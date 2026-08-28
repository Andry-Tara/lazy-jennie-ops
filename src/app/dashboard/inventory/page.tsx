import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type Props = {
  searchParams: Promise<{
    outlet?: string
    status?: string
    search?: string
  }>
}

type StockRow = {
  outlet_id: string
  outlet_code: string
  outlet_name: string
  outlet_type: string

  item_id: string
  sku: string
  item_name: string
  item_type: string

  category_code: string | null
  category_name: string | null

  base_unit_code: string
  base_unit_symbol: string

  stock_qty: number
  minimum_stock: number

  stock_status:
    | 'AVAILABLE'
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK'
}

export default async function InventoryPage({
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
    .select('id, code, name, type')
    .eq('is_active', true)
    .order('name')

  const { data, error } = await supabase
    .from('inventory_stock')
    .select('*')
    .order('item_name')

  let stockRows = (data || []) as StockRow[]

  if (params.outlet) {
    stockRows = stockRows.filter(
      (row) => row.outlet_id === params.outlet
    )
  }

  const summaryRows = [...stockRows]

  if (params.status) {
    stockRows = stockRows.filter(
      (row) => row.stock_status === params.status
    )
  }

  if (params.search) {
    const keyword = params.search
      .toLowerCase()
      .trim()

    stockRows = stockRows.filter((row) => {
      return (
        row.item_name
          .toLowerCase()
          .includes(keyword) ||
        row.sku
          .toLowerCase()
          .includes(keyword) ||
        (row.category_name || '')
          .toLowerCase()
          .includes(keyword)
      )
    })
  }

  const totalItems = summaryRows.length

  const available = summaryRows.filter(
    (row) => row.stock_status === 'AVAILABLE'
  ).length

  const lowStock = summaryRows.filter(
    (row) => row.stock_status === 'LOW_STOCK'
  ).length

  const outOfStock = summaryRows.filter(
    (row) => row.stock_status === 'OUT_OF_STOCK'
  ).length

  function formatNumber(value: number) {
    return Number(value).toLocaleString('id-ID', {
      maximumFractionDigits: 3,
    })
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
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
            Current Stock & Inventory Monitoring
          </p>
        </div>

        {/* SUMMARY */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Total Items
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

            <p className="mt-2 text-3xl font-bold text-amber-600">
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

        {/* FILTER */}
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
              Stock Status
            </label>

            <select
              name="status"
              defaultValue={params.status || ''}
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

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase text-zinc-500">
              Search
            </label>

            <input
              name="search"
              defaultValue={params.search || ''}
              placeholder="SKU / Item / Category"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 rounded-xl bg-red-900 px-4 py-3 font-semibold text-white hover:bg-red-800"
            >
              Filter
            </button>

            <Link
              href="/dashboard/inventory"
              className="rounded-xl border border-zinc-300 px-4 py-3 font-semibold"
            >
              Reset
            </Link>
          </div>
        </form>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        {/* CURRENT STOCK */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>
                <h2 className="font-bold">
                  Current Stock
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  {stockRows.length} record(s)
                </p>
              </div>

              <div className="flex flex-wrap gap-3">

                <Link
                  href="/dashboard/inventory/movements"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50"
                >
                  Stock Movement
                </Link>

                <Link
                  href="/dashboard/receiving"
                  className="rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold hover:bg-zinc-50"
                >
                  Receiving History
                </Link>

                <Link
                  href="/dashboard/receiving/new"
                  className="rounded-xl bg-red-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
                >
                  + Receiving
                </Link>

              </div>
            </div>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 text-zinc-500">
                <tr>
                  <th className="px-6 py-4">
                    Location
                  </th>

                  <th className="px-6 py-4">
                    SKU
                  </th>

                  <th className="px-6 py-4">
                    Item
                  </th>

                  <th className="px-6 py-4">
                    Category
                  </th>

                  <th className="px-6 py-4">
                    Type
                  </th>

                  <th className="px-6 py-4 text-right">
                    Stock
                  </th>

                  <th className="px-6 py-4">
                    Unit
                  </th>

                  <th className="px-6 py-4 text-right">
                    Minimum
                  </th>

                  <th className="px-6 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {stockRows.map((row) => (
                  <tr
                    key={`${row.outlet_id}-${row.item_id}`}
                    className="hover:bg-zinc-50"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium">
                        {row.outlet_name}
                      </p>

                      <p className="text-xs text-zinc-400">
                        {row.outlet_code}
                      </p>
                    </td>

                    <td className="px-6 py-4 font-semibold text-red-900">
                      {row.sku}
                    </td>

                    <td className="px-6 py-4 font-medium">
                      {row.item_name}
                    </td>

                    <td className="px-6 py-4 text-zinc-500">
                      {row.category_name || '-'}
                    </td>

                    <td className="px-6 py-4 text-xs">
                      {row.item_type.replaceAll('_', ' ')}
                    </td>

                    <td className="px-6 py-4 text-right text-lg font-bold">
                      {formatNumber(row.stock_qty)}
                    </td>

                    <td className="px-6 py-4">
                      {row.base_unit_code}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {formatNumber(row.minimum_stock)}
                    </td>

                    <td className="px-6 py-4">

                      {row.stock_status === 'AVAILABLE' && (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Available
                        </span>
                      )}

                      {row.stock_status === 'LOW_STOCK' && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Low Stock
                        </span>
                      )}

                      {row.stock_status === 'OUT_OF_STOCK' && (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                          Out of Stock
                        </span>
                      )}

                    </td>
                  </tr>
                ))}

              </tbody>
            </table>

            {!stockRows.length && (
              <div className="p-12 text-center">
                <p className="font-semibold text-zinc-700">
                  No inventory found
                </p>

                <p className="mt-1 text-sm text-zinc-500">
                  Try changing the filter.
                </p>
              </div>
            )}

          </div>
        </div>

      </div>
    </main>
  )
}
