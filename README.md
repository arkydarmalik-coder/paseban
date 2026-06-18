# Paseban — AI Router Cloud 🚀

**Satu endpoint OpenAI-compatible buat 60+ AI provider.**
Multi-key, auto-fallback, smart routing — gak perlu ribet manage API key satu-satu.

```
POST /api/v1/chat/completions
Authorization: Bearer paseban_xxxxxxxx
```

## ✨ Fitur

| Fitur | Detail |
|---|---|
| **One API** | 1 endpoint buat semua provider (OpenAI, Anthropic, Gemini, DeepSeek, dll) |
| **Multi-Key** | Unlimited keys per provider — auto-rotate kalau kena 429 |
| **Smart Routing** | 4 strategi: Least-Busy Circuit, Waterfall, Random, Failover |
| **Custom Provider** | Bawa provider sendiri (base URL + model mapping) |
| **Auto-Fallback** | Request otomatis coba provider lain kalau satu mati |
| **Usage Tracking** | Monitor pemakaian per provider, per key, per bulan |
| **Edge Runtime** | Proxy latency rendah — deployed di Vercel Edge |

## 🧠 Robin Routing Engine

4 strategi buat milih key terbaik:

| Strategy | Cara Kerja | Cocok Untuk |
|---|---|---|
| **LBC** (default) | Pilih key paling sepi | High-traffic, multi-key |
| **Waterfall** | Gratis → Backup → Berbayar | Hemat budget |
| **Random** | Acak dari pool aktif | Testing / distribusi |
| **Failover** | Primary → Backup → Free | Mission-critical |

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/paseban.git
cd paseban
npm install
```

### 2. Environment

```bash
cp .env.local.example .env.local
# Isi Vercel KV credentials (optional — in-memory fallback di dev)
```

### 3. Dev

```bash
npm run dev
```

### 4. Test

```bash
npm test
```

### 5. Build

```bash
npm run build
```

## 📡 API

### Chat Completion

```bash
curl https://paseban.app/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": false
  }'
```

Response headers:

- `X-Paseban-Provider` — provider yang dipake
- `X-Paseban-Strategy` — routing strategy
- `X-Paseban-Key` — key ID yang dipake

### Models

```bash
curl https://paseban.app/api/v1/models
```

### Usage

```bash
curl https://paseban.app/api/usage?month=2026-06
```

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Client App  │────▶│  Paseban API  │────▶│ Provider │
│  (OpenAI SDK) │     │  /api/v1/...  │     │  API     │
└─────────────┘     │              │     └──────────┘
                    │  ┌──────────┐│
                    │  │  Robin   ││
                    │  │  Router  ││
                    │  └──────────┘│
                    │  ┌──────────┐│
                    │  │  KV Repo ││
                    │  └──────────┘│
                    └──────────────┘
```

## 🧪 Testing

```bash
npm test           # Vitest
npm run test:watch # Watch mode
```

Robin engine: 16 tests — all passing ✅

## 🛠️ Tech Stack

- **Framework:** Next.js 15 (App Router, Edge Runtime)
- **Language:** TypeScript strict
- **Styling:** Tailwind CSS v4
- **State:** Zustand
- **Persistence:** Vercel KV (Redis) / InMemory fallback
- **Dev:** Turbopack, Vitest

## 📄 License

MIT
