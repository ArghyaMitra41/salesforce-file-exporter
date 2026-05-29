# Salesforce File Exporter

A zero-cost, browser-based tool to bulk-export Files, Attachments, and Documents from Salesforce — directly from your browser to your computer.

**No backend server. No data leaves your browser.**

## Features

- 📁 **ContentDocument/ContentVersion** (modern Salesforce Files)
- 📎 **Attachments** (legacy)
- 📄 **Documents** (legacy)
- 🔍 **4 export modes**: CSV of Record IDs, SOQL Query, List View, Object Browse
- 📦 **ZIP download** — all files bundled into a single ZIP
- 🎛️ **Filters** — date range, file extension
- 📝 **Flexible naming** — original filename, ID prefix, or folder-per-record
- 🔒 **OAuth 2.0 PKCE** — secure, no passwords stored

## Quick Start

### 1. Salesforce Admin Setup (one-time)

A Salesforce admin needs to:

1. **Create a Connected App** (Setup → App Manager → New Connected App)
   - Enable OAuth Settings
   - Add callback URL: `https://your-app.vercel.app/auth/callback`
   - Scopes: `api`, `refresh_token`, `offline_access`
   - ✅ Enable PKCE Extension
   - ✅ Enable CORS for OAuth Endpoints
   - ❌ Uncheck "Require Secret for Web Server Flow"
   - ❌ Uncheck "Require Secret for Refresh Token Flow"

2. **Add to CORS Allowlist** (Setup → Security → CORS)
   - Add: `https://your-app.vercel.app`

3. **Copy the Consumer Key** and give it to users.

The in-app setup guide at `/setup` has step-by-step instructions.

### 2. Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local: set VITE_APP_URL=http://localhost:5173
npm run dev
```

### 3. Deploy to Vercel (free)

Connect your GitHub repo to Vercel. Set env vars:
- `VITE_APP_URL` = `https://your-project.vercel.app`
- `VITE_SF_DEFAULT_CLIENT_ID` = (optional, pre-bakes a Consumer Key)

## Architecture

Pure client-side React SPA — zero backend:

```
Browser  →  Salesforce REST API (OAuth 2.0 PKCE)
                   ↓
             client-zip (streaming ZIP)
                   ↓
             Browser file download
```

**Tech stack**: React 18 + Vite + TypeScript + Tailwind CSS + Zustand + TanStack Query + client-zip + PapaParse
