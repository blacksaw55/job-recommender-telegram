import { Telegraf } from 'telegraf';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { config } from '../config.js';

export class TelegramBotManager {
  constructor(geminiService, tracker, jobScraper) {
    this.gemini = geminiService;
    this.tracker = tracker;
    this.scraper = jobScraper;
    this.token = process.env.TELEGRAM_BOT_TOKEN;
    this.chatId = process.env.TELEGRAM_CHAT_ID;
    this.bot = null;

    if (this.token && this.token !== 'your_telegram_bot_token_here') {
      this.bot = new Telegraf(this.token);
      this.setupHandlers();
    } else {
      console.warn(chalk.yellow('⚠️ TELEGRAM_BOT_TOKEN is missing or unconfigured in .env!'));
    }
  }

  setupHandlers() {
    // /start command - Registers chat ID and welcomes user
    this.bot.command('start', async (ctx) => {
      const chatId = ctx.chat.id;
      this.updateChatIdInEnv(chatId);

      const welcomeMsg = `
👋 <b>Welcome Parakh!</b>

🤖 <b>Telegram AI Job Recommendation Bot is ACTIVE!</b>

I will automatically evaluate jobs matching your resume (<b>Vue 3, React, Node.js, AI Web Dev, 2.3 YOE</b>) across <b>Naukri, LinkedIn, and Top Tech Feeds</b> and send you top recommendations every morning at <b>7:00 AM</b>.

<b>Available Commands:</b>
🔹 /recommend - Run an instant job scan & receive top recommendations right now.
🔹 /status - Check bot health & total recommended jobs.
🔹 /help - Display bot commands.
`.trim();

      await ctx.replyWithHTML(welcomeMsg);
    });

    // /recommend command - Trigger instant scan & digest
    this.bot.command('recommend', async (ctx) => {
      await ctx.reply('🔎 Scanning job postings on Naukri, LinkedIn, and Tech Feeds... Please wait 1-2 minutes for Gemini AI evaluations!');
      const sentCount = await this.runRecommendationJob(ctx.chat.id);
      if (sentCount === 0) {
        await ctx.reply('✨ No new recommendations found right now (all available listings were already evaluated or below match score threshold).');
      }
    });

    // /status command
    this.bot.command('status', async (ctx) => {
      const sentTotal = this.tracker.getSentCount();
      const statusMsg = `
📊 <b>Bot Status:</b> ACTIVE ✅
⏰ <b>Daily Schedule:</b> Every morning at 7:00 AM
🎯 <b>Target Roles:</b> ${config.jobTitles.slice(0, 4).join(', ')}
📍 <b>Location:</b> ${config.location}
⭐ <b>Match Score Threshold:</b> ${config.matchScoreThreshold}%
📈 <b>Total Jobs Recommended So Far:</b> ${sentTotal}
`.trim();
      await ctx.replyWithHTML(statusMsg);
    });

    // /help command
    this.bot.command('help', async (ctx) => {
      const helpMsg = `
ℹ️ <b>Bot Help & Commands:</b>

• Send /recommend to get instant top job matches with direct apply links.
• Send /status to view system status.
• Daily 7:00 AM job digest sends automatically!
`.trim();
      await ctx.replyWithHTML(helpMsg);
    });
  }

  /**
   * Automatically updates TELEGRAM_CHAT_ID in .env file when user sends /start.
   * @param {number|string} chatId 
   */
  updateChatIdInEnv(chatId) {
    this.chatId = String(chatId);
    process.env.TELEGRAM_CHAT_ID = String(chatId);

    const envPath = path.resolve('.env');
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, 'utf-8');
      if (content.includes('TELEGRAM_CHAT_ID=')) {
        content = content.replace(/TELEGRAM_CHAT_ID=.*/, `TELEGRAM_CHAT_ID=${chatId}`);
      } else {
        content += `\nTELEGRAM_CHAT_ID=${chatId}`;
      }
      fs.writeFileSync(envPath, content, 'utf-8');
      console.log(chalk.green(`✅ Auto-saved Telegram CHAT_ID (${chatId}) to .env!`));
    }
  }

  /**
   * Starts Telegram bot polling daemon.
   */
  async launch() {
    if (this.bot) {
      console.log(chalk.bold.green('🚀 Launching Telegram Bot daemon...'));
      this.bot.launch().catch((err) => console.error(chalk.red('Telegram Bot launch error:'), err.message));
    }
  }

  /**
   * Executes multi-platform job scan, Gemini evaluation, and sends recommendations to target Telegram chatId.
   * @param {string|number} targetChatId 
   * @returns {Promise<number>} Count of sent recommendations
   */
  async runRecommendationJob(targetChatId = this.chatId, resumeText = '') {
    const chatId = targetChatId || this.chatId;

    if (!resumeText) {
      const { getResumeText } = await import('./resumeParser.js');
      resumeText = await getResumeText(config.resumePath);
    }

    console.log(chalk.bold.magenta('\n======================================================'));
    console.log(chalk.bold.magenta('  🤖 Executing Telegram Job Recommendation Pipeline   '));
    console.log(chalk.bold.magenta('======================================================\n'));

    const rawJobs = await this.scraper.fetchAllJobs();
    console.log(chalk.cyan(`📥 Total raw job candidates fetched: ${rawJobs.length}`));

    let sentCount = 0;
    for (const job of rawJobs) {
      if (sentCount >= config.maxDailyDigestJobs) break;

      if (this.tracker.hasBeenSent(job.id, job.title, job.company)) {
        console.log(chalk.gray(`⏭️ Job "${job.title}" at ${job.company} already sent earlier. Skipping.`));
        continue;
      }

      console.log(chalk.bold(`\n📋 Gemini Evaluating: "${job.title}" at ${job.company} [${job.source}]`));
      const evalResult = await this.gemini.evaluateJob(resumeText, job);

      console.log(chalk.bold(`   Score: ${evalResult.match_score}% | Recommend: ${evalResult.should_recommend}`));
      console.log(chalk.gray(`   Reason: ${evalResult.fit_reason}`));

      if (evalResult.should_recommend && evalResult.match_score >= config.matchScoreThreshold) {
        const htmlMsg = this.gemini.formatTelegramMessage(evalResult);

        if (this.bot && chatId) {
          try {
            await this.bot.telegram.sendMessage(chatId, htmlMsg, { parse_mode: 'HTML', disable_web_page_preview: false });
            console.log(chalk.green(`📨 Pushed recommendation to Telegram chat ${chatId}!`));
          } catch (err) {
            console.error(chalk.red('Failed to send Telegram message:'), err.message);
          }
        } else {
          console.log(chalk.yellow('\n--- TELEGRAM MESSAGE PREVIEW (Console Dry-Run) ---'));
          console.log(htmlMsg.replace(/<[^>]*>/g, ''));
          console.log('---------------------------------------------------\n');
        }

        this.tracker.recordSent(job.id, job.title, job.company, job.source, evalResult.match_score);
        sentCount++;
      }
    }

    console.log(chalk.bold.green(`\n✅ Recommendation Pipeline Complete! (${sentCount} top jobs pushed)`));
    return sentCount;
  }
}
