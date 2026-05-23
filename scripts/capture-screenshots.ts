/**
 * README 用スクリーンショット取得スクリプト
 * 実行: npx tsx scripts/capture-screenshots.ts
 */
import { chromium } from 'playwright'
import * as fs from 'fs'
import * as path from 'path'

const BASE_URL = 'https://ai-pm-onotatu.vercel.app'
const OUT_DIR = path.join(process.cwd(), 'docs', 'screenshots')
const EMAIL = process.env.TEST_EMAIL || 'evidence-test@ai-pm-tool.test'
const PASSWORD = process.env.TEST_PASSWORD || ''

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()

  // 1. ログイン画面
  await page.goto(BASE_URL + '/login')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT_DIR, '01_login.png'), fullPage: false })
  console.log('✅ 01_login.png')

  // 2. ログイン
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 })
  await page.waitForLoadState('networkidle')

  // 3. ダッシュボード（プロジェクト一覧）
  await page.screenshot({ path: path.join(OUT_DIR, '02_dashboard.png'), fullPage: false })
  console.log('✅ 02_dashboard.png')

  // 4. プロジェクト詳細（最初のプロジェクトをクリック）
  const firstProject = page.locator('a[href^="/projects/"]').first()
  if (await firstProject.isVisible()) {
    await firstProject.click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: path.join(OUT_DIR, '03_project.png'), fullPage: false })
    console.log('✅ 03_project.png')

    // 5. コンテンツ詳細（最初のコンテンツをクリック）
    const firstContent = page.locator('a[href*="/contents/"]').first()
    if (await firstContent.isVisible()) {
      await firstContent.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: path.join(OUT_DIR, '04_content.png'), fullPage: false })
      console.log('✅ 04_content.png')
    }
  }

  // 6. 設定画面
  await page.goto(BASE_URL + '/settings')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: path.join(OUT_DIR, '05_settings.png'), fullPage: false })
  console.log('✅ 05_settings.png')

  await browser.close()
  console.log('\n🎉 スクリーンショット取得完了:', OUT_DIR)
}

main().catch(console.error)
