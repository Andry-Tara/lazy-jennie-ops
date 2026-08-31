import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SearchParams = Promise<{
  from?: string
  to?: string
  outlet?: string
  type?: string
}>

export default async function StockMovementPage({
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

  // =====================================================
  // DATE
  // =====================================================

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

  const fromDate =
    params.from ||
    today

  const toDate =
    params.to ||
    today

  // =====================================================
  // COST ACCESS
  // =====================================================

  const {
    data: permissionData,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )

  const canViewCost =
    (permissionData || []).some(
      (row: {
        module_code: string
        can_view: boolean
      }) =>
        (
          row.module_code ===
            'INVENTORY_VALUATION' ||
          row.module_code ===
            'COSTING'
        ) &&
        row.can_view ===
          true
    )

  // =====================================================
  // VISIBLE LOCATIONS
  // =====================================================

  const {
    data: locationRows,
  } =
    await supabase
      .from(
        'inventory_stock_secure'
      )
      .select(`
        outlet_id,
        outlet_code,
        outlet_name
      `)

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
      locationRows || []
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
  // MOVEMENT
  // =====================================================

  let query =
    supabase
      .from(
        'stock_transactions_secure'
      )
      .select(`
        id,
        transaction_no,
        transaction_date,
        outlet_id,
        outlet_code,
        outlet_name,
        item_id,
        item_sku,
        item_name,
        transaction_type,
        source_qty,
        source_unit_code,
        quantity_base,
        base_unit_code,
        unit_cost,
        total_cost,
        batch_no,
        expiry_date,
        reference_type,
        reference_no,
        notes
      `)
      .gte(
        'transaction_date',
        `${fromDate}T00:00:00+07:00`
      )
      .lte(
        'transaction_date',
        `${toDate}T23:59:59.999+07:00`
      )
      .order(
        'transaction_date',
        {
          ascending: false,
        }
      )

  if (params.outlet) {
    query =
      query.eq(
        'outlet_id',
        params.outlet
      )
  }

  if (params.type) {
    query =
      query.eq(
        'transaction_type',
        params.type
      )
  }

  const {
    data: rows,
    error,
  } =
    await query

  const transactionTypes =
    [
      'OPENING_BALANCE',
      'PURCHASE_RECEIVING',
      'PRODUCTION_USAGE',
      'PRODUCTION_OUTPUT',
      'TRANSFER_OUT',
      'TRANSFER_IN',
      'POS_CONSUMPTION',
      'WASTE',
      'STOCK_ADJUSTMENT',
      'STOCK_OPNAME',
    ]

  const stockIn =
    (rows || [])
      .filter(
        (row) =>
          Number(
            row.quantity_base || 0
          ) > 0
      )
      .reduce(
        (total, row) =>
          total +
          Number(
            row.quantity_base || 0
          ),
        0
      )

  const stockOut =
    (rows || [])
      .filter(
        (row) =>
          Number(
            row.quantity_base || 0
          ) < 0
      )
      .reduce(
        (total, row) =>
          total +
          Math.abs(
            Number(
              row.quantity_base || 0
            )
          ),
        0
      )

  const movementValue =
    canViewCost
      ? (rows || []).reduce(
          (total, row) =>
            total +
            Number(
              row.total_cost || 0
            ),
          0
        )
      : 0

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

  function formatDateTime(
    value:
      string |
      null
  ) {
    if (!value) {
      return '-'
    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        timeZone:
          'Asia/Jakarta',

        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',
      }
    ).format(
      new Date(value)
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
            Stock Movement
          </h1>

          <p className="mt-2 text-zinc-500">
            Inventory Ledger by Authorized Location
          </p>

        </div>

        {/* FILTER */}

        <form
          method="get"
          className="mb-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm lg:grid-cols-5"
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
              Movement Type
            </label>

            <select
              name="type"
              defaultValue={
                params.type || ''
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="">
                All Types
              </option>

              {transactionTypes.map(
                (type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type}
                  </option>
                )
              )}

            </select>
          </div>

          <div className="flex items-end">

            <button
              type="submit"
              className="w-full rounded-xl bg-red-900 px-5 py-3 font-bold text-white"
            >
              Apply Filter
            </button>

          </div>

        </form>

        {/* SUMMARY */}

        <div
          className={`mb-8 grid gap-4 ${
            canViewCost
              ? 'md:grid-cols-4'
              : 'md:grid-cols-3'
          }`}
        >

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Transactions
            </p>
            <p className="mt-2 text-3xl font-bold">
              {rows?.length || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Stock In
            </p>
            <p className="mt-2 text-2xl font-bold text-green-700">
              +{formatQty(stockIn)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Stock Out
            </p>
            <p className="mt-2 text-2xl font-bold text-red-700">
              -{formatQty(stockOut)}
            </p>
          </div>

          {canViewCost && (
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm text-zinc-500">
                Recorded Value
              </p>
              <p className="mt-2 text-xl font-bold">
                {formatRupiah(
                  movementValue
                )}
              </p>
            </div>
          )}

        </div>

        {!canViewCost && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Inventory cost and transaction value are restricted for this role.
          </div>
        )}

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
                  <th className="px-4 py-4">
                    Date / No
                  </th>
                  <th className="px-4 py-4">
                    Location
                  </th>
                  <th className="px-4 py-4">
                    Item
                  </th>
                  <th className="px-4 py-4">
                    Type
                  </th>
                  <th className="px-4 py-4 text-right">
                    Qty
                  </th>

                  {canViewCost && (
                    <>
                      <th className="px-4 py-4 text-right">
                        Unit Cost
                      </th>
                      <th className="px-4 py-4 text-right">
                        Value
                      </th>
                    </>
                  )}

                  <th className="px-4 py-4">
                    Reference
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(rows || []).map(
                  (row) => {

                    const qty =
                      Number(
                        row.quantity_base || 0
                      )

                    return (
                      <tr key={row.id}>

                        <td className="px-4 py-4">

                          <p className="font-semibold">
                            {formatDateTime(
                              row.transaction_date
                            )}
                          </p>

                          <p className="mt-1 text-xs text-zinc-400">
                            {row.transaction_no}
                          </p>

                        </td>

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
                            {row.item_sku}
                          </p>

                        </td>

                        <td className="px-4 py-4">
                          {row.transaction_type}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            qty >= 0
                              ? 'text-green-700'
                              : 'text-red-700'
                          }`}
                        >
                          {qty > 0
                            ? '+'
                            : ''}
                          {formatQty(qty)}
                          {' '}
                          {row.base_unit_code ||
                            ''}
                        </td>

                        {canViewCost && (
                          <>
                            <td className="px-4 py-4 text-right">
                              {formatRupiah(
                                row.unit_cost
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-semibold">
                              {formatRupiah(
                                row.total_cost
                              )}
                            </td>
                          </>
                        )}

                        <td className="px-4 py-4">

                          <p className="font-medium">
                            {row.reference_no ||
                              '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {row.reference_type ||
                              ''}
                          </p>

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
