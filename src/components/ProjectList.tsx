'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ProjectStatusBadge } from '@/components/StatusBadge'
import type { Project, ProjectStatus } from '@/lib/types'

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今日'
  if (days === 1) return '昨日'
  if (days < 7) return `${days}日前`
  if (days < 30) return `${Math.floor(days / 7)}週間前`
  return `${Math.floor(days / 30)}ヶ月前`
}

export default function ProjectList({ projects }: { projects: Project[] }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchQuery = p.name.toLowerCase().includes(query.toLowerCase()) ||
        (p.description ?? '').toLowerCase().includes(query.toLowerCase())
      const matchStatus = statusFilter === '' || p.status === statusFilter
      return matchQuery && matchStatus
    })
  }, [projects, query, statusFilter])

  return (
    <>
      <div className="mb-6 flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="プロジェクトを検索..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
        >
          <option value="">すべて</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Link
              key={project.id}
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
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
          <p className="text-slate-400">
            {query || statusFilter ? '条件に一致するプロジェクトがありません' : 'プロジェクトがまだありません'}
          </p>
          {!query && !statusFilter && (
            <Link href="/projects/new" className="mt-3 inline-block text-sm text-blue-500 hover:underline">
              最初のプロジェクトを作成する
            </Link>
          )}
        </div>
      )}
    </>
  )
}
