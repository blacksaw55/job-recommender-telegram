import path from 'path';

export const config = {
  // Target job titles aligned with Parakh's background & career goals
  jobTitles: [
    'Frontend Engineer',
    'Full Stack Developer',
    'Backend Engineer',
    'AI Web Developer',
    'Vue.js Developer',
    'React Developer',
    'Node.js Developer'
  ],

  // Target Location preferences
  location: 'India', // All India & Remote

  // Path to resume file (.txt, .pdf, or .md)
  resumePath: path.resolve('./resume.txt'),

  // Minimum Gemini match score (0 - 100) required to send recommendation
  matchScoreThreshold: 70,

  // Maximum jobs to include in the daily 7 AM digest
  maxDailyDigestJobs: 7,

  // Cron schedule for Daily Digest (Default: 7:00 AM every morning)
  cronSchedule: '0 7 * * *',

  // Gemini model to use
  geminiModel: 'gemini-3.6-flash',

  // Platform Priorities
  platforms: {
    naukri: { enabled: true, priority: 1 },
    linkedIn: { enabled: true, priority: 1 },
    wellfound: { enabled: true, priority: 2 },
    indeed: { enabled: true, priority: 2 },
    remoteFeeds: { enabled: true, priority: 2 }
  },

  // Candidate details for Gemini match evaluation
  candidateContext: {
    name: 'Parakh Agrawal',
    email: 'parakhagarwal1509@gmail.com',
    phone: '+91 78796 34853',
    yearsOfExperience: 2.3,
    primarySkills: ['Vue 3', 'React', 'Node.js', 'TypeScript', 'JavaScript', 'Express', 'Pinia', 'REST APIs', 'AI Web Development', 'Vite', 'Docker'],
    currentCompany: 'IndiaMART InterMESH Ltd. (Livekeeping)',
    currentLocation: 'Noida, India',
    preferredLocations: 'All India / Remote',
    education: 'B.Tech in Computer Science & Engineering (JSS Noida, 2024)',
    expectedSalary: '18,000,000 INR', // Annual (18 LPA)
    linkedIn: 'https://linkedin.com/in/parakh',
    github: 'https://github.com/parakhagrwal'
  }
};
