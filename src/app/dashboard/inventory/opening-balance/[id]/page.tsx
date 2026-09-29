import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'

type Params = Promise<{
  id: string
}>

type PermissionRow = {
  module_code: string
  can_view: boolean
}

type Header = {
  id: string
  opening_no: string
  opening_date: string
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

type Line = {
  id: string
  item_sku: string | null
  item_name: string | null
  item_type: string | null
  source_qty: number | string
  source_unit_code: string | null
  source_unit_symbol: string | null
  conversion_factor: number | string
  quantity_base: number | string
  base_unit_code: string | null
  base_unit_symbol: string | null
  unit_cost_source: number | string | null
  unit_cost_base: number | string | null
  total_cost: number | string | null
  batch_no: string | null
  expiry_date: string | null
  notes: string | null
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

function formatNumber(value: number | string) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits: 6,
    }
  ).format(Number(value || 0))
}

export default async function OpeningBalanceDetailPage({
  params,
}: {
  params: Params
}) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: permissionData,
  } = await supabase.rpc('get_my_permissions')

  const inventoryPermission =
    ((permissionData || []) as PermissionRow[]).find(
      (row) =>
        row.module_code === 'INVENTORY'
    )

  if (!inventoryPermission?.can_view) {
    redirect('/dashboard?denied=INVENTORY')
  }

  const [
    headerResult,
    linesResult,
  ] = await Promise.all([
    supabase
      .from('opening_balances_secure')
      .select(`
        id,
        opening_no,
        opening_date,
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
      .eq('id', id)
      .maybeSingle(),

    supabase
      .from('opening_balance_items_secure')
      .select(`
        id,
        item_sku,
        item_name,
        item_type,
        source_qty,
        source_unit_code,
        source_unit_symbol,
        conversion_factor,
        quantity_base,
        base_unit_code,
        base_unit_symbol,
        unit_cost_source,
        unit_cost_base,
        total_cost,
        batch_no,
        expiry_date,
        notes
      `)
      .eq('opening_balance_id', id)
      .order('item_name'),
  ])

  if (!headerResult.data) {
    notFound()
  }

  const header =
    headerResult.data as Header

  const lines =
    (linesResult.data || []) as Line[]

  // headerResult.data has already been narrowed above.
  // In Supabase's discriminated response type, that means
  // headerResult.error is known to be null here.
  const pageError =
    linesResult.error?.message ||
    ''

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/inventory/opening-balance"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Opening Balance
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">

          <div>
            <p className="text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {header.opening_no}
            </h1>

            <p className="mt-2 text-zinc-500">
              {header.outlet_code}
              {' - '}
              {header.outlet_name}
              {' · '}
              {header.opening_date}
            </p>
          </div>

          <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
            {header.status}
          </span>

        </div>

        {pageError && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Location
            </p>
            <p className="mt-2 font-bold">
              {header.outlet_code}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {header.outlet_name}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Lines
            </p>
            <p className="mt-2 text-2xl font-bold">
              {Number(header.item_line_count || 0)}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">
              Distinct Items
            </p>
            <p className="mt-2 text-2xl font-bold">
              {Number(header.distinct_item_count || 0)}
            </p>
          </div>

          <div className="rounded-2xl bg-zinc-900 p-5 text-white shadow-sm">
            <p className="text-sm text-zinc-300">
              Total Value
            </p>
            <p className="mt-2 text-xl font-bold">
              {formatCurrency(header.total_value)}
            </p>
          </div>

        </div>

        {header.notes && (
          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-zinc-500">
              Notes
            </p>
            <p className="mt-2">
              {header.notes}
            </p>
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="min-w-full text-sm">

              <thead className="bg-zinc-50 text-left text-zinc-500">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Item
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Qty
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Unit
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Base Qty
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Unit Cost
                  </th>
                  <th className="px-5 py-4 text-right font-semibold">
                    Total
                  </th>
                  <th className="px-5 py-4 font-semibold">
                    Batch / Expiry
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">

                {lines.map((line) => (
                  <tr key={line.id}>

                    <td className="px-5 py-4">
                      <p className="font-bold">
                        {line.item_sku || '-'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {line.item_name || '-'}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {formatNumber(line.source_qty)}
                    </td>

                    <td className="px-5 py-4">
                      {line.source_unit_code ||
                       line.source_unit_symbol ||
                       '-'}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {formatNumber(line.quantity_base)}
                      {' '}
                      {line.base_unit_symbol ||
                       line.base_unit_code ||
                       ''}
                    </td>

                    <td className="px-5 py-4 text-right">
                      {formatCurrency(line.unit_cost_source)}
                    </td>

                    <td className="px-5 py-4 text-right font-bold">
                      {formatCurrency(line.total_cost)}
                    </td>

                    <td className="px-5 py-4">
                      <p>
                        {line.batch_no || '-'}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {line.expiry_date || '-'}
                      </p>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>

        </div>

      </div>
    </main>
  )
}
