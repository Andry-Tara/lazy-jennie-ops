import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import POSClient from './POSClient'

export default async function POSPage() {
  const supabase =
    await createClient()

  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // PROFILE
  // =====================================================

  const {
    data: profile,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        role_id,
        outlet_id,
        is_active
      `)
      .eq('id', user.id)
      .single()

  if (
    profile &&
    !profile.is_active
  ) {
    redirect('/dashboard')
  }

  // =====================================================
  // ROLE
  // =====================================================

  let roleCode = ''

  if (profile?.role_id) {
    const { data: role } =
      await supabase
        .from('roles')
        .select(`
          code,
          name
        `)
        .eq(
          'id',
          profile.role_id
        )
        .single()

    roleCode =
      role?.code || ''
  }

  const allowedRoles = [
    'SUPER_ADMIN',
    'MANAGEMENT',
    'OUTLET_MANAGER',
    'CASHIER',
  ]

  if (
    !allowedRoles.includes(
      roleCode
    )
  ) {
    return (
      <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

        <div className="mx-auto max-w-xl">

          <Link
            href="/dashboard"
            className="text-sm text-zinc-500"
          >
            ← Dashboard
          </Link>

          <div className="mt-8 rounded-2xl bg-white p-8 shadow-sm">

            <p className="text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-3 text-2xl font-bold">
              POS Access Restricted
            </h1>

            <p className="mt-3 text-zinc-500">
              Your current role does not have permission to use POS.
            </p>

          </div>

        </div>

      </main>
    )
  }

  // =====================================================
  // OUTLETS
  // =====================================================

  const {
    data: outletData,
    error: outletError,
  } =
    await supabase
      .from('outlets_secure')
      .select(`
        id,
        code,
        name,
        type
      `)
      .eq(
        'is_active',
        true
      )
      .order('name')

  const outlets =
    (outletData || []).map(
      (outlet) => ({
        id: outlet.id,
        code:
          outlet.code || '',
        name:
          outlet.name || '',
        type:
          outlet.type || '',
      })
    )

  // =====================================================
  // MENUS
  // =====================================================

  const {
    data: menuData,
    error: menuError,
  } =
    await supabase
      .from('menu_items')
      .select(`
        id,
        code,
        name,
        category,
        selling_price,
        low_stock_portions,
        image_url
      `)
      .eq(
        'is_active',
        true
      )
      .order('category')
      .order('name')

  const menus =
    (menuData || []).map(
      (menu) => ({
        id:
          menu.id,

        code:
          menu.code,

        name:
          menu.name,

        category:
          menu.category,

        selling_price:
          Number(
            menu.selling_price ||
              0
          ),

        low_stock_portions:
          Number(
            menu.low_stock_portions ||
              0
          ),

        image_url:
          menu.image_url || null,
      })
    )

  // =====================================================
  // DEFAULT OUTLET
  // =====================================================

  let defaultOutletId =
    ''

  if (
    profile?.outlet_id
  ) {
    defaultOutletId =
      profile.outlet_id
  } else if (
    outlets.length > 0
  ) {
    defaultOutletId =
      outlets[0].id
  }

  // =====================================================
  // OVERRIDE ACCESS
  // =====================================================

  const canOverride =
    [
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )

  // =====================================================
  // TODAY JAKARTA
  // =====================================================

  const today =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone:
          'Asia/Jakarta',

        year:
          'numeric',

        month:
          '2-digit',

        day:
          '2-digit',
      }
    ).format(
      new Date()
    )

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-[1600px]">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Point of Sale
            </h1>

            <p className="mt-2 text-zinc-500">
              Sales, Stock Consumption & Actual COGS
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/menu"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Menu Master
            </Link>

            <Link
              href="/dashboard/costing"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              COGS & Costing
            </Link>

          </div>

        </div>

        {(outletError ||
          menuError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {outletError && (
              <p>
                {outletError.message}
              </p>
            )}

            {menuError && (
              <p>
                {menuError.message}
              </p>
            )}

          </div>

        )}

        <POSClient
          outlets={outlets}
          menus={menus}
          defaultOutletId={
            defaultOutletId
          }
          today={today}
          roleCode={roleCode}
          canOverride={
            canOverride
          }
        />

      </div>

    </main>
  )
}
