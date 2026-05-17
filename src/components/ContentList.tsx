'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ContentStatusBadge } from '@/components/StatusBadge'
import type { Content, ContentStatus } from '@/lib/types'

type ContentWithAssignee = Content & { assignee: { display_name: string } | null }

export default function ContentList({
  contents,
  projectId,
}: {
  contents: ContentWithAssignee[]
  projectId: string
}) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContentStatus | ''>('')

  const assignees = useMemo(() => {
    const names = contents
      .map((c) => c.assignee?.display_name)
      .filter((n): n is string => !!n)
    return [...new Set(names)]
  }, [contents])

  const [assigneeFilter, setAssigneeFilter] = useState('')

  const filtered = useMemo(() => {
    return contents.filter((c) => {
      const matchQuery = c.title.toLowerCase().includes(query.toLowerCase())
      const matchStatus = statusFilter === '' || c.status === statusFilter
      const matchAssignee = assigneeFilter === '' || c.assignee?.display_name === assigneeFilter
      return matchQuery && matchStatus && matchAssignee
    })
  }, [contents, query, statusFilter, assigneeFilter])

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="コンテンツを検索..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ContentStatus | '')}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">すべて</option>
          <option value="draft">Draft</option>
          <option value="review">Review</option>
          <option value="approved">Approved</option>
          <option value="published">Published</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          <option value="">担当者: すべて</option>
          {assignees.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-slate-600">タイトル</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">ステータス</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 sm:table-cell">担当者</th>
              <th className="hidden px-4 py-3 text-left font-medium text-slate-600 md:table-cell">更新日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length > 0 ? (
              filtered.map((content) => (
                <tr key={content.id} className="cursor-pointer transition hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${projectId}/contents/${content.id}`}
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
                  {query || statusFilter || assigneeFilter
                    ? '条件に一致するコンテンツがありません'
                    : 'コンテンツがまだありません'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
