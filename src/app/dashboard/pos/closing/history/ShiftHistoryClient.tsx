'use client'

import Link from 'next/link'

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  createClient,
} from '@/lib/supabase/client'


type Outlet = {
  id: string
  code: string
  name: string
}


type Shift = {
  id: string
  shift_no: string

  outlet_id: string
  outlet_code: string
  outlet_name: string

  cashier_id: string
  cashier_email: string | null

  status: string

  opening_cash:
    number | string

  opened_at: string
  closed_at: string | null

  actual_cash:
    number | string | null

  summary_cash_sales:
    number | string

  summary_qris_sales:
    number | string

  summary_card_sales:
    number | string

  summary_transfer_sales:
    number | string

  summary_other_sales:
    number | string

  summary_total_sales:
    number | string

  summary_transaction_count:
    number

  summary_cash_in:
    number | string

  summary_cash_out:
    number | string

  summary_expected_cash:
    number | string

  variance:
    number | string | null
}


const PAGE_SIZE = 20


export default function ShiftHistoryClient({
  outlets,
}: {
  outlets: Outlet[]
}) {

  const supabase =
    useMemo(
      () => createClient(),
      []
    )


  const [
    rows,
    setRows,
  ] =
    useState<Shift[]>([])


  const [
    count,
    setCount,
  ] =
    useState(0)


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    search,
    setSearch,
  ] =
    useState('')


  const [
    outletId,
    setOutletId,
  ] =
    useState('ALL')


  const [
    status,
    setStatus,
  ] =
    useState('ALL')


  const [
    dateFrom,
    setDateFrom,
  ] =
    useState('')


  const [
    dateTo,
    setDateTo,
  ] =
    useState('')


  const [
    page,
    setPage,
  ] =
    useState(0)


  function money(
    value:
      | number
      | string
      | null
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

        hour12:
          false,

        timeZone:
          'Asia/Jakarta',
      }
    ).format(
      new Date(
        value
      )
    )

  }


  const load =
    useCallback(
      async () => {

        setLoading(true)


        let query =
          supabase
            .from(
              'cashier_shifts_secure'
            )
            .select(
              '*',
              {
                count:
                  'exact',
              }
            )


        if (
          outletId !==
          'ALL'
        ) {

          query =
            query.eq(
              'outlet_id',
              outletId
            )

        }


        if (
          status !==
          'ALL'
        ) {

          query =
            query.eq(
              'status',
              status
            )

        }


        if (dateFrom) {

          query =
            query.gte(
              'opened_at',
              `${dateFrom}T00:00:00+07:00`
            )

        }


        if (dateTo) {

          query =
            query.lte(
              'opened_at',
              `${dateTo}T23:59:59+07:00`
            )

        }


        const clean =
          search
            .trim()
            .replace(
              /[,()%]/g,
              ' '
            )


        if (clean) {

          query =
            query.or(
              [
                `shift_no.ilike.%${clean}%`,
                `outlet_name.ilike.%${clean}%`,
                `cashier_email.ilike.%${clean}%`,
              ].join(',')
            )

        }


        const from =
          page *
          PAGE_SIZE


        const {
          data,
          count:
            total,
          error,
        } =
          await query
            .order(
              'opened_at',
              {
                ascending:
                  false,
              }
            )
            .range(
              from,
              from +
              PAGE_SIZE -
              1
            )


        if (!error) {

          setRows(
            (
              data ||
              []
            ) as Shift[]
          )

          setCount(
            total ||
            0
          )

        }


        setLoading(false)

      },
      [
        dateFrom,
        dateTo,
        outletId,
        page,
        search,
        status,
        supabase,
      ]
    )


  useEffect(
    () => {

      void load()

    },
    [
      load,
    ]
  )


  useEffect(
    () => {

      setPage(0)

    },
    [
      search,
      outletId,
      status,
      dateFrom,
      dateTo,
    ]
  )


  // ========================================================
  // SHIFT HISTORY POLISH V2
  // ========================================================

  const visibleTotalSales =
    rows.reduce(
      (
        total,
        row
      ) =>
        total +
        Number(
          row.summary_total_sales ||
          0
        ),
      0
    )


  const visibleBalanced =
    rows.filter(
      (
        row
      ) =>
        row.status ===
          'CLOSED' &&
        Number(
          row.variance ||
          0
        ) ===
          0
    ).length


  const visibleVarianceIssues =
    rows.filter(
      (
        row
      ) =>
        row.status ===
          'CLOSED' &&
        Number(
          row.variance ||
          0
        ) !==
          0
    ).length


  function setDatePreset(
    preset:
      | 'TODAY'
      | '7D'
      | '30D'
      | 'ALL'
  ) {

    if (
      preset ===
      'ALL'
    ) {

      setDateFrom('')
      setDateTo('')

      return

    }


    const now =
      new Date()


    const jakartaToday =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Jakarta',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        }
      ).format(
        now
      )


    let daysBack =
      0


    if (
      preset ===
      '7D'
    ) {
      daysBack =
        6
    }


    if (
      preset ===
      '30D'
    ) {
      daysBack =
        29
    }


    const from =
      new Date(
        now.getTime() -
        (
          daysBack *
          86400000
        )
      )


    const jakartaFrom =
      new Intl.DateTimeFormat(
        'en-CA',
        {
          timeZone:
            'Asia/Jakarta',

          year:
            'numeric',

          month:
            '2-digit',

          day:
            '2-digit',
        }
      ).format(
        from
      )


    setDateFrom(
      jakartaFrom
    )

    setDateTo(
      jakartaToday
    )

  }


  const pages =
    Math.max(
      1,
      Math.ceil(
        count /
        PAGE_SIZE
      )
    )


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1600px]">

        <header>

          <Link
            href="/dashboard/pos/closing"
            className="text-sm font-semibold text-zinc-500"
          >
            ← Cashier Shift
          </Link>


          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
            Restaurant Operations
          </p>


          <h1 className="mt-1 text-4xl font-black">
            Shift History
          </h1>


          <p className="mt-2 text-zinc-500">
            Search, review and audit cashier closing sessions.
          </p>

        </header>


        <section className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
              Shifts Found
            </p>

            <p className="mt-2 text-3xl font-black">
              {
                count
              }
            </p>

          </div>


          <div className="rounded-2xl border border-zinc-200 bg-zinc-950 p-5 text-white shadow-sm">

            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
              Sales On This Page
            </p>

            <p className="mt-2 text-2xl font-black">
              {
                money(
                  visibleTotalSales
                )
              }
            </p>

          </div>


          <div className="rounded-2xl border border-green-100 bg-green-50 p-5">

            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-green-600">
              Balanced
            </p>

            <p className="mt-2 text-3xl font-black text-green-800">
              {
                visibleBalanced
              }
            </p>

          </div>


          <div
            className={
              `rounded-2xl border p-5 ${
                visibleVarianceIssues > 0
                  ? 'border-red-100 bg-red-50'
                  : 'border-zinc-200 bg-white'
              }`
            }
          >

            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-zinc-400">
              Variance Issues
            </p>

            <p
              className={
                `mt-2 text-3xl font-black ${
                  visibleVarianceIssues > 0
                    ? 'text-red-700'
                    : 'text-zinc-950'
                }`
              }
            >
              {
                visibleVarianceIssues
              }
            </p>

          </div>

        </section>


        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <div>

              <p className="font-black">
                Shift Filters
              </p>

              <p className="mt-1 text-xs text-zinc-500">
                Review closing sessions by date, outlet and status.
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <button
                type="button"
                onClick={() =>
                  setDatePreset(
                    'TODAY'
                  )
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black"
              >
                Today
              </button>

              <button
                type="button"
                onClick={() =>
                  setDatePreset(
                    '7D'
                  )
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black"
              >
                Last 7 Days
              </button>

              <button
                type="button"
                onClick={() =>
                  setDatePreset(
                    '30D'
                  )
                }
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-black"
              >
                Last 30 Days
              </button>

              <button
                type="button"
                onClick={() =>
                  setDatePreset(
                    'ALL'
                  )
                }
                className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-black text-white"
              >
                All Dates
              </button>

            </div>

          </div>


          <div className="grid gap-3 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search shift / outlet / cashier..."
              className="rounded-xl border border-zinc-300 px-4 py-3"
            />


            <select
              value={
                outletId
              }
              onChange={(
                event
              ) =>
                setOutletId(
                  event.target.value
                )
              }
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-bold"
            >
              <option value="ALL">
                All Outlets
              </option>

              {outlets.map(
                (
                  outlet
                ) => (
                  <option
                    key={
                      outlet.id
                    }
                    value={
                      outlet.id
                    }
                  >
                    {
                      outlet.name
                    }
                  </option>
                )
              )}
            </select>


            <select
              value={
                status
              }
              onChange={(
                event
              ) =>
                setStatus(
                  event.target.value
                )
              }
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-bold"
            >
              <option value="ALL">
                All Status
              </option>
              <option value="OPEN">
                Open
              </option>
              <option value="CLOSED">
                Closed
              </option>
            </select>


            <label className="rounded-xl border border-zinc-300 bg-white px-3 py-2">

              <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                Start Date
              </span>

              <input
                type="date"
                value={
                  dateFrom
                }
                onChange={(
                  event
                ) =>
                  setDateFrom(
                    event.target.value
                  )
                }
                className="mt-1 w-full bg-transparent text-sm font-bold outline-none"
              />

            </label>


            <label className="rounded-xl border border-zinc-300 bg-white px-3 py-2">

              <span className="block text-[10px] font-black uppercase tracking-wider text-zinc-400">
                End Date
              </span>

              <input
                type="date"
                value={
                  dateTo
                }
                onChange={(
                  event
                ) =>
                  setDateTo(
                    event.target.value
                  )
                }
                className="mt-1 w-full bg-transparent text-sm font-bold outline-none"
              />

            </label>

          </div>

        </section>


        <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1200px]">

              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">

                <tr>
                  <th className="px-5 py-4">
                    Shift
                  </th>
                  <th className="px-5 py-4">
                    Outlet / Cashier
                  </th>
                  <th className="px-5 py-4">
                    Period
                  </th>
                  <th className="px-5 py-4">
                    Transactions
                  </th>
                  <th className="px-5 py-4">
                    Sales
                  </th>
                  <th className="px-5 py-4">
                    Expected
                  </th>
                  <th className="px-5 py-4">
                    Actual
                  </th>
                  <th className="px-5 py-4">
                    Variance
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

                {rows.map(
                  (
                    row
                  ) => {

                    const variance =
                      Number(
                        row.variance ||
                        0
                      )


                    return (

                      <tr
                        key={
                          row.id
                        }
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-5 py-5">

                          <p className="font-black">
                            {
                              row.shift_no
                            }
                          </p>

                        </td>


                        <td className="px-5 py-5">

                          <p className="font-bold">
                            {
                              row.outlet_name
                            }
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {
                              row.cashier_email ||
                              '-'
                            }
                          </p>

                        </td>


                        <td className="px-5 py-5 text-sm">

                          <p>
                            {
                              dateTime(
                                row.opened_at
                              )
                            }
                          </p>

                          <p className="mt-1 text-zinc-500">
                            → {
                              dateTime(
                                row.closed_at
                              )
                            }
                          </p>

                        </td>


                        <td className="px-5 py-5 font-bold">
                          {
                            row.summary_transaction_count
                          }
                        </td>


                        <td className="px-5 py-5 font-black">
                          {
                            money(
                              row.summary_total_sales
                            )
                          }
                        </td>


                        <td className="px-5 py-5">
                          {
                            money(
                              row.summary_expected_cash
                            )
                          }
                        </td>


                        <td className="px-5 py-5">
                          {
                            row.actual_cash ===
                            null
                              ? '—'
                              : money(
                                  row.actual_cash
                                )
                          }
                        </td>


                        <td className="px-5 py-5">

                          {row.status ===
                          'CLOSED' ? (

                            <span
                              className={
                                `rounded-full px-3 py-1 text-xs font-black ${
                                  variance ===
                                  0
                                    ? 'bg-green-50 text-green-700'
                                    : 'bg-red-50 text-red-700'
                                }`
                              }
                            >
                              {
                                money(
                                  variance
                                )
                              }
                              {
                                variance ===
                                0
                                  ? ' · Balanced'
                                  : variance >
                                    0
                                    ? ' · Over'
                                    : ' · Short'
                              }
                            </span>

                          ) : (
                            '—'
                          )}

                        </td>


                        <td className="px-5 py-5">

                          <span
                            className={
                              `rounded-full px-3 py-1 text-xs font-black ${
                                row.status ===
                                'CLOSED'
                                  ? 'bg-zinc-100 text-zinc-700'
                                  : 'bg-green-50 text-green-700'
                              }`
                            }
                          >
                            {
                              row.status
                            }
                          </span>

                        </td>


                        <td className="px-5 py-5">

                          <Link
                            href={`/dashboard/pos/closing/history/${row.id}`}
                            className="font-black text-red-900 hover:underline"
                          >
                            View Detail →
                          </Link>

                        </td>

                      </tr>

                    )

                  }
                )}


                {!loading &&
                  rows.length ===
                    0 && (

                  <tr>

                    <td
                      colSpan={
                        10
                      }
                      className="px-5 py-16 text-center font-semibold text-zinc-400"
                    >
                      No cashier shifts found.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>


          <div className="flex items-center justify-between border-t border-zinc-200 p-5">

            <p className="text-sm text-zinc-500">
              {
                count
              } shifts
            </p>


            <div className="flex items-center gap-3">

              <button
                type="button"
                disabled={
                  page ===
                  0
                }
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.max(
                        0,
                        current -
                        1
                      )
                  )
                }
                className="h-10 w-10 rounded-lg border border-zinc-300 font-black disabled:opacity-30"
              >
                ‹
              </button>


              <span className="text-sm font-black">
                {
                  page +
                  1
                } / {
                  pages
                }
              </span>


              <button
                type="button"
                disabled={
                  page +
                  1 >=
                  pages
                }
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      current +
                      1
                  )
                }
                className="h-10 w-10 rounded-lg border border-zinc-300 font-black disabled:opacity-30"
              >
                ›
              </button>

            </div>

          </div>

        </section>

      </div>

    </main>
  )
}
