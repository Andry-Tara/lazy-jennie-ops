'use client'

import Link
  from 'next/link'

import {
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'


type TableRow = {
  id: string
  outlet_id: string
  outlet_code: string
  outlet_name: string

  code: string
  name: string
  capacity: number

  status: string

  active_order_id:
    string |
    null
}


type Order = {
  id: string
  order_no: string

  outlet_id: string

  table_id: string
  table_code: string
  table_name: string

  source: string
  status: string
  payment_status: string

  guest_name:
    string |
    null

  notes:
    string |
    null

  subtotal:
    number |
    string

  grand_total:
    number |
    string

  opened_at: string
}


type ExistingItem = {
  id: string
  order_id: string

  menu_item_id: string

  menu_code:
    string |
    null

  menu_name: string

  quantity:
    number |
    string

  unit_price:
    number |
    string

  line_total:
    number |
    string

  notes:
    string |
    null

  status: string
  round_no: number
}


type Menu = {
  outlet_id: string

  id: string

  code:
    string |
    null

  name: string

  category:
    string |
    null

  selling_price:
    number |
    string

  image_url:
    string |
    null
}


type CartRow = {
  menu_item_id: string

  qty: number

  notes: string
}


type Props = {
  table: TableRow
  order: Order | null

  existingItems:
    ExistingItem[]

  menus: Menu[]
}


function money(
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


export default function WaiterOrderClient({
  table,
  order,
  existingItems,
  menus,
}: Props) {

  const router =
    useRouter()


  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  const [
    search,
    setSearch,
  ] =
    useState('')


  const [
    category,
    setCategory,
  ] =
    useState('ALL')


  const [
    guestName,
    setGuestName,
  ] =
    useState(
      order
        ?.guest_name ||
      ''
    )


  const [
    orderNotes,
    setOrderNotes,
  ] =
    useState(
      order
        ?.notes ||
      ''
    )


  const [
    cart,
    setCart,
  ] =
    useState<CartRow[]>(
      []
    )


  const [
    sending,
    setSending,
  ] =
    useState(false)


  const [
    error,
    setError,
  ] =
    useState('')


  const categories =
    useMemo(
      () => [

        'ALL',

        ...Array.from(
          new Set(
            menus
              .map(
                (menu) =>
                  menu.category ||
                  'OTHER'
              )
              .filter(Boolean)
          )
        ),

      ],
      [menus]
    )


  const filteredMenus =
    useMemo(
      () => {

        const keyword =
          search
            .trim()
            .toLowerCase()


        return menus.filter(
          (menu) => {

            if (
              category !==
                'ALL'
              &&
              (
                menu.category ||
                'OTHER'
              ) !==
                category
            ) {
              return false
            }


            if (!keyword) {
              return true
            }


            return [
              menu.code ||
                '',
              menu.name,
              menu.category ||
                '',
            ]
              .join(' ')
              .toLowerCase()
              .includes(
                keyword
              )

          }
        )

      },
      [
        menus,
        search,
        category,
      ]
    )


  function cartRow(
    menuId: string
  ) {

    return cart.find(
      (row) =>
        row.menu_item_id ===
        menuId
    )

  }


  function increase(
    menuId: string
  ) {

    setCart(
      (current) => {

        const existing =
          current.find(
            (row) =>
              row.menu_item_id ===
              menuId
          )


        if (existing) {

          return current.map(
            (row) =>
              row.menu_item_id ===
                menuId

                ? {
                    ...row,
                    qty:
                      row.qty +
                      1,
                  }

                : row
          )

        }


        return [
          ...current,
          {
            menu_item_id:
              menuId,

            qty:
              1,

            notes:
              '',
          },
        ]

      }
    )

  }


  function decrease(
    menuId: string
  ) {

    setCart(
      (current) =>
        current
          .map(
            (row) =>
              row.menu_item_id ===
                menuId

                ? {
                    ...row,
                    qty:
                      row.qty -
                      1,
                  }

                : row
          )
          .filter(
            (row) =>
              row.qty >
              0
          )
    )

  }


  function updateNote(
    menuId: string,
    value: string
  ) {

    setCart(
      (current) =>
        current.map(
          (row) =>
            row.menu_item_id ===
              menuId

              ? {
                  ...row,
                  notes:
                    value,
                }

              : row
        )
    )

  }


  const cartLines =
    cart
      .map(
        (row) => {

          const menu =
            menus.find(
              (item) =>
                item.id ===
                row.menu_item_id
            )


          if (!menu) {
            return null
          }


          return {
            ...row,
            menu,
          }

        }
      )
      .filter(
        Boolean
      ) as Array<
        CartRow & {
          menu: Menu
        }
      >


  const cartTotal =
    cartLines.reduce(
      (
        total,
        row
      ) =>
        total +
        (
          Number(
            row.menu
              .selling_price
          )
          *
          row.qty
        ),
      0
    )


  async function submit() {

    if (
      cart.length ===
      0
    ) {

      setError(
        'Pilih minimal 1 menu.'
      )

      return

    }


    setSending(true)
    setError('')


    try {

      const payload =
        cart.map(
          (row) => ({
            menu_item_id:
              row.menu_item_id,

            quantity:
              row.qty,

            notes:
              row.notes
                .trim() ||
              null,
          })
        )


      if (order) {

        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            'add_waiter_order_items_secure',
            {
              p_order_id:
                order.id,

              p_items:
                payload,
            }
          )


        if (rpcError) {
          throw rpcError
        }

      } else {

        const {
          error:
            rpcError,
        } =
          await supabase.rpc(
            'create_waiter_order_secure',
            {
              p_outlet_id:
                table.outlet_id,

              p_table_id:
                table.id,

              p_guest_name:
                guestName
                  .trim() ||
                null,

              p_notes:
                orderNotes
                  .trim() ||
                null,

              p_items:
                payload,
            }
          )


        if (rpcError) {
          throw rpcError
        }

      }


      router.push(
        '/dashboard/waiter'
      )

      router.refresh()

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        'Failed to send order.'
      )

      setSending(false)

    }

  }


  return (

    <main className="min-h-screen bg-zinc-100 text-zinc-900">

      <div className="mx-auto max-w-[1600px] px-3 py-3 sm:px-4">


        {/* HEADER */}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">

          <div>

            <Link
              href="/dashboard/waiter"
              className="text-xs font-bold text-zinc-500 hover:text-zinc-900"
            >
              ← Table Map
            </Link>


            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-red-800">
              Waiter Mode · {
                table.outlet_name
              }
            </p>


            <div className="mt-1 flex items-baseline gap-2">

              <h1 className="text-2xl font-black">
                {
                  table.code
                }
              </h1>

              <p className="font-bold text-zinc-500">
                {
                  table.name
                }
                {' · '}
                {
                  table.capacity
                } pax
              </p>

            </div>

          </div>


          <div
            className={`rounded-xl px-3 py-2 ${
              order

                ? 'bg-amber-100 text-amber-900'

                : 'bg-emerald-100 text-emerald-900'
            }`}
          >

            <p className="text-[10px] font-black uppercase">
              {
                order
                  ? 'Active Order'
                  : 'New Order'
              }
            </p>

            <p className="mt-0.5 text-sm font-black">
              {
                order
                  ?.order_no ||
                'Ready to Order'
              }
            </p>

          </div>

        </div>



        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">


          {/* ===============================================
              MENU
          =============================================== */}

          <div className="space-y-3">


            <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">

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
                placeholder="Search menu..."
                className="w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />


              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">

                {categories.map(
                  (value) => (

                    <button
                      key={
                        value
                      }
                      type="button"
                      onClick={() =>
                        setCategory(
                          value
                        )
                      }
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-black ${
                        category ===
                          value

                          ? 'bg-zinc-950 text-white'

                          : 'bg-zinc-100 text-zinc-600'
                      }`}
                    >
                      {value}
                    </button>

                  )
                )}

              </div>

            </section>



            <section className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">

              {filteredMenus.map(
                (menu) => {

                  const row =
                    cartRow(
                      menu.id
                    )


                  return (

                    <div
                      key={
                        menu.id
                      }
                      className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
                    >

                      <p className="text-[9px] font-black uppercase tracking-wide text-zinc-400">
                        {
                          menu.category ||
                          'Menu'
                        }
                      </p>


                      <h3 className="mt-1 min-h-[34px] text-sm font-black leading-4">
                        {
                          menu.name
                        }
                      </h3>


                      <p className="mt-1 text-xs font-black text-red-900">
                        {
                          money(
                            menu.selling_price
                          )
                        }
                      </p>


                      <div className="mt-2 grid grid-cols-[36px_1fr_36px] items-center gap-1.5">

                        <button
                          type="button"
                          onClick={() =>
                            decrease(
                              menu.id
                            )
                          }
                          className="h-9 rounded-lg bg-zinc-100 text-lg font-black hover:bg-zinc-200"
                        >
                          −
                        </button>


                        <div className="text-center text-base font-black">
                          {
                            row?.qty ||
                            0
                          }
                        </div>


                        <button
                          type="button"
                          onClick={() =>
                            increase(
                              menu.id
                            )
                          }
                          className="h-9 rounded-lg bg-blue-600 text-lg font-black text-white hover:bg-blue-500"
                        >
                          +
                        </button>

                      </div>


                      {row && (

                        <input
                          value={
                            row.notes
                          }
                          onChange={(
                            event
                          ) =>
                            updateNote(
                              menu.id,
                              event.target.value
                            )
                          }
                          placeholder="Kitchen note..."
                          className="mt-2 w-full rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs outline-none focus:border-blue-500"
                        />

                      )}

                    </div>

                  )

                }
              )}

            </section>

          </div>



          {/* ===============================================
              RIGHT PANEL
          =============================================== */}

          <div className="space-y-3 md:sticky md:top-3 md:flex md:h-[calc(100vh-7rem)] md:self-start md:flex-col md:gap-3 md:space-y-0">


            {order && (

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3 md:max-h-[170px] md:shrink-0 md:overflow-y-auto">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                      Current Order
                    </p>

                    <p className="mt-0.5 text-sm font-black">
                      {
                        order.order_no
                      }
                    </p>

                  </div>


                  <p className="font-black">
                    {
                      money(
                        order.grand_total
                      )
                    }
                  </p>

                </div>


                <div className="mt-2 space-y-2">

                  {existingItems.map(
                    (item) => (

                      <div
                        key={
                          item.id
                        }
                        className="border-t border-amber-200 pt-2"
                      >

                        <div className="flex justify-between gap-3">

                          <div>

                            <p className="font-black">
                              {
                                Number(
                                  item.quantity
                                )
                              }× {
                                item.menu_name
                              }
                            </p>


                            {item.notes && (

                              <p className="mt-1 text-xs text-amber-800">
                                Note: {
                                  item.notes
                                }
                              </p>

                            )}


                            <p className="mt-1 text-[10px] font-black uppercase text-amber-600">
                              Round {
                                item.round_no
                              }
                            </p>

                          </div>


                          <p className="whitespace-nowrap text-sm font-black">
                            {
                              money(
                                item.line_total
                              )
                            }
                          </p>

                        </div>

                      </div>

                    )
                  )}

                </div>

              </section>

            )}



            {!order && (

              <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm md:shrink-0">

                <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  Guest
                </p>


                <input
                  value={
                    guestName
                  }
                  onChange={(
                    event
                  ) =>
                    setGuestName(
                      event.target.value
                    )
                  }
                  placeholder="Guest name · optional"
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />


                <textarea
                  value={
                    orderNotes
                  }
                  onChange={(
                    event
                  ) =>
                    setOrderNotes(
                      event.target.value
                    )
                  }
                  placeholder="General order note · optional"
                  rows={2}
                  className="mt-2 w-full resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                />

              </section>

            )}



            <section className="rounded-xl border border-zinc-200 bg-white p-3 shadow-lg md:flex md:min-h-0 md:flex-1 md:flex-col">

              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                {
                  order
                    ? 'Additional Order'
                    : 'New Order'
                }
              </p>


              {cartLines.length ===
                0 ? (

                <div className="py-6 text-center text-xs text-zinc-400 md:flex md:flex-1 md:items-center md:justify-center">
                  Select menu to start.
                </div>

              ) : (

                <div className="mt-3 space-y-2 md:min-h-0 md:flex-1 md:overflow-y-auto md:pr-1">

                  {cartLines.map(
                    (row) => (

                      <div
                        key={
                          row.menu_item_id
                        }
                        className="border-b border-zinc-100 pb-2"
                      >

                        <div className="flex justify-between gap-3">

                          <p className="font-black">
                            {
                              row.qty
                            }× {
                              row.menu.name
                            }
                          </p>

                          <p className="whitespace-nowrap text-sm font-bold">
                            {
                              money(
                                Number(
                                  row.menu
                                    .selling_price
                                )
                                *
                                row.qty
                              )
                            }
                          </p>

                        </div>


                        {row.notes && (

                          <p className="mt-1 text-xs text-zinc-500">
                            Note: {
                              row.notes
                            }
                          </p>

                        )}

                      </div>

                    )
                  )}

                </div>

              )}


              <div className="mt-3 flex shrink-0 items-center justify-between border-t border-zinc-200 pt-3">

                <span className="font-black">
                  Total
                </span>

                <span className="text-lg font-black">
                  {
                    money(
                      cartTotal
                    )
                  }
                </span>

              </div>


              {error && (

                <div className="mt-2 shrink-0 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                  {error}
                </div>

              )}


              <button
                type="button"
                disabled={
                  sending ||
                  cart.length ===
                    0
                }
                onClick={() =>
                  void submit()
                }
                className="mt-3 w-full shrink-0 rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {
                  sending

                    ? 'SENDING...'

                    : order

                      ? 'SEND ADDITIONAL ORDER'

                      : 'SEND TO KITCHEN'
                }
              </button>


              <p className="mt-2 shrink-0 text-center text-[10px] font-semibold text-zinc-400">
                Payment is handled by Cashier POS.
              </p>

            </section>

          </div>

        </div>

      </div>

    </main>

  )
}
