import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ============================================================
// モックレスポンス（APIキー未設定時）
// ============================================================
const MOCK_RESPONSES: Record<string, string> = {
  improve:
    '1. 冒頭に具体的な数値や実績を追加することで信頼性が向上します。\n2. 「厳選された素材」の具体例を示すと説得力が増します。\n3. CTAボタンの直前に、価格の優位性を明記することを推奨します。',
  summarize:
    '品質と価格のバランスを追求した商品を、熟練の職人が丁寧に仕上げています。アフターサービスも充実しており、お客様満足を第一に考えています。',
  seo: 'キーワード「高品質 商品」を含める。メタディスクリプションは120文字以内に。見出しにターゲットキーワードを含め、altテキストを最適化してください。',
  tone: '現在のトーン: フォーマル。提案: ブランドの親しみやすさを出すために、丁寧語を保ちつつも少し柔らかい表現に変更することで、読者との距離を縮められます。',
}

// ============================================================
// 提案タイプ別の指示
// ============================================================
const PROMPT_INSTRUCTIONS: Record<string, string> = {
  improve:
    '以下のコンテンツを改善してください。文章品質・構成・読みやすさの観点で具体的な改善提案を3点挙げてください。',
  summarize:
    '以下のコンテンツを3〜5文で簡潔に要約してください。',
  seo:
    '以下のコンテンツのSEO改善提案をしてください。キーワード・見出し・構成・メタディスクリプションの観点で具体的に提案してください。',
  tone:
    '以下のコンテンツの文体・トーンを改善してください。読者に親しみやすく、かつプロフェッショナルなトーンへの具体的な変換提案をしてください。',
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
  // リクエストパラメータ検証
  // ============================================================
  const { promptType, body, contentId, useProjectFiles } = (await request.json()) as {
    promptType: string
    body: string
    contentId?: string
    useProjectFiles?: boolean
  }

  if (!body?.trim()) {
    return NextResponse.json({ error: 'コンテンツ本文を入力してください' }, { status: 400 })
  }

  const validTypes = ['improve', 'summarize', 'seo', 'tone']
  if (!validTypes.includes(promptType)) {
    return NextResponse.json({ error: '不正な提案タイプです' }, { status: 400 })
  }

  // ============================================================
  // RAG: プロジェクトファイルのテキスト取得
  // ============================================================
  const fileContexts: { name: string; text: string }[] = []

  if (useProjectFiles && contentId) {
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
        .limit(3)

      if (files) {
        let totalChars = 0
        for (const f of files) {
          if (!f.extracted_text) continue
          const remaining = 6000 - totalChars
          if (remaining <= 0) break
          const text = f.extracted_text.slice(0, Math.min(2000, remaining))
          fileContexts.push({ name: f.name, text })
          totalChars += text.length
        }
      }
    }
  }

  const filesUsed = fileContexts.map((f) => f.name)

  // ============================================================
  // モックモード（APIキー未設定）
  // ============================================================
  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const response = MOCK_RESPONSES[promptType] ?? MOCK_RESPONSES['improve']
    return NextResponse.json({ response, model: 'mock', isMock: true, filesUsed })
  }

  // ============================================================
  // システムプロンプト構築（RAGコンテキスト付加）
  // ============================================================
  let systemPrompt = 'あなたはプロの日本語コピーライターです。'
  if (fileContexts.length > 0) {
    systemPrompt +=
      '\n以下のプロジェクト資料を参考にして、コンテンツの改善提案を行ってください。\n\n【プロジェクト参照資料】\n'
    fileContexts.forEach((f, i) => {
      systemPrompt += `--- 資料${i + 1}: ${f.name} ---\n${f.text}\n\n`
    })
  }

  const instruction = PROMPT_INSTRUCTIONS[promptType] ?? PROMPT_INSTRUCTIONS['improve']
  const userMessage = `${instruction}\n\n【編集対象コンテンツ】\n${body}`

  // ============================================================
  // Claude API ストリーミング呼び出し
  // ============================================================
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = client.messages.stream({
          model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
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

        // 参照ファイル情報を末尾に送信
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
