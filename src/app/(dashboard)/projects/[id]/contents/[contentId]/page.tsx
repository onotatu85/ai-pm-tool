'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentStatusBadge } from '@/components/StatusBadge'
import type { Content, ContentStatus, AiPromptType } from '@/lib/types'
import { useRouter, useParams } from 'next/navigation'

const STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
]

const AI_TABS: { value: AiPromptType; label: string }[] = [
  { value: 'improve', label: '改善' },
  { value: 'summarize', label: '要約' },
  { value: 'seo', label: 'SEO' },
  { value: 'tone', label: '文体' },
]

export default function ContentPage() {
  const params = useParams()
  const projectId = params.id as string
  const contentId = params.contentId as string
  const router = useRouter()
  const supabase = createClient()

  const [content, setContent] = useState<Content | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<ContentStatus>('draft')
  const [saving, setSaving] = useState(false)
  const [aiTab, setAiTab] = useState<AiPromptType>('improve')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('contents')
        .select('*')
        .eq('id', contentId)
        .single()
      if (data) {
        setContent(data)
        setTitle(data.title)
        setBody(data.body ?? '')
        setStatus(data.status)
      }
    }
    load()
  }, [contentId])

  async function handleSave() {
    setSaving(true)
    await supabase.from('contents').update({ title, body, status }).eq('id', contentId)
    setSaving(false)
  }

  async function handleDelete() {
    if (!confirm('このコンテンツを削除しますか？この操作は取り消せません。')) return
    await supabase.from('contents').delete().eq('id', contentId)
    router.push(`/projects/${projectId}`)
  }

  async function handleAiSuggest() {
    setAiLoading(true)
    setAiResult('')
    const res = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptType: aiTab, body }),
    })
    const data = await res.json()
    setAiResult(data.response)
    setIsMock(data.isMock)
    setAiLoading(false)
  }

  function applyAiResult() {
    if (aiResult) setBody((prev) => prev + '\n\n' + aiResult)
  }

  if (!content) {
    return (
      <div className="flex h-40 items-center justify-center text-slate-400">読み込み中...</div>
    )
  }

  return (
    <div>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-500">プロジェクト一覧</Link>
        <span className="mx-2">›</span>
        <Link href={`/projects/${projectId}`} className="hover:text-blue-500">プロジェクト</Link>
        <span className="mx-2">›</span>
        <span className="text-slate-700">{content.title}</span>
      </nav>

      <div className="flex gap-6">
        {/* 左パネル: 編集エリア */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="mb-4 flex gap-3">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="flex items-center">
                <ContentStatusBadge status={status} />
              </div>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              placeholder="コンテンツ本文を入力..."
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                下書き保存
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
              <button
                onClick={handleDelete}
                className="ml-auto rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>

            {/* 変更履歴 */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">変更履歴</p>
              <div className="space-y-1 text-xs text-slate-400">
                <p>v2 佐藤花子 — レビュー依頼</p>
                <p>v1 田中太郎 — 作成</p>
              </div>
            </div>
          </div>
        </div>

        {/* 右パネル: AI提案 */}
        <div className="w-80 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-800">✨ AI改善提案</h2>

            {isMock && (
              <div className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                モードモード（APIキー未設定）
              </div>
            )}

            <div className="mb-4 flex rounded-lg border border-slate-200 p-0.5">
              {AI_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setAiTab(tab.value)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                    aiTab === tab.value
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleAiSuggest}
              disabled={aiLoading || !body}
              className="mb-4 w-full rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {aiLoading ? '生成中...' : 'AI提案を生成'}
            </button>

            {aiResult && (
              <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {aiResult}
              </div>
            )}

            {aiResult && (
              <div className="flex items-center gap-2">
                <button
                  onClick={applyAiResult}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  本文に適用
                </button>
                <button
                  onClick={() => setAiResult('')}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  却下
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
