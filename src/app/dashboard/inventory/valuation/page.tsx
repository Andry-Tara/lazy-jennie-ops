import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function InventoryValuationPage() {
  const supabase = await createClient()

  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // INVENTORY VALUATION
  // =====================================================

  const {
    data: valuation,
    error,
  } = await supabase
    .from('inventory_valuation')
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

  // =====================================================
  // ONLY NON-ZERO STOCK
  // =====================================================

  const stockRows =
    (valuation || []).filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) !== 0
    )

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalInventoryValue =
    stockRows.reduce(
      (total, row) =>
        total +
        Number(
          row.stock_value || 0
        ),
      0
    )

  const activeStockLines =
    stockRows.filter(
      (row) =>
        Number(
          row.stock_qty || 0
        ) > 0
    ).length

  const lowStockLines =
    stockRows.filter(
      (row) =>
        row.stock_status ===
        'LOW_STOCK'
    ).length

  const valuationIssues =
    stockRows.filter(
      (row) =>
        row.valuation_status !==
        'OK'
    ).length

  // =====================================================
  // FORMAT
  // =====================================================

  function formatNumber(
    value: number | string | null
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
    ).format(
      Number(
        value || 0
      )
    )
  }

  function itemTypeLabel(
    value: string
  ) {
    if (
      value ===
      'RAW_MATERIAL'
    ) {
      return 'Raw Material'
    }

    if (
      value ===
      'WIP'
    ) {
      return 'WIP'
    }

    if (
      value ===
      'FINISHED_GOOD'
    ) {
      return 'Finished Good'
    }

    if (
      value ===
      'PACKAGING'
    ) {
      return 'Packaging'
    }

    if (
      value ===
      'CONSUMABLE'
    ) {
      return 'Consumable'
    }

    return value
  }

  function valuationClass(
    value: string
  ) {
    if (
      value === 'OK'
    ) {
      return 'bg-green-100 text-green-700'
    }

    if (
      value === 'NO_COST'
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    return 'bg-red-100 text-red-700'
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

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

          <Link
            href="/dashboard/inventory/movements"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
          >
            Stock Movement
          </Link>

        </div>

        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

            <p className="text-sm text-red-200">
              Total Inventory Value
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatRupiah(
                totalInventoryValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Stock Lines
            </p>

            <p className="mt-2 text-3xl font-bold">
              {activeStockLines}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Low Stock
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-700">
              {lowStockLines}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Valuation Issues
            </p>

            <p className="mt-2 text-3xl font-bold text-red-700">
              {valuationIssues}
            </p>

          </div>

        </div>

        {/* DATABASE ERROR */}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-5 text-red-700">

            <p className="font-bold">
              Inventory Valuation Error
            </p>

            <p className="mt-2 text-sm">
              {error.message}
            </p>

          </div>
        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Current Inventory Value
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Current stock valued using Weighted Average Cost.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Location
                  </th>

                  <th className="px-5 py-4">
                    Item
                  </th>

                  <th className="px-5 py-4">
                    Type
                  </th>

                  <th className="px-5 py-4 text-right">
                    Stock
                  </th>

                  <th className="px-5 py-4">
                    Unit
                  </th>

                  <th className="px-5 py-4 text-right">
                    Avg Cost
                  </th>

                  <th className="px-5 py-4 text-right">
                    Stock Value
                  </th>

                  <th className="px-5 py-4">
                    Stock Status
                  </th>

                  <th className="px-5 py-4">
                    Valuation
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {stockRows.map(
                  (row) => (

                    <tr
                      key={`${row.outlet_id}-${row.item_id}`}
                      className="hover:bg-zinc-50"
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

                        <p className="font-medium">
                          {row.item_name}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {row.sku}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {row.category_name || ''}
                        </p>

                      </td>

                      <td className="px-5 py-4">

                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                          {itemTypeLabel(
                            row.item_type
                          )}
                        </span>

                      </td>

                      <td className="px-5 py-4 text-right font-bold">
                        {formatNumber(
                          row.stock_qty
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {row.base_unit_code}
                      </td>

                      <td className="px-5 py-4 text-right">

                        <p className="font-semibold">
                          {formatRupiah(
                            row.average_cost
                          )}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          / {row.base_unit_code}
                        </p>

                      </td>

                      <td className="px-5 py-4 text-right font-bold text-red-900">
                        {formatRupiah(
                          row.stock_value
                        )}
                      </td>

                      <td className="px-5 py-4">

                        {row.stock_status ===
                        'AVAILABLE' ? (

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Available
                          </span>

                        ) : row.stock_status ===
                          'LOW_STOCK' ? (

                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                            Low Stock
                          </span>

                        ) : (

                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Out of Stock
                          </span>

                        )}

                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${valuationClass(
                            row.valuation_status
                          )}`}
                        >
                          {row.valuation_status}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

            {!error &&
              !stockRows.length && (

              <div className="p-12 text-center">

                <p className="font-semibold">
                  No Inventory Value Yet
                </p>

                <p className="mt-2 text-sm text-zinc-500">
                  Inventory valuation will appear after stock transactions are posted.
                </p>

              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  )
}
