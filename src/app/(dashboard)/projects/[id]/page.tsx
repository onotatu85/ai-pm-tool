import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProjectStatusBadge, ContentStatusBadge } from '@/components/StatusBadge'
import type { Content } from '@/lib/types'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase.from('projects').select('*').eq('id', id).single()
  if (!project) notFound()

  const { data: contents } = await supabase
    .from('contents')
    .select('*, assignee:profiles!contents_assignee_id_fkey(display_name)')
    .eq('project_id', id)
    .order('updated_at', { ascending: false })

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-500">
          プロジェクト一覧
        </Link>
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
          <button className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            メンバー管理
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="コンテンツを検索..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option>すべて</option>
          <option>Draft</option>
          <option>Review</option>
          <option>Approved</option>
          <option>Published</option>
        </select>
        <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
          <option>担当者: すべて</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">タイトル</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">ステータス</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 sm:table-cell">
                担当者
              </th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 md:table-cell">
                更新日
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contents && contents.length > 0 ? (
              contents.map((content: Content & { assignee: { display_name: string } | null }) => (
                <tr
                  key={content.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${id}/contents/${content.id}`}
                      className="block font-medium text-slate-800 hover:text-blue-600"
                    >
                      {content.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <ContentStatusBadge status={content.status} />
                  </td>
                  <td className="hidden px-4 py-3 text-slate-500 sm:table-cell">
                    {content.assignee?.display_name ?? '—'}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-400 md:table-cell">
                    {new Date(content.updated_at).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400">
                  コンテンツがまだありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
