import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('招待 API - 認証なし', () => {
  test('未認証で /api/invite POST すると 401 を返す', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/invite', {
      data: {
        email: 'test@example.com',
        role: 'member',
        organizationId: 'some-org-id',
      },
    })
    expect(res.status()).toBe(401)
    const body = await res.json() as { error: string }
    expect(body.error).toBeTruthy()
  })

  test('必須フィールドなしで /api/invite POST すると 400 または 401 を返す', async ({ request }) => {
    // 未認証リクエストはミドルウェアが先に 401 を返す
    // 認証済みの場合は API ルートが 400 を返す
    const res = await request.post(BASE_URL + '/api/invite', {
      data: {},
    })
    expect([400, 401]).toContain(res.status())
  })
})

test.describe('設定ページ - 招待フォーム UI', () => {
  test('未ログインで /settings にアクセスするとリダイレクト', async ({ page }) => {
    await page.goto(BASE_URL + '/settings')
    await page.waitForURL(/\/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
