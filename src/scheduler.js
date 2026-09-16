import cron from 'node-cron';
import chalk from 'chalk';
import { config } from '../config.js';

export function setupDailyScheduler(telegramBotManager) {
  console.log(chalk.cyan(`⏰ Initializing Daily 7:00 AM Cron Scheduler (${config.cronSchedule})...`));

  cron.schedule(config.cronSchedule, async () => {
    console.log(chalk.bold.yellow('\n🔔 [CRON TRIGGER 7:00 AM] Running Daily Job Recommendation Digest!'));
    try {
      await telegramBotManager.runRecommendationJob();
    } catch (err) {
      console.error(chalk.red('Error running 7 AM daily cron job:'), err.message);
    }
  });

  console.log(chalk.green('✅ Daily 7:00 AM scheduler is ACTIVE! Bot will scan & message every morning at 7:00 AM.'));
}
