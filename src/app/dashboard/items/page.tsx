import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

export default async function ItemsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: permissionData } = await supabase.rpc(
    'get_my_permissions'
  )

  const permissions = (permissionData || []) as PermissionRow[]

  const masterItemPermission = permissions.find(
    (row) => row.module_code === 'MASTER_ITEM'
  )

  const canCreate = Boolean(
    masterItemPermission?.can_create
  )

  const canViewCost = permissions.some(
    (row) =>
      row.can_view === true &&
      [
        'PURCHASING',
        'INVENTORY_VALUATION',
        'COSTING',
      ].includes(row.module_code)
  )

  const {
    data: items,
    error,
  } = await supabase
    .from('items_secure')
    .select(`
      id,
      sku,
      name,
      category_id,
      item_type,
      base_unit_id,
      purchase_unit_id,
      minimum_stock,
      reorder_qty,
      standard_cost,
      last_cost,
      is_purchasable,
      is_sellable,
      track_batch,
      track_expiry,
      is_active,
      created_at
    `)
    .order('name')

  const { data: categories } = await supabase
    .from('item_categories_secure')
    .select(`
      id,
      code,
      name
    `)

  const { data: units } = await supabase
    .from('units_secure')
    .select(`
      id,
      code,
      name,
      symbol
    `)

  const categoryMap = new Map(
    (categories || []).map((row) => [
      row.id,
      row,
    ])
  )

  const unitMap = new Map(
    (units || []).map((row) => [
      row.id,
      row,
    ])
  )

  const activeCount =
    (items || []).filter(
      (item) => item.is_active
    ).length

  const wipCount =
    (items || []).filter(
      (item) =>
        item.item_type === 'WIP'
    ).length

  const finishedCount =
    (items || []).filter(
      (item) =>
        item.item_type === 'FINISHED_GOOD'
    ).length

  function formatNumber(
    value: number | string | null
  ) {
    return Number(value || 0).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits: 3,
      }
    )
  }

  function formatRupiah(
    value: number | string | null
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(Number(value || 0))
  }

  function itemTypeLabel(
    type: string
  ) {
    if (type === 'RAW_MATERIAL') {
      return 'Raw Material'
    }

    if (type === 'WIP') {
      return 'WIP'
    }

    if (type === 'FINISHED_GOOD') {
      return 'Finished Good'
    }

    if (type === 'PACKAGING') {
      return 'Packaging'
    }

    if (type === 'CONSUMABLE') {
      return 'Consumable'
    }

    return type
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

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
              Master Item
            </h1>

            <p className="mt-2 text-zinc-500">
              Raw Material, WIP, Finished Goods & Inventory Items
            </p>
          </div>

          {canCreate && (
            <Link
              href="/dashboard/items/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
            >
              + Add Item
            </Link>
          )}

        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Total Items
            </p>

            <p className="mt-2 text-3xl font-bold">
              {items?.length || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Active
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              WIP
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-700">
              {wipCount}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Finished Goods
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-700">
              {finishedCount}
            </p>
          </div>

        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">
            <h2 className="font-bold">
              Item List
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Inventory master data
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    SKU
                  </th>

                  <th className="px-5 py-4">
                    Item
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4">
                    Type
                  </th>

                  <th className="px-5 py-4">
                    Base Unit
                  </th>

                  <th className="px-5 py-4">
                    Purchase Unit
                  </th>

                  <th className="px-5 py-4 text-right">
                    Min Stock
                  </th>

                  {canViewCost && (
                    <th className="px-5 py-4 text-right">
                      Last Cost
                    </th>
                  )}

                  <th className="px-5 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(items || []).map((item) => {

                  const category =
                    categoryMap.get(
                      item.category_id
                    )

                  const baseUnit =
                    unitMap.get(
                      item.base_unit_id
                    )

                  const purchaseUnit =
                    item.purchase_unit_id
                      ? unitMap.get(
                          item.purchase_unit_id
                        )
                      : null

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-50"
                    >

                      <td className="px-5 py-4 font-bold text-red-900">
                        {item.sku}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {item.name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-1">

                          {item.is_purchasable && (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                              Purchase
                            </span>
                          )}

                          {item.is_sellable && (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                              Sell
                            </span>
                          )}

                          {item.track_expiry && (
                            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                              Expiry
                            </span>
                          )}

                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {category?.name || '-'}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold">
                          {itemTypeLabel(
                            item.item_type
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {baseUnit?.code || '-'}
                      </td>

                      <td className="px-5 py-4">
                        {purchaseUnit?.code || '-'}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatNumber(
                          item.minimum_stock
                        )}
                      </td>

                      {canViewCost && (
                        <td className="px-5 py-4 text-right font-semibold">
                          {formatRupiah(
                            item.last_cost
                          )}
                        </td>
                      )}

                      <td className="px-5 py-4">

                        {item.is_active ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                            Inactive
                          </span>
                        )}

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

            {!items?.length && (
              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Item Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Create your first inventory item.
                </p>

              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
