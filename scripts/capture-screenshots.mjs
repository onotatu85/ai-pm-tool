import { chromium } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const BASE_URL = 'https://ai-pm-onotatu.vercel.app'
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots')
const EMAIL = process.env.TEST_EMAIL || ''
const PASSWORD = process.env.TEST_PASSWORD || ''

fs.mkdirSync(OUT_DIR, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()

// 1. ログイン画面
await page.goto(BASE_URL + '/login')
await page.waitForLoadState('networkidle')
await page.screenshot({ path: path.join(OUT_DIR, '01_login.png') })
console.log('✅ 01_login.png')

// 2. ログイン
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASSWORD)
await page.click('button[type="submit"]')
await page.waitForURL(url => !url.href.includes('/login'), { timeout: 15000 })
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000)

// 3. ダッシュボード
await page.screenshot({ path: path.join(OUT_DIR, '02_dashboard.png') })
console.log('✅ 02_dashboard.png')

// 4. プロジェクト詳細（UUID形式のリンクを取得）
const projectHref = await page.evaluate(() => {
  const links = Array.from(document.querySelectorAll('a[href^="/projects/"]'))
  const detail = links.find(a => /\/projects\/[0-9a-f-]{36}$/.test(a.getAttribute('href') || ''))
  return detail ? detail.getAttribute('href') : null
})
if (projectHref) {
  await page.goto(BASE_URL + projectHref)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1000)
  await page.screenshot({ path: path.join(OUT_DIR, '03_project.png') })
  console.log('✅ 03_project.png')

  // 5. コンテンツ詳細（UUID形式のリンクを取得）
  const contentHref = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="/contents/"]'))
    const detail = links.find(a => /\/contents\/[0-9a-f-]{36}$/.test(a.getAttribute('href') || ''))
    return detail ? detail.getAttribute('href') : null
  })
  if (contentHref) {
    await page.goto(BASE_URL + contentHref)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: path.join(OUT_DIR, '04_content.png') })
    console.log('✅ 04_content.png')
  } else {
    console.log('⏭ コンテンツなし（スキップ）')
  }
}

// 6. 設定画面
await page.goto(BASE_URL + '/settings')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(500)
await page.screenshot({ path: path.join(OUT_DIR, '05_settings.png') })
console.log('✅ 05_settings.png')

await browser.close()
console.log('\n🎉 完了:', OUT_DIR)
