'use client'

import Link from 'next/link'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'


type Order = {
  id: string
  order_no: string

  outlet_id: string
  outlet_code: string
  outlet_name: string

  table_code: string | null
  table_name: string | null

  status: string
  payment_status: string

  subtotal: number | string
  grand_total: number | string
}


type Menu = {
  id: string
  code: string
  name: string

  category: string | null

  selling_price:
    number | string

  image_url:
    string | null
}


type Availability = {
  status?: string
  available_portions?: number
}


type CartRow = {
  menu_item_id: string
  code: string
  name: string

  unit_price: number
  qty: number
  notes: string
}


export default function AddItemsClient({
  order,
  menus,
  salesOnlyProfile,
}: {
  order: Order
  menus: Menu[]
  salesOnlyProfile: boolean
}) {

  const router =
    useRouter()


  const supabase =
    useMemo(
      () => createClient(),
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
    cart,
    setCart,
  ] =
    useState<CartRow[]>(
      []
    )


  const [
    availability,
    setAvailability,
  ] =
    useState<
      Record<
        string,
        Availability
      >
    >({})


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


  function money(
    value:
      | number
      | string
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


  useEffect(
    () => {

      let cancelled =
        false


      async function loadAvailability() {

        // SALES_ONLY_SYNTHETIC_AVAILABILITY
        //
        // Rangka / Sales-Only:
        // no BOM and no inventory stock validation.
        //
        // Existing menu logic can remain unchanged because
        // every active menu receives AVAILABLE availability.
        if (
          salesOnlyProfile
        ) {

          const next:
            Record<
              string,
              Availability
            > =
              {}


          for (
            const menu
            of menus
          ) {

            next[
              menu.id
            ] = {
              status:
                'AVAILABLE',

              available_portions:
                Number.MAX_SAFE_INTEGER,
            }

          }


          if (!cancelled) {

            setAvailability(
              next
            )

          }


          return

        }



        const next:
          Record<
            string,
            Availability
          > =
            {}


        await Promise.all(

          menus.map(
            async (
              menu
            ) => {

              const {
                data,
              } =
                await supabase.rpc(
                  'get_menu_stock_availability',
                  {
                    p_outlet_id:
                      order.outlet_id,

                    p_menu_item_id:
                      menu.id,
                  }
                )


              if (
                !cancelled
              ) {
                next[
                  menu.id
                ] =
                  (
                    data ||
                    {}
                  ) as Availability
              }

            }
          )

        )


        if (!cancelled) {
          setAvailability(
            next
          )
        }

      }


      void loadAvailability()


      return () => {
        cancelled =
          true
      }

    },
    [
      menus,
      order.outlet_id,
      salesOnlyProfile,
      supabase,
    ]
  )


  const categories =
    useMemo(
      () => {

        return Array.from(
          new Set(
            menus
              .map(
                (menu) =>
                  menu.category
              )
              .filter(
                Boolean
              )
          )
        ) as string[]

      },
      [menus]
    )


  const filteredMenus =
    useMemo(
      () => {

        const q =
          search
            .trim()
            .toLowerCase()


        return menus.filter(
          (menu) => {

            if (
              category !==
                'ALL' &&
              menu.category !==
                category
            ) {
              return false
            }


            if (!q) {
              return true
            }


            return (
              menu.name
                .toLowerCase()
                .includes(
                  q
                ) ||
              menu.code
                .toLowerCase()
                .includes(
                  q
                )
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


  function cartQty(
    menuId: string
  ) {

    return (
      cart.find(
        (row) =>
          row.menu_item_id ===
          menuId
      )?.qty || 0
    )

  }


  function addMenu(
    menu: Menu
  ) {

    const stock =
      availability[
        menu.id
      ]


    const available =
      Number(
        stock
          ?.available_portions ??
        0
      )


    const currentQty =
      cartQty(
        menu.id
      )


    if (
      stock?.status ===
      'NO_BOM'
    ) {
      setError(
        `${menu.name} belum memiliki BOM.`
      )
      return
    }


    if (
      currentQty + 1 >
      available
    ) {

      setError(
        `Stock ${menu.name} tidak cukup.`
      )

      return
    }


    setError('')


    setCart(
      (
        current
      ) => {

        const existing =
          current.find(
            (row) =>
              row.menu_item_id ===
              menu.id
          )


        if (existing) {

          return current.map(
            (row) =>
              row.menu_item_id ===
              menu.id

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
              menu.id,

            code:
              menu.code,

            name:
              menu.name,

            unit_price:
              Number(
                menu.selling_price ||
                0
              ),

            qty: 1,
            notes: '',
          },
        ]

      }
    )

  }


  function decrease(
    menuId: string
  ) {

    setCart(
      (
        current
      ) =>
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
              row.qty > 0
          )
    )

  }


  function updateCartNote(
    menuItemId: string,
    value: string
  ) {

    setCart(
      (current) =>
        current.map(
          (row) =>
            row.menu_item_id ===
            menuItemId
              ? {
                  ...row,
                  notes:
                    value,
                }
              : row
        )
    )

  }


  const addOnTotal =
    cart.reduce(
      (
        total,
        row
      ) =>
        total +
        (
          row.unit_price *
          row.qty
        ),
      0
    )


  async function submitAddOn() {

    if (
      cart.length ===
      0
    ) {
      return
    }


    setSending(true)
    setError('')


    try {

      const {
        data,
        error:
          rpcError,
      } =
        await supabase.rpc(
          'add_restaurant_order_items_secure',
          {
            p_order_id:
              order.id,

            p_items:
              cart.map(
                (row) => ({
                  menu_item_id:
                    row.menu_item_id,

                  quantity:
                    row.qty,

                  notes:
                    row.notes.trim() ||
                    null,
                })
              ),
          }
        )


      if (rpcError) {
        throw rpcError
      }


      const round =
        Number(
          data || 0
        )


      console.log(
        'ADDITIONAL ORDER ROUND:',
        round
      )


      router.push(
        '/dashboard/pos/orders'
      )

      router.refresh()

    } catch (
      err: any
    ) {

      console.error(
        'ADD ORDER ERROR:',
        err
      )


      setError(
        err?.message ||
        err?.details ||
        'Failed to add items.'
      )

    } finally {

      setSending(false)

    }

  }


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950">

      <div className="mx-auto max-w-[1500px]">

        <header className="mb-6">

          <Link
            href="/dashboard/pos/orders"
            className="text-sm font-bold text-zinc-500 hover:text-red-900"
          >
            ← Open Orders
          </Link>


          <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-red-800">
            Additional Order
          </p>


          <div className="mt-1 flex flex-wrap items-end justify-between gap-4">

            <div>

              <h1 className="text-3xl font-black">
                {
                  order.table_code ||
                  'Takeaway'
                }
              </h1>

              <p className="mt-1 font-bold text-zinc-500">
                {
                  order.order_no
                }
                {' · '}
                {
                  order.outlet_name
                }
              </p>

            </div>


            <div className="rounded-xl bg-white px-5 py-3 text-right shadow-sm">

              <p className="text-xs font-bold text-zinc-500">
                Current Total
              </p>

              <p className="text-xl font-black text-red-900">
                {
                  money(
                    order.grand_total
                  )
                }
              </p>

            </div>

          </div>

        </header>


        {error && (

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {error}
          </div>

        )}


        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

          <section>

            <div className="mb-5 grid gap-3 md:grid-cols-2">

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
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3"
              />


              <select
                value={
                  category
                }
                onChange={(
                  event
                ) =>
                  setCategory(
                    event.target.value
                  )
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3"
              >

                <option value="ALL">
                  All Categories
                </option>

                {categories.map(
                  (value) => (

                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {value}
                    </option>

                  )
                )}

              </select>

            </div>


            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              {filteredMenus.map(
                (menu) => {

                  const info =
                    availability[
                      menu.id
                    ]

                  const available =
                    Number(
                      info
                        ?.available_portions ??
                      0
                    )


                  const disabled =
                    info?.status ===
                      'NO_BOM' ||
                    available <= 0


                  return (

                    <button
                      key={
                        menu.id
                      }
                      type="button"
                      disabled={
                        disabled
                      }
                      onClick={() =>
                        addMenu(
                          menu
                        )
                      }
                      className="rounded-2xl border border-zinc-200 bg-white p-5 text-left shadow-sm hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >

                      <p className="text-xs font-bold text-zinc-400">
                        {
                          menu.code
                        }
                      </p>


                      <h2 className="mt-1 text-lg font-black">
                        {
                          menu.name
                        }
                      </h2>


                      <p className="mt-1 text-sm text-zinc-500">
                        {
                          menu.category
                        }
                      </p>


                      <p className="mt-5 text-xl font-black text-red-900">
                        {
                          money(
                            menu.selling_price
                          )
                        }
                      </p>


                      <p
                        className={
                          salesOnlyProfile
                            ? "mt-3 text-xs font-bold text-green-700"
                            : "mt-3 text-xs font-bold text-zinc-500"
                        }
                      >
                        {
                          salesOnlyProfile
                            ? "Ready to Sell"
                            : <>Available: {available}</>
                        }
                      </p>

                    </button>

                  )

                }
              )}

            </div>

          </section>


          <aside className="h-fit rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <div className="border-b border-zinc-200 p-5">

              <h2 className="text-xl font-black">
                Additional Items
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Only these items will be sent to KDS.
              </p>

            </div>


            <div className="divide-y divide-zinc-100">

              {cart.map(
                (row) => (

                  <div
                    key={
                      row.menu_item_id
                    }
                    className="p-5"
                  >

                    <p className="font-black">
                      {
                        row.name
                      }
                    </p>


                    <div className="mt-3 flex items-center justify-between gap-3">

                      <div className="flex items-center gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            decrease(
                              row.menu_item_id
                            )
                          }
                          className="h-9 w-9 rounded-lg border border-zinc-300 font-black"
                        >
                          −
                        </button>


                        <span className="min-w-8 text-center font-black">
                          {
                            row.qty
                          }
                        </span>


                        <button
                          type="button"
                          onClick={() => {

                            const menu =
                              menus.find(
                                (
                                  item
                                ) =>
                                  item.id ===
                                  row.menu_item_id
                              )

                            if (menu) {
                              addMenu(
                                menu
                              )
                            }

                          }}
                          className="h-9 w-9 rounded-lg border border-zinc-300 font-black"
                        >
                          +
                        </button>

                      </div>


                      <p className="font-black">
                        {
                          money(
                            row.unit_price *
                            row.qty
                          )
                        }
                      </p>

                    </div>

                  <div className="mt-3">
                      <label className="mb-1.5 block text-[11px] font-black uppercase tracking-wide text-zinc-500">
                        Kitchen Note
                      </label>

                      <textarea
                        rows={2}
                        value={
                          row.notes
                        }
                        onChange={(
                          event
                        ) =>
                          updateCartNote(
                            row.menu_item_id,
                            event.target.value
                          )
                        }
                        placeholder="Example: no spicy, sauce separate"
                        className="w-full resize-none rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-zinc-800 outline-none focus:border-amber-400"
                      />
                    </div>

                  </div>

                )
              )}


              {cart.length ===
                0 && (

                <div className="p-10 text-center text-sm font-semibold text-zinc-400">
                  Select additional menu items.
                </div>

              )}

            </div>


            <div className="border-t border-zinc-200 p-5">

              <div className="flex items-end justify-between">

                <div>

                  <p className="text-xs font-bold text-zinc-500">
                    Additional
                  </p>

                  <p className="text-2xl font-black text-red-900">
                    {
                      money(
                        addOnTotal
                      )
                    }
                  </p>

                </div>


                <div className="text-right">

                  <p className="text-xs font-bold text-zinc-500">
                    New Total
                  </p>

                  <p className="font-black">
                    {
                      money(
                        Number(
                          order.grand_total
                        ) +
                        addOnTotal
                      )
                    }
                  </p>

                </div>

              </div>


              <button
                type="button"
                disabled={
                  sending ||
                  cart.length ===
                    0
                }
                onClick={() =>
                  void submitAddOn()
                }
                className="mt-5 w-full rounded-xl bg-zinc-950 px-5 py-4 font-black text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {
                  sending
                    ? 'SENDING ADD-ON...'
                    : 'SEND ADD-ON TO KITCHEN'
                }
              </button>

            </div>

          </aside>

        </div>

      </div>

    </main>
  )
}
