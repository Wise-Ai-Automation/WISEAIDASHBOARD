# Agent Analytics Suite

Multi-tenant analytics, call management, and campaign dashboard for Retell AI voice agents.

## Features

- **Dashboard & Call Analytics**: Real-time KPI aggregation, call duration, latency, cost tracking, and sentiment analytics.
- **Call Logs & Transcripts**: Detailed call logs, audio playback, and full conversation transcripts.
- **Campaigns**: Batch call orchestration and CSV contact list execution via Retell AI.
- **Multi-Tenant Subaccounts**: Role-based access control (Admin & Subaccount), agent isolation, and assigned caller IDs.
- **Client Billing**: Per-minute billing rates, profit tracking, and daily spend limit alerts.
- **Modern UI**: Midnight Glass design system with light/dark theme support.

## Tech Stack

- **Framework**: TanStack Start (React 19) + Vite
- **Styling**: Tailwind CSS
- **Backend & Auth**: Supabase (PostgreSQL, Row Level Security, Auth)
- **Voice Agent Engine**: Retell AI API
- **Charts**: Recharts

## Getting Started

### 1. Prerequisites

- Node.js (v20+ recommended)
- npm or pnpm

### 2. Environment Setup

Create a `.env` file with your credentials:

```env
SUPABASE_PROJECT_ID="your_supabase_project_id"
SUPABASE_URL="https://your_supabase_project_id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

VITE_SUPABASE_PROJECT_ID="your_supabase_project_id"
VITE_SUPABASE_URL="https://your_supabase_project_id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_supabase_anon_key"

RETELL_API_KEY="key_your_retell_api_key"
```

### 3. Installation & Development

```sh
npm install
npm run dev
```

### 4. Build for Production

```sh
npm run build
```
