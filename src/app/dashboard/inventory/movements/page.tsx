import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{
    outlet?: string
    item?: string
    type?: string
  }>
}

type Movement = {
  id: string
  transaction_no: string
  transaction_date: string
  transaction_type: string
  source_qty: number
  quantity_base: number
  unit_cost: number
  total_cost: number
  reference_no: string | null
  batch_no: string | null
  outlets: {
    id: string
    code: string
    name: string
  } | null
  items: {
    id: string
    sku: string
    name: string
  } | null
  units: {
    id: string
    code: string
    symbol: string
  } | null
}

export default async function StockMovementsPage({
  searchParams,
}: Props) {
  const params = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: outlets } = await supabase
    .from('outlets')
    .select('id, code, name')
    .eq('is_active', true)
    .order('name')

  const { data: items } = await supabase
    .from('items')
    .select('id, sku, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('stock_transactions')
    .select(`
      id,
      transaction_no,
      transaction_date,
      transaction_type,
      source_qty,
      quantity_base,
      unit_cost,
      total_cost,
      reference_no,
      batch_no,
      outlets (
        id,
        code,
        name
      ),
      items (
        id,
        sku,
        name
      ),
      units:source_unit_id (
        id,
        code,
        symbol
      )
    `)
    .order('transaction_date', {
      ascending: false,
    })
    .limit(500)

  if (params.outlet) {
    query = query.eq('outlet_id', params.outlet)
  }

  if (params.item) {
    query = query.eq('item_id', params.item)
  }

  if (params.type) {
    query = query.eq('transaction_type', params.type)
  }

  const { data, error } = await query

  const movements = (data || []) as unknown as Movement[]

  const stockIn = movements
    .filter((row) => Number(row.quantity_base) > 0)
    .reduce(
      (total, row) => total + Number(row.quantity_base),
      0
    )

  const stockOut = movements
    .filter((row) => Number(row.quantity_base) < 0)
    .reduce(
      (total, row) =>
        total + Math.abs(Number(row.quantity_base)),
      0
    )

  const netMovement = movements.reduce(
    (total, row) =>
      total + Number(row.quantity_base),
    0
  )

  function formatNumber(value: number) {
    return Number(value).toLocaleString('id-ID', {
      maximumFractionDigits: 3,
    })
  }

  function formatRupiah(value: number) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value))
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Jakarta',
    }).format(new Date(value))
  }

  function formatType(value: string) {
    return value.replaceAll('_', ' ')
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
            Inventory Transaction Ledger
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Transactions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {movements.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Stock In
            </p>

            <p className="mt-2 text-3xl font-bold text-green-700">
              +{formatNumber(stockIn)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Stock Out
            </p>

            <p className="mt-2 text-3xl font-bold text-red-700">
              -{formatNumber(stockOut)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Net Movement
            </p>

            <p className="mt-2 text-3xl font-bold">
              {netMovement > 0 ? '+' : ''}
              {formatNumber(netMovement)}
            </p>
          </div>
        </div>

        <form
          method="get"
          className="mb-6 grid gap-4 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-4"
        >
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Location
            </label>

            <select
              name="outlet"
              defaultValue={params.outlet || ''}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="">
                All Locations
              </option>

              {outlets?.map((outlet) => (
                <option
                  key={outlet.id}
                  value={outlet.id}
                >
                  {outlet.code} - {outlet.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Item
            </label>

            <select
              name="item"
              defaultValue={params.item || ''}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="">
                All Items
              </option>

              {items?.map((item) => (
                <option
                  key={item.id}
                  value={item.id}
                >
                  {item.sku} - {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Transaction Type
            </label>

            <select
              name="type"
              defaultValue={params.type || ''}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="">
                All Transactions
              </option>

              <option value="OPENING_BALANCE">
                Opening Balance
              </option>

              <option value="PURCHASE_RECEIVING">
                Purchase Receiving
              </option>

              <option value="PRODUCTION_USAGE">
                Production Usage
              </option>

              <option value="PRODUCTION_OUTPUT">
                Production Output
              </option>

              <option value="TRANSFER_OUT">
                Transfer Out
              </option>

              <option value="TRANSFER_IN">
                Transfer In
              </option>

              <option value="POS_CONSUMPTION">
                POS Consumption
              </option>

              <option value="WASTE">
                Waste
              </option>

              <option value="STOCK_ADJUSTMENT">
                Stock Adjustment
              </option>

              <option value="STOCK_OPNAME">
                Stock Opname
              </option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-red-900 px-4 py-3 font-semibold text-white"
            >
              Filter
            </button>

            <Link
              href="/dashboard/inventory/movements"
              className="rounded-xl border border-zinc-300 px-4 py-3 font-semibold"
            >
              Reset
            </Link>
          </div>
        </form>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold">
                  Transaction History
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  Latest 500 transactions
                </p>
              </div>

              <Link
                href="/dashboard/receiving/new"
                className="rounded-xl bg-red-900 px-5 py-2.5 text-sm font-semibold text-white"
              >
                + Receiving
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Transaction
                  </th>

                  <th className="px-5 py-4">
                    Location
                  </th>

                  <th className="px-5 py-4">
                    Item
                  </th>

                  <th className="px-5 py-4">
                    Input
                  </th>

                  <th className="px-5 py-4 text-right">
                    Movement
                  </th>

                  <th className="px-5 py-4 text-right">
                    Cost
                  </th>

                  <th className="px-5 py-4">
                    Reference
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {movements.map((movement) => {
                  const qty =
                    Number(movement.quantity_base)

                  const stockComingIn =
                    qty > 0

                  return (
                    <tr
                      key={movement.id}
                      className="hover:bg-zinc-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-zinc-500">
                        {formatDate(
                          movement.transaction_date
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {formatType(
                            movement.transaction_type
                          )}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {movement.transaction_no}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {movement.outlets?.name || '-'}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {movement.outlets?.code || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {movement.items?.name || '-'}
                        </p>

                        <p className="text-xs text-zinc-400">
                          {movement.items?.sku || ''}
                        </p>
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {formatNumber(
                          movement.source_qty
                        )}{' '}
                        {movement.units?.code || ''}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <span
                          className={
                            stockComingIn
                              ? 'font-bold text-green-700'
                              : 'font-bold text-red-700'
                          }
                        >
                          {stockComingIn ? '+' : ''}
                          {formatNumber(qty)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <p className="font-medium">
                          {formatRupiah(
                            movement.total_cost
                          )}
                        </p>

                        {Number(
                          movement.unit_cost
                        ) > 0 && (
                          <p className="text-xs text-zinc-400">
                            {formatRupiah(
                              movement.unit_cost
                            )} / base
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {movement.reference_no ||
                            movement.transaction_no}
                        </p>

                        {movement.batch_no && (
                          <p className="mt-1 text-xs text-zinc-400">
                            Batch: {movement.batch_no}
                          </p>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {!movements.length && (
              <div className="p-12 text-center">
                <p className="font-semibold">
                  No stock movement found
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  No inventory transactions match this filter.
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
