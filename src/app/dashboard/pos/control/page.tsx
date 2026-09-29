import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

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

export default async function POSControlPage() {
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
    data: sales,
    error,
  } =
    await supabase
      .from('sales_secure')
      .select(`
        id,
        sale_no,
        transaction_date,
        outlet_id,
        status,
        subtotal,
        discount_amount,
        complimentary_amount,
        void_amount,
        net_sales,
        grand_total,
        payment_method,
        has_control_actions
      `)
      .order(
        'transaction_date',
        {
          ascending: false,
        }
      )
      .limit(50)

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Point of Sale
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              RESTAURANT OPERATIONS
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              POS Control
            </h1>

            <p className="mt-2 text-zinc-500">
              Discount, Complimentary, Void & Audit
            </p>

          </div>

          <div className="flex gap-3">

            <Link
              href="/dashboard/pos/approvals"
              className="rounded-xl border border-amber-300 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-900"
            >
              Approval Queue
            </Link>

            <Link
              href="/dashboard/pos/settings"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold"
            >
              Discount Settings
            </Link>

          </div>

        </div>

        {error && (
          <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
            {error.message}
          </div>
        )}

        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-4 border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-500">
            <div>Sale</div>
            <div>Control</div>
            <div>Net Sales</div>
            <div>Grand Total</div>
            <div />
          </div>

          {!sales?.length ? (
            <div className="p-12 text-center">

              <p className="font-bold">
                Belum ada sale.
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                Post transaksi dari POS terlebih dahulu.
              </p>

            </div>
          ) : (
            <div className="divide-y divide-zinc-100">

              {sales.map(
                (sale) => (
                  <div
                    key={sale.id}
                    className="grid grid-cols-[1.3fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-4"
                  >

                    <div>

                      <p className="font-bold">
                        {sale.sale_no}
                      </p>

                      <p className="mt-1 text-xs text-zinc-400">
                        {new Date(
                          sale.transaction_date
                        ).toLocaleString(
                          'id-ID'
                        )}
                        {' • '}
                        {sale.payment_method || '-'}
                      </p>

                    </div>

                    <div className="text-sm">

                      {sale.has_control_actions ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                          CONTROLLED
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500">
                          CLEAN
                        </span>
                      )}

                      <p className="mt-2 text-xs text-zinc-500">
                        Disc {formatRupiah(
                          Number(
                            sale.discount_amount || 0
                          )
                        )}
                        {' • '}
                        Comp {formatRupiah(
                          Number(
                            sale.complimentary_amount || 0
                          )
                        )}
                        {' • '}
                        Void {formatRupiah(
                          Number(
                            sale.void_amount || 0
                          )
                        )}
                      </p>

                    </div>

                    <div className="font-semibold">
                      {formatRupiah(
                        Number(
                          sale.net_sales || 0
                        )
                      )}
                    </div>

                    <div className="font-bold text-red-900">
                      {formatRupiah(
                        Number(
                          sale.grand_total || 0
                        )
                      )}
                    </div>

                    <Link
                      href={`/dashboard/pos/control/${sale.id}`}
                      className="rounded-lg bg-red-900 px-4 py-2 text-sm font-bold text-white hover:bg-red-800"
                    >
                      Open
                    </Link>

                  </div>
                )
              )}

            </div>
          )}

        </div>

      </div>

    </main>
  )
}
