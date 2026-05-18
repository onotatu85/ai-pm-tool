'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FileUpload from '@/components/FileUpload'
import FileList from '@/components/FileList'
import type { ProjectFile } from '@/lib/types'

type Props = {
  projectId: string
  organizationId: string
}

export default function ProjectFilesSection({ projectId, organizationId }: Props) {
  const supabase = createClient()
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>('viewer')
  const [open, setOpen] = useState(false)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('project_files')
      .select('*, uploader:profiles(display_name)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    if (data) setFiles(data as unknown as ProjectFile[])
    setLoading(false)
  }, [projectId, supabase])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .single()

      if (membership) setCurrentUserRole(membership.role)
      await loadFiles()
    }
    init()
  }, [organizationId, loadFiles, supabase])

  const canUpload = currentUserRole === 'admin' || currentUserRole === 'member'
  const canDelete = currentUserRole === 'admin'

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white">
      {/* ヘッダー（折りたたみ） */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">📎 ファイル</span>
          {files.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {files.length}
            </span>
          )}
        </div>
        <span className="text-slate-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {/* アップロードエリア */}
          {canUpload && (
            <div className="mb-4">
              <FileUpload projectId={projectId} onUploaded={loadFiles} />
            </div>
          )}

          {/* ファイル一覧 */}
          {loading ? (
            <p className="text-xs text-slate-400">読み込み中...</p>
          ) : (
            <FileList
              files={files}
              canDelete={canDelete}
              onDeleted={loadFiles}
            />
          )}
        </div>
      )}
    </div>
  )
}
