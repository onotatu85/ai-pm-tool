import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectStatusBadge } from '@/components/StatusBadge'
import type { Project } from '@/lib/types'

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  if (days < 30) return `${Math.floor(days / 7)}週間前`
  return `${Math.floor(days / 30)}ヶ月前`
}

async function ProjectCard({ project }: { project: Project }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="font-semibold text-slate-800">{project.name}</h2>
        <ProjectStatusBadge status={project.status} />
      </div>
      {project.description && (
        <p className="mb-4 line-clamp-1 text-sm text-slate-500">{project.description}</p>
      )}
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>更新: {formatRelativeDate(project.updated_at)}</span>
        <div className="flex -space-x-1.5">
          {['bg-blue-400', 'bg-green-400', 'bg-purple-400'].map((color, i) => (
            <div
              key={i}
              className={`flex h-6 w-6 items-center justify-center rounded-full ${color} text-[10px] font-bold text-white ring-2 ring-white`}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
      </div>
    </Link>
  )
}

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

      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          placeholder="プロジェクトを検索..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500">
          <option>すべて</option>
          <option>Active</option>
          <option>Completed</option>
          <option>Archived</option>
        </select>
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project: Project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-400">プロジェクトがまだありません</p>
          <Link
            href="/projects/new"
            className="mt-3 inline-block text-sm text-blue-500 hover:underline"
          >
            最初のプロジェクトを作成する
          </Link>
        </div>
      )}
    </div>
  )
}
