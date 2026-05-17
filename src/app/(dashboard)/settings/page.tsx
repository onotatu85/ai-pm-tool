'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type SidebarTab = 'profile' | 'members' | 'security'

const roleBadge: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
}

const statusBadge: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  invited: 'bg-yellow-100 text-yellow-700',
}

export default function SettingsPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<SidebarTab>('profile')

  // プロフィール
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // パスワード変更
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // メンバー（モック）
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setEmail(user.email ?? '')
      const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
      if (data) setDisplayName(data.display_name ?? '')
    }
    loadProfile()
  }, [])

  async function handleProfileSave() {
    setProfileSaving(true)
    setProfileMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id)
    setProfileSaving(false)
    setProfileMsg(error ? '保存に失敗しました' : '保存しました')
    setTimeout(() => setProfileMsg(''), 3000)
  }

  async function handlePasswordChange() {
    if (!newPassword) { setPasswordMsg('新しいパスワードを入力してください'); return }
    if (newPassword !== confirmPassword) { setPasswordMsg('パスワードが一致しません'); return }
    if (newPassword.length < 6) { setPasswordMsg('パスワードは6文字以上で入力してください'); return }
    setPasswordSaving(true)
    setPasswordMsg('')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)
    if (error) {
      setPasswordMsg('変更に失敗しました')
    } else {
      setPasswordMsg('パスワードを変更しました')
      setNewPassword('')
      setConfirmPassword('')
    }
    setTimeout(() => setPasswordMsg(''), 3000)
  }

  const sidebarItems: { key: SidebarTab; label: string }[] = [
    { key: 'profile', label: 'プロフィール' },
    { key: 'members', label: 'メンバー管理' },
    { key: 'security', label: 'セキュリティ' },
  ]

  const initial = displayName ? displayName.charAt(0) : '?'

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-800">設定</h1>
      <div className="flex gap-6">
        <div className="w-48 shrink-0">
          <nav className="rounded-xl border border-slate-200 bg-white p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  activeTab === item.key ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-slate-800">プロフィール設定</h2>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
                  {initial}
                </div>
              </div>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">表示名</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">メールアドレス</label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                </div>
                {profileMsg && (
                  <p className={`text-sm ${profileMsg.includes('失敗') ? 'text-red-600' : 'text-green-600'}`}>
                    {profileMsg}
                  </p>
                )}
                <button
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {profileSaving ? '保存中...' : '保存する'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-slate-800">メンバー管理</h2>
              <div className="mb-4 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                メンバー招待機能は近日公開予定です
              </div>
              <div className="mb-6 flex gap-2 opacity-50">
                <input
                  type="email"
                  placeholder="メールアドレスを入力..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  disabled
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="member">メンバー</option>
                  <option value="viewer">閲覧者</option>
                  <option value="admin">管理者</option>
                </select>
                <button disabled className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white">
                  招待
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="pb-3 text-left font-medium text-slate-600">名前</th>
                    <th className="pb-3 text-left font-medium text-slate-600">ロール</th>
                    <th className="pb-3 text-left font-medium text-slate-600">ステータス</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-3">
                      <p className="font-medium text-slate-800">{displayName || '—'}</p>
                      <p className="text-xs text-slate-400">{email}</p>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge.admin}`}>
                        admin
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge.active}`}>
                        active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-slate-800">セキュリティ</h2>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">新しいパスワード</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">パスワード（確認）</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {passwordMsg && (
                  <p className={`text-sm ${passwordMsg.includes('失敗') || passwordMsg.includes('一致') || passwordMsg.includes('以上') ? 'text-red-600' : 'text-green-600'}`}>
                    {passwordMsg}
                  </p>
                )}
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordSaving}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                >
                  {passwordSaving ? '変更中...' : 'パスワードを変更'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
