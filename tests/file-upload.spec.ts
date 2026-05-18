import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

test.describe('ファイルアップロード API - 認証なし', () => {
  test('未認証で /api/files/upload POST すると 401 を返す', async ({ request }) => {
    const res = await request.post(BASE_URL + '/api/files/upload', {
      multipart: {
        file: {
          name: 'test.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from('test content'),
        },
        projectId: 'some-project-id',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('未認証で /api/files/:id GET すると 401 を返す', async ({ request }) => {
    const res = await request.get(BASE_URL + '/api/files/some-file-id')
    expect(res.status()).toBe(401)
  })

  test('未認証で /api/files/:id DELETE すると 401 を返す', async ({ request }) => {
    const res = await request.delete(BASE_URL + '/api/files/some-file-id')
    expect(res.status()).toBe(401)
  })
})

test.describe('ファイルアップロード UI - 認証なし', () => {
  test('未ログインで /projects/:id にアクセスするとリダイレクト', async ({ page }) => {
    await page.goto(BASE_URL + '/projects/some-project-id')
    await page.waitForURL(/\/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
