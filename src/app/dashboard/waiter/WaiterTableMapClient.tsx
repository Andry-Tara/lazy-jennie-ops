'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'


type Outlet = {
  id: string
  code: string
  name: string
}


type TableRow = {
  id: string
  outlet_id: string

  outlet_code: string
  outlet_name: string

  code: string
  name: string
  capacity: number

  status: string
  is_active: boolean

  active_order_id: string | null
  active_order_no: string | null

  active_order_status: string | null
  active_payment_status: string | null

  active_order_total:
    number |
    string |
    null

  active_order_opened_at:
    string |
    null

  active_order_count: number
}


type Props = {
  outlets: Outlet[]
  tables: TableRow[]
  assignedOutletId: string
}


type StatusFilter =
  | 'ALL'
  | 'AVAILABLE'
  | 'OCCUPIED'


function rupiah(
  value:
    number |
    string |
    null |
    undefined
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
      value ||
      0
    )
  )

}


function orderTime(
  value:
    string |
    null
) {

  if (!value) {
    return '-'
  }


  const date =
    new Date(
      value
    )


  return new Intl.DateTimeFormat(
    'id-ID',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone:
        'Asia/Jakarta',
    }
  ).format(
    date
  )

}


export default function WaiterTableMapClient({
  outlets,
  tables,
  assignedOutletId,
}: Props) {

  const router =
    useRouter()


  const initialOutletId =
    assignedOutletId &&
    outlets.some(
      (row) =>
        row.id ===
        assignedOutletId
    )

      ? assignedOutletId

      : (
          outlets[0]
            ?.id ||
          ''
        )


  const [
    outletId,
    setOutletId,
  ] =
    useState(
      initialOutletId
    )


  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      'ALL'
    )


  const [
    search,
    setSearch,
  ] =
    useState('')


  const [
    selectedTableId,
    setSelectedTableId,
  ] =
    useState('')


  const outletTables =
    useMemo(
      () =>

        tables.filter(
          (table) =>
            table.outlet_id ===
            outletId
        ),

      [
        tables,
        outletId,
      ]
    )


  const availableCount =
    outletTables.filter(
      (table) =>
        !table.active_order_id &&
        table.status ===
          'AVAILABLE'
    ).length


  const occupiedCount =
    outletTables.filter(
      (table) =>
        Boolean(
          table.active_order_id
        )
        ||
        table.status ===
          'OCCUPIED'
    ).length


  const openOrderCount =
    outletTables.reduce(
      (
        total,
        table
      ) =>
        total +
        Number(
          table.active_order_count ||
          0
        ),
      0
    )


  const filteredTables =
    outletTables.filter(
      (table) => {

        const occupied =
          Boolean(
            table.active_order_id
          )
          ||
          table.status ===
            'OCCUPIED'


        if (
          statusFilter ===
            'AVAILABLE'
          &&
          occupied
        ) {
          return false
        }


        if (
          statusFilter ===
            'OCCUPIED'
          &&
          !occupied
        ) {
          return false
        }


        const keyword =
          search
            .trim()
            .toLowerCase()


        if (!keyword) {
          return true
        }


        return [
          table.code,
          table.name,
          table.active_order_no ||
            '',
        ]
          .join(' ')
          .toLowerCase()
          .includes(
            keyword
          )

      }
    )


  const selectedTable =
    outletTables.find(
      (table) =>
        table.id ===
        selectedTableId
    )


  const selectedOutlet =
    outlets.find(
      (outlet) =>
        outlet.id ===
        outletId
    )


  return (

    <div className="space-y-5">


      {/* ===================================================
          OUTLET
      =================================================== */}

      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">

        <div className="flex flex-wrap items-end justify-between gap-4">


          <div className="min-w-[240px] flex-1">

            <label className="mb-2 block text-xs font-black uppercase tracking-wider text-zinc-400">
              Branch
            </label>


            <select
              value={
                outletId
              }
              onChange={(
                event
              ) => {

                setOutletId(
                  event.target.value
                )

                setSelectedTableId(
                  ''
                )

              }}
              className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 font-bold outline-none focus:border-zinc-950"
            >

              {outlets.map(
                (outlet) => (

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
                    {
                      outlet.code
                        ? ` · ${outlet.code}`
                        : ''
                    }
                  </option>

                )
              )}

            </select>

          </div>


          <button
            type="button"
            onClick={() =>
              router.refresh()
            }
            className="rounded-2xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black hover:bg-zinc-50"
          >
            ↻ Refresh
          </button>

        </div>

      </section>



      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">


        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Tables
          </p>

          <p className="mt-2 text-3xl font-black">
            {
              outletTables.length
            }
          </p>

        </div>


        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Available
          </p>

          <p className="mt-2 text-3xl font-black text-emerald-800">
            {
              availableCount
            }
          </p>

        </div>


        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">

          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Occupied
          </p>

          <p className="mt-2 text-3xl font-black text-amber-800">
            {
              occupiedCount
            }
          </p>

        </div>


        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">

          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
            Open Orders
          </p>

          <p className="mt-2 text-3xl font-black text-blue-800">
            {
              openOrderCount
            }
          </p>

        </div>

      </section>



      {/* ===================================================
          FILTER
      =================================================== */}

      <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">


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
            placeholder="Search table or order..."
            className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-950"
          />


          <div className="grid grid-cols-3 gap-2">

            {(
              [
                'ALL',
                'AVAILABLE',
                'OCCUPIED',
              ] as StatusFilter[]
            ).map(
              (status) => (

                <button
                  key={
                    status
                  }
                  type="button"
                  onClick={() =>
                    setStatusFilter(
                      status
                    )
                  }
                  className={`rounded-xl px-3 py-3 text-xs font-black ${
                    statusFilter ===
                    status

                      ? 'bg-zinc-950 text-white'

                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {
                    status ===
                      'ALL'
                      ? 'All'
                      : status ===
                          'AVAILABLE'
                        ? 'Available'
                        : 'Occupied'
                  }
                </button>

              )
            )}

          </div>

        </div>

      </section>



      {/* ===================================================
          TABLE MAP
      =================================================== */}

      <section>

        <div className="mb-3 flex items-center justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
              Table Map
            </p>

            <h2 className="mt-1 text-xl font-black">
              {
                selectedOutlet
                  ?.name ||
                'Outlet'
              }
            </h2>

          </div>


          <p className="text-sm font-bold text-zinc-500">
            {
              filteredTables.length
            } tables
          </p>

        </div>


        {filteredTables.length ===
          0 ? (

          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">

            <p className="font-black text-zinc-700">
              No tables found
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Check the selected branch or table filter.
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">

            {filteredTables.map(
              (table) => {

                const occupied =
                  Boolean(
                    table.active_order_id
                  )
                  ||
                  table.status ===
                    'OCCUPIED'


                const selected =
                  selectedTableId ===
                  table.id


                return (

                  <button
                    key={
                      table.id
                    }
                    type="button"
                    onClick={() =>
                      setSelectedTableId(
                        table.id
                      )
                    }
                    className={`min-h-[190px] rounded-3xl border p-4 text-left transition ${
                      selected

                        ? 'border-zinc-950 ring-2 ring-zinc-950'

                        : occupied

                          ? 'border-amber-200 bg-amber-50 hover:border-amber-400'

                          : 'border-emerald-200 bg-emerald-50 hover:border-emerald-400'
                    }`}
                  >

                    <div className="flex items-start justify-between gap-2">

                      <div>

                        <p className="text-2xl font-black">
                          {
                            table.code
                          }
                        </p>

                        <p className="mt-1 text-xs font-semibold text-zinc-500">
                          {
                            table.name
                          }
                        </p>

                      </div>


                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                          occupied

                            ? 'bg-amber-200 text-amber-900'

                            : 'bg-emerald-200 text-emerald-900'
                        }`}
                      >
                        {
                          occupied
                            ? 'OCCUPIED'
                            : 'AVAILABLE'
                        }
                      </span>

                    </div>


                    <p className="mt-4 text-xs font-bold text-zinc-500">
                      {
                        table.capacity
                      } pax
                    </p>


                    {occupied &&
                    table.active_order_id ? (

                      <div className="mt-4 border-t border-amber-200 pt-3">

                        <p className="truncate text-xs font-black">
                          {
                            table.active_order_no
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-600">
                          {
                            table.active_order_status
                          }
                          {' · '}
                          {
                            orderTime(
                              table.active_order_opened_at
                            )
                          }
                        </p>

                        <p className="mt-2 text-sm font-black">
                          {
                            rupiah(
                              table.active_order_total
                            )
                          }
                        </p>

                      </div>

                    ) : (

                      <div className="mt-4 border-t border-emerald-200 pt-3">

                        <p className="text-xs font-bold text-emerald-800">
                          Ready for new guest
                        </p>

                      </div>

                    )}

                  </button>

                )

              }
            )}

          </div>

        )}

      </section>



      {/* ===================================================
          SELECTED TABLE ACTION PANEL
      =================================================== */}

      {selectedTable && (

        <section className="sticky bottom-4 rounded-3xl border border-zinc-300 bg-white p-5 shadow-2xl">

          <div className="flex flex-wrap items-center justify-between gap-4">


            <div>

              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                Selected Table
              </p>

              <div className="mt-1 flex items-center gap-3">

                <p className="text-2xl font-black">
                  {
                    selectedTable.code
                  }
                </p>

                <p className="text-sm font-semibold text-zinc-500">
                  {
                    selectedTable.name
                  }
                </p>

              </div>

            </div>


            {selectedTable.active_order_id ? (

              <div className="text-right">

                <p className="text-xs font-bold text-zinc-400">
                  ACTIVE ORDER
                </p>

                <p className="font-black">
                  {
                    selectedTable.active_order_no
                  }
                </p>

                <p className="text-sm font-black">
                  {
                    rupiah(
                      selectedTable.active_order_total
                    )
                  }
                </p>

              </div>

            ) : (

              <div className="text-right">

                <p className="text-xs font-bold text-emerald-700">
                  TABLE AVAILABLE
                </p>

                <p className="text-sm font-semibold text-zinc-500">
                  Ready to start order
                </p>

              </div>

            )}

          </div>


          <div className="mt-4">

            {selectedTable.active_order_id ? (

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/waiter/order/${selectedTable.id}`
                  )
                }
                className="w-full rounded-2xl bg-amber-600 px-4 py-4 text-center text-sm font-black text-white hover:bg-amber-700"
              >
                OPEN ORDER · ADD ITEMS
              </button>

            ) : (

              <button
                type="button"
                onClick={() =>
                  router.push(
                    `/dashboard/waiter/order/${selectedTable.id}`
                  )
                }
                className="w-full rounded-2xl bg-zinc-950 px-4 py-4 text-center text-sm font-black text-white hover:bg-zinc-800"
              >
                START ORDER
              </button>

            )}

          </div>

        </section>

      )}

    </div>

  )
}
