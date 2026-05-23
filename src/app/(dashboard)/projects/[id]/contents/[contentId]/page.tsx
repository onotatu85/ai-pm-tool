'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentStatusBadge } from '@/components/StatusBadge'
import type { Content, ContentStatus, AiPromptType, ChatMessage } from '@/lib/types'
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
  { value: 'draft', label: '下書き' },
  { value: 'review', label: 'レビュー中' },
  { value: 'approved', label: '承認済み' },
  { value: 'published', label: '公開済み' },
]

const AI_TABS: { value: AiPromptType; label: string }[] = [
  { value: 'improve', label: '改善' },
  { value: 'summarize', label: '要約' },
  { value: 'seo', label: 'SEO' },
  { value: 'tone', label: '文体' },
]

type ActivePanel = AiPromptType | 'investigate'

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

  // AI 提案関連
  const [activePanel, setActivePanel] = useState<ActivePanel>('improve')
  const aiTab = activePanel !== 'investigate' ? activePanel : 'improve'
  const [aiResult, setAiResult] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [isMock, setIsMock] = useState(false)
  const [useProjectFiles, setUseProjectFiles] = useState(false)
  const [projectFiles, setProjectFiles] = useState<{ id: string; name: string }[]>([])
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([])
  const [filesUsed, setFilesUsed] = useState<string[]>([])

  // 技術調査チャット関連
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

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
            const myEntry = memberData.find((m) => m.user_id === user?.id)
            setCurrentUserRole(myEntry?.role ?? 'viewer')
          }
        }

        // テキスト抽出済みのプロジェクトファイル一覧を取得
        const { data: fileData } = await supabase
          .from('project_files')
          .select('id, name')
          .eq('project_id', contentData.project_id)
          .not('extracted_text', 'is', null)
          .order('created_at', { ascending: false })
        if (fileData) {
          setProjectFiles(fileData)
          // デフォルト：全ファイルを選択済みにする
          setSelectedFileIds(fileData.map((f) => f.id))
        }

        await loadHistory(contentId)
      }
    }
    load()
  }, [contentId])

  async function handleSave() {
    if (currentUserRole === 'viewer') {
      setToast({ message: '閲覧者は編集できません', type: 'error' })
      return
    }
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
    if (!body.trim()) {
      setToast({ message: 'コンテンツ本文を入力してください', type: 'error' })
      return
    }
    setAiLoading(true)
    setAiResult('')
    setFilesUsed([])
    setIsMock(false)

    const { data: { user } } = await supabase.auth.getUser()

    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promptType: aiTab,
          body,
          contentId,
          useProjectFiles: useProjectFiles && selectedFileIds.length > 0,
          selectedFileIds: useProjectFiles ? selectedFileIds : [],
        }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        setToast({ message: err.error ?? 'AI提案の生成に失敗しました', type: 'error' })
        return
      }

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        // ========== SSE ストリーミング ==========
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''
        let localFilesUsed: string[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // 完結した行を処理
          let newlineIdx: number
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx).trimEnd()
            buffer = buffer.slice(newlineIdx + 1)

            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)
            if (payload === '[DONE]') continue

            try {
              const json = JSON.parse(payload) as {
                chunk?: string
                filesUsed?: string[]
                error?: string
              }
              if (json.chunk) {
                fullText += json.chunk
                setAiResult(fullText)
              }
              if (json.filesUsed) {
                localFilesUsed = json.filesUsed
                setFilesUsed(json.filesUsed)
              }
              if (json.error) {
                setToast({ message: json.error, type: 'error' })
              }
            } catch {
              // JSON パースエラーは無視
            }
          }
        }

        // ai_sessions に記録
        if (fullText && user) {
          await supabase.from('ai_sessions').insert({
            content_id: contentId,
            prompt_type: aiTab,
            prompt_text: body,
            response: fullText,
            model: 'claude-haiku-4-5',
            status: 'completed',
            created_by: user.id,
            use_project_files: useProjectFiles && selectedFileIds.length > 0,
            files_used: localFilesUsed,
          })
        }
      } else {
        // ========== JSON レスポンス（モックモード）==========
        const data = await res.json() as {
          response: string
          isMock: boolean
          model?: string
          filesUsed?: string[]
        }
        setAiResult(data.response)
        setIsMock(data.isMock)
        if (data.filesUsed) setFilesUsed(data.filesUsed)

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
      }
    } catch {
      setToast({ message: 'ネットワークエラーが発生しました', type: 'error' })
    } finally {
      setAiLoading(false)
    }
  }

  function applyAiResult() {
    if (aiResult) setBody((prev) => prev + '\n\n' + aiResult)
  }

  // ============================================================
  // 技術調査チャット送信
  // ============================================================
  async function handleChatSend(overrideInput?: string) {
    const inputText = overrideInput ?? chatInput
    if (!inputText.trim() || chatLoading) return

    const newUserMsg: ChatMessage = { role: 'user', content: inputText.trim() }
    const newMessages = [...chatMessages, newUserMsg]
    setChatMessages(newMessages)
    setChatInput('')
    setChatLoading(true)

    // スクロールを最下部へ
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          contentBody: body,
          contentId,
          selectedFileIds: useProjectFiles ? selectedFileIds : [],
        }),
      })

      if (!res.ok) {
        const err = await res.json() as { error?: string }
        const errMsg = err.error ?? 'チャットの送信に失敗しました'
        setChatMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${errMsg}` }])
        return
      }

      const contentType = res.headers.get('content-type') ?? ''

      if (contentType.includes('text/event-stream')) {
        // SSE ストリーミング
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let fullText = ''

        // ストリーミング中のプレースホルダー
        setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }])

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          let newlineIdx: number
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIdx).trimEnd()
            buffer = buffer.slice(newlineIdx + 1)
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6)
            if (payload === '[DONE]') continue
            try {
              const json = JSON.parse(payload) as { chunk?: string; filesUsed?: string[]; error?: string }
              if (json.chunk) {
                fullText += json.chunk
                // 最後のメッセージ（アシスタント）を更新
                setChatMessages((prev) => {
                  const updated = [...prev]
                  updated[updated.length - 1] = { role: 'assistant', content: fullText }
                  return updated
                })
              }
              if (json.filesUsed) setFilesUsed(json.filesUsed)
            } catch { /* ignore */ }
          }
        }
      } else {
        // JSON レスポンス（モックモード）
        const data = await res.json() as { response: string; isMock?: boolean; filesUsed?: string[] }
        setIsMock(data.isMock ?? false)
        if (data.filesUsed) setFilesUsed(data.filesUsed)
        setChatMessages((prev) => [...prev, { role: 'assistant', content: data.response }])
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: '❌ ネットワークエラーが発生しました' }])
    } finally {
      setChatLoading(false)
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  function handleChatKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleChatSend()
    }
  }

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

            {/* 提案タイプ タブ（1行目: 改善/要約/SEO/文体）*/}
            <div className="mb-1 flex rounded-lg border border-slate-200 p-0.5">
              {AI_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setActivePanel(tab.value)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                    activePanel === tab.value
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {/* 2行目: 技術調査タブ */}
            <div className="mb-4 flex rounded-lg border border-slate-200 p-0.5">
              <button
                onClick={() => { setActivePanel('investigate'); setFilesUsed([]) }}
                className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
                  activePanel === 'investigate'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                🔍 技術調査（チャット）
              </button>
            </div>

            {/* ============================================================ */}
            {/* 技術調査（チャット）パネル */}
            {/* ============================================================ */}
            {activePanel === 'investigate' && (
              <div className="flex flex-col">
                {/* プロジェクト資料参照チェックボックス（技術調査用） */}
                <div className="mb-3">
                  <label className={`flex items-center gap-2 text-xs ${projectFiles.length === 0 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={useProjectFiles}
                      onChange={(e) => setUseProjectFiles(e.target.checked)}
                      disabled={projectFiles.length === 0}
                      className="h-3.5 w-3.5 rounded border-slate-300 accent-indigo-600"
                    />
                    <span className="font-medium text-slate-600">仕様書・設計書を参照</span>
                  </label>
                  {useProjectFiles && projectFiles.length > 0 && (
                    <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-xs text-slate-500">参照する資料を選択</span>
                        <div className="flex gap-2 text-xs text-indigo-500">
                          <button onClick={() => setSelectedFileIds(projectFiles.map((f) => f.id))} className="hover:underline">全選択</button>
                          <span className="text-slate-300">|</span>
                          <button onClick={() => setSelectedFileIds([])} className="hover:underline">全解除</button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {projectFiles.map((file) => (
                          <label key={file.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={selectedFileIds.includes(file.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedFileIds((prev) => [...prev, file.id])
                                } else {
                                  setSelectedFileIds((prev) => prev.filter((id) => id !== file.id))
                                }
                              }}
                              className="h-3 w-3 accent-indigo-600"
                            />
                            <span className="truncate text-slate-700" title={file.name}>{file.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-1.5 text-right text-xs text-slate-400">{selectedFileIds.length} / {projectFiles.length} 件選択中</p>
                    </div>
                  )}
                  {projectFiles.length === 0 && (
                    <p className="mt-1 pl-5 text-xs text-slate-400">テキスト抽出済みのファイルがありません</p>
                  )}
                </div>

                {/* クイック調査ボタン */}
                {chatMessages.length === 0 && (
                  <div className="mb-3 space-y-1.5">
                    <p className="text-xs font-medium text-slate-500">よく使う質問：</p>
                    {[
                      '仕様通りか設計書と照合してください',
                      'この現象の原因として考えられるものを教えてください',
                      '推奨される対策を教えてください',
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => void handleChatSend(q)}
                        disabled={chatLoading}
                        className="w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-left text-xs text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* チャット履歴 */}
                {chatMessages.length > 0 && (
                  <div className="mb-3 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'bg-indigo-500 text-white'
                              : 'bg-white border border-slate-200 text-slate-700'
                          }`}
                        >
                          {msg.content || (
                            <span className="inline-flex items-center gap-1 text-slate-400">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-slate-400" />
                              生成中...
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                )}

                {/* 参照した資料 */}
                {filesUsed.length > 0 && (
                  <div className="mb-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
                    📎 参照: {filesUsed.join('、')}
                  </div>
                )}

                {/* 入力エリア */}
                <div className="flex flex-col gap-1.5">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleChatKeyDown}
                    rows={2}
                    placeholder="質問を入力（Enter送信 / Shift+Enterで改行）"
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void handleChatSend()}
                      disabled={chatLoading || !chatInput.trim()}
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {chatLoading ? '送信中...' : '送信'}
                    </button>
                    {chatMessages.length > 0 && (
                      <button
                        onClick={() => { setChatMessages([]); setFilesUsed([]) }}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50"
                        title="会話をリセット"
                      >
                        リセット
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* 通常の AI 改善提案パネル */}
            {/* ============================================================ */}
            {activePanel !== 'investigate' && (
              <div>

            {/* プロジェクト資料参照チェックボックス */}
            <div className="mb-4">
              <label className={`flex items-center gap-2 text-xs ${projectFiles.length === 0 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={useProjectFiles}
                  onChange={(e) => setUseProjectFiles(e.target.checked)}
                  disabled={projectFiles.length === 0}
                  className="h-3.5 w-3.5 rounded border-slate-300 accent-blue-500"
                />
                <span className="font-medium text-slate-600">プロジェクト資料を参照</span>
              </label>

              {/* ファイル個別選択リスト */}
              {useProjectFiles && projectFiles.length > 0 && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs text-slate-500">参照するファイルを選択</span>
                    <div className="flex gap-2 text-xs text-blue-500">
                      <button
                        onClick={() => setSelectedFileIds(projectFiles.map((f) => f.id))}
                        className="hover:underline"
                      >
                        全選択
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => setSelectedFileIds([])}
                        className="hover:underline"
                      >
                        全解除
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {projectFiles.map((file) => (
                      <label key={file.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-slate-100">
                        <input
                          type="checkbox"
                          checked={selectedFileIds.includes(file.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFileIds((prev) => [...prev, file.id])
                            } else {
                              setSelectedFileIds((prev) => prev.filter((id) => id !== file.id))
                            }
                          }}
                          className="h-3 w-3 accent-blue-500"
                        />
                        <span className="truncate text-slate-700" title={file.name}>
                          {file.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-right text-xs text-slate-400">
                    {selectedFileIds.length} / {projectFiles.length} 件選択中
                  </p>
                </div>
              )}

              {projectFiles.length === 0 && (
                <p className="mt-1 pl-5 text-xs text-slate-400">
                  テキスト抽出済みのファイルがありません
                </p>
              )}
            </div>

            {/* ファイルが1件も選択されていない場合の警告 */}
            {useProjectFiles && selectedFileIds.length === 0 && (
              <p className="mb-2 text-xs text-amber-600">
                ⚠ ファイルを1件以上選択してください
              </p>
            )}

            {/* AI提案生成ボタン */}
            <button
              onClick={handleAiSuggest}
              disabled={aiLoading || !body.trim() || (useProjectFiles && selectedFileIds.length === 0)}
              className="mb-4 w-full rounded-lg bg-blue-500 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {aiLoading ? '生成中...' : 'AI提案を生成'}
            </button>

            {/* ストリーミング中のインジケーター */}
            {aiLoading && aiResult && (
              <div className="mb-1 flex items-center gap-1 text-xs text-blue-500">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                生成中...
              </div>
            )}

            {/* 提案結果 */}
            {aiResult && (
              <div className="mb-3 rounded-lg bg-blue-50 p-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                {aiResult}
              </div>
            )}

            {/* 参照したファイル表示 */}
            {filesUsed.length > 0 && (
              <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                📎 参照した資料: {filesUsed.join('、')}
              </div>
            )}

            {/* 適用・却下ボタン */}
            {aiResult && !aiLoading && (
              <div className="flex items-center gap-2">
                <button
                  onClick={applyAiResult}
                  className="flex-1 rounded-lg border border-slate-300 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  本文に適用
                </button>
                <button
                  onClick={() => { setAiResult(''); setFilesUsed([]) }}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  却下
                </button>
              </div>
            )}
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
