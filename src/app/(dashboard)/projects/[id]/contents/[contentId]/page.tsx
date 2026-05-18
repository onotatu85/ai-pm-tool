'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentStatusBadge } from '@/components/StatusBadge'
import type { Content, ContentStatus, AiPromptType } from '@/lib/types'
import { useRouter, useParams } from 'next/navigation'
import Toast from '@/components/Toast'

// ロール別に許可されるステータス
const STATUS_BY_ROLE: Record<string, ContentStatus[]> = {
  admin:  ['draft', 'review', 'approved', 'published'],
  member: ['draft', 'review'],
  viewer: [],
}

type MemberItem = {
  user_id: string
  role: string
  profile: { display_name: string } | { display_name: string }[] | null
}

type HistoryItem = {
  id: string
  action: string
  created_at: string
  metadata: { status?: string; title?: string } | null
  profile: { display_name: string } | { display_name: string }[] | null
}

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
  const [assigneeId, setAssigneeId] = useState('')
  const [members, setMembers] = useState<MemberItem[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string>('viewer')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [aiTab, setAiTab] = useState<AiPromptType>('improve')
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  async function loadHistory(cid: string) {
    const { data } = await supabase
      .from('audit_logs')
      .select('id, action, created_at, metadata, profile:profiles(display_name)')
      .eq('resource_type', 'content')
      .eq('resource_id', cid)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setHistory(data as unknown as HistoryItem[])
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    async function load() {
      const { data: contentData } = await supabase
        .from('contents')
        .select('*, project:projects(organization_id)')
        .eq('id', contentId)
        .single()
      if (contentData) {
        setContent(contentData)
        setTitle(contentData.title)
        setBody(contentData.body ?? '')
        setStatus(contentData.status)
        setAssigneeId(contentData.assignee_id ?? '')

        const orgId = (contentData as Content & { project: { organization_id: string } }).project?.organization_id
        if (orgId) {
          const { data: { user } } = await supabase.auth.getUser()
          const { data: memberData } = await supabase
            .from('org_members')
            .select('user_id, role, profile:profiles(display_name)')
            .eq('organization_id', orgId)
          if (memberData) {
            setMembers(memberData as unknown as MemberItem[])
            // ログインユーザー自身のロールを特定
            const myEntry = memberData.find((m) => m.user_id === user?.id)
            setCurrentUserRole(myEntry?.role ?? 'viewer')
          }
        }

        await loadHistory(contentId)
      }
    }
    load()
  }, [contentId])

  async function handleSave() {
    // viewer は保存不可
    if (currentUserRole === 'viewer') {
      setToast({ message: '閲覧者は編集できません', type: 'error' })
      return
    }
    // member は approved/published を設定不可
    if (currentUserRole === 'member' && (status === 'approved' || status === 'published')) {
      setToast({ message: 'このステータスを設定する権限がありません', type: 'error' })
      return
    }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('contents').update({
      title, body, status,
      assignee_id: assigneeId || null
    }).eq('id', contentId)

    if (!error && user) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      if (membership) {
        await supabase.from('audit_logs').insert({
          organization_id: membership.organization_id,
          user_id: user.id,
          action: 'content.update',
          resource_type: 'content',
          resource_id: contentId,
          metadata: { title, status }
        })
      }
      await loadHistory(contentId)
      setToast({ message: '保存しました', type: 'success' })
    } else if (error) {
      setToast({ message: '保存に失敗しました', type: 'error' })
    }
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

    const { data: { user } } = await supabase.auth.getUser()

    const res = await fetch('/api/ai/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promptType: aiTab, body }),
    })
    const data = await res.json() as { response: string; isMock: boolean; model?: string }
    setAiResult(data.response)
    setIsMock(data.isMock)

    if (!data.isMock && user) {
      await supabase.from('ai_sessions').insert({
        content_id: contentId,
        prompt_type: aiTab,
        prompt_text: body,
        response: data.response,
        model: data.model ?? 'claude-haiku-4-5',
        status: 'completed',
        created_by: user.id,
      })
    }

    setAiLoading(false)
  }

  function applyAiResult() {
    if (aiResult) setBody((prev) => prev + '\n\n' + aiResult)
  }

  // ロールに応じた選択可能ステータス
  const allowedStatuses = useMemo(() => STATUS_BY_ROLE[currentUserRole] ?? [], [currentUserRole])
  const isReadOnly = currentUserRole === 'viewer'
  const canDelete = currentUserRole === 'admin'

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

            {/* ロール表示バナー */}
            {isReadOnly && (
              <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500 border border-slate-200">
                👁 閲覧者モード — このコンテンツは編集できません
              </div>
            )}
            {currentUserRole === 'member' && (
              <div className="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-600">
                ✏️ メンバーモード — Draft・Review のみ設定できます
              </div>
            )}

            <div className="mb-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isReadOnly}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-lg font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3">
              {isReadOnly ? (
                /* viewer はステータスを読み取り専用で表示 */
                <div className="flex items-center gap-3">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">{status}</span>
                  <ContentStatusBadge status={status} />
                </div>
              ) : (
                <>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContentStatus)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        disabled={!allowedStatuses.includes(opt.value)}
                      >
                        {opt.label}{!allowedStatuses.includes(opt.value) ? ' (権限なし)' : ''}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center">
                    <ContentStatusBadge status={status} />
                  </div>
                </>
              )}
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={isReadOnly}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">担当者未設定</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {(Array.isArray(m.profile) ? m.profile[0]?.display_name : m.profile?.display_name) ?? m.user_id}
                  </option>
                ))}
              </select>
            </div>

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
              disabled={isReadOnly}
              placeholder="コンテンツ本文を入力..."
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            />

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => router.back()}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                {isReadOnly ? '戻る' : 'キャンセル'}
              </button>
              {!isReadOnly && (
                <>
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
                </>
              )}
              {canDelete && (
                <button
                  onClick={handleDelete}
                  className="ml-auto rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  削除
                </button>
              )}
            </div>

            {/* 変更履歴 */}
            <div className="mt-6 border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-medium text-slate-500">変更履歴</p>
              {history.length === 0 ? (
                <p className="text-xs text-slate-300">履歴はまだありません</p>
              ) : (
                <div className="space-y-1 text-xs text-slate-400">
                  {history.map((h) => (
                    <p key={h.id}>
                      {(Array.isArray(h.profile) ? h.profile[0]?.display_name : h.profile?.display_name) ?? '不明'} — {h.metadata?.status ?? h.action} ({new Date(h.created_at).toLocaleDateString('ja-JP')})
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右パネル: AI提案 */}
        <div className="w-80 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-800">✨ AI改善提案</h2>

            {isMock && (
              <div className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
                モックモード（APIキー未設定）
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
