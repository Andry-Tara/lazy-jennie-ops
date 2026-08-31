import { createClient } from '@/lib/supabase/server'
import {
  redirect,
  notFound,
} from 'next/navigation'
import Link from 'next/link'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function StockOpnameDetailPage({
  params,
}: PageProps) {
  const {
    id,
  } =
    await params

  const supabase =
    await createClient()

  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const {
    data: permissions,
  } =
    await supabase.rpc(
      'get_my_permissions'
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
  // HEADER SECURE
  // =====================================================

  const {
    data: opname,
    error: opnameError,
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
      .eq(
        'id',
        id
      )
      .single()

  if (
    opnameError ||
    !opname
  ) {
    notFound()
  }

  // =====================================================
  // ITEMS SECURE
  // =====================================================

  const {
    data: rows,
    error: itemError,
  } =
    await supabase
      .from(
        'stock_opname_items_secure'
      )
      .select(`
        id,
        opname_id,
        item_id,
        item_sku,
        item_name,
        unit_id,
        unit_code,
        system_qty,
        physical_qty,
        difference_qty,
        unit_cost,
        variance_value,
        notes
      `)
      .eq(
        'opname_id',
        id
      )
      .order(
        'item_name'
      )

  const match =
    (rows || []).filter(
      (row) =>
        Number(
          row.difference_qty || 0
        ) === 0
    ).length

  const shortage =
    (rows || []).filter(
      (row) =>
        Number(
          row.difference_qty || 0
        ) < 0
    ).length

  const surplus =
    (rows || []).filter(
      (row) =>
        Number(
          row.difference_qty || 0
        ) > 0
    ).length

  const netVariance =
    canViewCost
      ? (rows || []).reduce(
          (total, row) =>
            total +
            Number(
              row.variance_value || 0
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

  function formatCost(
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

        <div className="mb-8">

          <Link
            href="/dashboard/inventory/opname"
            className="text-sm text-zinc-500 hover:text-red-800"
          >
            ← Stock Opname
          </Link>

          <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            {opname.opname_no}
          </h1>

          <p className="mt-2 text-zinc-500">
            Stock Opname Detail
          </p>

        </div>

        {/* HEADER */}

        <div className="mb-6 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Location
            </p>
            <p className="mt-2 font-bold">
              {opname.outlet_name}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {opname.outlet_code}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Date
            </p>
            <p className="mt-2 font-bold">
              {formatDate(
                opname.opname_date
              )}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Status
            </p>
            <p className="mt-2 font-bold text-green-700">
              {opname.status}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Lines
            </p>
            <p className="mt-2 text-2xl font-bold">
              {rows?.length || 0}
            </p>
          </div>

        </div>

        <div
          className={`mb-8 grid gap-4 ${
            canViewCost
              ? 'md:grid-cols-4'
              : 'md:grid-cols-3'
          }`}
        >

          <div className="rounded-2xl bg-green-50 p-6">
            <p className="text-sm text-green-600">
              Match
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {match}
            </p>
          </div>

          <div className="rounded-2xl bg-red-50 p-6">
            <p className="text-sm text-red-500">
              Shortage
            </p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {shortage}
            </p>
          </div>

          <div className="rounded-2xl bg-amber-50 p-6">
            <p className="text-sm text-amber-600">
              Surplus
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-700">
              {surplus}
            </p>
          </div>

          {canViewCost && (
            <div className="rounded-2xl bg-zinc-900 p-6 text-white">
              <p className="text-sm text-zinc-300">
                Net Variance
              </p>
              <p className="mt-2 text-xl font-bold">
                {formatRupiah(
                  netVariance
                )}
              </p>
            </div>
          )}

        </div>

        {!canViewCost && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            Financial variance and WAC are restricted for this role.
          </div>
        )}

        {itemError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {itemError.message}
          </div>
        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>
                  <th className="px-4 py-4">
                    Inventory Item
                  </th>
                  <th className="px-4 py-4 text-right">
                    System
                  </th>
                  <th className="px-4 py-4 text-right">
                    Physical
                  </th>
                  <th className="px-4 py-4 text-right">
                    Difference
                  </th>

                  {canViewCost && (
                    <>
                      <th className="px-4 py-4 text-right">
                        WAC
                      </th>
                      <th className="px-4 py-4 text-right">
                        Variance
                      </th>
                    </>
                  )}

                  <th className="px-4 py-4">
                    Status
                  </th>
                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(rows || []).map(
                  (row) => {

                    const difference =
                      Number(
                        row.difference_qty || 0
                      )

                    return (
                      <tr key={row.id}>

                        <td className="px-4 py-4">

                          <p className="font-bold">
                            {row.item_name}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {row.item_sku}
                          </p>

                        </td>

                        <td className="px-4 py-4 text-right">
                          {formatQty(
                            row.system_qty
                          )}
                          {' '}
                          {row.unit_code ||
                            ''}
                        </td>

                        <td className="px-4 py-4 text-right font-bold">
                          {formatQty(
                            row.physical_qty
                          )}
                          {' '}
                          {row.unit_code ||
                            ''}
                        </td>

                        <td
                          className={`px-4 py-4 text-right font-bold ${
                            difference < 0
                              ? 'text-red-700'
                              : difference > 0
                                ? 'text-amber-700'
                                : 'text-green-700'
                          }`}
                        >
                          {difference > 0
                            ? '+'
                            : ''}
                          {formatQty(
                            difference
                          )}
                          {' '}
                          {row.unit_code ||
                            ''}
                        </td>

                        {canViewCost && (
                          <>
                            <td className="px-4 py-4 text-right">
                              Rp{' '}
                              {formatCost(
                                row.unit_cost
                              )}
                            </td>

                            <td className="px-4 py-4 text-right font-bold">
                              {formatRupiah(
                                row.variance_value
                              )}
                            </td>
                          </>
                        )}

                        <td className="px-4 py-4">

                          {difference === 0 ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                              MATCH
                            </span>
                          ) : difference < 0 ? (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                              SHORTAGE
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              SURPLUS
                            </span>
                          )}

                        </td>

                      </tr>
                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        </div>

        {opname.notes && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-zinc-500">
              Notes
            </p>
            <p className="mt-2">
              {opname.notes}
            </p>
          </div>
        )}

      </div>

    </main>
  )
}
