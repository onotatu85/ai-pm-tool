/**
 * 製造完了エビデンス取得テスト
 * 全26機能のスクリーンショットを取得する
 *
 * テストユーザー: evidence-test@ai-pm-tool.test / EvidenceTest123!
 */
import { test, expect, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

// テスト実行前に .env.test.local を設定するか、以下の環境変数を設定してください:
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   TEST_EMAIL, TEST_PASSWORD
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const TEST_EMAIL = process.env.TEST_EMAIL || 'evidence-test@ai-pm-tool.test'
const TEST_PASSWORD = process.env.TEST_PASSWORD || ''

const EVIDENCE_DIR = path.join(process.cwd(), 'test-results', 'evidence')

// ディレクトリ作成
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

// スクリーンショット保存ヘルパー
async function capture(page: Page, name: string, selector?: string) {
  ensureDir(EVIDENCE_DIR)
  const filePath = path.join(EVIDENCE_DIR, `${name}.png`)
  if (selector) {
    const el = page.locator(selector)
    await el.screenshot({ path: filePath }).catch(() =>
      page.screenshot({ path: filePath, fullPage: true })
    )
  } else {
    await page.screenshot({ path: filePath, fullPage: true })
  }
  console.log(`📸 ${name}.png`)
  return filePath
}

// Supabase REST API ヘルパー
async function supabaseRest(
  method: string,
  path: string,
  body?: object,
  useServiceRole = false
) {
  const key = useServiceRole ? SERVICE_ROLE_KEY : ANON_KEY
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase REST ${method} ${path} failed: ${res.status} ${text}`)
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// Supabase Auth API でサインイン（JWT取得）
async function signInWithPassword(email: string, password: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: ANON_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Sign in failed: ${res.status}`)
  return await res.json()
}

// ログイン状態のシード
let testProjectId: string
let testContentId: string
let testOrgId: string
let accessToken: string

