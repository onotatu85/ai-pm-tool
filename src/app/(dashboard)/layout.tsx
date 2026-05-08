import { createClient } from '@/lib/supabase/server'
import Header from '@/components/Header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName = user?.user_metadata?.display_name ?? user?.email ?? '田中太郎'

  return (
    <div className="min-h-screen bg-slate-50">
      <Header displayName={displayName} />
      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}
