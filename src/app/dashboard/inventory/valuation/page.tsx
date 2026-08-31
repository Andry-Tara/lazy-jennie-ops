import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SearchParams = Promise<{
  outlet?: string
}>

export default async function InventoryValuationPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params =
    await searchParams

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  let query =
    supabase
      .from(
        'inventory_valuation_secure'
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
        category_name,
        base_unit_code,
        base_unit_symbol,
        stock_qty,
        average_cost,
        stock_value,
        standard_cost,
        last_cost,
        minimum_stock,
        stock_status,
        valuation_status
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
    data: rows,
    error,
  } =
    await query

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
      rows || []
  ) {
    if (
      !outletMap.has(
        row.outlet_id
      )
    ) {
      outletMap.set(
        row.outlet_id,
        {
          id: row.outlet_id,
          code: row.outlet_code,
          name: row.outlet_name,
        }
      )
    }
  }

  const totalValue =
    (rows || []).reduce(
      (total, row) =>
        total +
        Number(
          row.stock_value || 0
        ),
      0
    )

  const positiveStock =
    (rows || []).filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) > 0
    ).length

  const noCost =
    (rows || []).filter(
      (row) =>
        row.valuation_status ===
        'NO_COST'
    ).length

  const negativeStock =
    (rows || []).filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) < 0
    ).length

  function formatRupiah(
    value:
      number |
      string |
      null
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(
      Number(
        value || 0
      )
    )
  }

  function formatCost(
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
        maximumFractionDigits: 4,
      }
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
        maximumFractionDigits: 4,
      }
    )
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <div className="mb-8">

          <Link
            href="/dashboard/inventory"
            className="text-sm text-zinc-500 hover:text-red-800"
          >
            ← Inventory
          </Link>

          <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Inventory Valuation
          </h1>

          <p className="mt-2 text-zinc-500">
            Weighted Average Cost & Current Stock Value
          </p>

        </div>

        <form
          method="get"
          className="mb-8 flex flex-wrap gap-4 rounded-2xl bg-white p-6 shadow-sm"
        >

          <div className="min-w-72">

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
                    key={outlet.id}
                    value={outlet.id}
                  >
                    {outlet.code}
                    {' - '}
                    {outlet.name}
                  </option>
                )
              )}

            </select>

          </div>

          <div className="flex items-end">

            <button
              type="submit"
              className="rounded-xl bg-red-900 px-6 py-3 font-bold text-white"
            >
              Apply Filter
            </button>

          </div>

        </form>

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">
            <p className="text-sm text-red-200">
              Current Inventory Value
            </p>
            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                totalValue
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Items With Stock
            </p>
            <p className="mt-2 text-3xl font-bold">
              {positiveStock}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Missing Cost
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {noCost}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Negative Stock
            </p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {negativeStock}
            </p>
          </div>

        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-4 py-4">
                    Location
                  </th>
                  <th className="px-4 py-4">
                    Item
                  </th>
                  <th className="px-4 py-4">
                    Category
                  </th>
                  <th className="px-4 py-4 text-right">
                    Stock
                  </th>
                  <th className="px-4 py-4 text-right">
                    WAC / Base
                  </th>
                  <th className="px-4 py-4 text-right">
                    Stock Value
                  </th>
                  <th className="px-4 py-4 text-right">
                    Last Cost
                  </th>
                  <th className="px-4 py-4">
                    Valuation
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(rows || []).map(
                  (row) => (
                    <tr
                      key={`${row.outlet_id}-${row.item_id}`}
                    >

                      <td className="px-4 py-4">
                        <p className="font-medium">
                          {row.outlet_name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {row.outlet_code}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-bold">
                          {row.item_name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {row.sku}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        {row.category_name ||
                          '-'}
                      </td>

                      <td className="px-4 py-4 text-right font-bold">
                        {formatQty(
                          row.stock_qty
                        )}
                        {' '}
                        {row.base_unit_symbol ||
                          row.base_unit_code}
                      </td>

                      <td className="px-4 py-4 text-right">
                        Rp{' '}
                        {formatCost(
                          row.average_cost
                        )}
                      </td>

                      <td className="px-4 py-4 text-right font-bold">
                        {formatRupiah(
                          row.stock_value
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        Rp{' '}
                        {formatCost(
                          row.last_cost
                        )}
                      </td>

                      <td className="px-4 py-4">

                        {row.valuation_status ===
                        'OK' ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                            OK
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            {row.valuation_status}
                          </span>
                        )}

                      </td>

                    </tr>
                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </main>
  )
}
