'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback?next=/reset-password`
        : '/auth/callback?next=/reset-password'

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setError('メール送信に失敗しました。メールアドレスをご確認ください。')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg text-center">
        <div className="mb-4 text-5xl">📧</div>
        <h1 className="mb-2 text-xl font-semibold text-slate-800">メールを送信しました</h1>
        <p className="mb-6 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{email}</span> に
          パスワードリセット用のリンクを送信しました。
          <br />
          メールを確認してリンクをクリックしてください。
        </p>
        <p className="text-xs text-slate-400">
          メールが届かない場合は迷惑メールフォルダをご確認ください。
        </p>
        <div className="mt-6">
          <Link href="/login" className="text-sm text-blue-500 hover:underline">
            ログインページへ戻る
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <div className="mb-8 text-center">
        <div className="mb-2 text-4xl font-bold text-blue-500">AI-PM</div>
        <h1 className="text-xl font-semibold text-slate-800">パスワードをお忘れですか？</h1>
        <p className="mt-1 text-sm text-slate-500">
          登録済みのメールアドレスを入力してください。
          <br />
          パスワードリセット用のリンクをお送りします。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            メールアドレス
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '送信中...' : 'リセットリンクを送信'}
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/login" className="text-sm text-blue-500 hover:underline">
          ログインページへ戻る
        </Link>
      </div>
    </div>
  )
}
