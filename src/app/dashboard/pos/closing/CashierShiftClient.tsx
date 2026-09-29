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
  type: string
  is_active: boolean
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


type Transaction = {
  shift_id: string

  sale_id: string
  sale_no: string

  order_id: string | null
  order_no: string | null

  table_code: string

  order_type: string
  payment_method: string

  grand_total:
    number | string

  status: string

  posted_at: string
}


const PAGE_SIZES =
  [
    10,
    20,
    50,
    100,
  ]


export default function CashierShiftClient({
  outlets,
  defaultOutletId,
  cashierEmail,
  currentUserId,
  roleCode,
}: {
  outlets: Outlet[]
  defaultOutletId: string
  cashierEmail: string
  currentUserId: string
  roleCode: string
}) {

  const supabase =
    useMemo(
      () => createClient(),
      []
    )


  const [
    outletId,
    setOutletId,
  ] =
    useState(
      defaultOutletId
    )


  const [
    shift,
    setShift,
  ] =
    useState<Shift | null>(
      null
    )


  const [
    transactions,
    setTransactions,
  ] =
    useState<Transaction[]>(
      []
    )


  const [
    transactionCount,
    setTransactionCount,
  ] =
    useState(0)


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState('')


  const [
    success,
    setSuccess,
  ] =
    useState('')


  const [
    openingCash,
    setOpeningCash,
  ] =
    useState('')


  const [
    actualCash,
    setActualCash,
  ] =
    useState('')


  const [
    closingNotes,
    setClosingNotes,
  ] =
    useState('')


  const [
    search,
    setSearch,
  ] =
    useState('')


  const [
    paymentFilter,
    setPaymentFilter,
  ] =
    useState('ALL')


  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState('ALL')


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState('ALL')


  const [
    page,
    setPage,
  ] =
    useState(0)


  const [
    pageSize,
    setPageSize,
  ] =
    useState(10)


  const [
    movementMode,
    setMovementMode,
  ] =
    useState<
      'CASH_IN' |
      'CASH_OUT' |
      null
    >(null)


  const [
    movementAmount,
    setMovementAmount,
  ] =
    useState('')


  const [
    movementReason,
    setMovementReason,
  ] =
    useState('')


  const [
    working,
    setWorking,
  ] =
    useState(false)


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


  function time(
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

        timeZone:
          'Asia/Jakarta',
      }
    ).format(
      new Date(
        value
      )
    )

  }


  function duration(
    value:
      string |
      null
  ) {

    if (!value) {
      return '-'
    }


    const start =
      new Date(
        value
      ).getTime()


    const end =
      shift?.closed_at
        ? new Date(
            shift.closed_at
          ).getTime()
        : Date.now()


    const minutes =
      Math.max(
        0,
        Math.floor(
          (
            end -
            start
          ) /
          60000
        )
      )


    const hours =
      Math.floor(
        minutes /
        60
      )


    const remain =
      minutes % 60


    return `${hours}h ${remain}m`

  }


  const loadShift =
    useCallback(
      async (
        silent = false
      ) => {

        if (!outletId) {
          setShift(null)
          return null
        }


        if (!silent) {
          setLoading(true)
        }


        const {
          data,
          error:
            shiftError,
        } =
          await supabase
            .from(
              'cashier_shifts_secure'
            )
            .select('*')
            .eq(
              'outlet_id',
              outletId
            )
            .eq(
              'status',
              'OPEN'
            )
            .order(
              'opened_at',
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle()


        if (shiftError) {

          setError(
            shiftError.message
          )

          setShift(null)

        } else {

          setShift(
            data as
              Shift |
              null
          )

          setError('')

        }


        if (!silent) {
          setLoading(false)
        }


        return data as
          Shift |
          null

      },
      [
        outletId,
        supabase,
      ]
    )


  const loadTransactions =
    useCallback(
      async (
        targetShift:
          Shift |
          null =
          shift
      ) => {

        if (!targetShift) {

          setTransactions([])
          setTransactionCount(0)

          return

        }


        let query =
          supabase
            .from(
              'cashier_shift_transactions_secure'
            )
            .select(
              '*',
              {
                count:
                  'exact',
              }
            )
            .eq(
              'shift_id',
              targetShift.id
            )


        if (
          paymentFilter !==
          'ALL'
        ) {

          query =
            query.eq(
              'payment_method',
              paymentFilter
            )

        }


        if (
          typeFilter !==
          'ALL'
        ) {

          query =
            query.eq(
              'order_type',
              typeFilter
            )

        }


        if (
          statusFilter !==
          'ALL'
        ) {

          query =
            query.eq(
              'status',
              statusFilter
            )

        }


        const cleanSearch =
          search
            .trim()
            .replace(
              /[,()%]/g,
              ' '
            )


        if (cleanSearch) {

          query =
            query.or(
              [
                `sale_no.ilike.%${cleanSearch}%`,
                `order_no.ilike.%${cleanSearch}%`,
                `table_code.ilike.%${cleanSearch}%`,
              ].join(',')
            )

        }


        const from =
          page *
          pageSize


        const to =
          from +
          pageSize -
          1


        const {
          data,
          count,
          error:
            transactionError,
        } =
          await query
            .order(
              'posted_at',
              {
                ascending:
                  false,
              }
            )
            .range(
              from,
              to
            )


        if (
          transactionError
        ) {

          setError(
            transactionError.message
          )

          return

        }


        setTransactions(
          (
            data ||
            []
          ) as Transaction[]
        )


        setTransactionCount(
          count ||
          0
        )

      },
      [
        page,
        pageSize,
        paymentFilter,
        search,
        shift,
        statusFilter,
        supabase,
        typeFilter,
      ]
    )


  const refreshAll =
    useCallback(
      async () => {

        setRefreshing(true)


        const latest =
          await loadShift(
            true
          )


        await loadTransactions(
          latest
        )


        setRefreshing(false)

      },
      [
        loadShift,
        loadTransactions,
      ]
    )


  useEffect(
    () => {

      void loadShift()

    },
    [
      loadShift,
    ]
  )


  useEffect(
    () => {

      setPage(0)

    },
    [
      search,
      paymentFilter,
      typeFilter,
      statusFilter,
      pageSize,
    ]
  )


  useEffect(
    () => {

      void loadTransactions()

    },
    [
      loadTransactions,
    ]
  )


  const isCashierRole =
    roleCode === 'CASHIER'


  const isOwnShift =
    Boolean(
      shift &&
      shift.cashier_id ===
        currentUserId
    )


  const canOperateShift =
    isCashierRole &&
    isOwnShift


  async function openShift() {

    if (!isCashierRole) {

      setError(
        'Only Cashier can open a cashier shift.'
      )

      return

    }


    if (!outletId) {
      return
    }


    setWorking(true)
    setError('')
    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'open_cashier_shift_secure',
          {
            p_outlet_id:
              outletId,

            p_opening_cash:
              Number(
                openingCash ||
                0
              ),
          }
        )


      if (rpcError) {
        throw rpcError
      }


      setOpeningCash('')


      setSuccess(
        'Cashier shift berhasil dibuka.'
      )


      await refreshAll()

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        err?.details ||
        'Failed to open cashier shift.'
      )

    } finally {

      setWorking(false)

    }

  }


  async function recordMovement() {

    if (!canOperateShift) {

      setError(
        'Cash movement hanya dapat dilakukan oleh cashier pemilik shift.'
      )

      return

    }


    if (
      !shift ||
      !movementMode
    ) {
      return
    }


    setWorking(true)
    setError('')
    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'record_cashier_cash_movement_secure',
          {
            p_shift_id:
              shift.id,

            p_movement_type:
              movementMode,

            p_amount:
              Number(
                movementAmount ||
                0
              ),

            p_reason:
              movementReason,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      setMovementMode(null)
      setMovementAmount('')
      setMovementReason('')


      setSuccess(
        'Cash movement berhasil dicatat.'
      )


      await refreshAll()

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        err?.details ||
        'Failed to record cash movement.'
      )

    } finally {

      setWorking(false)

    }

  }


  async function closeShift() {

    if (!canOperateShift) {

      setError(
        'Shift ini hanya dapat ditutup oleh cashier pemilik shift.'
      )

      return

    }


    if (!shift) {
      return
    }


    if (
      actualCash.trim() ===
      ''
    ) {

      setError(
        'Actual Cash wajib diisi sebelum closing.'
      )

      return

    }


    const confirmed =
      window.confirm(
        `Close ${shift.shift_no}?\n\nSetelah shift CLOSED, angka closing akan menjadi snapshot final.`
      )


    if (!confirmed) {
      return
    }


    setWorking(true)
    setError('')
    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'close_cashier_shift_secure',
          {
            p_shift_id:
              shift.id,

            p_actual_cash:
              Number(
                actualCash
              ),

            p_notes:
              closingNotes ||
              null,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      setSuccess(
        'Cashier shift berhasil ditutup.'
      )


      setActualCash('')
      setClosingNotes('')


      await refreshAll()

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        err?.details ||
        'Failed to close cashier shift.'
      )

    } finally {

      setWorking(false)

    }

  }


  function exportCurrentPage() {

    if (
      transactions.length ===
      0
    ) {
      return
    }


    const rows =
      [
        [
          'Time',
          'Sale No',
          'Order No',
          'Table',
          'Type',
          'Payment',
          'Amount',
          'Status',
        ],

        ...transactions.map(
          (
            row
          ) => [
            time(
              row.posted_at
            ),

            row.sale_no,

            row.order_no ||
              '',

            row.table_code,

            row.order_type,

            row.payment_method,

            String(
              row.grand_total
            ),

            row.status,
          ]
        ),
      ]


    const csv =
      rows
        .map(
          (
            row
          ) =>
            row
              .map(
                (
                  cell
                ) =>
                  `"${String(
                    cell
                  ).replace(
                    /"/g,
                    '""'
                  )}"`
              )
              .join(',')
        )
        .join('\n')


    const blob =
      new Blob(
        [
          csv,
        ],
        {
          type:
            'text/csv;charset=utf-8;',
        }
      )


    const url =
      URL.createObjectURL(
        blob
      )


    const a =
      document.createElement(
        'a'
      )


    a.href =
      url


    a.download =
      `${
        shift?.shift_no ||
        'cashier-shift'
      }-transactions.csv`


    a.click()


    URL.revokeObjectURL(
      url
    )

  }


  const expectedCash =
    Number(
      shift
        ?.summary_expected_cash ||
      0
    )


  const actual =
    Number(
      actualCash ||
      0
    )


  const variance =
    actualCash.trim()
      ? actual -
        expectedCash
      : 0


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        transactionCount /
        pageSize
      )
    )


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1700px]">


        <header className="mb-6 flex flex-wrap items-end justify-between gap-5">

          <div>

            <Link
              href="/dashboard/pos"
              className="text-sm font-semibold text-zinc-500 hover:text-red-900"
            >
              ← Point of Sale
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              Restaurant Operations
            </p>


            <h1 className="mt-1 text-4xl font-black tracking-tight">
              Cashier Shift / Closing
            </h1>


            <p className="mt-2 text-zinc-500">
              Manage cashier session, transactions and closing reconciliation.
            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/pos/closing/history"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black hover:bg-zinc-50"
            >
              Shift History
            </Link>

            <select
              value={
                outletId
              }
              disabled={
                Boolean(
                  shift
                )
              }
              onChange={(
                event
              ) => {

                setOutletId(
                  event.target.value
                )

                setPage(0)

              }}
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-bold disabled:bg-zinc-100"
            >

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


            <button
              type="button"
              onClick={() =>
                void refreshAll()
              }
              disabled={
                refreshing
              }
              className="rounded-xl bg-zinc-950 px-5 py-3 font-black text-white disabled:opacity-50"
            >
              {
                refreshing
                  ? 'Refreshing...'
                  : '↻ Refresh'
              }
            </button>

          </div>

        </header>


        {error && (

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-5 py-4 font-semibold text-red-700">
            {error}
          </div>

        )}


        {success && (

          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-5 py-4 font-semibold text-green-700">
            ✓ {success}
          </div>

        )}


        {loading ? (

          <div className="rounded-2xl bg-white p-16 text-center font-bold text-zinc-500">
            Loading Cashier Shift...
          </div>

        ) : !shift ? (

          <section className="mx-auto mt-12 max-w-xl overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">

            <div className="border-b border-zinc-100 p-7">

              <p className="text-xs font-black uppercase tracking-[0.18em] text-red-800">
                Start Cashier Session
              </p>


              <h2 className="mt-2 text-3xl font-black">
                {
                  isCashierRole
                    ? 'Open Shift'
                    : 'No Active Outlet Shift'
                }
              </h2>


              <p className="mt-2 text-sm text-zinc-500">
                {
                  isCashierRole
                    ? 'Enter the physical cash available in the drawer before sales begin.'
                    : 'Waiting for the assigned cashier to open the operational shift.'
                }
              </p>

            </div>


            <div className="p-7">

              <div className="rounded-2xl bg-zinc-50 p-5">

                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                  Cashier
                </p>

                <p className="mt-1 font-black">
                  {
                    cashierEmail
                  }
                </p>

              </div>


              <label className="mt-6 block">

                <span className="text-sm font-black">
                  Opening Cash
                </span>


                <input
                  type="number"
                  min="0"
                  value={
                    openingCash
                  }
                  onChange={(
                    event
                  ) =>
                    setOpeningCash(
                      event.target.value
                    )
                  }
                  placeholder="Example: 500000"
                  className="mt-2 w-full rounded-xl border border-zinc-300 bg-white px-4 py-4 text-xl font-black outline-none focus:border-zinc-900"
                />

              </label>


              <button
                type="button"
                onClick={() =>
                  void openShift()
                }
                disabled={
                  working ||
                  !isCashierRole
                }
                className="mt-6 w-full rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700 disabled:opacity-50"
              >
                {
                  working
                    ? 'OPENING SHIFT...'
                    : 'OPEN CASHIER SHIFT'
                }
              </button>

            </div>

          </section>

        ) : (

          <>

            <div className="grid gap-5 xl:grid-cols-[1fr_2fr]">

              <section className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-6">

                <div className="flex items-start justify-between gap-5">

                  <div>

                    <p className="text-xs font-black uppercase tracking-wide text-green-700">
                      {
                        canOperateShift
                          ? 'My Cashier Shift'
                          : 'Active Outlet Shift'
                      }
                    </p>


                    <div className="mt-2 flex flex-wrap items-center gap-3">

                      <h2 className="text-2xl font-black">
                        {
                          shift.shift_no
                        }
                      </h2>


                      <span className="rounded-full bg-green-600 px-3 py-1 text-xs font-black text-white">
                        OPEN
                      </span>

                    </div>


                    <p className="mt-4 text-sm text-zinc-600">
                      Started {
                        dateTime(
                          shift.opened_at
                        )
                      }
                    </p>


                    <p className="mt-1 text-sm text-zinc-600">
                      Cashier {
                        shift.cashier_email ||
                        cashierEmail
                      }
                    </p>

                  </div>


                  <div className="text-right">

                    <p className="text-3xl font-black text-green-700">
                      {
                        duration(
                          shift.opened_at
                        )
                      }
                    </p>

                    <p className="text-xs text-zinc-500">
                      Duration
                    </p>

                  </div>

                </div>

              </section>


              <section className="rounded-2xl border border-zinc-200 bg-white p-4">

                <p className="px-2 pb-3 text-xs font-black uppercase tracking-wide text-zinc-500">
                  Sales Summary
                </p>


                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">

                  <SummaryCard
                    label="Cash Sales"
                    value={
                      money(
                        shift.summary_cash_sales
                      )
                    }
                    detail="Physical cash"
                    tone="green"
                  />


                  <SummaryCard
                    label="QRIS"
                    value={
                      money(
                        shift.summary_qris_sales
                      )
                    }
                    detail="Digital payment"
                    tone="blue"
                  />


                  <SummaryCard
                    label="Card"
                    value={
                      money(
                        shift.summary_card_sales
                      )
                    }
                    detail="Debit / credit"
                    tone="purple"
                  />


                  <SummaryCard
                    label="Total Sales"
                    value={
                      money(
                        shift.summary_total_sales
                      )
                    }
                    detail={
                      `${shift.summary_transaction_count} transactions`
                    }
                    tone="orange"
                  />

                </div>

              </section>

            </div>


            <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">

              <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">

                <div className="border-b border-zinc-200 p-5">

                  <div className="flex flex-wrap items-center justify-between gap-3">

                    <div>

                      <h2 className="text-xl font-black">
                        Transactions
                      </h2>

                      <p className="mt-1 text-sm text-zinc-500">
                        Search and filter high-volume daily transactions.
                      </p>

                    </div>


                    <button
                      type="button"
                      onClick={
                        exportCurrentPage
                      }
                      className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-black"
                    >
                      Export Page
                    </button>

                  </div>


                  <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">

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
                      placeholder="Search sale / order / table..."
                      className="rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-900"
                    />


                    <select
                      value={
                        paymentFilter
                      }
                      onChange={(
                        event
                      ) =>
                        setPaymentFilter(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-3 font-bold"
                    >
                      <option value="ALL">
                        All Payments
                      </option>
                      <option value="CASH">
                        Cash
                      </option>
                      <option value="QRIS">
                        QRIS
                      </option>
                      <option value="CARD">
                        Card
                      </option>
                      <option value="TRANSFER">
                        Transfer
                      </option>
                      <option value="OTHER">
                        Other
                      </option>
                    </select>


                    <select
                      value={
                        typeFilter
                      }
                      onChange={(
                        event
                      ) =>
                        setTypeFilter(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-3 font-bold"
                    >
                      <option value="ALL">
                        All Order Types
                      </option>
                      <option value="DINE_IN">
                        Dine In
                      </option>
                      <option value="TAKEAWAY">
                        Takeaway
                      </option>
                      <option value="DIRECT_POS">
                        Direct POS
                      </option>
                    </select>


                    <select
                      value={
                        statusFilter
                      }
                      onChange={(
                        event
                      ) =>
                        setStatusFilter(
                          event.target.value
                        )
                      }
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-3 font-bold"
                    >
                      <option value="ALL">
                        All Status
                      </option>
                      <option value="POSTED">
                        Posted
                      </option>
                    </select>

                  </div>

                </div>


                <div className="overflow-x-auto">

                  <table className="w-full min-w-[900px] text-left">

                    <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">

                      <tr>
                        <th className="px-5 py-4">
                          Time
                        </th>
                        <th className="px-5 py-4">
                          Sale No
                        </th>
                        <th className="px-5 py-4">
                          Order
                        </th>
                        <th className="px-5 py-4">
                          Table
                        </th>
                        <th className="px-5 py-4">
                          Type
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

                      {transactions.map(
                        (
                          row
                        ) => (

                          <tr
                            key={
                              row.sale_id
                            }
                            className="hover:bg-zinc-50"
                          >

                            <td className="px-5 py-4 text-sm font-semibold">
                              {
                                time(
                                  row.posted_at
                                )
                              }
                            </td>


                            <td className="px-5 py-4 text-sm font-bold">
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

                              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">
                                {
                                  row.order_type
                                }
                              </span>

                            </td>


                            <td className="px-5 py-4">

                              <PaymentBadge
                                value={
                                  row.payment_method
                                }
                              />

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

                                <button
                                  type="button"
                                  onClick={() => {

                                    window.open(
                                      `/print/order-receipt/${row.order_id}`,
                                      '_blank',
                                      'noopener,noreferrer'
                                    )

                                  }}
                                  className="text-sm font-black text-zinc-600 hover:text-zinc-950"
                                >
                                  Receipt
                                </button>

                              ) : (
                                <span className="text-zinc-300">
                                  —
                                </span>
                              )}

                            </td>

                          </tr>

                        )
                      )}


                      {transactions.length ===
                        0 && (

                        <tr>

                          <td
                            colSpan={
                              9
                            }
                            className="px-5 py-16 text-center text-sm font-semibold text-zinc-400"
                          >
                            No transactions found.
                          </td>

                        </tr>

                      )}

                    </tbody>

                  </table>

                </div>


                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 p-5">

                  <p className="text-sm text-zinc-500">
                    Showing {
                      transactionCount ===
                        0
                        ? 0
                        : (
                            page *
                            pageSize
                          ) + 1
                    }–{
                      Math.min(
                        (
                          page +
                          1
                        ) *
                        pageSize,
                        transactionCount
                      )
                    } of {
                      transactionCount
                    } transactions
                  </p>


                  <div className="flex items-center gap-2">

                    <select
                      value={
                        pageSize
                      }
                      onChange={(
                        event
                      ) =>
                        setPageSize(
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold"
                    >
                      {PAGE_SIZES.map(
                        (
                          size
                        ) => (
                          <option
                            key={
                              size
                            }
                            value={
                              size
                            }
                          >
                            {size} / page
                          </option>
                        )
                      )}
                    </select>


                    <button
                      type="button"
                      disabled={
                        page <= 0
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


                    <span className="min-w-20 text-center text-sm font-black">
                      {
                        page +
                        1
                      } / {
                        totalPages
                      }
                    </span>


                    <button
                      type="button"
                      disabled={
                        page +
                        1 >=
                        totalPages
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


              {canOperateShift ? (
<aside className="h-fit overflow-hidden rounded-2xl border border-zinc-200 bg-white">

                <div className="border-b border-zinc-200 p-5">

                  <h2 className="text-xl font-black">
                    Closing Summary
                  </h2>


                  <p className="mt-1 text-sm text-zinc-500">
                    Reconcile physical cash before closing.
                  </p>

                </div>


                <div className="space-y-4 p-5">

                  <SummaryRow
                    label="Total Sales"
                    value={
                      money(
                        shift.summary_total_sales
                      )
                    }
                    strong
                  />


                  <SummaryRow
                    label="Cash Sales"
                    value={
                      money(
                        shift.summary_cash_sales
                      )
                    }
                  />


                  <SummaryRow
                    label="QRIS"
                    value={
                      money(
                        shift.summary_qris_sales
                      )
                    }
                  />


                  <SummaryRow
                    label="Card"
                    value={
                      money(
                        shift.summary_card_sales
                      )
                    }
                  />


                  <SummaryRow
                    label="Transfer"
                    value={
                      money(
                        shift.summary_transfer_sales
                      )
                    }
                  />


                  <div className="border-t border-zinc-200 pt-4">

                    <SummaryRow
                      label="Opening Cash"
                      value={
                        money(
                          shift.opening_cash
                        )
                      }
                    />


                    <div className="mt-3">

                      <SummaryRow
                        label="+ Cash Sales"
                        value={
                          money(
                            shift.summary_cash_sales
                          )
                        }
                      />

                    </div>


                    <div className="mt-3">

                      <SummaryRow
                        label="+ Cash In"
                        value={
                          money(
                            shift.summary_cash_in
                          )
                        }
                      />

                    </div>


                    <div className="mt-3">

                      <SummaryRow
                        label="- Cash Out"
                        value={
                          money(
                            shift.summary_cash_out
                          )
                        }
                      />

                    </div>

                  </div>


                  <div className="border-t border-zinc-200 pt-4">

                    <SummaryRow
                      label="Expected Cash"
                      value={
                        money(
                          expectedCash
                        )
                      }
                      strong
                    />

                  </div>


                  <div className="grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setMovementMode(
                          'CASH_IN'
                        )
                      }
                      className="rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm font-black text-green-700"
                    >
                      + Cash In
                    </button>


                    <button
                      type="button"
                      onClick={() =>
                        setMovementMode(
                          'CASH_OUT'
                        )
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-black text-red-700"
                    >
                      − Cash Out
                    </button>

                  </div>


                  {movementMode && (

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">

                      <p className="text-sm font-black">
                        {
                          movementMode ===
                          'CASH_IN'
                            ? 'Cash In'
                            : 'Cash Out'
                        }
                      </p>


                      <input
                        type="number"
                        min="0"
                        value={
                          movementAmount
                        }
                        onChange={(
                          event
                        ) =>
                          setMovementAmount(
                            event.target.value
                          )
                        }
                        placeholder="Amount"
                        className="mt-3 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
                      />


                      <input
                        value={
                          movementReason
                        }
                        onChange={(
                          event
                        ) =>
                          setMovementReason(
                            event.target.value
                          )
                        }
                        placeholder="Reason"
                        className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
                      />


                      <div className="mt-3 flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            void recordMovement()
                          }
                          disabled={
                            working
                          }
                          className="flex-1 rounded-lg bg-zinc-950 px-3 py-2.5 text-sm font-black text-white"
                        >
                          Save
                        </button>


                        <button
                          type="button"
                          onClick={() =>
                            setMovementMode(
                              null
                            )
                          }
                          className="rounded-lg border border-zinc-300 px-3 py-2.5 text-sm font-black"
                        >
                          Cancel
                        </button>

                      </div>

                    </div>

                  )}


                  <label className="block border-t border-zinc-200 pt-4">

                    <span className="text-sm font-black">
                      Actual Cash
                    </span>


                    <input
                      type="number"
                      min="0"
                      value={
                        actualCash
                      }
                      onChange={(
                        event
                      ) =>
                        setActualCash(
                          event.target.value
                        )
                      }
                      placeholder="Counted physical cash"
                      className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-lg font-black"
                    />

                  </label>


                  <div
                    className={
                      `rounded-xl p-4 ${
                        !actualCash.trim()
                          ? 'bg-zinc-100'
                          : variance === 0
                            ? 'bg-green-50'
                            : Math.abs(
                                variance
                              ) <= 10000
                              ? 'bg-amber-50'
                              : 'bg-red-50'
                      }`
                    }
                  >

                    <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                      Variance
                    </p>


                    <p
                      className={
                        `mt-1 text-2xl font-black ${
                          variance ===
                          0
                            ? 'text-green-700'
                            : 'text-red-700'
                        }`
                      }
                    >
                      {
                        actualCash.trim()
                          ? money(
                              variance
                            )
                          : '—'
                      }
                    </p>


                    {actualCash.trim() && (

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

                    )}

                  </div>


                  <textarea
                    value={
                      closingNotes
                    }
                    onChange={(
                      event
                    ) =>
                      setClosingNotes(
                        event.target.value
                      )
                    }
                    placeholder="Closing notes (optional)"
                    rows={
                      3
                    }
                    className="w-full resize-none rounded-xl border border-zinc-300 px-4 py-3 text-sm"
                  />


                  <button
                    type="button"
                    disabled={
                      working ||
                      !actualCash.trim()
                    }
                    onClick={() =>
                      void closeShift()
                    }
                    className="w-full rounded-xl bg-green-600 px-5 py-4 font-black text-white hover:bg-green-700 disabled:opacity-40"
                  >
                    CLOSE SHIFT
                  </button>

                </div>

              </aside>
              ) : (
<aside className="rounded-2xl border border-blue-200 bg-blue-50 p-6">

                <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                  Read-only Shift Monitoring
                </p>


                <h3 className="mt-2 text-xl font-black text-zinc-950">
                  Active Cashier Shift
                </h3>


                <p className="mt-3 text-sm leading-6 text-blue-900">
                  Shift ini dimiliki oleh cashier yang sedang bertugas.
                  Owner / Manager dapat memonitor sales dan menerima
                  payment tanpa mengambil alih cashier shift.
                </p>


                <div className="mt-5 rounded-xl bg-white p-4">

                  <div className="flex items-center justify-between gap-4">

                    <span className="text-sm text-zinc-500">
                      Shift
                    </span>

                    <span className="text-sm font-black">
                      {shift.shift_no}
                    </span>

                  </div>


                  <div className="mt-3 flex items-center justify-between gap-4">

                    <span className="text-sm text-zinc-500">
                      Cashier
                    </span>

                    <span className="text-right text-sm font-black">
                      {
                        shift.cashier_email ||
                        'Cashier'
                      }
                    </span>

                  </div>


                  <div className="mt-3 flex items-center justify-between gap-4">

                    <span className="text-sm text-zinc-500">
                      Status
                    </span>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      OPEN
                    </span>

                  </div>

                </div>


                <div className="mt-5 space-y-2 text-sm">

                  <p className="font-bold text-green-800">
                    ✓ View Sales Summary
                  </p>

                  <p className="font-bold text-green-800">
                    ✓ View Transactions
                  </p>

                  <p className="font-bold text-green-800">
                    ✓ Receive Payment from Open Orders
                  </p>

                  <p className="font-bold text-zinc-500">
                    × Cash In / Cash Out
                  </p>

                  <p className="font-bold text-zinc-500">
                    × Close Cashier Shift
                  </p>

                </div>

              </aside>
              )}

            </div>

          </>

        )}

      </div>

    </main>
  )
}


function SummaryCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail: string
  tone:
    | 'green'
    | 'blue'
    | 'purple'
    | 'orange'
}) {

  const toneClass = {
    green:
      'bg-green-50',

    blue:
      'bg-blue-50',

    purple:
      'bg-purple-50',

    orange:
      'bg-orange-50',
  }[
    tone
  ]


  return (
    <div className={`rounded-xl p-4 ${toneClass}`}>

      <p className="text-xs font-bold text-zinc-600">
        {label}
      </p>

      <p className="mt-1 text-xl font-black">
        {value}
      </p>

      <p className="mt-1 text-xs text-zinc-500">
        {detail}
      </p>

    </div>
  )
}


function SummaryRow({
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
            ? 'text-lg font-black'
            : 'text-sm font-bold'
        }
      >
        {value}
      </span>

    </div>
  )
}


function PaymentBadge({
  value,
}: {
  value: string
}) {

  const upper =
    String(
      value ||
      'OTHER'
    ).toUpperCase()


  const className =
    upper ===
    'CASH'
      ? 'bg-green-50 text-green-700'

      : upper ===
        'QRIS'
        ? 'bg-blue-50 text-blue-700'

        : upper ===
          'CARD'
          ? 'bg-purple-50 text-purple-700'

          : 'bg-zinc-100 text-zinc-700'


  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${className}`}>
      {upper}
    </span>
  )
}