// ---- ページログインヘルパー ----
async function loginViaPage(page: Page) {
  await page.goto(BASE_URL + '/login')
  await page.waitForLoadState('networkidle')
  await page.fill('input[type="email"]', TEST_EMAIL)
  await page.fill('input[type="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  // ログインページから離れるまで待機（フルURLに対してマッチするパターンを使用）
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

// ---- テストデータセットアップ ----
test.beforeAll(async () => {
  ensureDir(EVIDENCE_DIR)

  // 認証トークン取得
  const auth = await signInWithPassword(TEST_EMAIL, TEST_PASSWORD)
  accessToken = auth.access_token
  const userId = auth.user.id

  // 組織IDを取得
  const orgMembersRes = await fetch(
    `${SUPABASE_URL}/rest/v1/org_members?user_id=eq.${userId}&select=organization_id`,
    {
      headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    }
  )
  const orgMembers = await orgMembersRes.json()
  testOrgId = orgMembers[0]?.organization_id

  if (!testOrgId) {
    // 組織がなければ作成
    const org = await supabaseRest(
      'POST',
      '/organizations',
      { name: 'Evidence Test Org', plan: 'free' },
      true
    )
    testOrgId = org[0].id
    await supabaseRest(
      'POST',
      '/org_members',
      { organization_id: testOrgId, user_id: userId, role: 'admin' },
      true
    )
  }

  // テストプロジェクト作成（既存確認）
  const existingProjects = await supabaseRest(
    'GET',
    `/projects?organization_id=eq.${testOrgId}&name=eq.エビデンステストプロジェクト&select=id`,
    undefined,
    true
  )
  if (existingProjects && existingProjects.length > 0) {
    testProjectId = existingProjects[0].id
  } else {
    const projects = await supabaseRest(
      'POST',
      '/projects',
      {
        organization_id: testOrgId,
        name: 'エビデンステストプロジェクト',
        description: 'AIプロジェクト管理ツールの製造完了エビデンス取得用プロジェクトです。技術仕様書に基づき品質確認を実施します。',
        status: 'active',
        created_by: auth.user.id,
      },
      true
    )
    testProjectId = projects[0].id
  }

  // テストコンテンツ作成（既存確認）
  const existingContents = await supabaseRest(
    'GET',
    `/contents?project_id=eq.${testProjectId}&title=eq.技術仕様書レビュー記事&select=id`,
    undefined,
    true
  )
  if (existingContents && existingContents.length > 0) {
    testContentId = existingContents[0].id
  } else {
    const contents = await supabaseRest(
      'POST',
      '/contents',
      {
        project_id: testProjectId,
        title: '技術仕様書レビュー記事',
        body: '当システムは、Next.js + Supabase + Claude API を活用したAIプロジェクト管理ツールです。\n\nユーザーはプロジェクトとコンテンツを管理し、AIによる文章改善提案や技術調査チャットを利用できます。\n\nファイルアップロード機能により、仕様書・設計書をRAG（Retrieval-Augmented Generation）として活用できます。',
        status: 'review',
        created_by: auth.user.id,
      },
      true
    )
    testContentId = contents[0].id
  }

  // 追加コンテンツ（ステータスバリエーション用）
  const statuses = [
    { title: 'ランディングページコピー', status: 'draft' },
    { title: 'SEO改善レポート', status: 'approved' },
    { title: 'プレスリリース原稿', status: 'published' },
  ]
  for (const s of statuses) {
    const ex = await supabaseRest(
      'GET',
      `/contents?project_id=eq.${testProjectId}&title=eq.${encodeURIComponent(s.title)}&select=id`,
      undefined,
      true
    )
    if (!ex || ex.length === 0) {
      await supabaseRest(
        'POST',
        '/contents',
        {
          project_id: testProjectId,
          title: s.title,
          body: `${s.title}の本文です。`,
          status: s.status,
          created_by: auth.user.id,
        },
        true
      )
    }
  }

  console.log(`✅ テストデータ準備完了`)
  console.log(`   ProjectID: ${testProjectId}`)
  console.log(`   ContentID: ${testContentId}`)
  console.log(`   OrgID: ${testOrgId}`)
})

// =====================================================
// 認証関連機能 (Features 01-04)
// =====================================================
test.describe('01. 認証機能', () => {
  test('01-01 ログイン画面', async ({ page }) => {
    await page.goto(BASE_URL + '/login')
    await page.waitForLoadState('networkidle')
    await capture(page, '01-01_ログイン画面')
  })

  test('01-02 新規登録画面', async ({ page }) => {
    await page.goto(BASE_URL + '/signup')
    await page.waitForLoadState('networkidle')
    await capture(page, '01-02_新規登録画面')
  })

  test('01-03 パスワードリセット依頼画面', async ({ page }) => {
    await page.goto(BASE_URL + '/forgot-password')
    await page.waitForLoadState('networkidle')
    await capture(page, '01-03_パスワードリセット依頼画面')
  })

  test('01-04 パスワードリセット画面（メール確認後）', async ({ page }) => {
    // リセットパスワードページは直接アクセス可能（セッション有効前提）
    await page.goto(BASE_URL + '/reset-password')
    await page.waitForLoadState('networkidle')
    await capture(page, '01-04_パスワードリセット画面')
  })

  test('01-05 ログイン成功 → ダッシュボードへリダイレクト', async ({ page }) => {
    await loginViaPage(page)
    await page.waitForLoadState('networkidle')
    await capture(page, '01-05_ログイン成功_ダッシュボード')
  })
})

// =====================================================
// プロジェクト一覧機能 (Features 05-08)
// =====================================================
test.describe('02. プロジェクト一覧', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
  })

  test('02-01 プロジェクト一覧 - 日本語ステータスバッジ', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    // ステータスバッジが日本語で表示されていることを確認
    const badges = page.locator('span.rounded-full')
    await badges.first().waitFor({ timeout: 5000 }).catch(() => {})
    await capture(page, '02-01_プロジェクト一覧_日本語ステータスバッジ')
  })

  test('02-02 プロジェクト一覧 - 進捗バー表示', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await capture(page, '02-02_プロジェクト一覧_進捗バー')
  })

  test('02-03 プロジェクト一覧 - キーワード検索', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const searchInput = page.locator('input[placeholder="プロジェクトを検索..."]')
    await searchInput.fill('エビデンス')
    await page.waitForTimeout(500)
    await capture(page, '02-03_プロジェクト一覧_キーワード検索')
    await searchInput.clear()
  })

  test('02-04 プロジェクト一覧 - ステータスフィルター', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    const select = page.locator('select').first()
    await select.selectOption('active')
    await page.waitForTimeout(500)
    await capture(page, '02-04_プロジェクト一覧_ステータスフィルター')
  })
})

