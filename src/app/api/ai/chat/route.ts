import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ChatMessage } from '@/lib/types'

// ============================================================
// モックレスポンス（APIキー未設定時）
// ============================================================
const MOCK_RESPONSE = `【仕様確認】
アップロードされた資料を確認しました。

この現象が**仕様通りか**を判断するには、設計書の該当セクションを参照する必要があります。
資料に記載がない場合は、設計上の考慮漏れ（バグ）の可能性があります。

【推奨対策】
1. 設計書の認証フロー図と照合する
2. 発生条件（ブラウザ・操作手順）を特定する
3. 再現手順を記録して開発チームに共有する

※ これはモックレスポンスです。APIキーを設定すると実際の資料に基づいた回答が得られます。`

// ============================================================
// システムプロンプト
// ============================================================
function buildSystemPrompt(fileContexts: { name: string; text: string }[], contentBody: string): string {
  let prompt = `あなたはソフトウェア開発プロジェクトの技術アナリストです。
以下のルールに従って回答してください。

【役割】
- 発生した現象が「仕様通りか」「設計書通りか」「バグか」を判断する
- 提供された仕様書・設計書を根拠として回答する
- 推奨される対策を具体的に提案する
- 資料に記載がない場合は「資料に記載なし」と明示する

【回答フォーマット】
1. 仕様確認: 資料のどこに該当記述があるか（または「記載なし」）
2. 判定: 仕様通り / 仕様外（バグの可能性） / 資料不足で判断不可
3. 推奨対策: 具体的な対処方法

【調査対象の現象・コンテンツ】
${contentBody || '（本文未入力）'}
`

  if (fileContexts.length > 0) {
    prompt += '\n\n【参照する仕様書・設計書】\n'
    fileContexts.forEach((f, i) => {
      prompt += `--- 資料${i + 1}: ${f.name} ---\n${f.text}\n\n`
    })
  } else {
    prompt += '\n\n【注意】参照できる資料がありません。プロジェクトファイルをアップロードして選択してください。'
  }

  return prompt
}

export async function POST(request: Request) {
  // ============================================================
  // 認証チェック
  // ============================================================
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ============================================================
  // リクエストパラメータ
  // ============================================================
  const { messages, contentBody, contentId, selectedFileIds } = (await request.json()) as {
    messages: ChatMessage[]
    contentBody: string
    contentId?: string
    selectedFileIds?: string[]
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'メッセージが必要です' }, { status: 400 })
  }

  // ============================================================
  // RAG: プロジェクトファイルのテキスト取得
  // ============================================================
  const fileContexts: { name: string; text: string }[] = []

  if (selectedFileIds && selectedFileIds.length > 0) {
    const { data: files } = await supabase
      .from('project_files')
      .select('name, extracted_text')
      .in('id', selectedFileIds)
      .not('extracted_text', 'is', null)

    if (files) {
      let totalChars = 0
      for (const f of files) {
        if (!f.extracted_text) continue
        const remaining = 8000 - totalChars
        if (remaining <= 0) break
        const text = f.extracted_text.slice(0, Math.min(2000, remaining))
        fileContexts.push({ name: f.name, text })
        totalChars += text.length
      }
    }
  } else if (contentId) {
    // selectedFileIds 未指定の場合は自動選択（後方互換）
    const { data: contentData } = await supabase
      .from('contents')
      .select('project_id')
      .eq('id', contentId)
      .single()

    if (contentData?.project_id) {
      const { data: files } = await supabase
        .from('project_files')
        .select('name, extracted_text')
        .eq('project_id', contentData.project_id)
        .not('extracted_text', 'is', null)
        .order('created_at', { ascending: false })
        .limit(5)

      if (files) {
        let totalChars = 0
        for (const f of files) {
          if (!f.extracted_text) continue
          const remaining = 8000 - totalChars
          if (remaining <= 0) break
          const text = f.extracted_text.slice(0, Math.min(2000, remaining))
          fileContexts.push({ name: f.name, text })
          totalChars += text.length
        }
      }
    }
  }

  const filesUsed = fileContexts.map((f) => f.name)
  const systemPrompt = buildSystemPrompt(fileContexts, contentBody ?? '')

  // ============================================================
  // モックモード（APIキー未設定）
  // ============================================================
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return NextResponse.json({ response: MOCK_RESPONSE, isMock: true, filesUsed })
  }

  // ============================================================
  // Claude API ストリーミング（会話履歴対応）
  // ============================================================
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = client.messages.stream({
          model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
          max_tokens: 2048,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        })

        for await (const event of aiStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({ chunk: event.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ filesUsed })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI APIエラーが発生しました'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
