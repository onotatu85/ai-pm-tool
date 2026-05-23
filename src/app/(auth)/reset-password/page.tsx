'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

function PasswordStrength({ password }: { password: string }) {
  const strength =
    password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3
  const labels = ['', '弱', '中', '強']
  const colors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-green-400']
  return (
    <div className="mt-1 flex items-center gap-2">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? colors[strength] : 'bg-slate-200'}`}
          />
        ))}
      </div>
      {strength > 0 && <span className="text-xs text-slate-500">{labels[strength]}</span>}
    </div>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('パスワードが一致しません')
      return
    }
    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('パスワードの更新に失敗しました。リンクの有効期限が切れている可能性があります。')
      setLoading(false)
      return
    }

    // 更新成功 → ダッシュボードへ
    router.push('/?message=password_updated')
    router.refresh()
  }

  return (
    <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
      <div className="mb-8 text-center">
        <div className="mb-2 text-4xl font-bold text-blue-500">AI-PM</div>
        <h1 className="text-xl font-semibold text-slate-800">新しいパスワードを設定</h1>
        <p className="mt-1 text-sm text-slate-500">8文字以上の新しいパスワードを入力してください</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">新しいパスワード</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <PasswordStrength password={password} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            パスワード（確認）
          </label>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          {confirmPassword && password !== confirmPassword && (
            <p className="mt-1 text-xs text-red-500">パスワードが一致しません</p>
          )}
          {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
            <p className="mt-1 text-xs text-green-500">✓ パスワードが一致しています</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-blue-500 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? '更新中...' : 'パスワードを更新する'}
        </button>
      </form>
    </div>
  )
}
