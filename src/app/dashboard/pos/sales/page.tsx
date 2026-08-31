import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SalesAccess = {
  role_code: string | null
  outlet_id: string | null
  can_view_cost: boolean
  can_view_override_audit: boolean
}

export default async function SalesHistoryPage() {
  const supabase =
    await createClient()

  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: { user },
  } =
    await supabase.auth
      .getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // ACCESS
  // =====================================================

  const {
    data: accessData,
  } =
    await supabase.rpc(
      'get_my_sales_access'
    )

  const access =
    accessData as unknown as SalesAccess | null

  const canViewCost =
    Boolean(
      access?.can_view_cost
    )

  // =====================================================
  // SECURE SALES
  // =====================================================

  const {
    data: sales,
    error: salesError,
  } =
    await supabase
      .from('sales_secure')
      .select(`
        id,
        sale_no,
        sale_date,
        transaction_date,
        outlet_id,
        status,
        subtotal,
        discount_amount,
        service_amount,
        tax_amount,
        net_sales,
        grand_total,
        total_cogs,
        gross_profit,
        payment_method,
        stock_override_used,
        created_at
      `)
      .order(
        'transaction_date',
        {
          ascending: false,
        }
      )

  // =====================================================
  // OUTLETS
  // =====================================================

  const outletIds =
    Array.from(
      new Set(
        (sales || []).map(
          (row) =>
            row.outlet_id
        )
      )
    )

  let outlets: {
    id: string
    code: string
    name: string
  }[] = []

  if (
    outletIds.length >
    0
  ) {
    const {
      data,
    } =
      await supabase
        .from('outlets')
        .select(`
          id,
          code,
          name
        `)
        .in(
          'id',
          outletIds
        )

    outlets =
      data || []
  }

  const outletMap =
    new Map(
      outlets.map(
        (outlet) => [
          outlet.id,
          outlet,
        ]
      )
    )

  // =====================================================
  // SUMMARY
  // =====================================================

  const postedSales =
    (sales || []).filter(
      (sale) =>
        sale.status ===
        'POSTED'
    )

  const totalTransactions =
    postedSales.length

  const totalNetSales =
    postedSales.reduce(
      (total, sale) =>
        total +
        Number(
          sale.net_sales || 0
        ),
      0
    )

  const totalGrandTotal =
    postedSales.reduce(
      (total, sale) =>
        total +
        Number(
          sale.grand_total || 0
        ),
      0
    )

  const totalCogs =
    canViewCost
      ? postedSales.reduce(
          (total, sale) =>
            total +
            Number(
              sale.total_cogs || 0
            ),
          0
        )
      : 0

  const totalGrossProfit =
    canViewCost
      ? postedSales.reduce(
          (total, sale) =>
            total +
            Number(
              sale.gross_profit || 0
            ),
          0
        )
      : 0

  const grossMargin =
    canViewCost &&
    totalNetSales > 0
      ? (
          totalGrossProfit /
          totalNetSales
        ) * 100
      : 0

  // =====================================================
  // FORMAT
  // =====================================================

  function formatRupiah(
    value:
      number |
      string |
      null
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style:
          'currency',

        currency:
          'IDR',

        maximumFractionDigits:
          0,
      }
    ).format(
      Number(
        value || 0
      )
    )
  }

  function formatPercent(
    value: number
  ) {
    return `${value.toLocaleString(
      'id-ID',
      {
        minimumFractionDigits:
          1,

        maximumFractionDigits:
          1,
      }
    )}%`
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

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Point of Sale
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Sales History
            </h1>

            <p className="mt-2 text-zinc-500">
              POS Transaction History
            </p>

          </div>

          <Link
            href="/dashboard/pos"
            className="rounded-xl bg-red-900 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800"
          >
            + New Sale
          </Link>

        </div>

        {/* ACCESS INFO */}

        {!canViewCost && (

          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

            <p className="font-bold text-blue-900">
              Operational Sales View
            </p>

            <p className="mt-1 text-sm text-blue-800">
              COGS, Gross Profit and inventory costing are restricted for this role.
            </p>

          </div>

        )}

        {/* SUMMARY */}

        <div
          className={`mb-8 grid gap-4 ${
            canViewCost
              ? 'md:grid-cols-2 lg:grid-cols-4'
              : 'md:grid-cols-3'
          }`}
        >

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Transactions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {totalTransactions}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Net Sales
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                totalNetSales
              )}
            </p>

          </div>

          {!canViewCost && (

            <div className="rounded-2xl bg-white p-6 shadow-sm">

              <p className="text-sm text-zinc-500">
                Collected
              </p>

              <p className="mt-2 text-2xl font-bold">
                {formatRupiah(
                  totalGrandTotal
                )}
              </p>

              <p className="mt-2 text-xs text-zinc-400">
                Includes service & tax
              </p>

            </div>

          )}

          {canViewCost && (
            <>
              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm text-zinc-500">
                  Actual COGS
                </p>

                <p className="mt-2 text-2xl font-bold text-red-700">
                  {formatRupiah(
                    totalCogs
                  )}
                </p>

              </div>

              <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

                <p className="text-sm text-red-200">
                  Gross Profit
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatRupiah(
                    totalGrossProfit
                  )}
                </p>

                <p className="mt-2 text-xs text-red-200">
                  Margin{' '}
                  {formatPercent(
                    grossMargin
                  )}
                </p>

              </div>
            </>
          )}

        </div>

        {/* ERROR */}

        {salesError && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {salesError.message}
          </div>

        )}

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              POS Transactions
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Click Sale No to review transaction detail.
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Sale No
                  </th>

                  <th className="px-5 py-4">
                    Date / Time
                  </th>

                  <th className="px-5 py-4">
                    Outlet
                  </th>

                  <th className="px-5 py-4">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-right">
                    Net Sales
                  </th>

                  <th className="px-5 py-4 text-right">
                    Collected
                  </th>

                  {canViewCost && (
                    <>
                      <th className="px-5 py-4 text-right">
                        COGS
                      </th>

                      <th className="px-5 py-4 text-right">
                        Gross Profit
                      </th>

                      <th className="px-5 py-4 text-right">
                        Margin
                      </th>
                    </>
                  )}

                  <th className="px-5 py-4">
                    Control
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(sales || []).map(
                  (sale) => {

                    const outlet =
                      outletMap.get(
                        sale.outlet_id
                      )

                    const netSales =
                      Number(
                        sale.net_sales || 0
                      )

                    const grossProfit =
                      Number(
                        sale.gross_profit || 0
                      )

                    const margin =
                      canViewCost &&
                      netSales > 0
                        ? (
                            grossProfit /
                            netSales
                          ) * 100
                        : 0

                    return (

                      <tr
                        key={
                          sale.id
                        }
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-5 py-4">

                          <Link
                            href={`/dashboard/pos/sales/${sale.id}`}
                            className="font-bold text-red-900 hover:underline"
                          >
                            {sale.sale_no}
                          </Link>

                        </td>

                        <td className="px-5 py-4">
                          {formatDateTime(
                            sale.transaction_date
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {outlet?.name ||
                              '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {outlet?.code ||
                              ''}
                          </p>

                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {sale.payment_method ||
                            '-'}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            sale.net_sales
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            sale.grand_total
                          )}
                        </td>

                        {canViewCost && (
                          <>
                            <td className="px-5 py-4 text-right font-semibold text-red-700">
                              {formatRupiah(
                                sale.total_cogs
                              )}
                            </td>

                            <td className="px-5 py-4 text-right font-bold text-green-700">
                              {formatRupiah(
                                sale.gross_profit
                              )}
                            </td>

                            <td className="px-5 py-4 text-right font-semibold">
                              {formatPercent(
                                margin
                              )}
                            </td>
                          </>
                        )}

                        <td className="px-5 py-4">

                          {sale.stock_override_used ? (

                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700">
                              OVERRIDE
                            </span>

                          ) : (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700">
                              NORMAL
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

          {!sales?.length && (

            <div className="p-12 text-center">

              <p className="font-bold">
                No POS Sales
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                No transactions are available for your account and assigned outlet.
              </p>

            </div>

          )}

        </div>

      </div>

    </main>
  )
}
