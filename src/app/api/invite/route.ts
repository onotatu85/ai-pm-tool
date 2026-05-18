import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  let email: string, role: string, organizationId: string
  try {
    const body = (await request.json()) as { email?: string; role?: string; organizationId?: string }
    email = body.email ?? ''
    role = body.role ?? ''
    organizationId = body.organizationId ?? ''
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  if (!email || !role || !organizationId) {
    return NextResponse.json({ error: 'email, role, organizationId は必須です' }, { status: 400 })
  }

  // ログインユーザーのロールを確認（admin のみ招待可能）
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

  // 招待者が admin かチェック
  const { data: membership } = await supabase
    .from('org_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single()

  if (!membership || membership.role !== 'admin') {
    return NextResponse.json({ error: '管理者のみ招待できます' }, { status: 403 })
  }

  // すでに同じメールアドレスのメンバーが存在しないか確認
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingProfile) {
    const { data: existingMember } = await supabase
      .from('org_members')
      .select('id')
      .eq('user_id', existingProfile.id)
      .eq('organization_id', organizationId)
      .single()

    if (existingMember) {
      return NextResponse.json({ error: 'このユーザーはすでにメンバーです' }, { status: 409 })
    }
  }

  // Supabase Admin クライアントで招待メール送信
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: {
        invited_role: role,
        organization_id: organizationId,
      },
    }
  )

  if (inviteError) {
    // ユーザーがすでに存在する場合は org_members に直接追加
    if (inviteError.message.includes('already been registered') || inviteError.code === 'email_exists') {
      // 既存ユーザーをメンバーとして追加
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single()

      if (profile) {
        const { error: addError } = await adminClient
          .from('org_members')
          .insert({
            organization_id: organizationId,
            user_id: profile.id,
            role,
          })

        if (addError) {
          return NextResponse.json({ error: 'メンバー追加に失敗しました: ' + addError.message }, { status: 500 })
        }

        return NextResponse.json({ message: '既存ユーザーをメンバーとして追加しました', type: 'added' })
      }
    }

    return NextResponse.json({ error: '招待に失敗しました: ' + inviteError.message }, { status: 500 })
  }

  // 招待成功後、pending の org_member レコードを作成（確認後に実際のメンバーとなる）
  // 招待確認は Supabase Auth のコールバックで処理される
  // ここでは招待済みとして pending レコードを挿入
  if (inviteData?.user?.id) {
    const { error: memberError } = await adminClient
      .from('org_members')
      .insert({
        organization_id: organizationId,
        user_id: inviteData.user.id,
        role,
      })

    if (memberError && !memberError.message.includes('duplicate')) {
      console.warn('org_members insert warning:', memberError.message)
    }
  }

  return NextResponse.json({ message: `${email} に招待メールを送信しました`, type: 'invited' })
}
