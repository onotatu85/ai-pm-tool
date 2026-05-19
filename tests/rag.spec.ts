import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('RAG / AI提案 API - 認証なし', () => {
  test('未認証で /api/ai/suggest POST すると 401 を返す', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/ai/suggest', {
      data: { promptType: 'improve', body: 'テスト本文' },
    })
    expect(res.status()).toBe(401)
  })

  test('認証なしで空の body を送ると 401 を返す（認証チェックが先行）', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/ai/suggest', {
      data: { promptType: 'improve', body: '' },
    })
    expect(res.status()).toBe(401)
  })

  test('認証なしで不正な promptType を送ると 401 を返す', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/ai/suggest', {
      data: { promptType: 'invalid', body: 'テスト' },
    })
    expect(res.status()).toBe(401)
  })
})

test.describe('RAG UI - 認証なし', () => {
  test('未ログインでコンテンツ詳細ページにアクセスするとリダイレクト', async ({ page }) => {
    await page.goto(BASE_URL + '/projects/some-id/contents/some-content-id')
    await page.waitForURL(/\/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
