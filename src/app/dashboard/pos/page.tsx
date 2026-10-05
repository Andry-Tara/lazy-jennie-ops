import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import POSClient from './POSClient'
import { getRuntimeModuleOutlets } from '@/lib/saas/runtime-module-access'

export default async function POSPage() {
  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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

  const posRuntime =
    await getRuntimeModuleOutlets(
      supabase,
      'POS'
    )

  const posAllowedOutletIds =
    posRuntime.allowedOutletIds

  if (
    profile?.outlet_id &&
    !posAllowedOutletIds.includes(
      profile.outlet_id
    )
  ) {
    redirect(
      '/dashboard?denied=POS'
    )
  }

  if (
    !profile?.outlet_id &&
    posAllowedOutletIds.length === 0
  ) {
    redirect(
      '/dashboard?denied=POS'
    )
  }


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

  // =====================================================
  // RANGKA POS PROFILE BRANDING
  // =====================================================

  let appProfile:
    {
      brand_name: string | null
      inventory_enabled: boolean
      pos_enabled: boolean
    }
    | null =
      null


  if (
    profile?.outlet_id
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'outlet_app_profiles_secure'
        )
        .select(`
          brand_name,
          inventory_enabled,
          pos_enabled
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .maybeSingle()


    appProfile =
      data

  }


  const salesOnlyProfile =
    Boolean(
      appProfile &&
      appProfile.inventory_enabled ===
        false
    )


  const posBrandName =
    appProfile?.brand_name ||
    'LAZY JENNIE'


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
              {
                posBrandName.toUpperCase()
              }
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
      .in(
        'id',
        posAllowedOutletIds
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
  // SALES ONLY POS MENU SCOPE
  // =====================================================

  let menuData: any[] = []

  let menuError:
    {
      message: string
    }
    | null =
      null


  if (
    salesOnlyProfile &&
    profile?.outlet_id
  ) {

    const {
      data:
        routeRows,
      error:
        routeError,
    } =
      await supabase
        .from(
          'menu_kitchen_routes_secure'
        )
        .select(`
          menu_item_id
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .eq(
          'is_active',
          true
        )


    if (routeError) {

      menuError =
        routeError

    } else {

      const routeMenuIds =
        Array.from(
          new Set(
            (
              routeRows ||
              []
            ).map(
              row =>
                row.menu_item_id
            )
          )
        )


      if (
        routeMenuIds.length >
        0
      ) {

        const {
          data,
          error,
        } =
          await supabase
            .from(
              'menu_items'
            )
            .select(`
              id,
              code,
              name,
              category,
              selling_price,
              low_stock_portions,
              image_url
            `)
            .in(
              'id',
              routeMenuIds
            )
            .eq(
              'is_active',
              true
            )
            .order(
              'category'
            )
            .order(
              'name'
            )


        menuData =
          data ||
          []

        menuError =
          error

      }

    }

  } else {

    const {
      data,
      error,
    } =
      await supabase
        .from(
          'menu_items'
        )
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
        .order(
          'category'
        )
        .order(
          'name'
        )


    menuData =
      data ||
      []

    menuError =
      error

  }


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
  // UNIFIED ORDER TABLE MASTER
  // =====================================================

  const {
    data: restaurantTableData,
  } =
    await supabase
      .from('restaurant_tables_secure')
      .select(`
        id,
        outlet_id,
        code,
        name,
        capacity,
        status,
        is_active
      `)
      .eq('is_active', true)
      .order('code')

  const restaurantTables =
    (restaurantTableData || []).map(
      (table) => ({
        id: table.id,
        outlet_id: table.outlet_id,
        code: table.code || '',
        name: table.name || '',
        capacity: Number(
          table.capacity || 0
        ),
        status:
          table.status || '',
        is_active:
          Boolean(
            table.is_active
          ),
      })
    )


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

  const canOverride =
    [
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )

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

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              {
                posBrandName.toUpperCase()
              }
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Point of Sale
            </h1>

            <p className="mt-2 text-zinc-500">
              {
                salesOnlyProfile
                  ? 'Restaurant POS, orders & payments'
                  : 'Sales, Stock Consumption & Actual COGS'
              }
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/pos/control"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
            >
              POS Control
            </Link>

            <Link
              href="/dashboard/pos/orders"
              className="rounded-xl bg-zinc-950 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Open Orders
            </Link>

            {canOverride && (
              <Link
                href="/dashboard/pos/approvals"
                className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Approval Queue
              </Link>
            )}

            {canOverride && (
              <Link
                href="/dashboard/pos/settings"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                Discount Settings
              </Link>
            )}

            <Link
              href="/dashboard/menu"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Menu Master
            </Link>

            {!salesOnlyProfile && (

              <Link
                href="/dashboard/costing"
                className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
              >
                COGS & Costing
              </Link>

            )}

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
          restaurantTables={restaurantTables}
          defaultOutletId={
            defaultOutletId
          }
          today={today}
          roleCode={roleCode}
          canOverride={
            canOverride
          }
          salesOnlyProfile={salesOnlyProfile}
        />

      </div>

    </main>
  )
}
