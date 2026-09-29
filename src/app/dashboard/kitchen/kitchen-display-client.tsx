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


type Station =
  | 'KITCHEN'
  | 'BAR'
  | 'ALL'


type KitchenStatus =
  | 'NEW'
  | 'PREPARING'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED'


type RawRow =
  Record<
    string,
    any
  >


export default function KitchenDisplayClient({
  canOpenOrders,
}: {
  canOpenOrders: boolean
}) {
  const supabase =
    useMemo(
      () => createClient(),
      []
    )


  const [
    tickets,
    setTickets,
  ] =
    useState<RawRow[]>([])


  const [
    items,
    setItems,
  ] =
    useState<RawRow[]>([])


  const [
    units,
    setUnits,
  ] =
    useState<RawRow[]>([])


  const [
    station,
    setStation,
  ] =
    useState<Station>(
      'KITCHEN'
    )


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
    updatingId,
    setUpdatingId,
  ] =
    useState('')


  const [
    error,
    setError,
  ] =
    useState('')


  // ============================================================
  // FIELD NORMALIZERS
  //
  // Kept tolerant so KDS V2 remains compatible
  // with current secure-view aliases.
  // ============================================================

  function ticketId(
    row: RawRow
  ) {
    return String(
      row.id ?? ''
    )
  }


  function itemId(
    row: RawRow
  ) {
    return String(
      row.id ?? ''
    )
  }


  function itemTicketId(
    row: RawRow
  ) {
    return String(
      row.kitchen_ticket_id ??
      row.ticket_id ??
      ''
    )
  }


  function itemStation(
    row: RawRow
  ): string {
    return String(
      row.station ??
      'KITCHEN'
    ).toUpperCase()
  }


  function itemStatus(
    row: RawRow
  ): KitchenStatus {
    return (
      String(
        row.status ??
        'NEW'
      ).toUpperCase()
    ) as KitchenStatus
  }


  function menuName(
    row: RawRow
  ) {
    return String(
      row.menu_item_name ??
      row.menu_name ??
      row.item_name ??
      row.name ??
      'Menu Item'
    )
  }


  function roundNo(
    row: RawRow
  ) {
    return Number(
      row.kds_round_no ??
      row.round_no ??
      1
    )
  }


  function quantity(
    row: RawRow
  ) {
    return Number(
      row.quantity ??
      row.qty ??
      1
    )
  }


  function notes(
    row: RawRow
  ) {
    return String(
      row.notes ??
      row.item_notes ??
      ''
    ).trim()
  }


  function orderNo(
    ticket?: RawRow
  ) {
    if (!ticket) {
      return 'ORDER'
    }

    return String(
      ticket.order_no ??
      ticket.sale_no ??
      ticket.ticket_no ??
      'ORDER'
    )
  }


  function tableLabel(
    ticket?: RawRow
  ) {
    if (!ticket) {
      return ''
    }

    const code =
      ticket.kds_table_code ??
      ticket.table_code ??
      ''

    const name =
      ticket.kds_table_name ??
      ticket.table_name ??
      ''

    if (code && name) {
      return `${code} · ${name}`
    }

    if (
      String(
        ticket.kds_order_type ??
        ticket.order_type ??
        ''
      ).toUpperCase() ===
      'TAKEAWAY'
    ) {
      return 'TAKEAWAY'
    }

    return String(
      code ||
      name ||
      ''
    )
  }


  function sourceLabel(
    ticket?: RawRow
  ) {
    return String(
      ticket?.source ??
      'POS'
    )
  }


  function createdAt(
    ticket?: RawRow
  ) {
    const value =
      ticket?.created_at

    if (!value) {
      return ''
    }

    try {
      return new Intl.DateTimeFormat(
        'id-ID',
        {
          hour:
            '2-digit',
          minute:
            '2-digit',
        }
      ).format(
        new Date(
          value
        )
      )
    } catch {
      return ''
    }
  }


  // ============================================================
  // LOAD
  // ============================================================

  const load =
    useCallback(
      async (
        silent = false
      ) => {

        if (silent) {
          setRefreshing(
            true
          )
        } else {
          setLoading(
            true
          )
        }


        const [
          ticketResult,
          itemResult,
          unitResult,
        ] =
          await Promise.all([
            supabase
              .from(
                'kitchen_tickets_kds_v2_secure'
              )
              .select('*')
              .order(
                'created_at',
                {
                  ascending:
                    false,
                }
              )
              .limit(150),

            supabase
              .from(
                'kitchen_ticket_items_kds_v3_secure'
              )
              .select('*')
              .order(
                'created_at',
                {
                  ascending:
                    true,
                }
              )
              .limit(500),

            supabase
              .from(
                'kitchen_ticket_item_units_kds_v1_secure'
              )
              .select('*')
              .order(
                'unit_no',
                {
                  ascending: true,
                }
              )
              .limit(1500),
          ])


        if (
          ticketResult.error
        ) {

          setError(
            ticketResult
              .error
              .message
          )

        } else if (
          itemResult.error
        ) {

          setError(
            itemResult
              .error
              .message
          )

        } else {

          setTickets(
            ticketResult.data ||
            []
          )

          setItems(
            itemResult.data ||
            []
          )

          setUnits(
            unitResult.data ||
            []
          )

          if (
            unitResult.error
          ) {
            setError(
              unitResult.error.message
            )
          }

          setError('')

        }


        setLoading(false)
        setRefreshing(false)

      },
      [supabase]
    )


  useEffect(
    () => {

      void load()

      const timer =
        window.setInterval(
          () => {
            void load(
              true
            )
          },
          2500
        )


      return () => {
        window.clearInterval(
          timer
        )
      }

    },
    [load]
  )


  // ============================================================
  // MAP
  // ============================================================

  const ticketMap =
    useMemo(
      () =>
        new Map(
          tickets.map(
            (
              ticket
            ) => [
              ticketId(
                ticket
              ),
              ticket,
            ]
          )
        ),
      [tickets]
    )


  const activeItems =
    useMemo(
      () =>
        items.filter(
          (item) => {

            const status =
              itemStatus(
                item
              )

            if (
              status ===
                'COMPLETED' ||
              status ===
                'CANCELLED'
            ) {
              return false
            }


            if (
              station ===
              'ALL'
            ) {
              return true
            }


            return (
              itemStation(
                item
              ) ===
              station
            )
          }
        ),
      [
        items,
        station,
      ]
    )


  // ============================================================
  // SINGLE KDS QUEUE
  //
  // NEW + legacy PREPARING are shown.
  // READY disappears immediately from Chef KDS.
  //
  // Newest order first.
  // ============================================================

  const pendingItemsAll =
    items.filter(
      (item) => {

        const status =
          itemStatus(
            item
          )

        return (
          status === 'NEW' ||
          status === 'PREPARING'
        )
      }
    )


  const queueItems =
    activeItems
      .filter(
        (item) => {

          const status =
            itemStatus(
              item
            )

          return (
            status === 'NEW' ||
            status === 'PREPARING'
          )
        }
      )
      .sort(
        (a, b) => {

          const ticketA =
            ticketMap.get(
              itemTicketId(
                a
              )
            )

          const ticketB =
            ticketMap.get(
              itemTicketId(
                b
              )
            )

          const rawTimeA =
            String(
              (ticketA as any)?.created_at ||
              ''
            )

          const rawTimeB =
            String(
              (ticketB as any)?.created_at ||
              ''
            )

          const parsedA =
            Date.parse(
              rawTimeA
            )

          const parsedB =
            Date.parse(
              rawTimeB
            )

          const timeA =
            Number.isFinite(
              parsedA
            )
              ? parsedA
              : 0

          const timeB =
            Number.isFinite(
              parsedB
            )
              ? parsedB
              : 0


          // NEWEST ORDER FIRST
          if (
            timeA !==
            timeB
          ) {
            return (
              timeB -
              timeA
            )
          }


          // Same order:
          // Round 1 before Round 2 before Round 3
          const roundDiff =
            roundNo(
              a
            ) -
            roundNo(
              b
            )

          if (
            roundDiff !== 0
          ) {
            return roundDiff
          }


          const rawItemA =
            String(
              (a as any)?.created_at ||
              ''
            )

          const rawItemB =
            String(
              (b as any)?.created_at ||
              ''
            )

          const itemA =
            Date.parse(
              rawItemA
            )

          const itemB =
            Date.parse(
              rawItemB
            )

          return (
            (
              Number.isFinite(itemA)
                ? itemA
                : 0
            )
            -
            (
              Number.isFinite(itemB)
                ? itemB
                : 0
            )
          )
        }
      )


  function countStation(
    value:
      'KITCHEN'
      | 'BAR'
  ) {

    return pendingItemsAll.reduce(
      (
        total,
        item
      ) => {

        if (
          itemStation(
            item
          ) !== value
        ) {
          return total
        }


        const itemUnits =
          units.filter(
            (unit) =>
              String(
                unit.kitchen_ticket_item_id ??
                ''
              ) ===
              itemId(
                item
              )
          )


        if (
          itemUnits.length ===
          0
        ) {
          return total + 1
        }


        const pendingUnitCount =
          itemUnits.filter(
            (unit) => {

              const unitStatus =
                String(
                  unit.status ??
                  'NEW'
                ).toUpperCase()


              return ![
                'READY',
                'COMPLETED',
                'CANCELLED',
              ].includes(
                unitStatus
              )

            }
          ).length


        return (
          total +
          pendingUnitCount
        )

      },
      0
    )

  }


  // ============================================================
  // UPDATE ONE PHYSICAL UNIT
  // ============================================================

  async function updateUnit(
    unit: RawRow
  ) {

    const id =
      String(
        unit.id ??
        ''
      )


    if (!id) {
      return
    }


    setUpdatingId(
      id
    )

    setError('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'update_kitchen_item_unit_status_v1',
          {
            p_unit_id:
              id,

            p_status:
              'READY',
          }
        )


      if (rpcError) {
        throw rpcError
      }


      await load(
        true
      )

    } catch (
      err: any
    ) {

      console.error(
        'KDS UNIT ERROR:',
        err
      )

      setError(
        err?.message ||
        err?.details ||
        'Failed to update kitchen unit.'
      )

    } finally {

      setUpdatingId('')

    }

  }


  // ============================================================
  // TASK CARD
  // ============================================================

  function TaskCard({
    item,
  }: {
    item: RawRow
  }) {

    const ticket =
      ticketMap.get(
        itemTicketId(
          item
        )
      )


    const status =
      itemStatus(
        item
      )


    const itemUnits =
      units
        .filter(
          (unit) =>
            String(
              unit.kitchen_ticket_item_id ??
              ''
            ) ===
            itemId(
              item
            )
        )
        .sort(
          (a, b) =>
            Number(
              a.unit_no ??
              0
            ) -
            Number(
              b.unit_no ??
              0
            )
        )


    const table =
      tableLabel(
        ticket
      )


    return (
      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

        <div className="border-b border-zinc-100 p-4">

          <div className="flex items-start justify-between gap-3">

            <div>

              <p className="text-xs font-black uppercase tracking-wide text-red-800">
                {
                  sourceLabel(
                    ticket
                  )
                }
                {' · '}
                {
                  itemStation(
                    item
                  )
                }
              </p>


              <p className="mt-1 text-lg font-black">
                {
                  orderNo(
                    ticket
                  )
                }
              </p>


              {roundNo(
                item
              ) > 1 && (

                <p className="mt-2 inline-flex rounded-full bg-purple-50 px-3 py-1 text-xs font-black text-purple-700">
                  ADD-ON · ROUND {
                    roundNo(
                      item
                    )
                  }
                </p>

              )}


              {table && (
                <p className="mt-1 text-sm font-bold text-blue-700">
                  {table}
                </p>
              )}

            </div>


            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600">
              {
                createdAt(
                  ticket
                )
              }
            </span>

          </div>

        </div>


        <div className="p-5">

          <div className="flex items-start gap-4">

            <div
              className={
                `mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-black ${
                  status ===
                    'READY'
                    ? 'bg-green-100 text-green-700'
                    : status ===
                        'PREPARING'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-zinc-100 text-zinc-600'
                }`
              }
            >
              {
                status ===
                'READY'
                  ? '✓'
                  : quantity(
                      item
                    )
              }
            </div>


            <div className="min-w-0 flex-1">

              <p className="text-xl font-black">
                {
                  menuName(
                    item
                  )
                }
              </p>


              {quantity(
                item
              ) > 1 && (

                <p className="mt-1 text-xs font-bold text-zinc-400">
                  {
                    quantity(
                      item
                    )
                  } individual items
                </p>

              )}


              {notes(
                item
              ) && (

                <div className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-800">
                  Notes:{' '}
                  {
                    notes(
                      item
                    )
                  }
                </div>

              )}

            </div>

          </div>


          <div className="mt-5 space-y-3">

            {itemUnits.map(
              (unit) => {

                const unitStatus =
                  String(
                    unit.status ??
                    'NEW'
                  ).toUpperCase()

                const unitNo =
                  Number(
                    unit.unit_no ??
                    1
                  )

                const unitId =
                  String(
                    unit.id ??
                    ''
                  )

                const isUnitUpdating =
                  updatingId ===
                  unitId

                const isReady =
                  unitStatus ===
                    'READY' ||
                  unitStatus ===
                    'COMPLETED'

                const isCancelled =
                  unitStatus ===
                    'CANCELLED'


                return (

                  <div
                    key={
                      unitId
                    }
                    className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >

                    <div className="min-w-0">

                      <p className="font-black">
                        {
                          menuName(
                            item
                          )
                        }
                      </p>


                      {itemUnits.length >
                        1 && (

                        <p className="mt-1 text-xs font-bold text-zinc-500">
                          Item {
                            unitNo
                          } / {
                            itemUnits.length
                          }
                        </p>

                      )}

                    </div>


                    {isReady ? (

                      <span className="shrink-0 rounded-xl bg-green-100 px-4 py-3 text-xs font-black text-green-700">
                        ✓ {
                          unitStatus ===
                            'COMPLETED'
                            ? 'DONE'
                            : 'READY'
                        }
                      </span>

                    ) : isCancelled ? (

                      <span className="shrink-0 rounded-xl bg-zinc-200 px-4 py-3 text-xs font-black text-zinc-500">
                        CANCELLED
                      </span>

                    ) : (

                      <button
                        type="button"
                        disabled={
                          isUnitUpdating
                        }
                        onClick={() =>
                          void updateUnit(
                            unit
                          )
                        }
                        className="shrink-0 rounded-xl bg-green-700 px-5 py-3 text-xs font-black text-white transition hover:bg-green-800 disabled:opacity-50"
                      >
                        {
                          isUnitUpdating
                            ? 'UPDATING...'
                            : '✓ READY / DONE'
                        }
                      </button>

                    )}

                  </div>

                )

              }
            )}


            {itemUnits.length ===
              0 && (

              <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-center text-xs font-bold text-zinc-400">
                Preparing item checklist...
              </div>

            )}

          </div>

        </div>

      </article>
    )
  }


  function BoardColumn({
    title,
    subtitle,
    data,
    kind,
  }: {
    title: string
    subtitle: string
    data: RawRow[]
    kind:
      'NEW'
      | 'PREPARING'
      | 'READY'
  }) {

    return (
      <section>

        <div className="mb-4 flex items-end justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
              {subtitle}
            </p>

            <h2 className="mt-1 text-2xl font-black">
              {title}
            </h2>

          </div>


          <span
            className={
              `rounded-full px-3 py-1 text-sm font-black ${
                kind ===
                  'READY'
                  ? 'bg-green-100 text-green-700'
                  : kind ===
                      'PREPARING'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-zinc-200 text-zinc-700'
              }`
            }
          >
            {data.length}
          </span>

        </div>


        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">

          {data.map(
            (item) => (

              <TaskCard
                key={
                  itemId(
                    item
                  )
                }
                item={
                  item
                }
              />

            )
          )}


          {data.length ===
            0 && (

            <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm font-semibold text-zinc-400">
              No items
            </div>

          )}

        </div>

      </section>
    )
  }


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1700px]">

        <header className="mb-7">

          <div className="flex flex-wrap items-end justify-between gap-5">

            <div>

              <Link
                href="/dashboard"
                className="text-sm font-semibold text-zinc-500 hover:text-red-900"
              >
                ← Dashboard
              </Link>


              <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-red-800">
                Restaurant Operations
              </p>


              <h1 className="mt-1 text-4xl font-black">
                Kitchen Display
              </h1>


              <p className="mt-2 text-zinc-500">
                Single queue · newest order first · one tap when ready.
              </p>

            </div>


            <div className="flex gap-2">

              {canOpenOrders && (

                <Link
                  href="/dashboard/pos/orders"
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold"
                >
                  Open Orders
                </Link>

              )}


              <button
                type="button"
                disabled={
                  refreshing
                }
                onClick={() =>
                  void load()
                }
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {
                  refreshing
                    ? 'Refreshing...'
                    : 'Refresh'
                }
              </button>

            </div>

          </div>


          <div className="mt-7 flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() =>
                setStation(
                  'KITCHEN'
                )
              }
              className={
                `rounded-xl px-5 py-3 text-sm font-black ${
                  station ===
                    'KITCHEN'
                    ? 'bg-red-900 text-white'
                    : 'border border-zinc-300 bg-white'
                }`
              }
            >
              KITCHEN
              {' · '}
              {
                countStation(
                  'KITCHEN'
                )
              }
            </button>


            <button
              type="button"
              onClick={() =>
                setStation(
                  'BAR'
                )
              }
              className={
                `rounded-xl px-5 py-3 text-sm font-black ${
                  station ===
                    'BAR'
                    ? 'bg-blue-700 text-white'
                    : 'border border-zinc-300 bg-white'
                }`
              }
            >
              BAR
              {' · '}
              {
                countStation(
                  'BAR'
                )
              }
            </button>


            <button
              type="button"
              onClick={() =>
                setStation(
                  'ALL'
                )
              }
              className={
                `rounded-xl px-5 py-3 text-sm font-black ${
                  station ===
                    'ALL'
                    ? 'bg-zinc-950 text-white'
                    : 'border border-zinc-300 bg-white'
                }`
              }
            >
              ALL
              {' · '}
              {
                countStation(
                  'KITCHEN'
                ) +
                countStation(
                  'BAR'
                )
              }
            </button>

          </div>

        </header>


        {error && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>

        )}


        {loading ? (

          <div className="rounded-2xl bg-white p-16 text-center font-bold text-zinc-500">
            Loading Kitchen Display...
          </div>

        ) : (

          <div>

            <BoardColumn
              title="Kitchen Queue"
              subtitle="Newest Order First · One Tap Ready"
              data={
                queueItems
              }
              kind="NEW"
            />

          </div>

        )}

      </div>

    </main>
  )
}
