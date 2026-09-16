import dotenv from 'dotenv';
dotenv.config();

import chalk from 'chalk';
import { getResumeText } from './src/resumeParser.js';
import { GeminiService } from './src/geminiService.js';
import { JobTracker } from './src/tracker.js';
import { JobScraper } from './src/jobScraper.js';
import { TelegramBotManager } from './src/telegramBot.js';
import { setupDailyScheduler } from './src/scheduler.js';
import { config } from './config.js';

const command = process.argv[2] || 'start';

async function main() {
  console.log(chalk.bold.magenta('\n=================================================================='));
  console.log(chalk.bold.magenta('  🤖 Telegram AI Job Recommendation Bot (Gemini 3.6 Flash)        '));
  console.log(chalk.bold.magenta('==================================================================\n'));

  const gemini = new GeminiService();
  const tracker = new JobTracker();
  const scraper = new JobScraper();
  const botManager = new TelegramBotManager(gemini, tracker, scraper);

  let resumeText = '';
  try {
    resumeText = await getResumeText(config.resumePath);
    console.log(chalk.green(`📄 Loaded resume from: ${config.resumePath} (${resumeText.length} chars)`));
  } catch (err) {
    console.warn(chalk.yellow(`⚠️ ${err.message}`));
  }

  switch (command) {
    case 'dry-run': {
      console.log(chalk.bold.yellow('🧪 Running Dry-Run Recommendation Test...\n'));

      const sampleJob = {
        id: 'sample-1',
        title: 'Senior Vue 3 / Full Stack Developer',
        company: 'SaaSify India Ltd.',
        location: 'Noida / Remote',
        salary: '₹16,000,000 - ₹24,000,000 / year',
        source: 'Naukri (Priority 1)',
        applyUrl: 'https://www.naukri.com/job-listings-sample',
        description: `
          Looking for a Senior Frontend / Full Stack Developer with 2+ years experience in Vue 3, React, Node.js, and TypeScript.
          Responsibilities:
          - Lead Vue 2 -> Vue 3 migrations using Vite and Pinia.
          - Build real-time financial dashboards and RESTful API microservices.
          - Use AI development tools to accelerate delivery.
        `
      };

      console.log(chalk.cyan('Evaluating sample job against candidate resume...'));
      const evalResult = await gemini.evaluateJob(resumeText, sampleJob);

      console.log('\n' + chalk.bold.green('--- TELEGRAM FORMATTED MESSAGE PREVIEW ---'));
      const formattedHtml = gemini.formatTelegramMessage(evalResult);
      console.log(formattedHtml.replace(/<[^>]*>/g, ''));
      console.log(chalk.bold.green('-------------------------------------------\n'));
      break;
    }

    case 'send-now': {
      console.log(chalk.bold.cyan('⚡ Instantly triggering Job Scan & Telegram Broadcast...'));
      await botManager.runRecommendationJob(process.env.TELEGRAM_CHAT_ID, resumeText);
      break;
    }

    case 'start':
    default: {
      console.log(chalk.green('🚀 Launching Daily 7 AM Telegram Job Recommendation Daemon...'));

      if (!process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN === 'your_telegram_bot_token_here') {
        console.log(chalk.yellow('\n⚠️ TELEGRAM_BOT_TOKEN is not configured in .env yet.'));
        console.log(chalk.cyan('👉 Follow these quick steps to receive daily Telegram messages:'));
        console.log('   1. Open Telegram and search for ' + chalk.bold('@BotFather'));
        console.log('   2. Send ' + chalk.bold('/newbot') + ' to get your API token.');
        console.log('   3. Paste the token into ' + chalk.yellow('.env') + ' (TELEGRAM_BOT_TOKEN=...)');
        console.log('   4. Send ' + chalk.bold('/start') + ' to your new bot in Telegram!\n');
      }

      // Launch bot daemon & 7 AM cron scheduler
      await botManager.launch();
      setupDailyScheduler(botManager);

      console.log(chalk.bold.green('\n✅ System running! Bot is active and 7 AM daily scheduler is set up.'));
      console.log(chalk.gray('Press CTRL+C to stop.\n'));
      break;
    }
  }
}

main().catch((err) => console.error(chalk.red('Fatal error:'), err));
