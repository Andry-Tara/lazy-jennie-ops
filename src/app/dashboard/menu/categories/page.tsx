import {
  createClient,
} from '@/lib/supabase/server'

import {
  redirect,
} from 'next/navigation'

import MenuCategoriesClient
  from './MenuCategoriesClient'


export default async function MenuCategoriesPage() {

  const supabase =
    await createClient()


  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {
    redirect('/login')
  }


  const {
    data:
      profile,
  } =
    await supabase
      .from(
        'profiles'
      )
      .select(`
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
      false ||
    !profile.outlet_id
  ) {

    redirect(
      '/dashboard'
    )

  }


  const {
    data:
      appProfile,
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


  if (
    !appProfile ||
    appProfile.menu_master_enabled !==
      true ||
    appProfile.inventory_enabled !==
      false
  ) {

    redirect(
      '/dashboard/menu'
    )

  }


  const {
    data:
      outlet,
  } =
    await supabase
      .from(
        'outlets_secure'
      )
      .select(`
        code,
        name
      `)
      .eq(
        'id',
        profile.outlet_id
      )
      .maybeSingle()


  const {
    data:
      categoryRows,
    error:
      categoryError,
  } =
    await supabase
      .from(
        'menu_categories_secure'
      )
      .select(`
        id,
        outlet_id,
        code,
        name,
        sort_order,
        is_active
      `)
      .eq(
        'outlet_id',
        profile.outlet_id
      )
      .order(
        'sort_order'
      )
      .order(
        'name'
      )


  if (categoryError) {

    return (
      <main className="min-h-screen bg-zinc-100 p-8">

        <div className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          {
            categoryError.message
          }
        </div>

      </main>
    )

  }


  const {
    data:
      routes,
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


  const menuIds =
    Array.from(
      new Set(
        (
          routes ||
          []
        ).map(
          row =>
            row.menu_item_id
        )
      )
    )


  let menuRows:
    {
      id: string
      category: string | null
    }[] =
      []


  if (
    menuIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'menu_items'
        )
        .select(`
          id,
          category
        `)
        .in(
          'id',
          menuIds
        )


    menuRows =
      data ||
      []

  }


  const usageCount =
    new Map<
      string,
      number
    >()


  for (
    const menu
    of menuRows
  ) {

    const key =
      String(
        menu.category ||
        ''
      )
        .trim()
        .toLowerCase()


    if (!key) {
      continue
    }


    usageCount.set(
      key,
      (
        usageCount.get(
          key
        ) ||
        0
      ) +
      1
    )

  }


  return (
    <MenuCategoriesClient

      outletId={
        profile.outlet_id
      }

      outletCode={
        outlet?.code ||
        ''
      }

      brandName={
        appProfile.brand_name ||
        outlet?.name ||
        'Restaurant'
      }

      categories={
        (
          categoryRows ||
          []
        ).map(
          row => ({
            id:
              row.id,

            code:
              row.code,

            name:
              row.name,

            sort_order:
              Number(
                row.sort_order ||
                0
              ),

            is_active:
              Boolean(
                row.is_active
              ),

            usage_count:
              usageCount.get(
                row.name
                  .trim()
                  .toLowerCase()
              ) ||
              0,
          })
        )
      }

    />
  )
}
