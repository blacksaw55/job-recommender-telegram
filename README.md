# 🤖 Telegram AI Job Recommendation Bot

An automated **Telegram Bot** powered by **Gemini 3.6 Flash** and **Node.js** that scans job opportunities across **Naukri (Priority 1)**, **LinkedIn (Priority 1)**, and **Wellfound / Remote Tech Feeds (Priority 2)** matching candidate **Parakh Agrawal's** profile (**Vue 3, React, Node.js, AI Web Dev, 2.3 YOE** across **India / Remote**), and sends a daily job digest directly to **Telegram** every morning at **7:00 AM**.

---

## ✨ Features

- 🎯 **Rich Telegram Cards**: Every message includes **Designation**, **Company Name**, **Location**, **Salary Range**, **Key Skill Overlaps**, **Gemini Match Rating**, and a **Direct Job Apply Link**.
- ⏰ **Daily 7:00 AM Scheduler**: Powered by `node-cron` to push recommendations every morning.
- ⚡ **On-Demand Bot Commands**:
  - `/recommend` - Get instant top job matches sent to your phone right now.
  - `/status` - View bot health, next run time, and total sent job count.
  - `/start` - Connect your Telegram chat ID automatically.
- 🛑 **Zero Duplicate Spam**: Tracks sent recommendations in `sent_jobs.json`.
- 🛡️ **Rate Limit Handling**: Automatic 20-second backoff retries for free-tier Gemini API keys.

---

## 🚀 Quick Setup & Execution

### 1. Environment Configuration
Create a `.env` file in the project root:
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Create Telegram Bot (Takes 1 Minute)
1. Message [@BotFather](https://t.me/BotFather) on Telegram and send `/newbot`.
2. Copy your bot API Token into `.env`.
3. Open your new bot in Telegram and send `/start`.

### 3. Run Commands
```bash
# Test Gemini evaluation & format output in console
npm run dry-run

# Run full daemon (Bot + 7 AM Cron Scheduler)
npm start

# Trigger immediate Telegram broadcast right now
npm run send-now
```

---

## 🌐 Deploying to GitHub

To push this project to a new GitHub repository:

```bash
git init
git add .
git commit -m "Initial commit of Telegram AI Job Recommendation Bot"
git branch -M main
git remote add origin https://github.com/parakhagrwal/job-recommender-telegram.git
git push -u origin main
```
