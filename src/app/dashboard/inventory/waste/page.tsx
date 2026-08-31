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

export default async function WastePage() {
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

  const wastePermission = permissions.find(
    (row) => row.module_code === 'WASTE'
  )

  const canCreate = Boolean(
    wastePermission?.can_create &&
      wastePermission?.can_post
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
    data: wastes,
    error,
  } = await supabase
    .from('wastes_secure')
    .select(`
      id,
      waste_no,
      waste_date,
      outlet_id,
      outlet_code,
      outlet_name,
      status,
      notes,
      posted_at,
      created_at
    `)
    .order('waste_date', { ascending: false })
    .order('created_at', { ascending: false })

  const wasteIds = (wastes || []).map((row) => row.id)

  let itemRows: {
    waste_id: string
    reason: string | null
    base_qty: number | string | null
    total_loss: number | string | null
  }[] = []

  if (wasteIds.length > 0) {
    const { data } = await supabase
      .from('waste_items_secure')
      .select(`
        waste_id,
        reason,
        base_qty,
        total_loss
      `)
      .in('waste_id', wasteIds)

    itemRows = data || []
  }

  function getSummary(wasteId: string) {
    const rows = itemRows.filter(
      (row) => row.waste_id === wasteId
    )

    const reasons = Array.from(
      new Set(
        rows
          .map((row) => row.reason)
          .filter(Boolean)
      )
    )

    return {
      lines: rows.length,
      quantity: rows.reduce(
        (total, row) => total + Number(row.base_qty || 0),
        0
      ),
      loss: rows.reduce(
        (total, row) => total + Number(row.total_loss || 0),
        0
      ),
      reasons,
    }
  }

  const totalLoss = canViewCost
    ? itemRows.reduce(
        (total, row) => total + Number(row.total_loss || 0),
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
              Waste Management
            </h1>

            <p className="mt-2 text-zinc-500">
              Waste, Spoilage & Inventory Loss by Authorized Location
            </p>
          </div>

          {canCreate && (
            <Link
              href="/dashboard/inventory/waste/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-bold text-white hover:bg-red-800"
            >
              + Record Waste
            </Link>
          )}
        </div>

        {!canViewCost && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="font-bold text-blue-900">
              Operational Waste View
            </p>
            <p className="mt-1 text-sm text-blue-800">
              Waste quantity and reason are visible. Financial loss value is restricted for this role.
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
              Waste Documents
            </p>
            <p className="mt-2 text-3xl font-bold">
              {wastes?.length || 0}
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
                Waste Loss
              </p>
              <p className="mt-2 text-2xl font-bold">
                {formatRupiah(totalLoss)}
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
          {(wastes || []).map((waste) => {
            const summary = getSummary(waste.id)

            return (
              <div
                key={waste.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs text-zinc-400">
                      {formatDate(waste.waste_date)}
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-red-900">
                      {waste.waste_no}
                    </h2>

                    <p className="mt-2 font-medium">
                      {waste.outlet_name}
                    </p>

                    <p className="text-xs text-zinc-400">
                      {waste.outlet_code}
                    </p>
                  </div>

                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                    {waste.status}
                  </span>
                </div>

                <div
                  className={`mt-6 grid gap-4 ${
                    canViewCost
                      ? 'md:grid-cols-4'
                      : 'md:grid-cols-3'
                  }`}
                >
                  <div className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-400">
                      Lines
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {summary.lines}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-400">
                      Base Qty
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      {formatQty(summary.quantity)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-zinc-50 p-4">
                    <p className="text-xs text-zinc-400">
                      Reasons
                    </p>
                    <p className="mt-1 text-sm font-bold">
                      {summary.reasons.length > 0
                        ? summary.reasons.join(', ')
                        : '-'}
                    </p>
                  </div>

                  {canViewCost && (
                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs text-red-500">
                        Loss
                      </p>
                      <p className="mt-1 text-lg font-bold text-red-700">
                        {formatRupiah(summary.loss)}
                      </p>
                    </div>
                  )}
                </div>

                {waste.notes && (
                  <p className="mt-5 border-t border-zinc-100 pt-4 text-sm text-zinc-500">
                    {waste.notes}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {!wastes?.length && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="font-bold">
              No Waste Transactions
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              No waste transactions are available for your authorized location.
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
