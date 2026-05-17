import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectStatusBadge } from '@/components/StatusBadge'
import ContentList from '@/components/ContentList'
import type { Content } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  const { data: contents } = await supabase
    .from('contents')
    .select('*, assignee:profiles(display_name)')
    .eq('project_id', id)
    .order('updated_at', { ascending: false })

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-500">プロジェクト一覧</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">{project.name}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          {project.description && (
            <p className="mt-1 text-sm text-slate-500">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${id}/contents/new`}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
          >
            ＋ コンテンツ追加
          </Link>
        </div>
      </div>

      <ContentList
        contents={(contents ?? []) as (Content & { assignee: { display_name: string } | null })[]}
        projectId={id}
      />
    </div>
  )
}
