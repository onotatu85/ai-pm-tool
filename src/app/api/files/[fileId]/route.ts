import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type Params = { params: Promise<{ fileId: string }> }

// 署名付きダウンロード URL を取得
export async function GET(request: Request, { params }: Params) {
  const { fileId } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: fileRecord } = await supabase
    .from('project_files')
    .select('storage_path, name')
    .eq('id', fileId)
    .single()

  if (!fileRecord) {
    return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 1時間有効な署名付きURL を生成
  const { data: signedUrl, error } = await adminClient.storage
    .from('project-files')
    .createSignedUrl(fileRecord.storage_path, 3600, {
      download: fileRecord.name,
    })

  if (error || !signedUrl) {
    return NextResponse.json({ error: 'ダウンロードURLの生成に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ url: signedUrl.signedUrl })
}

// ファイル削除
export async function DELETE(request: Request, { params }: Params) {
  const { fileId } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ファイル情報とプロジェクトの組織IDを取得
  const { data: fileRecord } = await supabase
    .from('project_files')
    .select('storage_path, project_id, project:projects(organization_id)')
    .eq('id', fileId)
    .single()

  if (!fileRecord) {
    return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 })
  }

  // admin のみ削除可能
  const projectData = fileRecord.project
  const orgId = (Array.isArray(projectData)
    ? (projectData[0] as { organization_id: string } | undefined)?.organization_id
    : (projectData as { organization_id: string } | null)?.organization_id)
  if (!orgId) {
    return NextResponse.json({ error: '組織情報が取得できません' }, { status: 500 })
  }

  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', orgId)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: '管理者のみファイルを削除できます' }, { status: 403 })
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ストレージから削除
  await adminClient.storage.from('project-files').remove([fileRecord.storage_path])

  // DBから削除
  const { error: dbError } = await adminClient
    .from('project_files')
    .delete()
    .eq('id', fileId)

  if (dbError) {
    return NextResponse.json({ error: 'ファイル情報の削除に失敗しました' }, { status: 500 })
  }

  return NextResponse.json({ message: 'ファイルを削除しました' })
}
