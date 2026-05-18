'use client'

import { useState } from 'react'
import type { ProjectFile } from '@/lib/types'

type Props = {
  files: ProjectFile[]
  canDelete: boolean
  onDeleted: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string): string {
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.startsWith('text/')) return '📝'
  if (mimeType.includes('word')) return '📋'
  if (mimeType === 'application/json') return '🔧'
  return '📎'
}

export default function FileList({ files, canDelete, onDeleted }: Props) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  async function handleDownload(fileId: string, fileName: string) {
    setDownloading(fileId)
    try {
      const res = await fetch(`/api/files/${fileId}`)
      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        const a = document.createElement('a')
        a.href = data.url
        a.download = fileName
        a.click()
      } else {
        alert(data.error ?? 'ダウンロードに失敗しました')
      }
    } catch {
      alert('ネットワークエラーが発生しました')
    }
    setDownloading(null)
  }

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`「${fileName}」を削除しますか？この操作は取り消せません。`)) return
    setDeleting(fileId)
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' })
      if (res.ok) {
        onDeleted()
      } else {
        const data = await res.json() as { error?: string }
        alert(data.error ?? '削除に失敗しました')
      }
    } catch {
      alert('ネットワークエラーが発生しました')
    }
    setDeleting(null)
  }

  if (files.length === 0) {
    return (
      <p className="text-xs text-slate-400">まだファイルがありません</p>
    )
  }

  return (
    <div className="divide-y divide-slate-100">
      {files.map((file) => (
        <div key={file.id} className="flex items-center gap-3 py-2.5">
          <span className="text-xl">{fileIcon(file.mime_type)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400">
              {formatBytes(file.size_bytes)} ·{' '}
              {new Date(file.created_at).toLocaleDateString('ja-JP')} ·{' '}
              {(Array.isArray(file.uploader) ? file.uploader[0]?.display_name : file.uploader?.display_name) ?? '不明'}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => handleDownload(file.id, file.name)}
              disabled={downloading === file.id}
              className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading === file.id ? '...' : '⬇ DL'}
            </button>
            {canDelete && (
              <button
                onClick={() => handleDelete(file.id, file.name)}
                disabled={deleting === file.id}
                className="rounded border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
              >
                {deleting === file.id ? '...' : '削除'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
