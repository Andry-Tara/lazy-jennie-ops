import {
  createClient,
} from '@/lib/supabase/server'

import {
  redirect,
} from 'next/navigation'

import Link from 'next/link'

import MenuPhotoUploader
  from './MenuPhotoUploader'


export default async function MenuPage() {

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
    await supabase.auth
      .getUser()


  if (!user) {
    redirect('/login')
  }


  // =====================================================
  // MENU
  // =====================================================

  const {
    data: menus,
    error: menuError,
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
        notes,
        created_at
      `)
      .order(
        'name'
      )


  // =====================================================
  // COMPONENTS
  // =====================================================

  const {
    data: components,
  } =
    await supabase
      .from(
        'menu_item_components'
      )
      .select(`
        id,
        menu_item_id,
        item_id,
        quantity,
        unit_id,
        base_qty
      `)


  // =====================================================
  // ITEMS
  // =====================================================

  const itemIds =
    Array.from(
      new Set(
        (
          components ||
          []
        ).map(
          (row) =>
            row.item_id
        )
      )
    )


  let items: {
    id: string
    sku: string
    name: string
  }[] = []


  if (
    itemIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'items'
        )
        .select(`
          id,
          sku,
          name
        `)
        .in(
          'id',
          itemIds
        )


    items =
      data || []

  }


  // =====================================================
  // UNITS
  // =====================================================

  const unitIds =
    Array.from(
      new Set(
        (
          components ||
          []
        ).map(
          (row) =>
            row.unit_id
        )
      )
    )


  let units: {
    id: string
    code: string
    name: string
  }[] = []


  if (
    unitIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'units'
        )
        .select(`
          id,
          code,
          name
        `)
        .in(
          'id',
          unitIds
        )


    units =
      data || []

  }


  // =====================================================
  // MAP
  // =====================================================

  const itemMap =
    new Map(
      items.map(
        (item) => [
          item.id,
          item,
        ]
      )
    )


  const unitMap =
    new Map(
      units.map(
        (unit) => [
          unit.id,
          unit,
        ]
      )
    )


  const componentMap =
    new Map<
      string,
      typeof components
    >()


  for (
    const row of
      components || []
  ) {

    const current =
      componentMap.get(
        row.menu_item_id
      ) || []


    current.push(
      row
    )


    componentMap.set(
      row.menu_item_id,
      current
    )

  }


  // =====================================================
  // SUMMARY
  // =====================================================

  const totalMenus =
    menus?.length ||
    0


  const activeMenus =
    (
      menus || []
    ).filter(
      (row) =>
        row.is_active
    ).length


  const inactiveMenus =
    totalMenus -
    activeMenus


  const menusWithoutBom =
    (
      menus || []
    ).filter(
      (row) =>
        (
          componentMap.get(
            row.id
          ) || []
        ).length ===
        0
    ).length


  // =====================================================
  // FORMAT
  // =====================================================

  function formatRupiah(
    value:
      number |
      string |
      null
  ) {

    return new Intl
      .NumberFormat(
        'id-ID',
        {
          style:
            'currency',

          currency:
            'IDR',

          maximumFractionDigits:
            0,
        }
      )
      .format(
        Number(
          value || 0
        )
      )

  }


  function formatQty(
    value:
      number |
      string |
      null
  ) {

    return Number(
      value || 0
    ).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits:
          4,
      }
    )

  }


  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">


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
              Menu Master
            </h1>

            <p className="mt-2 text-zinc-500">
              Selling Menu, Photo, Price & Inventory BOM
            </p>

          </div>


          <Link
            href="/dashboard/menu/new"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + Add Menu
          </Link>

        </div>


        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total Menu
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalMenus}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Active Menu
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeMenus}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Inactive Menu
            </p>

            <p className="mt-2 text-3xl font-bold text-zinc-500">
              {inactiveMenus}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Missing BOM
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                menusWithoutBom >
                0
                  ? 'text-red-700'
                  : 'text-green-700'
              }`}
            >
              {menusWithoutBom}
            </p>

          </div>

        </div>


        {menuError && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {menuError.message}

          </div>

        )}


        {/* MENU GRID */}

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

          {(menus || []).map(
            (menu) => {

              const menuComponents =
                componentMap.get(
                  menu.id
                ) || []


              return (

                <div
                  key={
                    menu.id
                  }
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >

                  {/* PHOTO */}

                  <div className="p-4">

                    <MenuPhotoUploader
                      menuItemId={
                        menu.id
                      }
                      menuName={
                        menu.name
                      }
                      currentImageUrl={
                        menu.image_url
                      }
                    />

                  </div>


                  {/* MENU INFO */}

                  <div className="border-t border-zinc-100 p-5">

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <p className="text-xs font-semibold text-zinc-400">
                          {menu.code}
                        </p>

                        <h2 className="mt-1 text-xl font-bold">
                          {menu.name}
                        </h2>

                      </div>


                      {menu.is_active ? (

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>

                      ) : (

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                          Inactive
                        </span>

                      )}

                    </div>


                    <div className="mt-4 flex items-center justify-between">

                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">

                        {menu.category ||
                          'Uncategorized'}

                      </span>


                      <p className="text-xl font-bold text-red-900">

                        {formatRupiah(
                          menu.selling_price
                        )}

                      </p>

                    </div>


                    {/* BOM */}

                    <div className="mt-5">

                      <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                        Inventory BOM
                      </p>


                      {menuComponents.length ===
                      0 ? (

                        <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                          No BOM
                        </div>

                      ) : (

                        <div className="mt-3 space-y-2">

                          {menuComponents.map(
                            (
                              component
                            ) => {

                              const item =
                                itemMap.get(
                                  component.item_id
                                )


                              const unit =
                                unitMap.get(
                                  component.unit_id
                                )


                              return (

                                <div
                                  key={
                                    component.id
                                  }
                                  className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2"
                                >

                                  <div>

                                    <p className="text-sm font-medium">
                                      {item?.name ||
                                        '-'}
                                    </p>

                                    <p className="text-[10px] text-zinc-400">
                                      {item?.sku ||
                                        ''}
                                    </p>

                                  </div>


                                  <p className="text-sm font-bold">

                                    {formatQty(
                                      component.quantity
                                    )}
                                    {' '}
                                    {unit?.code ||
                                      ''}

                                  </p>

                                </div>

                              )

                            }
                          )}

                        </div>

                      )}

                    </div>


                    <div className="mt-5 border-t border-zinc-100 pt-4">

                      <Link
                        href={`/dashboard/menu/${menu.id}/edit`}
                        className="mb-5 flex w-full items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-red-900 transition hover:bg-zinc-50"
                      >
                        Edit Menu / BOM →
                      </Link>

                      <p className="text-xs text-zinc-400">
                        Low Stock Warning
                      </p>

                      <p className="mt-1 font-bold">
                        {formatQty(
                          menu.low_stock_portions
                        )}{' '}
                        portions
                      </p>

                    </div>

                  </div>

                </div>

              )

            }
          )}

        </div>


        {!menus?.length && (

          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

            <p className="font-bold">
              No Menu Yet
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Create the first selling menu and BOM.
            </p>

            <Link
              href="/dashboard/menu/new"
              className="mt-5 inline-flex rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white"
            >
              + Add Menu
            </Link>

          </div>

        )}

      </div>

    </main>

  )

}
