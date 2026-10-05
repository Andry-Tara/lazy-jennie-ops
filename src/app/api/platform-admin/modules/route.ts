import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

type RpcError = {
  message: string
}

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{
    data: unknown
    error: RpcError | null
  }>
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const action =
    typeof body.action === 'string'
      ? body.action
      : ''

  const outletId =
    typeof body.outletId === 'string'
      ? body.outletId
      : ''

  if (!outletId) {
    return NextResponse.json(
      { error: 'Outlet is required.' },
      { status: 400 }
    )
  }

  const db = supabase as unknown as RpcClient

  if (action === 'change_package') {
    const packageId =
      typeof body.packageId === 'string'
        ? body.packageId
        : ''

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package is required.' },
        { status: 400 }
      )
    }

    const result = await db.rpc(
      'platform_admin_change_outlet_subscription_package',
      {
        p_outlet_id: outletId,
        p_package_id: packageId,
        p_notes:
          typeof body.notes === 'string'
            ? body.notes
            : null,
      }
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  }

  if (action === 'set_enabled') {
    const moduleCode =
      typeof body.moduleCode === 'string'
        ? body.moduleCode.trim().toUpperCase()
        : ''

    if (
      !moduleCode ||
      typeof body.enabled !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid module update.' },
        { status: 400 }
      )
    }

    const result = await db.rpc(
      'platform_admin_set_outlet_module_enabled',
      {
        p_outlet_id: outletId,
        p_module_code: moduleCode,
        p_enabled: body.enabled,
      }
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  }

  if (action === 'set_addon') {
    const moduleCode =
      typeof body.moduleCode === 'string'
        ? body.moduleCode.trim().toUpperCase()
        : ''

    if (
      !moduleCode ||
      typeof body.granted !== 'boolean'
    ) {
      return NextResponse.json(
        { error: 'Invalid add-on update.' },
        { status: 400 }
      )
    }

    const result = await db.rpc(
      'platform_admin_set_outlet_module_addon',
      {
        p_outlet_id: outletId,
        p_module_code: moduleCode,
        p_granted: body.granted,
        p_notes:
          typeof body.notes === 'string'
            ? body.notes
            : null,
      }
    )

    if (result.error) {
      return NextResponse.json(
        { error: result.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  }

  return NextResponse.json(
    { error: 'Unsupported action.' },
    { status: 400 }
  )
}
