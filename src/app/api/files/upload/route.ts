import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ALLOWED_MIME_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/pdf',
  'application/json',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request: Request) {
  // 認証チェック
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

  // フォームデータを取得
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'フォームデータが不正です' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const projectId = formData.get('projectId') as string | null

  if (!file || !projectId) {
    return NextResponse.json({ error: 'file と projectId は必須です' }, { status: 400 })
  }

  // ファイルバリデーション
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'ファイルサイズは 10MB 以下にしてください' }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: '対応していないファイル形式です。テキスト・PDF・Word・CSV・JSON のみ対応しています' },
      { status: 400 }
    )
  }

  // プロジェクトへのアクセス権確認
  const { data: project } = await supabase
    .from('projects')
    .select('id, organization_id')
    .eq('id', projectId)
    .single()

  if (!project) {
    return NextResponse.json({ error: 'プロジェクトが見つかりません' }, { status: 404 })
  }

  // viewer は投稿不可
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', project.organization_id)
    .single()

  if (!membership || membership.role === 'viewer') {
    return NextResponse.json({ error: 'ファイルをアップロードする権限がありません' }, { status: 403 })
  }

  // Admin クライアントでストレージにアップロード
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ストレージバケットが存在しない場合は作成
  const { data: buckets } = await adminClient.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.id === 'project-files')
  if (!bucketExists) {
    await adminClient.storage.createBucket('project-files', {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE,
    })
  }

  // ユニークなパスでアップロード
  const fileExt = file.name.split('.').pop() ?? ''
  const uniqueName = `${crypto.randomUUID()}${fileExt ? '.' + fileExt : ''}`
  const storagePath = `${project.organization_id}/${projectId}/${uniqueName}`

  const arrayBuffer = await file.arrayBuffer()
  const { error: uploadError } = await adminClient.storage
    .from('project-files')
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json({ error: 'ストレージへのアップロードに失敗しました: ' + uploadError.message }, { status: 500 })
  }

  // テキストファイルの場合は本文を抽出
  let extractedText: string | null = null
  if (file.type === 'text/plain' || file.type === 'text/markdown' || file.type === 'text/csv') {
    try {
      extractedText = await file.text()
      // 最大 50,000 文字に制限
      if (extractedText.length > 50000) {
        extractedText = extractedText.slice(0, 50000) + '\n...(以下省略)'
      }
    } catch {
      // テキスト抽出失敗は無視
    }
  }

  // project_files テーブルに記録
  const { data: fileRecord, error: dbError } = await adminClient
    .from('project_files')
    .insert({
      project_id: projectId,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      size_bytes: file.size,
      extracted_text: extractedText,
      uploaded_by: user.id,
    })
    .select('*')
    .single()

  if (dbError) {
    // DBへの保存失敗時はストレージのファイルも削除
    await adminClient.storage.from('project-files').remove([storagePath])
    return NextResponse.json({ error: 'ファイル情報の保存に失敗しました: ' + dbError.message }, { status: 500 })
  }

  return NextResponse.json({ file: fileRecord }, { status: 201 })
}
