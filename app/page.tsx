'use client'

import { useEffect, useState } from 'react'

// ── Data ──
const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', models: 'GPT-4o, GPT-4o-mini' },
  { id: 'anthropic', name: 'Anthropic', models: 'Claude 3.5 Sonnet, Haiku' },
  { id: 'gemini', name: 'Google Gemini', models: 'Gemini 2.0 Flash, 1.5 Pro' },
  { id: 'deepseek', name: 'DeepSeek', models: 'DeepSeek Chat, Reasoner' },
  { id: 'groq', name: 'Groq', models: 'Llama 3.1 70B, 8B' },
  { id: 'mistral', name: 'Mistral', models: 'Mistral Large, Small' },
  { id: 'together', name: 'Together', models: 'Llama 3.1 70B Turbo' },
  { id: 'fireworks', name: 'Fireworks', models: 'Llama 3.1 70B' },
  { id: 'perplexity', name: 'Perplexity', models: 'Sonar Pro, Sonar' },
  { id: 'cohere', name: 'Cohere', models: 'Command R+' },
]

const STRATEGIES = [
  { id: 'lbc', name: 'Least-Busy Circuit', desc: 'Pilih key paling sepi dari pool. Cocok buat high-traffic.', icon: '📊' },
  { id: 'water', name: 'Waterfall', desc: 'Prioritas gratis dulu, baru berbayar. Hemat budget.', icon: '🌊' },
  { id: 'random', name: 'Random', desc: 'Distribusi acak dari semua key aktif.', icon: '🎲' },
  { id: 'failover', name: 'Failover', desc: 'Primary → Backup → Free. Prioritaskan reliability.', icon: '🔁' },
]

function ChevronRight() { return <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg> }

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen">
      {/* ── Nav ── */}
      <nav className="fixed top-0 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-xl z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">
            <span className="text-[var(--color-paseban-400)]">//</span> paseban
          </span>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Dashboard</a>
            <a href="/api/v1/models" className="text-sm text-gray-400 hover:text-white transition-colors">API</a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--color-border)] text-xs text-[var(--color-paseban-400)] mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            OpenAI-compatible
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            Route to{' '}
            <span className="bg-gradient-to-r from-[var(--color-paseban-400)] to-purple-400 bg-clip-text text-transparent">
              60+ AI Models
            </span>
            <br />
            from One API
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Satu endpoint OpenAI-compatible buat akses semua provider.
            Multi-key, auto-fallback, smart routing — gak perlu ribet manage API key satu-satu.
          </p>
          <div className="flex items-center justify-center gap-4">
            <a href="/dashboard" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--color-paseban-600)] hover:bg-[var(--color-paseban-500)] text-white font-medium transition-colors">
              Get Started <ChevronRight />
            </a>
            <code className="px-4 py-3 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-sm text-gray-300">
              curl https://paseban.app/api/v1/chat/completions
            </code>
          </div>
        </div>
      </section>

      {/* ── Supported Providers ── */}
      <section className="py-20 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Supported Providers</h2>
          <p className="text-gray-400 mb-10">Built-in + custom provider (bring your own base URL & model mapping)</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PROVIDERS.map(p => (
              <div key={p.id} className="p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] hover:border-[var(--color-paseban-600)] transition-colors">
                <div className="font-medium text-sm mb-1">{p.name}</div>
                <div className="text-xs text-gray-500">{p.models}</div>
              </div>
            ))}
            {/* Custom provider card */}
            <div className="p-4 rounded-xl bg-[var(--color-card)] border border-dashed border-[var(--color-border)] hover:border-[var(--color-paseban-600)] transition-colors flex items-center justify-center text-sm text-gray-500">
              + Custom Provider
            </div>
          </div>
        </div>
      </section>

      {/* ── Robin Strategy ── */}
      <section className="py-20 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-2">Robin Smart Routing</h2>
          <p className="text-gray-400 mb-10">4 routing strategies. Pilih per provider atau global.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STRATEGIES.map(s => (
              <div key={s.id} className="p-5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                <div className="text-2xl mb-3">{s.icon}</div>
                <div className="font-medium text-sm mb-1">{s.name}</div>
                <div className="text-xs text-gray-500">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-8 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
            <div className="text-sm font-medium mb-1">Multi-Key per Provider 🔑</div>
            <div className="text-xs text-gray-400">Unlimited keys with status tracking, quota monitoring, auto-rotate on 429</div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 border-t border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-center">How It Works</h2>
          <p className="text-gray-400 mb-10 text-center">Request → Robin picks best key → Proxy to provider → Return response</p>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Send Request', desc: 'Pake OpenAI SDK / curl ke endpoint Paseban. Model name, messages, sama parameter biasa.' },
              { step: '02', title: 'Robin Routes', desc: 'Smart engine milih provider + key terbaik based on strategy (LBC, Waterfall, Random, Failover).' },
              { step: '03', title: 'Proxy to Provider', desc: 'Request diteruskan ke provider tujuan. Auto-retry kalo 429. Fallback kalo mati.' },
              { step: '04', title: 'Return Response', desc: 'Response dikembalikan dalam format OpenAI-compatible. Termasuk header X-Paseban-Provider buat audit.' },
            ].map(s => (
              <div key={s.step} className="flex gap-4 p-4 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)]">
                <div className="text-[var(--color-paseban-400)] font-mono text-sm font-bold w-8 shrink-0">{s.step}</div>
                <div>
                  <div className="font-medium text-sm mb-1">{s.title}</div>
                  <div className="text-xs text-gray-400">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 px-6 border-t border-[var(--color-border)] text-center text-xs text-gray-500">
        Paseban — AI Router Cloud. Built with ❤️
      </footer>
    </div>
  )
}
