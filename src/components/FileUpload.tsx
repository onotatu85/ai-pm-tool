'use client'

import { useCallback, useRef, useState } from 'react'

type Props = {
  projectId: string
  onUploaded: () => void
}

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.csv', '.pdf', '.doc', '.docx', '.json']
const MAX_SIZE_MB = 10

export default function FileUpload({ projectId, onUploaded }: Props) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useCallback(async (file: File) => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setMessage({ text: `ファイルサイズは ${MAX_SIZE_MB}MB 以下にしてください`, isError: true })
      return
    }

    setUploading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('projectId', projectId)

    try {
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json() as { file?: unknown; error?: string }

      if (res.ok) {
        setMessage({ text: `「${file.name}」をアップロードしました`, isError: false })
        onUploaded()
      } else {
        setMessage({ text: data.error ?? 'アップロードに失敗しました', isError: true })
      }
    } catch {
      setMessage({ text: 'ネットワークエラーが発生しました', isError: true })
    }

    setUploading(false)
  }, [projectId, onUploaded])

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file) uploadFile(file)
  }, [uploadFile])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-6 py-8 text-center transition ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50'
        } ${uploading ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
          disabled={uploading}
        />
        <div className="mb-2 text-2xl">{uploading ? '⏳' : '📂'}</div>
        {uploading ? (
          <p className="text-sm text-slate-500">アップロード中...</p>
        ) : (
          <>
            <p className="text-sm font-medium text-slate-600">
              クリックまたはドラッグ&ドロップでファイルを追加
            </p>
            <p className="mt-1 text-xs text-slate-400">
              {ALLOWED_EXTENSIONS.join(' / ')} · 最大 {MAX_SIZE_MB}MB
            </p>
          </>
        )}
      </div>

      {message && (
        <p className={`mt-2 text-xs ${message.isError ? 'text-red-600' : 'text-green-600'}`}>
          {message.isError ? '⚠️ ' : '✅ '}{message.text}
        </p>
      )}
    </div>
  )
}
