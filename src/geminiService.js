import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import chalk from 'chalk';

export class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your_gemini_api_key_here') {
      console.warn(chalk.yellow('⚠️ GEMINI_API_KEY is missing or unconfigured in .env! Using demo fallback analysis.'));
      this.ai = null;
    } else {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  /**
   * Evaluates job posting against candidate resume.
   * @param {string} resumeText - Candidate resume text
   * @param {object} jobDetails - { title, company, location, salary, description, applyUrl, source }
   * @returns {Promise<object>} Match analysis object
   */
  async evaluateJob(resumeText, jobDetails) {
    if (!this.ai) {
      return {
        match_score: 85,
        should_recommend: true,
        designation: jobDetails.title,
        company: jobDetails.company,
        location: jobDetails.location,
        salary: jobDetails.salary || 'Competitive (As per industry)',
        matching_skills: ['Vue 3', 'React', 'Node.js', 'TypeScript', 'REST APIs'],
        fit_reason: 'Strong match for your Vue 3 & Node.js frontend/full-stack experience.',
        apply_url: jobDetails.applyUrl,
        source: jobDetails.source
      };
    }

    const prompt = `
You are an expert AI Tech Recruiter. Analyze the following job posting against candidate Parakh Agrawal's resume (2.3 YOE Software Engineer specializing in Vue 3, React, Node.js, and AI Web Development).

Candidate Resume:
${resumeText}

Candidate Context:
${JSON.stringify(config.candidateContext, null, 2)}

Job Title: ${jobDetails.title}
Company: ${jobDetails.company || 'Unknown Company'}
Location: ${jobDetails.location || 'India / Remote'}
Salary/Comp: ${jobDetails.salary || 'Not specified'}
Job Source: ${jobDetails.source || 'Job Board'}
Job Description:
${jobDetails.description}

Analyze fit and return a JSON object ONLY with the following exact keys:
- "match_score": Integer from 0 to 100.
- "should_recommend": Boolean (true if score >= ${config.matchScoreThreshold}, else false).
- "designation": Standardized job title string.
- "company": Company name.
- "location": Job location.
- "salary": Estimated or specified salary range.
- "matching_skills": Array of 3 to 6 overlapping tech skills found in both job & resume.
- "fit_reason": A concise 1-2 sentence explanation of why this job matches the candidate's background.
`;

    let retries = 4;
    while (retries > 0) {
      try {
        const response = await this.ai.models.generateContent({
          model: config.geminiModel,
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        });

        const result = JSON.parse(response.text);
        result.apply_url = jobDetails.applyUrl;
        result.source = jobDetails.source;
        return result;
      } catch (error) {
        if (error.message && (error.message.includes('429') || error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('Quota exceeded') || error.message.includes('RESOURCE_EXHAUSTED'))) {
          console.log(chalk.yellow(`⏳ Gemini API rate limited. Pausing 20s for quota reset (${retries} retries left)...`));
          await new Promise((resolve) => setTimeout(resolve, 20000));
          retries--;
        } else {
          console.error(chalk.red('Gemini API evaluation error:'), error.message);
          return {
            match_score: 50,
            should_recommend: false,
            fit_reason: `Error evaluating job: ${error.message}`,
            matching_skills: [],
            apply_url: jobDetails.applyUrl,
            source: jobDetails.source
          };
        }
      }
    }

    return {
      match_score: 50,
      should_recommend: false,
      fit_reason: 'Exceeded rate limit retries.',
      matching_skills: [],
      apply_url: jobDetails.applyUrl,
      source: jobDetails.source
    };
  }

  /**
   * Formats match result object into HTML message for Telegram.
   * @param {object} evalResult 
   * @returns {string} Formatted Telegram HTML text
   */
  formatTelegramMessage(evalResult) {
    const skillsList = evalResult.matching_skills && evalResult.matching_skills.length > 0
      ? evalResult.matching_skills.join(', ')
      : 'Vue 3, React, Node.js, JavaScript';

    const scoreBadge = evalResult.match_score >= 85 ? '🔥' : '⭐';

    return `
<b>${scoreBadge} Match Score: ${evalResult.match_score}% (${evalResult.source})</b>

🎯 <b>Designation:</b> ${evalResult.designation || 'Software Engineer'}
🏢 <b>Company:</b> ${evalResult.company || 'Tech Company'}
📍 <b>Location:</b> ${evalResult.location || 'India / Remote'}
💰 <b>Salary:</b> ${evalResult.salary || 'As per industry standards'}

🛠️ <b>Key Overlapping Skills:</b>
<code>${skillsList}</code>

🤖 <b>AI Fit Reason:</b>
<i>"${evalResult.fit_reason}"</i>

🔗 <b>Direct Apply Link:</b>
<a href="${evalResult.apply_url}">👉 Click Here to View & Apply Job</a>
`.trim();
  }
}
