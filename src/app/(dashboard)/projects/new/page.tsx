'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { ProjectStatus } from '@/lib/types'

export default function NewProjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('プロジェクト名は必須です')
      return
    }

    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: membership } = await supabase
      .from('org_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      setError('ワークスペースが見つかりません')
      setSaving(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({ name: name.trim(), description: description.trim() || null, status, created_by: user.id, organization_id: membership.organization_id })
      .select()
      .single()

    setSaving(false)

    if (insertError) {
      setError('プロジェクトの作成に失敗しました')
      return
    }

    router.push(`/projects/${data.id}`)
  }

  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-500">プロジェクト一覧</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">新規プロジェクト作成</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="mb-6 text-lg font-semibold text-slate-800">新規プロジェクト作成</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              プロジェクト名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: ECサイトリニューアル"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">説明（任意）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="プロジェクトの概要を入力..."
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ステータス</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Link
              href="/"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? '作成中...' : 'プロジェクトを作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
