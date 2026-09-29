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

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">


        {/* HEADER */}

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">

          <div>

            <Link
              href="/dashboard/waiter"
              className="text-sm font-bold text-zinc-500"
            >
              ← Table Map
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-red-800">
              Waiter Mode · {
                table.outlet_name
              }
            </p>


            <div className="mt-2 flex items-baseline gap-3">

              <h1 className="text-3xl font-black">
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
            className={`rounded-2xl px-5 py-3 ${
              order

                ? 'bg-amber-100 text-amber-900'

                : 'bg-emerald-100 text-emerald-900'
            }`}
          >

            <p className="text-xs font-black uppercase">
              {
                order
                  ? 'Active Order'
                  : 'New Order'
              }
            </p>

            <p className="mt-1 font-black">
              {
                order
                  ?.order_no ||
                'Ready to Order'
              }
            </p>

          </div>

        </div>



        <div className="grid gap-5 lg:grid-cols-[1fr_400px]">


          {/* ===============================================
              MENU
          =============================================== */}

          <div className="space-y-4">


            <section className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">

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
                className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none focus:border-zinc-950"
              />


              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">

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
                      className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black ${
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



            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">

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
                      className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
                    >

                      <p className="text-xs font-black uppercase text-zinc-400">
                        {
                          menu.category ||
                          'Menu'
                        }
                      </p>


                      <h3 className="mt-2 min-h-[48px] text-lg font-black">
                        {
                          menu.name
                        }
                      </h3>


                      <p className="mt-1 text-sm font-black text-red-900">
                        {
                          money(
                            menu.selling_price
                          )
                        }
                      </p>


                      <div className="mt-4 grid grid-cols-[44px_1fr_44px] items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            decrease(
                              menu.id
                            )
                          }
                          className="h-11 rounded-xl bg-zinc-100 text-xl font-black"
                        >
                          −
                        </button>


                        <div className="text-center text-xl font-black">
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
                          className="h-11 rounded-xl bg-zinc-950 text-xl font-black text-white"
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
                          className="mt-3 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-950"
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

          <div className="space-y-4">


            {order && (

              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs font-black uppercase tracking-wider text-amber-700">
                      Current Order
                    </p>

                    <p className="mt-1 font-black">
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


                <div className="mt-4 space-y-3">

                  {existingItems.map(
                    (item) => (

                      <div
                        key={
                          item.id
                        }
                        className="border-t border-amber-200 pt-3"
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

              <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">

                <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
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
                  className="mt-3 w-full rounded-xl border border-zinc-300 px-4 py-3"
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
                  rows={3}
                  className="mt-3 w-full resize-none rounded-xl border border-zinc-300 px-4 py-3"
                />

              </section>

            )}



            <section className="sticky top-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-lg">

              <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                {
                  order
                    ? 'Additional Order'
                    : 'New Order'
                }
              </p>


              {cartLines.length ===
                0 ? (

                <div className="py-10 text-center text-sm text-zinc-400">
                  Select menu to start.
                </div>

              ) : (

                <div className="mt-4 space-y-3">

                  {cartLines.map(
                    (row) => (

                      <div
                        key={
                          row.menu_item_id
                        }
                        className="border-b border-zinc-100 pb-3"
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


              <div className="mt-5 flex items-center justify-between border-t border-zinc-200 pt-4">

                <span className="font-black">
                  Total
                </span>

                <span className="text-xl font-black">
                  {
                    money(
                      cartTotal
                    )
                  }
                </span>

              </div>


              {error && (

                <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
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
                className="mt-5 w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {
                  sending

                    ? 'SENDING...'

                    : order

                      ? 'SEND ADDITIONAL ORDER'

                      : 'SEND TO KITCHEN'
                }
              </button>


              <p className="mt-3 text-center text-xs font-semibold text-zinc-400">
                Payment is handled by Cashier POS.
              </p>

            </section>

          </div>

        </div>

      </div>

    </main>

  )
}
