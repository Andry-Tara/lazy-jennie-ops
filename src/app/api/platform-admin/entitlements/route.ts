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

type OutletRow = {
  id: string
  company_code: string
  company_name: string
  code: string
  name: string
}

export async function GET(
  request: Request
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        error: 'Authentication required.',
      },
      {
        status: 401,
      }
    )
  }

  const db =
    supabase as unknown as RpcClient

  const url = new URL(request.url)

  const outletCode =
    url.searchParams
      .get('outlet')
      ?.trim()

  const companyCode =
    url.searchParams
      .get('company')
      ?.trim()

  if (!outletCode) {
    return NextResponse.json(
      {
        error:
          'Query parameter outlet is required.',
      },
      {
        status: 400,
      }
    )
  }

  /*
   * Reuse reviewed Platform Admin RPC.
   * This also guarantees that this
   * diagnostic endpoint is Platform Admin only.
   */
  const outletsResult =
    await db.rpc(
      'platform_admin_list_outlets'
    )

  if (outletsResult.error) {
    return NextResponse.json(
      {
        error:
          outletsResult.error.message,
      },
      {
        status: 403,
      }
    )
  }

  const outlets: OutletRow[] =
    Array.isArray(outletsResult.data)
      ? (outletsResult.data as OutletRow[])
      : []

  const matches =
    outlets.filter(
      (outlet) =>
        outlet.code === outletCode &&
        (
          !companyCode ||
          outlet.company_code ===
            companyCode
        )
    )

  if (matches.length === 0) {
    return NextResponse.json(
      {
        error: 'Outlet not found.',
      },
      {
        status: 404,
      }
    )
  }

  if (matches.length > 1) {
    return NextResponse.json(
      {
        error:
          'Outlet code is ambiguous. Add company query parameter.',
      },
      {
        status: 409,
      }
    )
  }

  const outlet = matches[0]

  const matrixResult =
    await db.rpc(
      'platform_admin_get_outlet_entitlement_matrix',
      {
        p_outlet_id: outlet.id,
      }
    )

  if (matrixResult.error) {
    return NextResponse.json(
      {
        error:
          matrixResult.error.message,
      },
      {
        status: 400,
      }
    )
  }

  return NextResponse.json({
    mode: 'SHADOW',
    enforcement: false,

    outlet: {
      id: outlet.id,
      code: outlet.code,
      name: outlet.name,
      companyCode:
        outlet.company_code,
      companyName:
        outlet.company_name,
    },

    entitlements:
      Array.isArray(
        matrixResult.data
      )
        ? matrixResult.data
        : [],
  })
}
