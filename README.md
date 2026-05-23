# AI Project Manager

AIを活用したプロジェクト・コンテンツ管理SaaSツール

🔗 **デモ**: [https://ai-pm-onotatu.vercel.app](https://ai-pm-onotatu.vercel.app)

---

## 概要

チームのコンテンツ制作ワークフローをAIでサポートするプロジェクト管理ツールです。
プロジェクト・コンテンツの管理から、Claude AIによる文章改善提案・技術調査まで一貫して行えます。

---

## 主な機能

### プロジェクト・コンテンツ管理
- プロジェクトの作成・編集・削除
- コンテンツのステータス管理（下書き / レビュー中 / 承認済み / 公開済み）
- メンバー招待・ロール管理（admin / member / viewer）
- ファイルアップロード・管理（PDF・画像など）

### AI機能（Claude API）
- **AI改善提案**: コンテンツの文章を改善・要約・SEO最適化・文体変換
- **RAG参照**: アップロードしたファイルをAIが参照して提案精度を向上
- **技術調査チャット**: プロジェクトに関する技術的な質問をAIと対話

### 認証・セキュリティ
- メール・パスワード認証
- パスワードリセット
- RLS（Row Level Security）によるデータ保護
- ロール別のステータス遷移制限

---

## 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フロントエンド | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| バックエンド | Next.js API Routes, Supabase |
| データベース | PostgreSQL (Supabase) |
| 認証 | Supabase Auth |
| ストレージ | Supabase Storage |
| AI | Anthropic Claude API (claude-haiku-4-5) |
| デプロイ | Vercel |
| テスト | Playwright (E2Eテスト) |

---

## ローカル開発環境のセットアップ

### 前提条件
- Node.js 18以上
- pnpm
- Supabaseアカウント
- Anthropic APIキー

### 手順

```bash
# リポジトリのクローン
git clone https://github.com/onotatu85/ai-pm-tool.git
cd ai-pm-tool

# 依存パッケージのインストール
pnpm install

# 環境変数の設定
cp .env.example .env.local
# .env.local を編集して各種APIキーを設定

# 開発サーバーの起動
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### 環境変数

`.env.example` を参照してください。必要な変数は以下の通りです：

| 変数名 | 説明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名キー |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase サービスロールキー |
| `ANTHROPIC_API_KEY` | Anthropic Claude API キー |

---

## ライセンス

MIT
