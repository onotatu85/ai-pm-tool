'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface HeaderProps {
  displayName?: string
}

export default function Header({ displayName = '田中太郎' }: HeaderProps) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = displayName.charAt(0)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-blue-500">AI-PM</span>
          <span className="hidden text-sm text-slate-500 sm:block">AI Project Manager</span>
        </Link>

        <div className="flex items-center gap-3">
          <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="通知">
            🔔
          </button>
          <Link
            href="/settings"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            title="設定"
          >
            ⚙️
          </Link>
          <div className="relative group">
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                {initials}
              </div>
              <span className="hidden text-sm text-slate-700 sm:block">{displayName}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg group-focus-within:block">
              <Link href="/settings" className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                プロフィール
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-slate-50"
              >
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
