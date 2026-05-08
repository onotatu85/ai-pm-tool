'use client'

import { useState } from 'react'

type SidebarTab = 'profile' | 'members' | 'security'

const MOCK_MEMBERS = [
  { name: '田中太郎', email: 'tanaka@company.com', role: 'admin', status: 'active' },
  { name: '佐藤花子', email: 'sato@company.com', role: 'member', status: 'active' },
  { name: '山田一郎', email: 'yamada@company.com', role: 'viewer', status: 'invited' },
]

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
  const [activeTab, setActiveTab] = useState<SidebarTab>('profile')
  const [displayName, setDisplayName] = useState('田中太郎')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')

  const sidebarItems: { key: SidebarTab; label: string }[] = [
    { key: 'profile', label: 'プロフィール' },
    { key: 'members', label: 'メンバー管理' },
    { key: 'security', label: 'セキュリティ' },
  ]

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold text-slate-800">設定</h1>
      <div className="flex gap-6">
        {/* サイドバー */}
        <div className="w-48 shrink-0">
          <nav className="rounded-xl border border-slate-200 bg-white p-2">
            {sidebarItems.map((item) => (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  activeTab === item.key
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white p-6">
          {activeTab === 'profile' && (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-slate-800">プロフィール設定</h2>
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-500 text-2xl font-bold text-white">
                  田
                </div>
                <button className="text-sm text-blue-500 hover:underline">変更する</button>
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
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    メールアドレス
                  </label>
                  <input
                    type="email"
                    defaultValue="tanaka@company.com"
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                </div>
                <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                  保存する
                </button>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-slate-800">メンバー管理</h2>
              <div className="mb-6 flex gap-2">
                <input
                  type="email"
                  placeholder="メールアドレスを入力..."
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="member">メンバー</option>
                  <option value="viewer">閲覧者</option>
                  <option value="admin">管理者</option>
                </select>
                <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                  招待
                </button>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="pb-3 text-left font-medium text-slate-600">名前</th>
                    <th className="pb-3 text-left font-medium text-slate-600">ロール</th>
                    <th className="pb-3 text-left font-medium text-slate-600">ステータス</th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_MEMBERS.map((member) => (
                    <tr key={member.email}>
                      <td className="py-3">
                        <p className="font-medium text-slate-800">{member.name}</p>
                        <p className="text-xs text-slate-400">{member.email}</p>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadge[member.role]}`}>
                          {member.role}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[member.status]}`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button className="text-xs text-blue-500 hover:underline">編集</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'security' && (
            <div>
              <h2 className="mb-6 text-lg font-semibold text-slate-800">セキュリティ</h2>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    新しいパスワード
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    パスワード（確認）
                  </label>
                  <input
                    type="password"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
                  パスワードを変更
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
