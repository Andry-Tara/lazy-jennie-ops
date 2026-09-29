import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_post: boolean
}

type OpeningBalanceRow = {
  id: string
  opening_no: string
  opening_date: string
  outlet_id: string
  outlet_code: string | null
  outlet_name: string | null
  outlet_type: string | null
  status: string
  notes: string | null
  posted_at: string
  item_line_count: number | string
  distinct_item_count: number | string
  total_value: number | string | null
}

function formatCurrency(value: number | string | null) {
  if (value === null) {
    return 'Restricted'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDate(value: string) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00+07:00`))
}

export default async function OpeningBalancePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: permissionData,
    error: permissionError,
  } = await supabase.rpc('get_my_permissions')

  const permissions = (permissionData || []) as PermissionRow[]

  const inventoryPermission = permissions.find(
    (row) => row.module_code === 'INVENTORY'
  )

  if (
    permissionError ||
    !inventoryPermission?.can_view
  ) {
    redirect('/dashboard?denied=INVENTORY')
  }

  const {
    data: openingBalances,
    error,
  } = await supabase
    .from('opening_balances_secure')
    .select(`
      id,
      opening_no,
      opening_date,
      outlet_id,
      outlet_code,
      outlet_name,
      outlet_type,
      status,
      notes,
      posted_at,
      item_line_count,
      distinct_item_count,
      total_value
    `)
    .order('opening_date', {
      ascending: false,
    })
    .order('created_at', {
      ascending: false,
    })

  const rows = (openingBalances || []) as OpeningBalanceRow[]

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

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
              Opening Balance
            </h1>

            <p className="mt-2 text-zinc-500">
              Initial inventory stock posted before operational transactions.
            </p>

          </div>

          {inventoryPermission.can_post && (
            <Link
              href="/dashboard/inventory/opening-balance/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-bold text-white hover:bg-red-800"
            >
              + New Opening Balance
            </Link>
          )}

        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">
            Go-Live Control
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Opening Balance is intended for initial stock only. Once an item
            has stock history at a location, the database will reject a new
            Opening Balance for that item/location.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="min-w-full text-sm">

              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Opening No
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Date
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Location
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Lines
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Items
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Total Value
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-zinc-50"
                  >
                    <td className="px-5 py-4">
                      <Link
                        href={`/dashboard/inventory/opening-balance/${row.id}`}
                        className="font-bold text-red-900 hover:underline"
                      >
                        {row.opening_no}
                      </Link>
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(row.opening_date)}
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {row.outlet_code || '-'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {row.outlet_name || '-'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {Number(row.item_line_count || 0)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {Number(row.distinct_item_count || 0)}
                    </td>

                    <td className="px-5 py-4 text-right font-semibold">
                      {formatCurrency(row.total_value)}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}

              </tbody>

            </table>

          </div>

          {!rows.length && !error && (
            <div className="p-12 text-center">
              <p className="font-bold">
                No Opening Balance Yet
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Database is ready for the first real opening stock.
              </p>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}
