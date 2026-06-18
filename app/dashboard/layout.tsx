'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard', label: 'Providers', icon: '◈' },
  { href: '/dashboard/routing', label: 'Routing', icon: '◎' },
  { href: '/dashboard/usage', label: 'Usage', icon: '▤' },
  { href: '/dashboard/endpoints', label: 'Endpoints', icon: '⚡' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname()

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar ── */}
      <aside className="w-56 border-r border-[var(--color-border)] p-4 flex flex-col shrink-0">
        <Link href="/" className="text-lg font-semibold tracking-tight mb-8">
          <span className="text-[var(--color-paseban-400)]">//</span> paseban
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => {
            const active = path === n.href
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? 'bg-[var(--color-paseban-600)]/10 text-[var(--color-paseban-400)]'
                    : 'text-gray-400 hover:text-white hover:bg-[var(--color-card)]'
                }`}
              >
                <span className="text-xs">{n.icon}</span>
                {n.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto pt-4 border-t border-[var(--color-border)]">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-400 transition-colors">
            ← Back to landing
          </Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
