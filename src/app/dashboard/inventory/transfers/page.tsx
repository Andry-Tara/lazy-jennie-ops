import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

export default async function StockTransfersPage() {
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

  const transferPermission = permissions.find(
    (row) => row.module_code === 'STOCK_TRANSFER'
  )

  const canCreate = Boolean(
    transferPermission?.can_create &&
      transferPermission?.can_post
  )

  const canViewCost = permissions.some(
    (row) =>
      row.can_view === true &&
      [
        'INVENTORY_VALUATION',
        'COSTING',
      ].includes(row.module_code)
  )

  const {
    data: transfers,
    error,
  } = await supabase
    .from('stock_transfers_secure')
    .select(`
      id,
      transfer_no,
      transfer_date,
      from_outlet_id,
      from_outlet_code,
      from_outlet_name,
      to_outlet_id,
      to_outlet_code,
      to_outlet_name,
      status,
      notes,
      posted_at,
      created_at
    `)
    .order('transfer_date', { ascending: false })
    .order('created_at', { ascending: false })

  const transferIds = (transfers || []).map((row) => row.id)

  let itemRows: {
    transfer_id: string
    base_qty: number | string | null
    total_value: number | string | null
  }[] = []

  if (transferIds.length > 0) {
    const { data } = await supabase
      .from('stock_transfer_items_secure')
      .select(`
        transfer_id,
        base_qty,
        total_value
      `)
      .in('transfer_id', transferIds)

    itemRows = data || []
  }

  function getSummary(transferId: string) {
    const rows = itemRows.filter(
      (row) => row.transfer_id === transferId
    )

    return {
      lines: rows.length,
      quantity: rows.reduce(
        (total, row) => total + Number(row.base_qty || 0),
        0
      ),
      value: rows.reduce(
        (total, row) => total + Number(row.total_value || 0),
        0
      ),
    }
  }

  const totalValue = canViewCost
    ? itemRows.reduce(
        (total, row) => total + Number(row.total_value || 0),
        0
      )
    : 0

  function formatQty(
    value: number | string | null
  ) {
    return Number(value || 0).toLocaleString('id-ID', {
      maximumFractionDigits: 4,
    })
  }

  function formatRupiah(
    value: number | string | null
  ) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(value || 0))
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
              href="/dashboard/inventory"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Inventory
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Stock Transfer
            </h1>

            <p className="mt-2 text-zinc-500">
              Stock Movement Between Authorized Locations
            </p>
          </div>

          {canCreate && (
            <Link
              href="/dashboard/inventory/transfers/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-bold text-white hover:bg-red-800"
            >
              + New Transfer
            </Link>
          )}
        </div>

        {!canViewCost && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-bold text-blue-900">
              Operational Transfer View
            </p>
            <p className="mt-1 text-sm text-blue-800">
              Transfer quantity is visible. WAC and transfer value are restricted for this role.
            </p>
          </div>
        )}

        <div
          className={`mb-8 grid gap-4 ${
            canViewCost
              ? 'md:grid-cols-3'
              : 'md:grid-cols-2'
          }`}
        >
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Transfers
            </p>
            <p className="mt-2 text-3xl font-bold">
              {transfers?.length || 0}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Item Lines
            </p>
            <p className="mt-2 text-3xl font-bold">
              {itemRows.length}
            </p>
          </div>

          {canViewCost && (
            <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">
              <p className="text-sm text-red-200">
                Transfer Value
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatRupiah(totalValue)}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="space-y-4">
          {(transfers || []).map((transfer) => {
            const summary = getSummary(transfer.id)

            return (
              <div
                key={transfer.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs text-zinc-400">
                      {formatDate(transfer.transfer_date)}
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-red-900">
                      {transfer.transfer_no}
                    </h2>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {transfer.status}
                  </span>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
                  <div className="rounded-xl bg-zinc-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      From
                    </p>
                    <p className="mt-2 font-bold">
                      {transfer.from_outlet_name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {transfer.from_outlet_code}
                    </p>
                  </div>

                  <div className="flex items-center justify-center text-2xl text-zinc-400">
                    →
                  </div>

                  <div className="rounded-xl bg-zinc-50 p-5">
                    <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      To
                    </p>
                    <p className="mt-2 font-bold">
                      {transfer.to_outlet_name}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {transfer.to_outlet_code}
                    </p>
                  </div>
                </div>

                <div
                  className={`mt-5 grid gap-4 ${
                    canViewCost
                      ? 'md:grid-cols-3'
                      : 'md:grid-cols-2'
                  }`}
                >
                  <div>
                    <p className="text-xs text-zinc-400">
                      Item Lines
                    </p>
                    <p className="mt-1 font-bold">
                      {summary.lines}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-400">
                      Base Qty
                    </p>
                    <p className="mt-1 font-bold">
                      {formatQty(summary.quantity)}
                    </p>
                  </div>

                  {canViewCost && (
                    <div>
                      <p className="text-xs text-zinc-400">
                        Transfer Value
                      </p>
                      <p className="mt-1 font-bold">
                        {formatRupiah(summary.value)}
                      </p>
                    </div>
                  )}
                </div>

                {transfer.notes && (
                  <p className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-500">
                    {transfer.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {!transfers?.length && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="font-bold">
              No Stock Transfer
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              No transfer is available for your authorized location.
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
