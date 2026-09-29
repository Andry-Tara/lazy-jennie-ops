import Link from 'next/link'

import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'


type Props = {
  params: Promise<{
    shiftId: string
  }>
}


function money(
  value:
    | number
    | string
    | null
    | undefined
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


function dateTime(
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
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }
  ).format(
    new Date(
      value
    )
  )

}


export default async function ShiftDetailPage({
  params,
}: Props) {

  const {
    shiftId,
  } =
    await params


  const supabase =
    await createClient()


  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {
    redirect('/login')
  }


  const {
    data: shift,
    error: shiftError,
  } =
    await supabase
      .from(
        'cashier_shifts_secure'
      )
      .select('*')
      .eq(
        'id',
        shiftId
      )
      .maybeSingle()


  if (
    shiftError ||
    !shift
  ) {
    notFound()
  }


  const {
    data: transactions,
  } =
    await supabase
      .from(
        'cashier_shift_transactions_secure'
      )
      .select('*')
      .eq(
        'shift_id',
        shiftId
      )
      .order(
        'posted_at',
        {
          ascending: true,
        }
      )


  const {
    data: movements,
  } =
    await supabase
      .from(
        'cashier_cash_movements_secure'
      )
      .select('*')
      .eq(
        'shift_id',
        shiftId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )


  const variance =
    Number(
      shift.variance ||
      0
    )


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1600px]">

        <header className="flex flex-wrap items-end justify-between gap-5">

          <div>

            <Link
              href="/dashboard/pos/closing/history"
              className="text-sm font-semibold text-zinc-500"
            >
              ← Shift History
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              Cashier Closing Audit
            </p>


            <h1 className="mt-1 text-4xl font-black">
              {
                shift.shift_no
              }
            </h1>


            <p className="mt-2 text-zinc-500">
              {
                shift.outlet_name
              }
              {' · '}
              {
                shift.cashier_email ||
                'Cashier'
              }
            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <Link
              href={`/print/cashier-shift/${shift.id}?format=80&autoprint=1`}
              target="_blank"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black"
            >
              Print 80mm
            </Link>


            <Link
              href={`/print/cashier-shift/${shift.id}?format=a4&autoprint=1`}
              target="_blank"
              className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
            >
              Print A4
            </Link>

          </div>

        </header>


        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">

          <Metric
            label="Total Sales"
            value={
              money(
                shift.summary_total_sales
              )
            }
          />

          <Metric
            label="Transactions"
            value={
              String(
                shift.summary_transaction_count
              )
            }
          />

          <Metric
            label="Expected Cash"
            value={
              money(
                shift.summary_expected_cash
              )
            }
          />

          <Metric
            label="Actual Cash"
            value={
              shift.actual_cash ===
              null
                ? '—'
                : money(
                    shift.actual_cash
                  )
            }
          />

          <Metric
            label="Variance"
            value={
              shift.status ===
              'CLOSED'
                ? money(
                    variance
                  )
                : '—'
            }
            good={
              shift.status ===
                'CLOSED' &&
              variance ===
                0
            }
          />

        </section>


        <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

            <div className="border-b border-zinc-200 p-5">

              <h2 className="text-xl font-black">
                Shift Transactions
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Every sale explicitly bound to this cashier shift.
              </p>

            </div>


            <div className="overflow-x-auto">

              <table className="w-full min-w-[900px]">

                <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">

                  <tr>
                    <th className="px-5 py-4">
                      Time
                    </th>
                    <th className="px-5 py-4">
                      Sale
                    </th>
                    <th className="px-5 py-4">
                      Order
                    </th>
                    <th className="px-5 py-4">
                      Table
                    </th>
                    <th className="px-5 py-4">
                      Payment
                    </th>
                    <th className="px-5 py-4 text-right">
                      Amount
                    </th>
                    <th className="px-5 py-4">
                      Status
                    </th>
                    <th className="px-5 py-4">
                      Action
                    </th>
                  </tr>

                </thead>


                <tbody className="divide-y divide-zinc-100">

                  {(transactions || []).map(
                    (
                      row
                    ) => (

                      <tr
                        key={
                          row.sale_id
                        }
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-5 py-4 text-sm">
                          {
                            dateTime(
                              row.posted_at
                            )
                          }
                        </td>


                        <td className="px-5 py-4 font-bold">
                          {
                            row.sale_no
                          }
                        </td>


                        <td className="px-5 py-4 text-sm">
                          {
                            row.order_no ||
                            '-'
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                            {
                              row.table_code
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black">
                            {
                              row.payment_method
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-right font-black">
                          {
                            money(
                              row.grand_total
                            )
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">
                            {
                              row.status
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          {row.order_id ? (

                            <Link
                              href={`/print/order-receipt/${row.order_id}`}
                              target="_blank"
                              className="font-black text-red-900"
                            >
                              Receipt
                            </Link>

                          ) : (
                            '—'
                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>


          <aside className="space-y-5">

            <section className="rounded-2xl border border-zinc-200 bg-white p-5">

              <h2 className="text-lg font-black">
                Closing Summary
              </h2>


              <div className="mt-5 space-y-3">

                <Row
                  label="Cash Sales"
                  value={
                    money(
                      shift.summary_cash_sales
                    )
                  }
                />

                <Row
                  label="QRIS"
                  value={
                    money(
                      shift.summary_qris_sales
                    )
                  }
                />

                <Row
                  label="Card"
                  value={
                    money(
                      shift.summary_card_sales
                    )
                  }
                />

                <Row
                  label="Transfer"
                  value={
                    money(
                      shift.summary_transfer_sales
                    )
                  }
                />


                <div className="border-t border-zinc-200 pt-3">

                  <Row
                    label="Opening Cash"
                    value={
                      money(
                        shift.opening_cash
                      )
                    }
                  />

                </div>


                <Row
                  label="+ Cash Sales"
                  value={
                    money(
                      shift.summary_cash_sales
                    )
                  }
                />


                <Row
                  label="+ Cash In"
                  value={
                    money(
                      shift.summary_cash_in
                    )
                  }
                />


                <Row
                  label="- Cash Out"
                  value={
                    money(
                      shift.summary_cash_out
                    )
                  }
                />


                <div className="border-t border-zinc-200 pt-3">

                  <Row
                    label="Expected Cash"
                    value={
                      money(
                        shift.summary_expected_cash
                      )
                    }
                    strong
                  />

                </div>


                <Row
                  label="Actual Cash"
                  value={
                    shift.actual_cash ===
                    null
                      ? '—'
                      : money(
                          shift.actual_cash
                        )
                  }
                  strong
                />


                <div
                  className={
                    `rounded-xl p-4 ${
                      variance ===
                      0
                        ? 'bg-green-50'
                        : 'bg-red-50'
                    }`
                  }
                >

                  <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                    Variance
                  </p>

                  <p
                    className={
                      `mt-1 text-xl font-black ${
                        variance ===
                        0
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`
                    }
                  >
                    {
                      money(
                        variance
                      )
                    }
                  </p>

                  <p className="mt-1 text-xs font-bold">
                    {
                      variance ===
                      0
                        ? '✓ Balanced'
                        : variance >
                          0
                          ? 'Cash Over'
                          : 'Cash Short'
                    }
                  </p>

                </div>

              </div>

            </section>


            <section className="rounded-2xl border border-zinc-200 bg-white p-5">

              <h2 className="text-lg font-black">
                Shift Information
              </h2>


              <div className="mt-4 space-y-3">

                <Row
                  label="Status"
                  value={
                    shift.status
                  }
                />

                <Row
                  label="Opened"
                  value={
                    dateTime(
                      shift.opened_at
                    )
                  }
                />

                <Row
                  label="Closed"
                  value={
                    dateTime(
                      shift.closed_at
                    )
                  }
                />

              </div>


              {shift.closing_notes && (

                <div className="mt-5 rounded-xl bg-zinc-50 p-4">

                  <p className="text-xs font-black uppercase text-zinc-500">
                    Closing Notes
                  </p>

                  <p className="mt-2 text-sm">
                    {
                      shift.closing_notes
                    }
                  </p>

                </div>

              )}

            </section>


            {(movements || []).length >
              0 && (

              <section className="rounded-2xl border border-zinc-200 bg-white p-5">

                <h2 className="text-lg font-black">
                  Cash Movements
                </h2>


                <div className="mt-4 divide-y divide-zinc-100">

                  {(movements || []).map(
                    (
                      movement
                    ) => (

                      <div
                        key={
                          movement.id
                        }
                        className="py-3"
                      >

                        <div className="flex justify-between gap-4">

                          <span className="font-bold">
                            {
                              movement.movement_type
                            }
                          </span>

                          <strong>
                            {
                              money(
                                movement.amount
                              )
                            }
                          </strong>

                        </div>

                        <p className="mt-1 text-xs text-zinc-500">
                          {
                            movement.reason
                          }
                        </p>

                      </div>

                    )
                  )}

                </div>

              </section>

            )}

          </aside>

        </div>

      </div>

    </main>
  )
}


function Metric({
  label,
  value,
  good = false,
}: {
  label: string
  value: string
  good?: boolean
}) {

  return (
    <div
      className={
        `rounded-2xl border p-5 ${
          good
            ? 'border-green-200 bg-green-50'
            : 'border-zinc-200 bg-white'
        }`
      }
    >
      <p className="text-xs font-black uppercase tracking-wide text-zinc-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>
    </div>
  )
}


function Row({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {

  return (
    <div className="flex items-center justify-between gap-4">

      <span
        className={
          strong
            ? 'font-black'
            : 'text-sm text-zinc-600'
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? 'font-black'
            : 'text-sm font-bold'
        }
      >
        {value}
      </span>

    </div>
  )
}
