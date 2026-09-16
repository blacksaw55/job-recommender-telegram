import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const LOG_FILE = path.resolve('./sent_jobs.json');

export class JobTracker {
  constructor() {
    this.sentJobs = this.load();
  }

  load() {
    if (fs.existsSync(LOG_FILE)) {
      try {
        const raw = fs.readFileSync(LOG_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        return [];
      }
    }
    return [];
  }

  save() {
    fs.writeFileSync(LOG_FILE, JSON.stringify(this.sentJobs, null, 2), 'utf-8');
  }

  hasBeenSent(jobId, title, company) {
    const key = jobId || `${company}-${title}`.toLowerCase().replace(/\s+/g, '-');
    return this.sentJobs.some((j) => j.key === key);
  }

  recordSent(jobId, title, company, source, matchScore) {
    const key = jobId || `${company}-${title}`.toLowerCase().replace(/\s+/g, '-');
    this.sentJobs.push({
      key,
      title,
      company,
      source,
      matchScore,
      sentAt: new Date().toISOString()
    });
    this.save();
    console.log(chalk.green(`✅ Recorded sent recommendation: "${title}" at ${company} [${source}]`));
  }

  getSentCount() {
    return this.sentJobs.length;
  }
}
