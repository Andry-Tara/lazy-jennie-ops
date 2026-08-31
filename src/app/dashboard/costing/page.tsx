import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SearchParams = Promise<{
  from?: string
  to?: string
  outlet?: string
}>

export default async function CostingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

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
  // DEFAULT DATE - CURRENT MONTH JAKARTA
  // =====================================================

  const today = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date())

  const [year, month] =
    today.split('-')

  const defaultFrom =
    `${year}-${month}-01`

  const fromDate =
    params.from || defaultFrom

  const toDate =
    params.to || today

  const outletFilter =
    params.outlet || ''

  // =====================================================
  // OUTLETS
  // =====================================================

  const { data: outlets } = await supabase
    .from('outlets_secure')
    .select(`
      id,
      code,
      name,
      type
    `)
    .eq('is_active', true)
    .order('name')

  // =====================================================
  // STOCK TRANSACTIONS
  // =====================================================

  let transactionQuery =
    supabase
      .from('stock_transactions_costing_secure')
      .select(`
        id,
        transaction_no,
        transaction_date,
        outlet_id,
        item_id,
        transaction_type,
        quantity_base,
        unit_cost,
        total_cost,
        reference_no,
        created_at
      `)
      .gte(
        'transaction_date',
        `${fromDate}T00:00:00+07:00`
      )
      .lte(
        'transaction_date',
        `${toDate}T23:59:59+07:00`
      )
      .order(
        'transaction_date',
        {
          ascending: false,
        }
      )

  if (outletFilter) {
    transactionQuery =
      transactionQuery.eq(
        'outlet_id',
        outletFilter
      )
  }

  const {
    data: transactions,
    error: transactionError,
  } = await transactionQuery

  // =====================================================
  // CURRENT INVENTORY VALUATION
  // =====================================================

  let valuationQuery =
    supabase
      .from('inventory_valuation_costing_secure')
      .select(`
        outlet_id,
        outlet_code,
        outlet_name,
        item_id,
        sku,
        item_name,
        item_type,
        category_name,
        base_unit_code,
        stock_qty,
        average_cost,
        stock_value,
        valuation_status
      `)

  if (outletFilter) {
    valuationQuery =
      valuationQuery.eq(
        'outlet_id',
        outletFilter
      )
  }

  const {
    data: valuation,
    error: valuationError,
  } = await valuationQuery

  // =====================================================
  // HELPERS
  // =====================================================

  function absoluteCost(
    value: number | string | null
  ) {
    return Math.abs(
      Number(value || 0)
    )
  }

  function sumType(
    type: string
  ) {
    return (transactions || [])
      .filter(
        (row) =>
          row.transaction_type ===
          type
      )
      .reduce(
        (total, row) =>
          total +
          absoluteCost(
            row.total_cost
          ),
        0
      )
  }

  // =====================================================
  // COST SUMMARY
  // =====================================================

  const purchaseValue =
    sumType(
      'PURCHASE_RECEIVING'
    )

  const productionUsageCost =
    sumType(
      'PRODUCTION_USAGE'
    )

  const productionOutputCost =
    sumType(
      'PRODUCTION_OUTPUT'
    )

  const wasteLoss =
    sumType(
      'WASTE'
    )

  const actualCogs =
    sumType(
      'POS_CONSUMPTION'
    )

  // =====================================================
  // STOCK OPNAME
  // =====================================================

  let opnameShortage = 0
  let opnameSurplus = 0

  for (
    const row of transactions || []
  ) {
    if (
      row.transaction_type !==
      'STOCK_OPNAME'
    ) {
      continue
    }

    const cost =
      absoluteCost(
        row.total_cost
      )

    if (
      Number(
        row.quantity_base || 0
      ) < 0
    ) {
      opnameShortage += cost
    }

    if (
      Number(
        row.quantity_base || 0
      ) > 0
    ) {
      opnameSurplus += cost
    }
  }

  const netOpnameVariance =
    opnameSurplus -
    opnameShortage

  // =====================================================
  // TRANSFER CONTROL
  // =====================================================

  const transferOutValue =
    sumType(
      'TRANSFER_OUT'
    )

  const transferInValue =
    sumType(
      'TRANSFER_IN'
    )

  const transferDifference =
    transferInValue -
    transferOutValue

  // =====================================================
  // CURRENT INVENTORY VALUE
  // =====================================================

  const currentInventoryValue =
    (valuation || []).reduce(
      (total, row) =>
        total +
        Number(
          row.stock_value || 0
        ),
      0
    )

  const valuationIssues =
    (valuation || []).filter(
      (row) =>
        row.valuation_status !==
          'OK' &&
        Number(
          row.stock_qty || 0
        ) !== 0
    ).length

  // =====================================================
  // TRANSACTION SUMMARY
  // =====================================================

  const typeSummary = new Map<
    string,
    {
      count: number
      qty: number
      value: number
    }
  >()

  for (
    const row of transactions || []
  ) {
    const current =
      typeSummary.get(
        row.transaction_type
      ) || {
        count: 0,
        qty: 0,
        value: 0,
      }

    current.count += 1

    current.qty +=
      Number(
        row.quantity_base || 0
      )

    current.value +=
      absoluteCost(
        row.total_cost
      )

    typeSummary.set(
      row.transaction_type,
      current
    )
  }

  const transactionSummaryRows =
    Array.from(
      typeSummary.entries()
    )
      .map(
        ([type, summary]) => ({
          type,
          ...summary,
        })
      )
      .sort(
        (a, b) =>
          b.value - a.value
      )

  // =====================================================
  // TOP INVENTORY VALUE
  // =====================================================

  const topInventory =
    [...(valuation || [])]
      .filter(
        (row) =>
          Number(
            row.stock_qty || 0
          ) > 0
      )
      .sort(
        (a, b) =>
          Number(
            b.stock_value || 0
          ) -
          Number(
            a.stock_value || 0
          )
      )
      .slice(0, 15)

  // =====================================================
  // FORMAT
  // =====================================================

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
      Number(value || 0)
    )
  }

  function formatNumber(
    value: number | string | null
  ) {
    return Number(
      value || 0
    ).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits: 3,
      }
    )
  }

  function transactionLabel(
    value: string
  ) {
    return value
      .replaceAll('_', ' ')
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
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              COGS & Costing
            </h1>

            <p className="mt-2 text-zinc-500">
              Inventory Cost, Production Cost,
              Waste, Variance & Actual COGS
            </p>

          </div>

          <Link
            href="/dashboard/inventory/valuation"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
          >
            Inventory Valuation
          </Link>

        </div>

        {/* FILTER */}

        <form
          method="get"
          className="mb-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4"
        >

          <div>

            <label className="mb-2 block text-sm font-semibold">
              From
            </label>

            <input
              type="date"
              name="from"
              defaultValue={
                fromDate
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold">
              To
            </label>

            <input
              type="date"
              name="to"
              defaultValue={
                toDate
              }
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
                outletFilter
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="">
                All Locations
              </option>

              {(outlets || []).map(
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
              className="w-full rounded-xl bg-red-900 px-6 py-3 font-bold text-white hover:bg-red-800"
            >
              Apply Filter
            </button>

          </div>

        </form>

        {/* IMPORTANT NOTICE */}

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="font-bold text-amber-900">
            COGS Status
          </p>

          <p className="mt-2 text-sm text-amber-800">
            Actual COGS is calculated from posted
            POS_CONSUMPTION inventory transactions.
            The selected period reflects actual POS stock consumption.
          </p>

        </div>

        {/* MAIN SUMMARY */}

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

            <p className="text-sm text-red-200">
              Current Inventory Value
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatRupiah(
                currentInventoryValue
              )}
            </p>

            <p className="mt-2 text-xs text-red-200">
              Current snapshot
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Purchase Received
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                purchaseValue
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              Selected period
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Actual COGS
            </p>

            <p className="mt-2 text-2xl font-bold text-red-800">
              {formatRupiah(
                actualCogs
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              POS Consumption
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Waste Loss
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {formatRupiah(
                wasteLoss
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              Selected period
            </p>

          </div>

        </div>

        {/* COSTING SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Production Usage Cost
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                productionUsageCost
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Production Output Value
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                productionOutputCost
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Stock Opname Shortage
            </p>

            <p className="mt-2 text-xl font-bold text-red-700">
              {formatRupiah(
                opnameShortage
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Stock Opname Surplus
            </p>

            <p className="mt-2 text-xl font-bold text-green-700">
              {formatRupiah(
                opnameSurplus
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              Net: {formatRupiah(
                netOpnameVariance
              )}
            </p>

          </div>

        </div>

        {/* CONTROL */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Transfer Out Value
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                transferOutValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Transfer In Value
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                transferInValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Transfer Difference
            </p>

            <p
              className={`mt-2 text-xl font-bold ${
                Math.abs(
                  transferDifference
                ) < 0.01
                  ? 'text-green-700'
                  : 'text-red-700'
              }`}
            >
              {formatRupiah(
                transferDifference
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              Ideally Rp0
            </p>

          </div>

        </div>

        {/* ERRORS */}

        {(transactionError ||
          valuationError) && (

          <div className="mb-8 rounded-xl bg-red-50 p-5 text-red-700">

            <p className="font-bold">
              Costing Data Error
            </p>

            {transactionError && (
              <p className="mt-2 text-sm">
                {transactionError.message}
              </p>
            )}

            {valuationError && (
              <p className="mt-2 text-sm">
                {valuationError.message}
              </p>
            )}

          </div>

        )}

        {/* VALUATION WARNING */}

        {valuationIssues > 0 && (

          <div className="mb-8 rounded-xl bg-amber-50 p-5 text-amber-800">

            <p className="font-bold">
              Valuation Warning
            </p>

            <p className="mt-2 text-sm">
              {valuationIssues} inventory
              line(s) still have valuation
              issues.
            </p>

          </div>

        )}

        {/* TRANSACTION COST SUMMARY */}

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Cost Movement Summary
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Stock ledger activity for the selected period
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Transaction Type
                  </th>

                  <th className="px-5 py-4 text-right">
                    Transactions
                  </th>

                  <th className="px-5 py-4 text-right">
                    Net Base Qty
                  </th>

                  <th className="px-5 py-4 text-right">
                    Cost Value
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {transactionSummaryRows.map(
                  (row) => (

                    <tr key={row.type}>

                      <td className="px-5 py-4 font-semibold">
                        {transactionLabel(
                          row.type
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {row.count}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatNumber(
                          row.qty
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-bold">
                        {formatRupiah(
                          row.value
                        )}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* TOP INVENTORY */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Highest Inventory Value
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Top current stock value by item and location
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

                  <th className="px-5 py-4 text-right">
                    Stock
                  </th>

                  <th className="px-5 py-4">
                    Unit
                  </th>

                  <th className="px-5 py-4 text-right">
                    WAC
                  </th>

                  <th className="px-5 py-4 text-right">
                    Inventory Value
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {topInventory.map(
                  (row) => (

                    <tr
                      key={`${row.outlet_id}-${row.item_id}`}
                    >

                      <td className="px-5 py-4">
                        {row.outlet_name}
                      </td>

                      <td className="px-5 py-4">

                        <p className="font-medium">
                          {row.item_name}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {row.sku}
                        </p>

                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatNumber(
                          row.stock_qty
                        )}
                      </td>

                      <td className="px-5 py-4">
                        {row.base_unit_code}
                      </td>

                      <td className="px-5 py-4 text-right">
                        {formatRupiah(
                          row.average_cost
                        )}
                      </td>

                      <td className="px-5 py-4 text-right font-bold text-red-900">
                        {formatRupiah(
                          row.stock_value
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <span
                          className={
                            row.valuation_status ===
                            'OK'
                              ? 'rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700'
                              : 'rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700'
                          }
                        >
                          {row.valuation_status}
                        </span>

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