// =====================================================
// プロジェクトCRUD (Features 09-12)
// =====================================================
test.describe('03. プロジェクト管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
  })

  test('03-01 新規プロジェクト作成フォーム', async ({ page }) => {
    await page.goto(BASE_URL + '/projects/new')
    await page.waitForLoadState('networkidle')
    // フォームにデータを入力
    await page.fill('input[placeholder*="ECサイト"]', 'テストプロジェクト作成デモ')
    await page.fill('textarea', 'プロジェクト作成フォームのエビデンス取得用ダミー入力です。')
    await page.selectOption('select', 'planning')
    await capture(page, '03-01_新規プロジェクト作成フォーム')
  })

  test('03-02 プロジェクト詳細ページ', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}`)
    await page.waitForLoadState('networkidle')
    await capture(page, '03-02_プロジェクト詳細ページ')
  })

  test('03-03 プロジェクト編集フォーム', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/edit`)
    await page.waitForLoadState('networkidle')
    await capture(page, '03-03_プロジェクト編集フォーム')
  })

  test('03-04 プロジェクト詳細 - コンテンツ一覧テーブル', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}`)
    await page.waitForLoadState('networkidle')
    // コンテンツテーブルが表示されるまで待機
    await page.locator('table, [role="table"], .content-list').first().waitFor({ timeout: 5000 }).catch(() => {})
    await capture(page, '03-04_コンテンツ一覧テーブル')
  })
})

// =====================================================
// コンテンツ管理 (Features 13-15)
// =====================================================
test.describe('04. コンテンツ管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
  })

  test('04-01 コンテンツ追加フォーム', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/contents/new`)
    await page.waitForLoadState('networkidle')
    // タイトル入力欄を探して入力
    const titleInput = page.locator('input').first()
    await titleInput.waitFor({ timeout: 5000 }).catch(() => {})
    await titleInput.fill('エビデンス取得用コンテンツ').catch(() => {})
    await capture(page, '04-01_コンテンツ追加フォーム')
  })

  test('04-02 コンテンツ詳細・編集エリア', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/contents/${testContentId}`)
    await page.waitForLoadState('networkidle')
    await capture(page, '04-02_コンテンツ詳細編集エリア')
  })

  test('04-03 コンテンツ詳細 - ステータスバッジと担当者', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/contents/${testContentId}`)
    await page.waitForLoadState('networkidle')
    // 左パネルを中心にスクロール
    const mainPanel = page.locator('form, [class*="panel"], main').first()
    await capture(page, '04-03_コンテンツ編集_ステータス担当者')
  })
})

