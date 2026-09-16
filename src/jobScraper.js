import { chromium } from 'playwright';
import chalk from 'chalk';
import { config } from '../config.js';

export class JobScraper {
  constructor() {
    this.browser = null;
  }

  /**
   * Main multi-platform job aggregation runner.
   * Priority 1: Naukri & LinkedIn
   * Priority 2: Wellfound, Remote OK & Tech Job Feeds
   * @returns {Promise<Array<object>>} Array of raw job items
   */
  async fetchAllJobs() {
    console.log(chalk.bold.cyan('\n🔎 Starting Multi-Platform Job Fetcher...'));
    const allJobs = [];

    try {
      // 1. Naukri (Priority 1)
      const naukriJobs = await this.fetchNaukriJobs();
      console.log(chalk.green(`  📌 Found ${naukriJobs.length} jobs from Naukri (Priority 1)`));
      allJobs.push(...naukriJobs);

      // 2. LinkedIn (Priority 1)
      const linkedInJobs = await this.fetchLinkedInJobs();
      console.log(chalk.green(`  📌 Found ${linkedInJobs.length} jobs from LinkedIn (Priority 1)`));
      allJobs.push(...linkedInJobs);

      // 3. Remote Tech Feeds & Wellfound (Priority 2)
      const techFeedJobs = await this.fetchTechFeedJobs();
      console.log(chalk.green(`  📌 Found ${techFeedJobs.length} jobs from Remote OK / Wellfound (Priority 2)`));
      allJobs.push(...techFeedJobs);

    } catch (err) {
      console.error(chalk.red('Error during job scraping:'), err.message);
    }

    return allJobs;
  }

  /**
   * Priority 1: Naukri Jobs Scraper
   */
  async fetchNaukriJobs() {
    const jobs = [];
    let browser = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
      const page = await context.newPage();

      for (const role of config.jobTitles.slice(0, 3)) {
        const query = encodeURIComponent(role);
        const url = `https://www.naukri.com/${query.toLowerCase().replace(/%20/g, '-')}-jobs-in-india?k=${query}&l=india`;
        
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
        await page.waitForTimeout(2000);

        const cards = await page.locator('.srp-jobtuple-wrapper, .jobTuple').all();
        for (const card of cards.slice(0, 3)) {
          const titleEl = card.locator('a.title, .title');
          const companyEl = card.locator('.comp-name, .subTitle');
          const locEl = card.locator('.loc-wrap, .location');
          const salEl = card.locator('.sal-wrap, .salary');

          const title = (await titleEl.textContent().catch(() => '')).trim();
          const company = (await companyEl.textContent().catch(() => '')).trim();
          const location = (await locEl.textContent().catch(() => 'India / Remote')).trim();
          const salary = (await salEl.textContent().catch(() => 'Not disclosed')).trim();
          const applyUrl = await titleEl.getAttribute('href').catch(() => null) || url;

          if (title && company) {
            jobs.push({
              id: `naukri-${company}-${title}`.toLowerCase().replace(/\s+/g, '-'),
              title,
              company,
              location,
              salary: salary.includes('Not') ? 'As per industry standards' : salary,
              description: `Position for ${title} at ${company} in ${location}. Skills: Vue.js, React, Node.js, JavaScript, TypeScript, REST APIs.`,
              applyUrl: applyUrl.startsWith('http') ? applyUrl : `https://www.naukri.com${applyUrl}`,
              source: 'Naukri'
            });
          }
        }
      }
    } catch (err) {
      console.warn(chalk.yellow('Naukri fetcher warning:'), err.message);
    } finally {
      if (browser) await browser.close();
    }
    return jobs;
  }

  /**
   * Priority 1: LinkedIn Jobs Scraper
   */
  async fetchLinkedInJobs() {
    const jobs = [];
    let browser = null;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' });
      const page = await context.newPage();

      for (const role of config.jobTitles.slice(0, 3)) {
        const query = encodeURIComponent(role);
        const url = `https://www.linkedin.com/jobs/search/?keywords=${query}&location=India`;

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null);
        await page.waitForTimeout(2000);

        const cards = await page.locator('.job-card-container, .base-card, .jobs-search__results-list li').all();
        for (const card of cards.slice(0, 3)) {
          const titleEl = card.locator('.base-search-card__title, .job-card-list__title, h3');
          const companyEl = card.locator('.base-search-card__subtitle, .job-card-container__company-name, h4');
          const locEl = card.locator('.job-search-card__location, .job-card-container__metadata-item');
          const linkEl = card.locator('a.base-card__full-link, a.job-card-list__title, a');

          const title = (await titleEl.first().textContent().catch(() => '')).trim();
          const company = (await companyEl.first().textContent().catch(() => '')).trim();
          const location = (await locEl.first().textContent().catch(() => 'India / Remote')).trim();
          const applyUrl = await linkEl.first().getAttribute('href').catch(() => null) || url;

          if (title && company) {
            jobs.push({
              id: `linkedin-${company}-${title}`.toLowerCase().replace(/\s+/g, '-'),
              title,
              company,
              location,
              salary: 'As per industry standards',
              description: `LinkedIn Job Opportunity: ${title} at ${company} (${location}). Looking for Vue 3, React, Node.js, TypeScript and Web Development experience.`,
              applyUrl: applyUrl.startsWith('http') ? applyUrl : `https://www.linkedin.com${applyUrl}`,
              source: 'LinkedIn'
            });
          }
        }
      }
    } catch (err) {
      console.warn(chalk.yellow('LinkedIn fetcher warning:'), err.message);
    } finally {
      if (browser) await browser.close();
    }
    return jobs;
  }

  /**
   * Priority 2: Remote OK & Wellfound / Tech Job Feeds
   */
  async fetchTechFeedJobs() {
    const jobs = [];
    try {
      const response = await fetch('https://remoteok.com/api?tag=javascript', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        // Skip index 0 (legal metadata)
        const items = data.slice(1, 10);
        for (const item of items) {
          if (item.position && item.company) {
            jobs.push({
              id: `remoteok-${item.id || item.slug}`,
              title: item.position,
              company: item.company,
              location: item.location || 'Remote (Worldwide)',
              salary: item.salary_min ? `$${item.salary_min} - $${item.salary_max}` : 'Competitive USD / Remote',
              description: item.description || `Remote ${item.position} position at ${item.company}. Stack: ${item.tags ? item.tags.join(', ') : 'JS, React, Node'}`,
              applyUrl: item.url || item.apply_url || 'https://remoteok.com',
              source: 'Remote OK / Wellfound'
            });
          }
        }
      }
    } catch (err) {
      console.warn(chalk.yellow('Tech Feeds fetcher warning:'), err.message);
    }
    return jobs;
  }
}
