# 🚀 LeadPilot

**AI-powered cold email automation for founders and sales teams.**

LeadPilot helps you send personalized, human-sounding cold emails at scale — with AI research, intelligent follow-ups, and deliverability optimization built-in.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://reactjs.org/)

---

## ✨ Features

### 📧 Smart Email Generation
- **AI-Personalized Emails** — GPT generates unique emails based on contact research
- **Spam-Optimized** — Avoids trigger words that land in Promotions/Spam
- **Auto Follow-ups** — Configurable delays with intelligent re-engagement

### 🔍 Lead Research
- **Company Intel** — Auto-fetches company info, news, and context
- **LinkedIn Integration** — Import contacts with enriched profiles
- **CSV Import** — Bulk upload your lead lists

### 📊 Campaign Management
- **Visual Dashboard** — Track sent, opened, replied at a glance
- **Real-time Status** — See what's pending, waiting, or completed
- **Batch Processing** — Rate-limited sending to protect deliverability

### 🔧 Deliverability Features
- **Domain Verification** — Works with Resend for proper SPF/DKIM
- **Webhook Tracking** — Delivery, bounce, and open notifications
- **Human-like Formatting** — Proper paragraphs and signatures

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, Vite, TypeScript |
| **Backend** | Hono, Node.js, TypeScript |
| **Database** | SQLite (better-sqlite3) |
| **AI** | OpenAI GPT-4o-mini |
| **Email** | Resend API |
| **Hosting** | Vercel (frontend), Railway (backend) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- OpenAI API key
- Resend API key (for production emails)

### Local Development

```bash
# Clone the repo
git clone https://github.com/sidharth-n/lead-pilot.git
cd lead-pilot

# Install backend dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API keys

# Start backend
npm run dev

# In another terminal, start frontend
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 to access the app.

### Environment Variables

```env
# Required
OPENAI_API_KEY=sk-...
USE_REAL_AI=true

# For production email sending
USE_REAL_EMAIL=true
RESEND_API_KEY=re_...
FROM_EMAIL=you@yourdomain.com
FROM_NAME=Your Name
```

---

## 📁 Project Structure

```
lead-pilot/
├── src/                    # Backend source
│   ├── api/                # API routes (Hono)
│   ├── database/           # SQLite schema & queries
│   ├── jobs/               # Background processors
│   └── services/           # OpenAI, Resend integrations
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route pages
│   │   └── api.ts          # API client
└── data/                   # SQLite database files
```

---

## 🌐 Deployment

### Frontend (Vercel)
1. Import repo on [vercel.com](https://vercel.com)
2. Set root directory: `frontend`
3. Add env var: `VITE_API_URL=https://your-backend.railway.app/api`

### Backend (Railway)
1. Deploy from GitHub on [railway.app](https://railway.app)
2. Add environment variables (API keys)
3. Add persistent volume at `/app/data` for SQLite

See [DEPLOYMENT_GUIDE.md](.gemini/DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 📄 License

MIT © [Sidharth N](https://github.com/sidharth-n)

---

<p align="center">
  Made with ❤️ for founders who hate writing cold emails
</p>
