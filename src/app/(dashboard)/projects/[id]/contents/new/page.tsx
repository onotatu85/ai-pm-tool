'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ContentStatus } from '@/lib/types'

export default function NewContentPage() {
  const params = useParams()
  const projectId = params.id as string
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<ContentStatus>('draft')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('タイトルは必須です')
      return
    }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error: insertError } = await supabase
      .from('contents')
      .insert({ project_id: projectId, title: title.trim(), body: body.trim(), status, created_by: user.id })
      .select()
      .single()

    setSaving(false)

    if (insertError) {
      setError('コンテンツの作成に失敗しました')
      return
    }

    router.push(`/projects/${projectId}/contents/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-500">プロジェクト一覧</Link>
        <span className="mx-2">›</span>
        <Link href={`/projects/${projectId}`} className="hover:text-blue-500">プロジェクト</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">新規コンテンツ追加</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="mb-6 text-lg font-semibold text-slate-800">新規コンテンツ追加</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: トップページコピー"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">本文（任意）</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              placeholder="コンテンツ本文を入力..."
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="review">Review</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href={`/projects/${projectId}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? '作成中...' : 'コンテンツを追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
