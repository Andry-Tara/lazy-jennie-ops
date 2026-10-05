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

  const outletId =
    typeof body.outletId === 'string'
      ? body.outletId
      : ''

  const packageId =
    typeof body.packageId === 'string'
      ? body.packageId
      : ''

  const startsOn =
    typeof body.startsOn === 'string'
      ? body.startsOn
      : ''

  const durationMonths =
    Number(body.durationMonths)

  const notes =
    typeof body.notes === 'string'
      ? body.notes
      : null

  if (
    !outletId ||
    !packageId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) ||
    !Number.isInteger(durationMonths) ||
    durationMonths < 1 ||
    durationMonths > 36
  ) {
    return NextResponse.json(
      { error: 'Invalid subscription input.' },
      { status: 400 }
    )
  }

  const db = supabase as unknown as RpcClient

  const result = await db.rpc(
    'platform_admin_create_outlet_subscription',
    {
      p_outlet_id: outletId,
      p_package_id: packageId,
      p_starts_on: startsOn,
      p_duration_months: durationMonths,
      p_notes: notes,
    }
  )

  if (result.error) {
    return NextResponse.json(
      { error: result.error.message },
      { status: 400 }
    )
  }

  const rows =
    Array.isArray(result.data)
      ? result.data
      : []

  return NextResponse.json(
    {
      subscription:
        rows[0] ?? null,
    },
    { status: 201 }
  )
}
