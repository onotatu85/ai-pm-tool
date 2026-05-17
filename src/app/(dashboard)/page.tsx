import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProjectList from '@/components/ProjectList'
import type { Project } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false })

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">プロジェクト一覧</h1>
        <Link
          href="/projects/new"
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
        >
          ＋ 新規プロジェクト作成
        </Link>
      </div>
      <ProjectList projects={(projects ?? []) as Project[]} />
    </div>
  )
}
