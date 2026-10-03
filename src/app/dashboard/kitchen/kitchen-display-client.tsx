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



  function ageMinutes(
    ticket?: RawRow
  ) {

    const value =
      ticket?.created_at

    if (!value) {
      return 0
    }

    const parsed =
      Date.parse(
        String(value)
      )

    if (
      !Number.isFinite(
        parsed
      )
    ) {
      return 0
    }

    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          parsed
        ) /
        60000
      )
    )
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


  function parseTimestamp(
    value: unknown
  ) {

    const parsed =
      Date.parse(
        String(
          value ||
          ''
        )
      )

    return Number.isFinite(
      parsed
    )
      ? parsed
      : 0
  }


  function itemActivityTimestamp(
    item?: RawRow
  ) {

    if (!item) {
      return 0
    }


    // Physical units are generated for the actual KDS item/round.
    // Prefer their creation timestamp when the secure view exposes it.
    const unitTimes =
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
        .map(
          (unit) =>
            Math.max(
              parseTimestamp(
                unit.kds_created_at
              ),
              parseTimestamp(
                unit.item_created_at
              ),
              parseTimestamp(
                unit.created_at
              ),
              parseTimestamp(
                unit.updated_at
              )
            )
        )
        .filter(
          (value) =>
            value >
            0
        )


    if (
      unitTimes.length >
      0
    ) {
      return Math.min(
        ...unitTimes
      )
    }


    // KDS secure views may expose the item/round timestamp
    // under different aliases. Prefer round/item-specific fields.
    const direct =
      [
        item.kds_item_created_at,
        item.item_created_at,
        item.round_created_at,
        item.added_at,
        item.kds_created_at,
        item.created_at,
        item.updated_at,
      ]
        .map(
          parseTimestamp
        )
        .find(
          (value) =>
            value >
            0
        )


    if (direct) {
      return direct
    }


    const ticket =
      ticketMap.get(
        itemTicketId(
          item
        )
      )


    return Math.max(
      parseTimestamp(
        ticket?.kds_created_at
      ),
      parseTimestamp(
        ticket?.created_at
      ),
      parseTimestamp(
        ticket?.updated_at
      )
    )
  }


  function formatActivityTime(
    item?: RawRow
  ) {

    const value =
      itemActivityTimestamp(
        item
      )

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


  function activityAgeMinutes(
    item?: RawRow
  ) {

    const value =
      itemActivityTimestamp(
        item
      )

    if (!value) {
      return 0
    }


    return Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          value
        ) /
        60000
      )
    )
  }


  function orderGroupKey(
    item: RawRow
  ) {

    const ticket =
      ticketMap.get(
        itemTicketId(
          item
        )
      )


    const order =
      orderNo(
        ticket
      )


    if (
      order &&
      order !==
      'ORDER'
    ) {
      return `order:${order}`
    }


    return (
      `ticket:${
        itemTicketId(
          item
        )
      }`
    )
  }


  // One visual card per restaurant order.
  // If a new add-on arrives for an older order, that order returns
  // to the top because grouping is sorted by latest item activity.
  const queueGroupMap =
    queueItems.reduce<
      Map<
        string,
        RawRow[]
      >
    >(
      (
        groups,
        item
      ) => {

        const key =
          orderGroupKey(
            item
          )

        const current =
          groups.get(
            key
          ) ||
          []

        current.push(
          item
        )

        groups.set(
          key,
          current
        )

        return groups

      },
      new Map<
        string,
        RawRow[]
      >()
    )


  const queueGroups:
    RawRow[][] =
    Array.from(
      queueGroupMap.values()
    )
      .map(
        (group) =>
          group.slice().sort(
            (
              a,
              b
            ) => {

              const roundDiff =
                roundNo(
                  b
                ) -
                roundNo(
                  a
                )

              if (
                roundDiff !==
                0
              ) {
                return roundDiff
              }

              return (
                itemActivityTimestamp(
                  a
                ) -
                itemActivityTimestamp(
                  b
                )
              )

            }
          )
      )
      .sort(
        (
          a,
          b
        ) => {

          const latestA =
            Math.max(
              ...a.map(
                itemActivityTimestamp
              )
            )

          const latestB =
            Math.max(
              ...b.map(
                itemActivityTimestamp
              )
            )

          return (
            latestB -
            latestA
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
  // ORDER CARD
  //
  // One card = one restaurant order.
  // Round/add-on items stay inside the same order card.
  // Item time/age is based on the item's own created_at,
  // not the original ticket time.
  // ============================================================

  function OrderCard({
    data,
  }: {
    data: RawRow[]
  }) {

    const firstItem =
      data[0]

    const ticket =
      firstItem
        ? ticketMap.get(
            itemTicketId(
              firstItem
            )
          )
        : undefined


    const table =
      tableLabel(
        ticket
      )


    const latestItem =
      data.reduce(
        (
          latest,
          item
        ) =>
          itemActivityTimestamp(
            item
          ) >
          itemActivityTimestamp(
            latest
          )
            ? item
            : latest,
        firstItem
      )


    const latestRound =
      Math.max(
        1,
        ...data.map(
          (item) =>
            roundNo(
              item
            )
        )
      )


    const hasAddon =
      latestRound >
      1


    const hasPreparing =
      data.some(
        (item) =>
          itemStatus(
            item
          ) ===
          'PREPARING'
      )


    return (

      <article
        className={
          `overflow-hidden rounded-xl border bg-white shadow-sm ${
            hasAddon
              ? 'border-purple-300 ring-1 ring-purple-100'
              : hasPreparing
                ? 'border-amber-300'
                : 'border-zinc-200'
          }`
        }
      >

        <div className="border-b border-zinc-100 p-3">

          <div className="flex items-start justify-between gap-3">

            <div className="min-w-0">

              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-red-800">
                {
                  sourceLabel(
                    ticket
                  )
                }
                {' · '}
                {
                  station ===
                  'ALL'
                    ? 'KDS'
                    : station
                }
              </p>


              <p className="mt-1 truncate text-lg font-black leading-tight">
                {
                  orderNo(
                    ticket
                  )
                }
              </p>


              {table && (

                <p className="mt-1 text-sm font-black text-blue-700">
                  {table}
                </p>

              )}


              {hasAddon && (

                <p className="mt-1.5 inline-flex rounded-lg bg-purple-100 px-2 py-1 text-[10px] font-black text-purple-800">
                  NEW ADD-ON · ROUND {
                    latestRound
                  }
                </p>

              )}

            </div>


            <div className="shrink-0 text-right">

              <span className="inline-flex rounded-lg bg-zinc-100 px-2 py-1 text-[11px] font-black text-zinc-600">
                {
                  formatActivityTime(
                    latestItem
                  )
                }
              </span>

              <p
                className={
                  `mt-1 text-[10px] font-black ${
                    activityAgeMinutes(
                      latestItem
                    ) >=
                    20
                      ? 'text-red-700'
                      : activityAgeMinutes(
                            latestItem
                          ) >=
                          10
                        ? 'text-amber-700'
                        : 'text-zinc-400'
                  }`
                }
              >
                LATEST {
                  activityAgeMinutes(
                    latestItem
                  )
                } MIN
              </p>

            </div>

          </div>

        </div>


        <div className="divide-y divide-zinc-100">

          {data.map(
            (item) => {

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
                    (
                      a,
                      b
                    ) =>
                      Number(
                        a.unit_no ??
                        0
                      ) -
                      Number(
                        b.unit_no ??
                        0
                      )
                  )


              const itemRound =
                roundNo(
                  item
                )


              return (

                <section
                  key={
                    itemId(
                      item
                    )
                  }
                  className={
                    `p-3 ${
                      itemRound >
                      1
                        ? 'bg-purple-50/40'
                        : ''
                    }`
                  }
                >

                  <div className="flex items-start gap-3">

                    <div
                      className={
                        `mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-black ${
                          status ===
                          'PREPARING'
                            ? 'bg-amber-100 text-amber-700'
                            : itemRound >
                                1
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-zinc-100 text-zinc-700'
                        }`
                      }
                    >
                      {
                        quantity(
                          item
                        )
                      }
                    </div>


                    <div className="min-w-0 flex-1">

                      <div className="flex items-start justify-between gap-2">

                        <div className="min-w-0">

                          <p className="text-lg font-black leading-tight">
                            {
                              menuName(
                                item
                              )
                            }
                          </p>


                          <div className="mt-1 flex flex-wrap items-center gap-1.5">

                            <span
                              className={
                                `rounded-md px-1.5 py-0.5 text-[9px] font-black ${
                                  itemStation(
                                    item
                                  ) ===
                                  'BAR'
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'bg-red-50 text-red-800'
                                }`
                              }
                            >
                              {
                                itemStation(
                                  item
                                )
                              }
                            </span>


                            {itemRound >
                              1 && (

                              <span className="rounded-md bg-purple-100 px-1.5 py-0.5 text-[9px] font-black text-purple-800">
                                ADD-ON · ROUND {
                                  itemRound
                                }
                              </span>

                            )}


                            <span className="text-[10px] font-bold text-zinc-400">
                              {
                                formatActivityTime(
                                  item
                                )
                              }
                              {' · '}
                              WAIT {
                                activityAgeMinutes(
                                  item
                                )
                              } MIN
                            </span>

                          </div>

                        </div>

                      </div>


                      {quantity(
                        item
                      ) > 1 && (

                        <p className="mt-1 text-[10px] font-bold text-zinc-400">
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

                        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs font-bold text-amber-900">
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


                  <div className="mt-2 space-y-1.5">

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
                            className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white p-2"
                          >

                            <div className="min-w-0">

                              <p className="truncate text-sm font-black leading-tight">
                                {
                                  menuName(
                                    item
                                  )
                                }
                              </p>


                              {itemUnits.length >
                                1 && (

                                <p className="mt-0.5 text-[10px] font-bold text-zinc-500">
                                  Item {
                                    unitNo
                                  } / {
                                    itemUnits.length
                                  }
                                </p>

                              )}

                            </div>


                            {isReady ? (

                              <span className="shrink-0 rounded-lg bg-green-100 px-3 py-2 text-[10px] font-black text-green-700">
                                ✓ {
                                  unitStatus ===
                                  'COMPLETED'
                                    ? 'DONE'
                                    : 'READY'
                                }
                              </span>

                            ) : isCancelled ? (

                              <span className="shrink-0 rounded-lg bg-zinc-200 px-3 py-2 text-[10px] font-black text-zinc-500">
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
                                className="shrink-0 rounded-lg bg-green-700 px-3 py-2 text-[10px] font-black text-white transition hover:bg-green-800 disabled:opacity-50"
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

                      <div className="rounded-lg border border-dashed border-zinc-300 p-2.5 text-center text-[10px] font-bold text-zinc-400">
                        Preparing item checklist...
                      </div>

                    )}

                  </div>

                </section>

              )

            }
          )}

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
    data: RawRow[][]
    kind:
      'NEW'
      | 'PREPARING'
      | 'READY'
  }) {

    const totalItems =
      data.reduce(
        (
          total,
          group
        ) =>
          total +
          group.length,
        0
      )


    return (

      <section>

        <div className="mb-3 flex items-end justify-between">

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
              {subtitle}
            </p>

            <h2 className="mt-0.5 text-xl font-black">
              {title}
            </h2>

          </div>


          <span
            className={
              `rounded-lg px-2.5 py-1 text-xs font-black ${
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
            {data.length} ORDERS · {
              totalItems
            } ITEMS
          </span>

        </div>


        <div className="grid items-start gap-3 md:grid-cols-3 xl:grid-cols-4">

          {data.map(
            (
              group
            ) => (

              <OrderCard
                key={
                  itemTicketId(
                    group[0]
                  ) ||
                  itemId(
                    group[0]
                  )
                }
                data={
                  group
                }
              />

            )
          )}


          {data.length ===
            0 && (

            <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-sm font-semibold text-zinc-400 md:col-span-3 xl:col-span-4">
              No items
            </div>

          )}

        </div>

      </section>

    )

  }


  return (
    <main className="min-h-screen bg-zinc-100 p-3 text-zinc-950 sm:p-4">

      <div className="mx-auto max-w-[1800px]">

        <header className="mb-4">

          <div className="flex flex-wrap items-end justify-between gap-3">

            <div>

              <Link
                href="/dashboard"
                className="text-xs font-semibold text-zinc-500 hover:text-red-900"
              >
                ← Dashboard
              </Link>


              <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-800">
                Restaurant Operations
              </p>


              <h1 className="mt-0.5 text-2xl font-black">
                Kitchen Display
              </h1>


              <p className="mt-1 text-xs font-semibold text-zinc-500">
                Single queue · newest order first · one tap when ready.
              </p>

            </div>


            <div className="flex gap-2">

              {canOpenOrders && (

                <Link
                  href="/dashboard/pos/orders"
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold"
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
                className="rounded-lg bg-zinc-950 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {
                  refreshing
                    ? 'Refreshing...'
                    : 'Refresh'
                }
              </button>

            </div>

          </div>


          <div className="mt-3 flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setStation(
                  'KITCHEN'
                )
              }
              className={
                `rounded-lg px-4 py-2 text-xs font-black ${
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
                `rounded-lg px-4 py-2 text-xs font-black ${
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
                `rounded-lg px-4 py-2 text-xs font-black ${
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

          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
            {error}
          </div>

        )}


        {loading ? (

          <div className="rounded-xl bg-white p-12 text-center font-bold text-zinc-500">
            Loading Kitchen Display...
          </div>

        ) : (

          <div>

            <BoardColumn
              title="Kitchen Queue"
              subtitle="Newest Activity First · Add-ons Return to Top"
              data={
                queueGroups
              }
              kind="NEW"
            />

          </div>

        )}

      </div>

    </main>
  )
}