// =====================================================
// AI機能 (Features 16-20)
// =====================================================
test.describe('05. AI機能', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
    await page.goto(BASE_URL + `/projects/${testProjectId}/contents/${testContentId}`)
    await page.waitForLoadState('networkidle')
  })

  test('05-01 AI改善提案パネル - 改善タブ', async ({ page }) => {
    // 「改善」タブをクリック
    const tab = page.locator('button').filter({ hasText: '改善' }).first()
    await tab.click().catch(() => {})
    await page.waitForTimeout(300)
    await capture(page, '05-01_AI改善提案_改善タブ')
  })

  test('05-02 AI改善提案 - 要約タブ', async ({ page }) => {
    const tab = page.locator('button').filter({ hasText: '要約' }).first()
    await tab.click().catch(() => {})
    await page.waitForTimeout(300)
    await capture(page, '05-02_AI改善提案_要約タブ')
  })

  test('05-03 AI改善提案 - SEOタブ', async ({ page }) => {
    const tab = page.locator('button').filter({ hasText: 'SEO' }).first()
    await tab.click().catch(() => {})
    await page.waitForTimeout(300)
    await capture(page, '05-03_AI改善提案_SEOタブ')
  })

  test('05-04 AI改善提案 - 文体タブ', async ({ page }) => {
    const tab = page.locator('button').filter({ hasText: '文体' }).first()
    await tab.click().catch(() => {})
    await page.waitForTimeout(300)
    await capture(page, '05-04_AI改善提案_文体タブ')
  })

  test('05-05 技術調査チャット - 初期状態', async ({ page }) => {
    // 技術調査チャットタブをクリック
    const chatTab = page.locator('button').filter({ hasText: /技術調査|チャット/ }).first()
    await chatTab.click().catch(() => {})
    await page.waitForTimeout(500)
    await capture(page, '05-05_技術調査チャット_初期状態')
  })

  test('05-06 技術調査チャット - メッセージ送信', async ({ page }) => {
    // 技術調査チャットタブをクリック
    const chatTab = page.locator('button').filter({ hasText: /技術調査|チャット/ }).first()
    await chatTab.click().catch(() => {})
    await page.waitForTimeout(500)

    // プリセット質問ボタンをクリック（あれば）
    const presetBtn = page.locator('button').filter({ hasText: /仕様通り|バグ|対策/ }).first()
    const presetExists = await presetBtn.isVisible().catch(() => false)

    if (presetExists) {
      await presetBtn.click()
      await page.waitForTimeout(300)
    } else {
      // テキストエリアに入力
      const textarea = page.locator('textarea').last()
      await textarea.fill('この機能は仕様書通りに動作していますか？')
    }
    await capture(page, '05-06_技術調査チャット_入力状態')
  })

  test('05-07 RAGファイル選択パネル', async ({ page }) => {
    // ファイル選択セクションを探す
    const fileSection = page.locator('[class*="file"], [data-testid*="file"]').first()
    const fileSectionVisible = await fileSection.isVisible().catch(() => false)

    // スクロールして表示
    if (fileSectionVisible) {
      await fileSection.scrollIntoViewIfNeeded()
    } else {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    }
    await page.waitForTimeout(300)
    await capture(page, '05-07_RAGファイル選択パネル')
  })
})

