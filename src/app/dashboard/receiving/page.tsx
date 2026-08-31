import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SearchParams = Promise<{
  from?: string
  to?: string
  outlet?: string
}>

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

export default async function ReceivingPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
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

  const receivingPermission = permissions.find(
    (row) => row.module_code === 'RECEIVING'
  )

  const canCreate = Boolean(
    receivingPermission?.can_create &&
      receivingPermission?.can_post
  )

  const canViewPurchaseCost = permissions.some(
    (row) =>
      row.can_view === true &&
      [
        'PURCHASING',
        'INVENTORY_VALUATION',
        'COSTING',
      ].includes(row.module_code)
  )

  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const fromDate = params.from || ''
  const toDate = params.to || ''

  let query = supabase
    .from('purchase_receivings_secure')
    .select(`
      id,
      receiving_no,
      receiving_date,
      outlet_id,
      outlet_code,
      outlet_name,
      supplier_id,
      invoice_no,
      status,
      total_amount,
      notes,
      posted_at,
      created_at,
      purchase_order_id
    `)
    .order('receiving_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (fromDate) {
    query = query.gte('receiving_date', fromDate)
  }

  if (toDate) {
    query = query.lte('receiving_date', toDate)
  }

  if (params.outlet) {
    query = query.eq('outlet_id', params.outlet)
  }

  const {
    data: receivings,
    error,
  } = await query

  const receivingIds = (receivings || []).map((row) => row.id)

  let itemRows: {
    receiving_id: string
    qty: number | string | null
    base_qty: number | string | null
    total_amount: number | string | null
  }[] = []

  if (receivingIds.length > 0) {
    const { data } = await supabase
      .from('purchase_receiving_items_secure')
      .select(`
        receiving_id,
        qty,
        base_qty,
        total_amount
      `)
      .in('receiving_id', receivingIds)

    itemRows = data || []
  }

  const outletMap = new Map<
    string,
    {
      id: string
      code: string
      name: string
    }
  >()

  for (const row of receivings || []) {
    if (!outletMap.has(row.outlet_id)) {
      outletMap.set(row.outlet_id, {
        id: row.outlet_id,
        code: row.outlet_code,
        name: row.outlet_name,
      })
    }
  }

  function getSummary(receivingId: string) {
    const rows = itemRows.filter(
      (row) => row.receiving_id === receivingId
    )

    return {
      lines: rows.length,
      quantity: rows.reduce(
        (total, row) => total + Number(row.qty || 0),
        0
      ),
      amount: rows.reduce(
        (total, row) => total + Number(row.total_amount || 0),
        0
      ),
    }
  }

  const totalDocuments = receivings?.length || 0

  const totalLines = itemRows.length

  const totalAmount = canViewPurchaseCost
    ? (receivings || []).reduce(
        (total, row) => total + Number(row.total_amount || 0),
        0
      )
    : 0

  function formatRupiah(
    value: number | string | null
  ) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
  }

  function formatQty(
    value: number | string | null
  ) {
    return Number(value || 0).toLocaleString('id-ID', {
      maximumFractionDigits: 4,
    })
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return '-'
    }

    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(
      new Date(`${value}T12:00:00+07:00`)
    )
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
              Receiving
            </h1>

            <p className="mt-2 text-zinc-500">
              Supplier Goods Receiving by Authorized Location
            </p>
          </div>

          {canCreate && (
            <Link
              href="/dashboard/receiving/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-bold text-white hover:bg-red-800"
            >
              + New Receiving
            </Link>
          )}
        </div>

        {!canViewPurchaseCost && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-bold text-blue-900">
              Operational Receiving View
            </p>
            <p className="mt-1 text-sm text-blue-800">
              Purchase price and receiving value are restricted for this role.
            </p>
          </div>
        )}

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
              defaultValue={fromDate}
              max={today}
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
              defaultValue={toDate}
              max={today}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold">
              Location
            </label>
            <select
              name="outlet"
              defaultValue={params.outlet || ''}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >
              <option value="">
                All Authorized Locations
              </option>

              {Array.from(outletMap.values()).map((outlet) => (
                <option
                  key={outlet.id}
                  value={outlet.id}
                >
                  {outlet.code} - {outlet.name}
                </option>
              ))}
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

        <div
          className={`mb-8 grid gap-4 ${
            canViewPurchaseCost
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2'
          }`}
        >
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Receiving Documents
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalDocuments}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Receiving Lines
            </p>
            <p className="mt-2 text-3xl font-bold">
              {totalLines}
            </p>
          </div>

          {canViewPurchaseCost && (
            <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">
              <p className="text-sm text-red-200">
                Received Value
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatRupiah(totalAmount)}
              </p>
            </div>
          )}
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
                  <th className="px-5 py-4">
                    Receiving
                  </th>
                  <th className="px-5 py-4">
                    Location
                  </th>
                  <th className="px-5 py-4">
                    Invoice / Source
                  </th>
                  <th className="px-5 py-4 text-right">
                    Lines
                  </th>
                  <th className="px-5 py-4 text-right">
                    Qty
                  </th>
                  {canViewPurchaseCost && (
                    <th className="px-5 py-4 text-right">
                      Value
                    </th>
                  )}
                  <th className="px-5 py-4">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100">
                {(receivings || []).map((receiving) => {
                  const summary = getSummary(receiving.id)

                  return (
                    <tr key={receiving.id}>
                      <td className="px-5 py-4">
                        <p className="font-bold text-red-900">
                          {receiving.receiving_no}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {formatDate(receiving.receiving_date)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {receiving.outlet_name}
                        </p>
                        <p className="text-xs text-zinc-400">
                          {receiving.outlet_code}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {receiving.invoice_no || '-'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-400">
                          {receiving.purchase_order_id
                            ? 'PO Receiving'
                            : 'Direct Receiving'}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {summary.lines}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatQty(summary.quantity)}
                      </td>

                      {canViewPurchaseCost && (
                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            receiving.total_amount
                          )}
                        </td>
                      )}

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          {receiving.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!receivings?.length && (
            <div className="p-12 text-center">
              <p className="font-bold">
                No Receiving
              </p>
              <p className="mt-2 text-sm text-zinc-500">
                No receiving documents are available for your authorized location.
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  )
}
