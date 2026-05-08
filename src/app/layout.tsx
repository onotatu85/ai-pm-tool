import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI Project Manager',
  description: 'AIで、プロジェクト管理をスマートに',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  )
}