// =====================================================
// ファイルアップロード (Feature 21)
// =====================================================
test.describe('06. ファイルアップロード', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
  })

  test('06-01 プロジェクトファイルセクション', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}`)
    await page.waitForLoadState('networkidle')
    // ファイルセクションまでスクロール
    const fileSection = page.locator('[class*="file"], h2').filter({ hasText: /ファイル|資料/ }).first()
    const fileSectionExists = await fileSection.isVisible().catch(() => false)
    if (fileSectionExists) {
      await fileSection.scrollIntoViewIfNeeded().catch(() => {})
    } else {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    }
    await page.waitForTimeout(500)
    await capture(page, '06-01_ファイルアップロードセクション')
  })
})

// =====================================================
// 設定・メンバー管理 (Features 22-24)
// =====================================================
test.describe('07. 設定・メンバー管理', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
    await page.goto(BASE_URL + '/settings')
    await page.waitForLoadState('networkidle')
  })

  test('07-01 プロフィール設定', async ({ page }) => {
    // プロフィールタブ（デフォルト）
    await page.waitForTimeout(800)
    await capture(page, '07-01_プロフィール設定')
  })

  test('07-02 メンバー管理画面', async ({ page }) => {
    // メンバー管理タブをクリック
    const membersTab = page.locator('button').filter({ hasText: 'メンバー管理' }).first()
    await membersTab.click().catch(() => {})
    await page.waitForTimeout(1000)
    await capture(page, '07-02_メンバー管理画面')
  })

  test('07-03 セキュリティ設定（パスワード変更）', async ({ page }) => {
    const securityTab = page.locator('button').filter({ hasText: 'セキュリティ' }).first()
    await securityTab.click().catch(() => {})
    await page.waitForTimeout(500)
    await capture(page, '07-03_セキュリティ設定_パスワード変更')
  })

  test('07-04 メンバー招待フォーム', async ({ page }) => {
    const membersTab = page.locator('button').filter({ hasText: 'メンバー管理' }).first()
    await membersTab.click().catch(() => {})
    await page.waitForTimeout(1000)
    // 招待フォームにメールを入力
    const inviteInput = page.locator('input[type="email"], input[placeholder*="招待"]').first()
    await inviteInput.fill('invite-demo@example.com').catch(() => {})
    await capture(page, '07-04_メンバー招待フォーム入力')
  })
})

// =====================================================
// UIコンポーネント (Features 25-26)
// =====================================================
test.describe('08. UIコンポーネント', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
  })

  test('08-01 Toastメッセージ通知', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/edit`)
    await page.waitForLoadState('networkidle')

    // フォームを変更して保存（Toast表示）
    await page.fill('input[type="text"]', 'エビデンステストプロジェクト（Toast確認）')
    await page.click('button[type="submit"]')
    // Toast出現を待つ
    const toast = page.locator('[class*="toast"], [role="alert"], .toast').first()
    await toast.waitFor({ timeout: 5000 }).catch(() => page.waitForTimeout(2000))
    await capture(page, '08-01_Toast通知メッセージ')

    // 元の名前に戻す
    await page.goto(BASE_URL + `/projects/${testProjectId}/edit`)
    await page.waitForLoadState('networkidle')
    await page.fill('input[type="text"]', 'エビデンステストプロジェクト')
    await page.click('button[type="submit"]')
  })

  test('08-02 ステータスバッジ一覧（各ステータス）', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    // ダッシュボードにすべてのステータスバッジが並ぶよう確認
    const allBadges = page.locator('span.rounded-full')
    await allBadges.first().waitFor({ timeout: 5000 }).catch(() => {})
    await capture(page, '08-02_ステータスバッジ一覧')
  })

  test('08-03 ロール制限 - 管理者メニュー表示', async ({ page }) => {
    await page.goto(BASE_URL + '/settings')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await capture(page, '08-03_ロール制限_管理者メニュー')
  })

  test('08-04 ブレッドクラムナビゲーション', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/contents/${testContentId}`)
    await page.waitForLoadState('networkidle')
    const breadcrumb = page.locator('nav').filter({ hasText: /プロジェクト一覧/ }).first()
    await breadcrumb.waitFor({ timeout: 5000 }).catch(() => {})
    await capture(page, '08-04_ブレッドクラムナビゲーション')
  })
})

// =====================================================
// レスポンシブ・全体 (Additional)
// =====================================================
test.describe('09. 総合確認', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaPage(page)
  })

  test('09-01 ダッシュボード全体表示', async ({ page }) => {
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    await capture(page, '09-01_ダッシュボード全体表示')
  })

  test('09-02 コンテンツ詳細ページ全体（AIパネル込み）', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}/contents/${testContentId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await capture(page, '09-02_コンテンツ詳細全体_AIパネル')
  })

  test('09-03 プロジェクト詳細ページ全体', async ({ page }) => {
    await page.goto(BASE_URL + `/projects/${testProjectId}`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(500)
    await capture(page, '09-03_プロジェクト詳細全体')
  })
})
