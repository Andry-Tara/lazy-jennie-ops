import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function StockOpnamePage() {
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
  // PERMISSION
  // =====================================================

  const {
    data: permissions,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )

  const opnamePermission =
    (permissions || []).find(
      (row: {
        module_code: string
        can_view: boolean
        can_create: boolean
        can_post: boolean
      }) =>
        row.module_code ===
        'STOCK_OPNAME'
    )

  const canCreate =
    Boolean(
      opnamePermission?.can_create
    )

  const canViewCost =
    (permissions || []).some(
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
        row.can_view
    )

  // =====================================================
  // HEADER
  // =====================================================

  const {
    data: opnames,
    error,
  } =
    await supabase
      .from(
        'stock_opnames_secure'
      )
      .select(`
        id,
        opname_no,
        opname_date,
        outlet_id,
        outlet_code,
        outlet_name,
        status,
        notes,
        posted_at,
        created_at
      `)
      .order(
        'opname_date',
        {
          ascending: false,
        }
      )
      .order(
        'created_at',
        {
          ascending: false,
        }
      )

  // =====================================================
  // ITEMS
  // =====================================================

  const opnameIds =
    (opnames || []).map(
      (row) =>
        row.id
    )

  let itemRows: {
    opname_id: string
    difference_qty: number | string | null
    variance_value: number | string | null
  }[] = []

  if (
    opnameIds.length >
    0
  ) {
    const {
      data,
    } =
      await supabase
        .from(
          'stock_opname_items_secure'
        )
        .select(`
          opname_id,
          difference_qty,
          variance_value
        `)
        .in(
          'opname_id',
          opnameIds
        )

    itemRows =
      data || []
  }

  function getSummary(
    opnameId: string
  ) {
    const rows =
      itemRows.filter(
        (row) =>
          row.opname_id ===
          opnameId
      )

    const match =
      rows.filter(
        (row) =>
          Number(
            row.difference_qty || 0
          ) === 0
      ).length

    const shortage =
      rows.filter(
        (row) =>
          Number(
            row.difference_qty || 0
          ) < 0
      ).length

    const surplus =
      rows.filter(
        (row) =>
          Number(
            row.difference_qty || 0
          ) > 0
      ).length

    const variance =
      rows.reduce(
        (total, row) =>
          total +
          Number(
            row.variance_value || 0
          ),
        0
      )

    return {
      lines:
        rows.length,
      match,
      shortage,
      surplus,
      variance,
    }
  }

  function formatRupiah(
    value: number
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(value)
  }

  function formatDate(
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
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }
    ).format(
      new Date(
        `${value}T12:00:00+07:00`
      )
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
              Stock Opname
            </h1>

            <p className="mt-2 text-zinc-500">
              Physical Stock Count & Variance Control
            </p>

          </div>

          {canCreate && (
            <Link
              href="/dashboard/inventory/opname/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-bold text-white"
            >
              + New Stock Opname
            </Link>
          )}

        </div>

        {!canViewCost && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Quantity variance is visible. Financial variance is restricted for this role.
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="space-y-4">

          {(opnames || []).map(
            (opname) => {

              const summary =
                getSummary(
                  opname.id
                )

              return (
                <Link
                  key={opname.id}
                  href={`/dashboard/inventory/opname/${opname.id}`}
                  className="block rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >

                  <div className="flex flex-wrap items-start justify-between gap-5">

                    <div>

                      <p className="text-xs font-semibold text-zinc-400">
                        {formatDate(
                          opname.opname_date
                        )}
                      </p>

                      <h2 className="mt-1 text-lg font-bold text-red-900">
                        {opname.opname_no}
                      </h2>

                      <p className="mt-2 font-medium">
                        {opname.outlet_name}
                      </p>

                      <p className="text-xs text-zinc-400">
                        {opname.outlet_code}
                      </p>

                    </div>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                      {opname.status}
                    </span>

                  </div>

                  <div
                    className={`mt-6 grid gap-4 ${
                      canViewCost
                        ? 'md:grid-cols-5'
                        : 'md:grid-cols-4'
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

                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs text-green-600">
                        Match
                      </p>
                      <p className="mt-1 text-xl font-bold text-green-700">
                        {summary.match}
                      </p>
                    </div>

                    <div className="rounded-xl bg-red-50 p-4">
                      <p className="text-xs text-red-500">
                        Shortage
                      </p>
                      <p className="mt-1 text-xl font-bold text-red-700">
                        {summary.shortage}
                      </p>
                    </div>

                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-xs text-amber-600">
                        Surplus
                      </p>
                      <p className="mt-1 text-xl font-bold text-amber-700">
                        {summary.surplus}
                      </p>
                    </div>

                    {canViewCost && (
                      <div className="rounded-xl bg-zinc-900 p-4 text-white">
                        <p className="text-xs text-zinc-300">
                          Net Variance
                        </p>
                        <p className="mt-1 text-lg font-bold">
                          {formatRupiah(
                            summary.variance
                          )}
                        </p>
                      </div>
                    )}

                  </div>

                </Link>
              )
            }
          )}

        </div>

        {!opnames?.length && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="font-bold">
              No Stock Opname
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              No stock opname is available for your authorized location.
            </p>
          </div>
        )}

      </div>

    </main>
  )
}
