import { NextResponse } from 'next/server'

const MOCK_RESPONSES: Record<string, string> = {
  improve:
    '1. 冒頭に具体的な数値や実績を追加することで信頼性が向上します。\n2. 「厳選された素材」の具体例を示すと説得力が増します。\n3. CTAボタンの直前に、価格の優位性を明記することを推奨します。',
  summarize:
    '品質と価格のバランスを追求した商品を、熟練の職人が丁寧に仕上げています。アフターサービスも充実しており、お客様満足を第一に考えています。',
  seo: 'キーワード「高品質 商品」を含める。メタディスクリプションは120文字以内に。見出しにターゲットキーワードを含め、altテキストを最適化してください。',
  tone: '現在のトーン: フォーマル。提案: ブランドの親しみやすさを出すために、丁寧語を保ちつつも少し柔らかい表現に変更することで、読者との距離を縮められます。',
}

export async function POST(request: Request) {
  const { promptType, body } = (await request.json()) as { promptType: string; body: string }

  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 800))
    const response = MOCK_RESPONSES[promptType] ?? MOCK_RESPONSES['improve']
    return NextResponse.json({ response, model: 'mock', isMock: true })
  }

  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const promptLabels: Record<string, string> = {
    improve: 'テキストを改善してください',
    summarize: '以下のテキストを簡潔に要約してください',
    seo: 'SEO改善提案をしてください',
    tone: '文体・トーンの改善提案をしてください',
  }

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${promptLabels[promptType] ?? '改善提案をしてください'}:\n\n${body}`,
      },
    ],
  })

  const firstBlock = message.content[0]
  const response = firstBlock?.type === 'text' ? firstBlock.text : ''
  return NextResponse.json({ response, model: message.model, isMock: false })
}
