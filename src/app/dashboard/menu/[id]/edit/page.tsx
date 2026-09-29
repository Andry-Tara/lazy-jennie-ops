import {
  createClient,
} from '@/lib/supabase/server'

import {
  redirect,
  notFound,
} from 'next/navigation'

import Link from 'next/link'

import EditMenuForm
  from './EditMenuForm'

import SalesOnlyEditMenuForm
  from './SalesOnlyEditMenuForm'


type PageProps = {
  params: Promise<{
    id: string
  }>
}


export default async function EditMenuPage({
  params,
}: PageProps) {

  const {
    id,
  } =
    await params


  const supabase =
    await createClient()


  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {
    redirect('/login')
  }


  // =====================================================
  // PROFILE
  // =====================================================

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        'profiles'
      )
      .select(`
        id,
        outlet_id,
        is_active
      `)
      .eq(
        'id',
        user.id
      )
      .maybeSingle()


  if (
    !profile ||
    profile.is_active ===
      false
  ) {
    redirect('/dashboard')
  }


  // =====================================================
  // APP PROFILE
  // =====================================================

  let appProfile:
    {
      brand_name:
        string

      inventory_enabled:
        boolean

      menu_master_enabled:
        boolean
    }
    | null =
      null


  if (
    profile.outlet_id
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
          menu_master_enabled
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .maybeSingle()


    appProfile =
      data

  }


  if (
    appProfile &&
    appProfile
      .menu_master_enabled ===
        false
  ) {

    redirect(
      '/dashboard'
    )

  }


  // =====================================================
  // MENU
  // =====================================================

  const {
    data:
      menu,
    error:
      menuError,
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
        image_url,
        is_active,
        notes
      `)
      .eq(
        'id',
        id
      )
      .single()


  if (
    menuError ||
    !menu
  ) {
    notFound()
  }


  // =====================================================
  // SALES-ONLY OUTLET
  // =====================================================

  const salesOnly =
    Boolean(
      profile.outlet_id &&
      appProfile &&
      appProfile
        .inventory_enabled ===
          false
    )


  if (
    salesOnly &&
    profile.outlet_id
  ) {

    const {
      data:
        route,
      error:
        routeError,
    } =
      await supabase
        .from(
          'menu_kitchen_routes_secure'
        )
        .select(`
          station,
          is_active
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .eq(
          'menu_item_id',
          id
        )
        .maybeSingle()


    if (
      routeError ||
      !route
    ) {
      notFound()
    }


    const brandName =
      appProfile
        ?.brand_name ||
      'Restaurant'


    const station =
      String(
        route.station ||
        'KITCHEN'
      ).toUpperCase() ===
      'BAR'
        ? 'BAR' as const
        : 'KITCHEN' as const


    return (
      <main className="min-h-screen bg-zinc-100 p-8 text-zinc-950">

        <div className="mx-auto max-w-5xl">

          <header className="mb-8">

            <Link
              href="/dashboard/menu"
              className="text-sm font-semibold text-zinc-500 hover:text-red-800"
            >
              ← Menu Master
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              {
                brandName
              }
            </p>


            <h1 className="mt-2 text-3xl font-black">
              Edit Menu
            </h1>


            <p className="mt-2 text-zinc-500">
              Update menu for POS & Kitchen Display
            </p>

          </header>


          <SalesOnlyEditMenuForm
            outletId={
              profile.outlet_id
            }
            brandName={
              brandName
            }
            initialStation={
              station
            }
            initialActive={
              Boolean(
                route.is_active
              )
            }
            menu={{
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

              image_url:
                menu.image_url,

              notes:
                menu.notes,
            }}
          />

        </div>

      </main>
    )

  }


  // =====================================================
  // LEGACY INVENTORY / BOM
  // =====================================================

  const {
    data:
      components,
    error:
      componentError,
  } =
    await supabase
      .from(
        'menu_item_components'
      )
      .select(`
        id,
        item_id,
        quantity,
        unit_id,
        notes
      `)
      .eq(
        'menu_item_id',
        id
      )
      .order(
        'created_at'
      )


  const {
    data:
      items,
    error:
      itemError,
  } =
    await supabase
      .from(
        'items_secure'
      )
      .select(`
        id,
        sku,
        name,
        item_type,
        base_unit_id
      `)
      .eq(
        'is_active',
        true
      )
      .order(
        'name'
      )


  const {
    data:
      units,
    error:
      unitError,
  } =
    await supabase
      .from(
        'units_secure'
      )
      .select(`
        id,
        code,
        name
      `)
      .order(
        'code'
      )


  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-6xl">

        <div className="mb-8">

          <Link
            href="/dashboard/menu"
            className="text-sm text-zinc-500 hover:text-red-800"
          >
            ← Menu Master
          </Link>


          <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>


          <h1 className="mt-2 text-3xl font-bold">
            Edit Menu
          </h1>


          <p className="mt-2 text-zinc-500">
            Update Selling Price, Status & Inventory BOM
          </p>

        </div>


        {(componentError ||
          itemError ||
          unitError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {componentError && (
              <p>
                {
                  componentError.message
                }
              </p>
            )}


            {itemError && (
              <p>
                {
                  itemError.message
                }
              </p>
            )}


            {unitError && (
              <p>
                {
                  unitError.message
                }
              </p>
            )}

          </div>

        )}


        <EditMenuForm

          menu={{
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
              menu.image_url,

            is_active:
              menu.is_active,

            notes:
              menu.notes,
          }}


          components={
            (components || []).map(
              (
                row
              ) => ({
                id:
                  row.id,

                item_id:
                  row.item_id,

                quantity:
                  Number(
                    row.quantity ||
                    0
                  ),

                unit_id:
                  row.unit_id,

                notes:
                  row.notes,
              })
            )
          }


          items={
            items ||
            []
          }


          units={
            units ||
            []
          }

        />

      </div>

    </main>
  )
}
