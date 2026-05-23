'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Toast from '@/components/Toast'
import { PROJECT_STATUS_OPTIONS } from '@/components/StatusBadge'
import type { ProjectStatus } from '@/lib/types'

export default function EditProjectPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('active')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function loadProject() {
      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !data) {
        setError('プロジェクトが見つかりません')
        setLoading(false)
        return
      }

      setName(data.name)
      setDescription(data.description ?? '')
      setStatus(data.status as ProjectStatus)
      setLoading(false)
    }

    loadProject()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('プロジェクト名は必須です')
      return
    }

    setSaving(true)
    setError('')

    const { error: updateError } = await supabase
      .from('projects')
      .update({ name: name.trim(), description: description.trim() || null, status })
      .eq('id', id)

    setSaving(false)

    if (updateError) {
      setError('プロジェクトの更新に失敗しました')
      return
    }

    setToast({ message: 'プロジェクトを更新しました', type: 'success' })
    setTimeout(() => {
      router.push(`/projects/${id}`)
    }, 1000)
  }

  async function handleDelete() {
    if (!confirm('このプロジェクトを削除しますか？この操作は元に戻せません。')) return

    setDeleting(true)
    setError('')

    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    setDeleting(false)

    if (deleteError) {
      setError('プロジェクトの削除に失敗しました')
      return
    }

    router.push('/')
  }

  const handleCloseToast = useCallback(() => setToast(null), [])

  if (loading) {
    return (
      <div className="mx-auto max-w-xl">
        <p className="text-sm text-slate-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl">
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-500">プロジェクト一覧</Link>
        <span className="mx-2">›</span>
        <Link href={`/projects/${id}`} className="hover:text-blue-500">{name || 'プロジェクト'}</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">編集</span>
      </nav>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="mb-6 text-lg font-semibold text-slate-800">プロジェクト編集</h1>

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
              {PROJECT_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? '削除中...' : 'プロジェクトを削除'}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '保存中...' : '変更を保存'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={handleCloseToast} />
      )}
    </div>
  )
}
