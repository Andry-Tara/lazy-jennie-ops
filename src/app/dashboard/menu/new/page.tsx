import {
  createClient,
} from '@/lib/supabase/server'

import {
  redirect,
} from 'next/navigation'

import Link from 'next/link'

import MenuForm
  from './MenuForm'

import SalesOnlyMenuForm
  from './SalesOnlyMenuForm'


export default async function NewMenuPage() {

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
  // OUTLET APPLICATION PROFILE
  // =====================================================

  let appProfile:
    {
      profile_code:
        string

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
          profile_code,
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


  const salesOnly =
    Boolean(
      profile.outlet_id &&
      appProfile &&
      appProfile
        .inventory_enabled ===
          false
    )


  // =====================================================
  // SALES-ONLY OUTLET
  // =====================================================

  if (
    salesOnly &&
    profile.outlet_id
  ) {

    const {
      data:
        outlet,
    } =
      await supabase
        .from(
          'outlets_secure'
        )
        .select(`
          id,
          code,
          name
        `)
        .eq(
          'id',
          profile.outlet_id
        )
        .maybeSingle()


    const brandName =
      appProfile
        ?.brand_name ||
      outlet
        ?.name ||
      'Restaurant'


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
              Add Menu
            </h1>


            <p className="mt-2 text-zinc-500">
              Create menu for POS & Kitchen Display
            </p>

          </header>


          <SalesOnlyMenuForm
            outletId={
              profile.outlet_id
            }
            brandName={
              brandName
            }
          />

        </div>

      </main>
    )

  }


  // =====================================================
  // LEGACY INVENTORY/BOM OUTLET
  // =====================================================

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
            Add Menu
          </h1>


          <p className="mt-2 text-zinc-500">
            Create selling menu and inventory BOM
          </p>

        </div>


        {(itemError ||
          unitError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

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


        <MenuForm
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
