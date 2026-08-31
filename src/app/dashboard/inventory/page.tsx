import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SearchParams = Promise<{
  outlet?: string
  search?: string
  status?: string
}>

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params =
    await searchParams

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
  // PERMISSIONS
  // =====================================================

  const {
    data: permissionData,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )

  const permissions =
    permissionData || []

  function canView(
    moduleCode: string
  ) {
    return permissions.some(
      (row: {
        module_code: string
        can_view: boolean
      }) =>
        row.module_code ===
          moduleCode &&
        row.can_view === true
    )
  }

  // =====================================================
  // INVENTORY
  // =====================================================

  let query =
    supabase
      .from(
        'inventory_stock_secure'
      )
      .select(`
        outlet_id,
        outlet_code,
        outlet_name,
        outlet_type,
        item_id,
        sku,
        item_name,
        item_type,
        category_code,
        category_name,
        base_unit_code,
        base_unit_symbol,
        stock_qty,
        minimum_stock,
        stock_status
      `)
      .order('outlet_name')
      .order('item_name')

  if (params.outlet) {
    query =
      query.eq(
        'outlet_id',
        params.outlet
      )
  }

  const {
    data: inventory,
    error,
  } =
    await query

  // =====================================================
  // OUTLET OPTIONS
  // =====================================================

  const outletMap =
    new Map<
      string,
      {
        id: string
        code: string
        name: string
      }
    >()

  for (
    const row of
      inventory || []
  ) {
    if (
      !outletMap.has(
        row.outlet_id
      )
    ) {
      outletMap.set(
        row.outlet_id,
        {
          id:
            row.outlet_id,

          code:
            row.outlet_code,

          name:
            row.outlet_name,
        }
      )
    }
  }

  // =====================================================
  // FILTER CLIENT-SIDE RESULT
  // =====================================================

  const search =
    (
      params.search ||
      ''
    )
      .trim()
      .toLowerCase()

  const statusFilter =
    params.status ||
    ''

  const filtered =
    (inventory || []).filter(
      (row) => {
        const matchesSearch =
          !search ||
          row.sku
            ?.toLowerCase()
            .includes(search) ||
          row.item_name
            ?.toLowerCase()
            .includes(search) ||
          row.category_name
            ?.toLowerCase()
            .includes(search)

        const derivedStatus =
          Number(
            row.stock_qty || 0
          ) <= 0
            ? 'OUT_OF_STOCK'
            : Number(
                  row.minimum_stock || 0
                ) > 0 &&
                Number(
                  row.stock_qty || 0
                ) <=
                  Number(
                    row.minimum_stock || 0
                  )
              ? 'LOW_STOCK'
              : 'AVAILABLE'

        const matchesStatus =
          !statusFilter ||
          derivedStatus ===
            statusFilter

        return (
          matchesSearch &&
          matchesStatus
        )
      }
    )

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalItems =
    filtered.length

  const available =
    filtered.filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) > 0 &&
        (
          Number(
            row.minimum_stock || 0
          ) <= 0 ||
          Number(
            row.stock_qty || 0
          ) >
            Number(
              row.minimum_stock || 0
            )
        )
    ).length

  const lowStock =
    filtered.filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) > 0 &&
        Number(
          row.minimum_stock || 0
        ) > 0 &&
        Number(
          row.stock_qty || 0
        ) <=
          Number(
            row.minimum_stock || 0
          )
    ).length

  const outOfStock =
    filtered.filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) <= 0
    ).length

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
              Inventory
            </h1>

            <p className="mt-2 text-zinc-500">
              Current Stock by Authorized Location
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/inventory/movements"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold"
            >
              Stock Movement
            </Link>

            {canView(
              'STOCK_OPNAME'
            ) && (
              <Link
                href="/dashboard/inventory/opname"
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold"
              >
                Stock Opname
              </Link>
            )}

            {canView(
              'INVENTORY_VALUATION'
            ) && (
              <Link
                href="/dashboard/inventory/valuation"
                className="rounded-xl bg-red-900 px-4 py-3 text-sm font-semibold text-white"
              >
                Inventory Valuation
              </Link>
            )}

          </div>

        </div>

        {/* FILTER */}

        <form
          method="get"
          className="mb-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4"
        >

          <div>

            <label className="mb-2 block text-sm font-semibold">
              Search
            </label>

            <input
              name="search"
              defaultValue={
                params.search || ''
              }
              placeholder="SKU / item / category"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold">
              Location
            </label>

            <select
              name="outlet"
              defaultValue={
                params.outlet || ''
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="">
                All Authorized Locations
              </option>

              {Array.from(
                outletMap.values()
              ).map(
                (outlet) => (
                  <option
                    key={
                      outlet.id
                    }
                    value={
                      outlet.id
                    }
                  >
                    {outlet.code}
                    {' - '}
                    {outlet.name}
                  </option>
                )
              )}

            </select>

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold">
              Stock Status
            </label>

            <select
              name="status"
              defaultValue={
                statusFilter
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="">
                All Status
              </option>

              <option value="AVAILABLE">
                Available
              </option>

              <option value="LOW_STOCK">
                Low Stock
              </option>

              <option value="OUT_OF_STOCK">
                Out of Stock
              </option>

            </select>

          </div>

          <div className="flex items-end">

            <button
              type="submit"
              className="w-full rounded-xl bg-zinc-900 px-5 py-3 font-bold text-white"
            >
              Apply Filter
            </button>

          </div>

        </form>

        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Inventory Lines
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalItems}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Available
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {available}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Low Stock
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {lowStock}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Out of Stock
            </p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {outOfStock}
            </p>
          </div>

        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>
                  <th className="px-5 py-4">
                    Location
                  </th>
                  <th className="px-5 py-4">
                    Inventory Item
                  </th>
                  <th className="px-5 py-4">
                    Category
                  </th>
                  <th className="px-5 py-4">
                    Type
                  </th>
                  <th className="px-5 py-4 text-right">
                    Stock
                  </th>
                  <th className="px-5 py-4 text-right">
                    Minimum
                  </th>
                  <th className="px-5 py-4">
                    Status
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {filtered.map(
                  (row) => {

                    const qty =
                      Number(
                        row.stock_qty || 0
                      )

                    const min =
                      Number(
                        row.minimum_stock || 0
                      )

                    const status =
                      qty <= 0
                        ? 'OUT_OF_STOCK'
                        : min > 0 &&
                            qty <= min
                          ? 'LOW_STOCK'
                          : 'AVAILABLE'

                    return (
                      <tr
                        key={`${row.outlet_id}-${row.item_id}`}
                      >

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {row.outlet_name}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {row.outlet_code}
                          </p>

                        </td>

                        <td className="px-5 py-4">

                          <p className="font-bold">
                            {row.item_name}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {row.sku}
                          </p>

                        </td>

                        <td className="px-5 py-4">
                          {row.category_name ||
                            '-'}
                        </td>

                        <td className="px-5 py-4">
                          {row.item_type}
                        </td>

                        <td className="px-5 py-4 text-right text-lg font-bold">

                          {formatQty(
                            row.stock_qty
                          )}
                          {' '}
                          {row.base_unit_symbol ||
                            row.base_unit_code}

                        </td>

                        <td className="px-5 py-4 text-right">

                          {formatQty(
                            row.minimum_stock
                          )}
                          {' '}
                          {row.base_unit_symbol ||
                            row.base_unit_code}

                        </td>

                        <td className="px-5 py-4">

                          {status ===
                          'AVAILABLE' ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                              AVAILABLE
                            </span>
                          ) : status ===
                            'LOW_STOCK' ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                              OUT OF STOCK
                            </span>
                          )}

                        </td>

                      </tr>
                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </main>
  )
}
