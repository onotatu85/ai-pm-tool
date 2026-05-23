'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DeleteProjectButton({ projectId }: { projectId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm('このプロジェクトを削除しますか？\nコンテンツも含めてすべて削除されます。この操作は元に戻せません。')) return

    setDeleting(true)

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)

    setDeleting(false)

    if (error) {
      alert('削除に失敗しました。権限を確認してください。')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={deleting}
      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {deleting ? '削除中...' : '削除'}
    </button>
  )
}
