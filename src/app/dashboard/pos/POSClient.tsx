'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
  type: string
}

type RestaurantTable = {
  id: string
  outlet_id: string
  code: string
  name: string
  capacity: number
  status: string
  is_active: boolean
}

type OrderType =
  | 'DINE_IN'
  | 'TAKEAWAY'

// UNIFIED_ORDER_POS_V1

type MenuItem = {
  id: string
  code: string
  name: string
  category: string | null
  selling_price: number
  low_stock_portions: number
  image_url: string | null
}

type Availability = {
  menu_item_id: string
  menu_code: string
  menu_name: string
  selling_price: number
  status:
    | 'AVAILABLE'
    | 'LOW_STOCK'
    | 'OUT_OF_STOCK'
    | 'NO_BOM'
  available_portions: number
  low_stock_portions: number
  components: {
    item_id: string
    sku: string
    item_name: string
    required_qty: number
    unit_id: string
    unit_code: string
    required_base_qty: number
    system_stock_base: number
    available_portions: number
  }[]
}

type CartRow = {
  menu_item_id: string
  code: string
  name: string
  unit_price: number
  qty: number
  notes: string
}

type OpenCashierShift = {
  id: string
  shift_no: string

  outlet_id: string
  outlet_code: string
  outlet_name: string

  status: string

  opening_cash:
    number | string

  opened_at: string
}


type Props = {
  outlets: Outlet[]
  menus: MenuItem[]
  restaurantTables: RestaurantTable[]
  defaultOutletId: string
  today: string
  roleCode: string
  canOverride: boolean
  salesOnlyProfile: boolean
}

export default function POSClient({
  outlets,
  menus,
  restaurantTables,
  defaultOutletId,
  today,
  roleCode,
  canOverride,
  salesOnlyProfile,
}: Props) {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const router =
    useRouter()

  const [
    selectedOutletId,
    setSelectedOutletId,
  ] = useState(
    defaultOutletId
  )

  const [
    orderType,
    setOrderType,
  ] =
    useState<OrderType>(
      'DINE_IN'
    )

  const [
    selectedTableId,
    setSelectedTableId,
  ] =
    useState('')

  const [
    sendingOrder,
    setSendingOrder,
  ] =
    useState(false)

  const [
    lastOrderId,
    setLastOrderId,
  ] =
    useState('')


  const [
    openCashierShift,
    setOpenCashierShift,
  ] =
    useState<OpenCashierShift | null>(
      null
    )


  const [
    shiftLoading,
    setShiftLoading,
  ] =
    useState(true)


  const [
    availabilityMap,
    setAvailabilityMap,
  ] = useState<
    Record<
      string,
      Availability
    >
  >({})

  const [
    availabilityLoading,
    setAvailabilityLoading,
  ] = useState(false)

  const [
    availabilityError,
    setAvailabilityError,
  ] = useState('')

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState('ALL')

  const [
    cart,
    setCart,
  ] = useState<CartRow[]>([])

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState('QRIS')

  const [
    serviceAmount,
    setServiceAmount,
  ] = useState('0')

  const [
    taxAmount,
    setTaxAmount,
  ] = useState('0')

  const [
    notes,
    setNotes,
  ] = useState('')

  const [
    overrideStock,
    setOverrideStock,
  ] = useState(false)

  const [
    overrideReason,
    setOverrideReason,
  ] = useState('')

  const [
    posting,
    setPosting,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    success,
    setSuccess,
  ] = useState('')

  const [
    lastSaleId,
    setLastSaleId,
  ] = useState('')

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

  const categories =
    useMemo(() => {
      return Array.from(
        new Set(
          menus
            .map(
              (menu) =>
                menu.category
            )
            .filter(
              (
                category
              ): category is string =>
                Boolean(category)
            )
        )
      ).sort()
    }, [menus])

  const filteredMenus =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase()

      return menus.filter(
        (menu) => {
          const matchesSearch =
            !keyword ||
            menu.name
              .toLowerCase()
              .includes(keyword) ||
            menu.code
              .toLowerCase()
              .includes(keyword)

          const matchesCategory =
            selectedCategory ===
              'ALL' ||
            menu.category ===
              selectedCategory

          return (
            matchesSearch &&
            matchesCategory
          )
        }
      )
    }, [
      menus,
      search,
      selectedCategory,
    ])

  async function loadAvailability(
    outletId: string
  ) {
    if (!outletId) {
      setAvailabilityMap({})
      return
    }

    // SALES_ONLY_SYNTHETIC_AVAILABILITY

    if (
      salesOnlyProfile
    ) {

      const salesOnlyMap:
        Record<
          string,
          Availability
        > =
          {}


      for (
        const menu
        of menus
      ) {

        salesOnlyMap[
          menu.id
        ] = {

          menu_item_id:
            menu.id,

          menu_code:
            menu.code,

          menu_name:
            menu.name,

          selling_price:
            Number(
              menu.selling_price ||
              0
            ),

          status:
            'AVAILABLE',

          available_portions:
            Number.MAX_SAFE_INTEGER,

          low_stock_portions:
            0,

          components:
            [],
        }

      }


      setAvailabilityError('')

      setAvailabilityMap(
        salesOnlyMap
      )

      setAvailabilityLoading(
        false
      )

      return
    }


    setAvailabilityLoading(true)
    setAvailabilityError('')

    const nextMap: Record<
      string,
      Availability
    > = {}

    try {
      const results =
        await Promise.all(
          menus.map(
            async (menu) => {
              const {
                data,
                error: rpcError,
              } =
                await supabase.rpc(
                  'get_menu_stock_availability',
                  {
                    p_outlet_id:
                      outletId,

                    p_menu_item_id:
                      menu.id,
                  }
                )

              if (rpcError) {
                throw rpcError
              }

              return data as unknown as Availability
            }
          )
        )

      for (
        const result of results
      ) {
        if (
          result?.menu_item_id
        ) {
          nextMap[
            result.menu_item_id
          ] = result
        }
      }

      setAvailabilityMap(
        nextMap
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to load menu stock.'

      setAvailabilityError(
        message
      )
    } finally {
      setAvailabilityLoading(false)
    }
  }

  useEffect(() => {
    void loadAvailability(
      selectedOutletId
    )
  }, [
    selectedOutletId,
    salesOnlyProfile,
  ])

  // UNIFIED_ORDER_TABLE_RESET
  useEffect(() => {
    setSelectedTableId('')
  }, [selectedOutletId])


  function getCartQty(
    menuItemId: string
  ) {
    return (
      cart.find(
        (row) =>
          row.menu_item_id ===
          menuItemId
      )?.qty || 0
    )
  }

  function addToCart(
    menu: MenuItem
  ) {
    setError('')
    setSuccess('')
    setLastSaleId('')

    if (!selectedOutletId) {
      setError(
        'Pilih outlet terlebih dahulu.'
      )
      return
    }

    const currentQty =
      getCartQty(
        menu.id
      )


    const nextQty =
      currentQty + 1


    if (
      !salesOnlyProfile
    ) {

      const availability =
        availabilityMap[
          menu.id
        ]


      if (
        !availability
      ) {

        setError(
          'Stock availability belum tersedia.'
        )

        return
      }


      if (
        availability.status ===
        'NO_BOM'
      ) {

        setError(
          `${menu.name} belum memiliki BOM.`
        )

        return
      }


      if (
        !canOverride &&
        nextQty >
          availability.available_portions
      ) {

        setError(
          `${menu.name} hanya tersedia ${availability.available_portions} porsi.`
        )

        return
      }

    }


    setCart(

      (current) => {
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
                      row.qty + 1,
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
                menu.selling_price
              ),

            qty: 1,
            notes: '',
          },
        ]
      }
    )
  }

  function decreaseCart(
    menuItemId: string
  ) {
    setCart(
      (current) =>
        current
          .map((row) =>
            row.menu_item_id ===
            menuItemId
              ? {
                  ...row,
                  qty:
                    row.qty - 1,
                }
              : row
          )
          .filter(
            (row) =>
              row.qty > 0
          )
    )
  }

  function increaseCart(
    row: CartRow
  ) {
    const menu =
      menus.find(
        (menu) =>
          menu.id ===
          row.menu_item_id
      )

    if (!menu) {
      return
    }

    addToCart(menu)
  }

  function removeCart(
    menuItemId: string
  ) {
    setCart(
      (current) =>
        current.filter(
          (row) =>
            row.menu_item_id !==
            menuItemId
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


  const outletTables =
    useMemo(
      () =>
        restaurantTables
          .filter(
            (table) =>
              table.outlet_id ===
                selectedOutletId &&
              table.is_active
          )
          .sort(
            (a, b) =>
              a.code.localeCompare(
                b.code
              )
          ),
      [
        restaurantTables,
        selectedOutletId,
      ]
    )


  const subtotal =
    cart.reduce(
      (total, row) =>
        total +
        row.unit_price *
          row.qty,
      0
    )

  const service =
    Math.max(
      Number(
        serviceAmount || 0
      ),
      0
    )

  const tax =
    Math.max(
      Number(
        taxAmount || 0
      ),
      0
    )

  const grandTotal =
    subtotal +
    service +
    tax

  const cartNeedsOverride =
    salesOnlyProfile
      ? false
      : cart.some(
          (row) => {

            const availability =
              availabilityMap[
                row.menu_item_id
              ]


            if (
              !availability
            ) {
              return false
            }


            return (
              row.qty >
              availability.available_portions
            )

          }
        )



  async function sendToKitchen() {
    setError('')
    setSuccess('')
    setLastSaleId('')
    setLastOrderId('')

    if (!selectedOutletId) {
      setError(
        'Outlet wajib dipilih.'
      )
      return
    }

    if (cart.length === 0) {
      setError(
        'Cart masih kosong.'
      )
      return
    }

    if (
      orderType ===
        'DINE_IN' &&
      !selectedTableId
    ) {
      setError(
        'Pilih table untuk Dine In.'
      )
      return
    }

    setSendingOrder(true)

    try {
      const {
        data,
        error: rpcError,
      } =
        await supabase.rpc(
          'create_restaurant_order_secure',
          {
            p_outlet_id:
              selectedOutletId,

            p_source:
              'POS',

            p_order_type:
              orderType,

            p_table_id:
              orderType ===
                'DINE_IN'
                ? selectedTableId
                : null,

            p_guest_name:
              null,

            p_notes:
              notes.trim() ||
              null,

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

      const orderId =
        String(
          data || ''
        )

      setLastOrderId(
        orderId
      )

      setSuccess(
        'Order berhasil dikirim ke Kitchen. Payment Status: UNPAID.'
      )

      setCart([])
      setServiceAmount('0')
      setTaxAmount('0')
      setNotes('')
      setOverrideStock(false)
      setOverrideReason('')
      setSelectedTableId('')

      router.refresh()

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : 'Failed to send order to Kitchen.'

      setError(message)

    } finally {

      setSendingOrder(false)

    }
  }


  useEffect(
    () => {

      let active =
        true


      async function loadCashierShift() {

        setShiftLoading(
          true
        )


        const {
          data,
          error:
            shiftError,
        } =
          await supabase
            .from(
              'cashier_payment_open_shift_secure'
            )
            .select('*')
            .order(
              'opened_at',
              {
                ascending:
                  false,
              }
            )
            .limit(1)
            .maybeSingle()


        if (!active) {
          return
        }


        if (shiftError) {

          setOpenCashierShift(
            null
          )

        } else {

          setOpenCashierShift(
            data as
              OpenCashierShift |
              null
          )

        }


        setShiftLoading(
          false
        )

      }


      void loadCashierShift()


      const timer =
        window.setInterval(
          () => {
            void loadCashierShift()
          },
          5000
        )


      return () => {

        active =
          false

        window.clearInterval(
          timer
        )

      }

    },
    [
      supabase,
      selectedOutletId,
    ]
  )


  const hasMatchingShift =
    Boolean(
      openCashierShift &&
      openCashierShift.outlet_id ===
        selectedOutletId
    )


  async function postSale() {
    setError('')
    setSuccess('')
    setLastSaleId('')

    if (!selectedOutletId) {
      setError(
        'Outlet wajib dipilih.'
      )
      return
    }

    if (cart.length === 0) {
      setError(
        'Cart masih kosong.'
      )
      return
    }

    if (
      cartNeedsOverride &&
      !overrideStock
    ) {
      setError(
        'Stock cart melebihi availability. Gunakan Manager Override atau kurangi quantity.'
      )
      return
    }

    if (
      overrideStock &&
      !canOverride
    ) {
      setError(
        'Anda tidak memiliki akses Manager Override.'
      )
      return
    }

    if (
      overrideStock &&
      overrideReason
        .trim()
        .length < 5
    ) {
      setError(
        'Manager Override Reason wajib diisi minimal 5 karakter.'
      )
      return
    }

    setPosting(true)

    try {
      const {
        data,
        error: rpcError,
      } =
        await supabase.rpc(
          'create_posted_sale_controlled',
          {
            p_outlet_id:
              selectedOutletId,

            p_sale_date:
              today,

            p_payment_method:
              paymentMethod,

            p_service_amount:
              service,

            p_tax_amount:
              tax,

            p_notes:
              notes.trim() ||
              null,

            p_items:
              cart.map(
                (row) => ({
                  menu_item_id:
                    row.menu_item_id,

                  qty:
                    row.qty,

                  notes:
                    row.notes.trim() ||
                    null,
                })
              ),

            p_override_stock:
              overrideStock,

            p_override_reason:
              overrideStock
                ? overrideReason.trim()
                : null,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      const saleId =
        String(
          data || ''
        )

      setLastSaleId(
        saleId
      )

      setSuccess(
        'Sale berhasil diposting. Gunakan POS Control bila perlu Discount, Complimentary, atau Void.'
      )

      setCart([])

      setServiceAmount('0')
      setTaxAmount('0')
      setNotes('')

      setOverrideStock(false)
      setOverrideReason('')

      await loadAvailability(
        selectedOutletId
      )
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to post POS Sale.'

      setError(message)
    } finally {
      setPosting(false)
    }
  }

  function statusStyle(
    status?: string
  ) {
    if (
      status === 'AVAILABLE'
    ) {
      return 'bg-green-100 text-green-700'
    }

    if (
      status === 'LOW_STOCK'
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    if (
      status ===
      'OUT_OF_STOCK'
    ) {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-zinc-100 text-zinc-500'
  }

  function statusLabel(
    status?: string
  ) {
    if (
      status === 'AVAILABLE'
    ) {
      return 'AVAILABLE'
    }

    if (
      status === 'LOW_STOCK'
    ) {
      return 'LOW STOCK'
    }

    if (
      status ===
      'OUT_OF_STOCK'
    ) {
      return 'OUT OF STOCK'
    }

    if (
      status === 'NO_BOM'
    ) {
      return 'NO BOM'
    }

    return 'CHECKING'
  }

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_360px]">

      <div>

        <div className="mb-3 rounded-xl bg-white p-3 shadow-sm">

          <div className="grid gap-2 md:grid-cols-3">

            <div>

              <label className="mb-2 block text-sm font-semibold">
                POS Location
              </label>

              <select
                value={
                  selectedOutletId
                }
                onChange={(
                  event
                ) => {
                  setSelectedOutletId(
                    event.target.value
                  )

                  setCart([])
                  setError('')
                  setSuccess('')
                  setLastSaleId('')
                }}
                disabled={
                  Boolean(
                    defaultOutletId
                  ) &&
                  roleCode !==
                    'SUPER_ADMIN' &&
                  roleCode !==
                    'MANAGEMENT'
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 disabled:bg-zinc-100"
              >

                <option value="">
                  Select Location
                </option>

                {outlets.map(
                  (outlet) => (
                    <option
                      key={outlet.id}
                      value={
                        outlet.id
                      }
                    >
                      {outlet.code}
                      {' - '}
                      {outlet.name}
                    </option>
                  )
                )}

              </select>

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold">
                Search Menu
              </label>

              <input
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search menu..."
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              />

            </div>

            <div>

              <label className="mb-2 block text-sm font-semibold">
                Category
              </label>

              <select
                value={
                  selectedCategory
                }
                onChange={(
                  event
                ) =>
                  setSelectedCategory(
                    event.target
                      .value
                  )
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3"
              >

                <option value="ALL">
                  All Categories
                </option>

                {categories.map(
                  (category) => (
                    <option
                      key={
                        category
                      }
                      value={
                        category
                      }
                    >
                      {category}
                    </option>
                  )
                )}

              </select>

            </div>

          </div>

        </div>

        {!salesOnlyProfile && availabilityError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {availabilityError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 2xl:grid-cols-4">

          {filteredMenus.map(
            (menu) => {
              const availability =
                availabilityMap[
                  menu.id
                ]

              const status =
                salesOnlyProfile
                  ? 'AVAILABLE'
                  : availability?.status

              const available =
                salesOnlyProfile
                  ? Number.MAX_SAFE_INTEGER
                  : Number(
                      availability?.available_portions ||
                        0
                    )

              const currentCartQty =
                getCartQty(
                  menu.id
                )

              const unavailableForCashier =
                !salesOnlyProfile &&
                !canOverride &&
                (
                  status ===
                    'OUT_OF_STOCK' ||
                  status ===
                    'NO_BOM' ||
                  currentCartQty >=
                    available
                )

              return (
                <button
                  key={menu.id}
                  type="button"
                  onClick={() =>
                    addToCart(
                      menu
                    )
                  }
                  disabled={
                    (
                      !salesOnlyProfile &&
                      availabilityLoading
                    ) ||
                    unavailableForCashier
                  }
                  className="rounded-xl bg-white p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >

                  <div
                    className="mb-2 aspect-[4/3] w-full overflow-hidden rounded-lg bg-zinc-100 bg-cover bg-center bg-no-repeat"
                    style={
                      menu.image_url
                        ? {
                            backgroundImage:
                              `url("${menu.image_url}")`,
                          }
                        : undefined
                    }
                  >
                    {!menu.image_url && (
                      <div className="flex h-full items-center justify-center">

                        <div className="text-center">

                          <div className="text-2xl">
                            🍽️
                          </div>

                          <p className="mt-1 text-[10px] text-zinc-400">
                            Menu Photo
                          </p>

                        </div>

                      </div>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-3">

                    <div>

                      <p className="text-xs font-semibold text-zinc-400">
                        {menu.code}
                      </p>

                      <h3 className="mt-0.5 text-sm font-black leading-tight">
                        {menu.name}
                      </h3>

                    </div>

                    {!salesOnlyProfile && (
<span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusStyle(
                        status
                      )}`}
                    >
                      {statusLabel(
                        status
                      )}
                    </span>
                  )}

                  </div>

                  <p className="mt-1 text-[11px] text-zinc-500">
                    {menu.category ||
                      'Uncategorized'}
                  </p>

                  <p className="mt-2 text-sm font-black text-red-900">
                    {formatRupiah(
                      Number(
                        menu.selling_price
                      )
                    )}
                  </p>

                  {!salesOnlyProfile && (
<div className="mt-2 border-t border-zinc-100 pt-2">

                    <p className="text-xs text-zinc-400">
                      {
                        salesOnlyProfile
                          ? 'Sales Status'
                          : 'Available to Sell'
                      }
                    </p>

                    <p
                      className={`mt-1 text-lg font-bold ${
                        available > 0
                          ? 'text-zinc-900'
                          : 'text-red-700'
                      }`}
                    >
                      {salesOnlyProfile
                        ? 'Ready to Sell'
                        : availabilityLoading
                          ? '...'
                          : `${available} portions`}
                    </p>

                    {currentCartQty >
                      0 && (
                      <p className="mt-2 text-xs font-semibold text-red-800">
                        Cart: {currentCartQty}
                      </p>
                    )}

                  </div>
                  )}

                </button>
              )
            }
          )}

        </div>

        {!filteredMenus.length && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

            <p className="font-bold">
              No Menu Found
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              Create a menu or change the search filter.
            </p>

            <Link
              href="/dashboard/menu"
              className="mt-5 inline-flex text-sm font-semibold text-red-800"
            >
              Open Menu Master →
            </Link>

          </div>
        )}

      </div>

      <div>

        <div className={salesOnlyProfile ? 'sticky top-3 flex h-[calc(100dvh-6rem)] min-h-0 flex-col overflow-hidden rounded-xl bg-white shadow-sm' : 'sticky top-3 rounded-xl bg-white shadow-sm'}>

          <div className={salesOnlyProfile ? 'shrink-0 border-b border-zinc-200 p-3' : 'border-b border-zinc-200 p-3'}>

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-base font-black">
                  Current Order
                </h2>

                <p className={salesOnlyProfile ? 'hidden' : 'mt-1 text-xs text-zinc-400'}>
                  {today}
                </p>

              </div>

              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {cart.reduce(
                  (
                    total,
                    row
                  ) =>
                    total +
                    row.qty,
                  0
                )}{' '}
                item
              </span>

            </div>

          </div>

          {salesOnlyProfile && (
            <div className="shrink-0 border-b border-zinc-200 bg-zinc-50/70 px-3 py-2">

              <div className="flex items-center gap-2">

                <div className="inline-flex min-w-0 flex-1 rounded-lg bg-white p-1 ring-1 ring-zinc-200">

                  <button
                    type="button"
                    onClick={() =>
                      setOrderType(
                        'DINE_IN'
                      )
                    }
                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-black ${
                      orderType ===
                      'DINE_IN'
                        ? 'bg-zinc-950 text-white'
                        : 'text-zinc-600'
                    }`}
                  >
                    Dine In
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderType(
                        'TAKEAWAY'
                      )

                      setSelectedTableId(
                        ''
                      )
                    }}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-black ${
                      orderType ===
                      'TAKEAWAY'
                        ? 'bg-zinc-950 text-white'
                        : 'text-zinc-600'
                    }`}
                  >
                    Takeaway
                  </button>

                </div>

                {shiftLoading ? (
                  <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-1.5 text-[10px] font-bold text-zinc-500">
                    Shift...
                  </span>
                ) : hasMatchingShift ? (
                  <Link
                    href="/dashboard/pos/closing"
                    title={
                      openCashierShift?.shift_no ||
                      'Shift Open'
                    }
                    className="shrink-0 rounded-full bg-green-100 px-2 py-1.5 text-[10px] font-black text-green-700"
                  >
                    ● Shift Open
                  </Link>
                ) : (
                  <Link
                    href="/dashboard/pos/closing"
                    className="shrink-0 rounded-full bg-red-100 px-2 py-1.5 text-[10px] font-black text-red-700"
                  >
                    Shift Required
                  </Link>
                )}

              </div>

              {orderType ===
                'DINE_IN' && (

                <div className="mt-2 flex items-center gap-2">

                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-zinc-500">
                    Table
                  </span>

                  <select
                    value={
                      selectedTableId
                    }
                    onChange={(
                      event
                    ) =>
                      setSelectedTableId(
                        event.target.value
                      )
                    }
                    className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs"
                  >

                    <option value="">
                      Select Table
                    </option>

                    {outletTables.map(
                      (table) => (

                        <option
                          key={
                            table.id
                          }
                          value={
                            table.id
                          }
                          disabled={
                            table.status !==
                            'AVAILABLE'
                          }
                        >
                          {table.code}
                          {' - '}
                          {table.name}
                          {table.status !==
                            'AVAILABLE'
                            ? ` · ${table.status}`
                            : ''}
                        </option>

                      )
                    )}

                  </select>

                </div>

              )}

              <details className="mt-1.5">

                <summary className="cursor-pointer select-none text-[10px] font-bold text-zinc-500">
                  + Order note
                </summary>

                <textarea
                  rows={1}
                  value={notes}
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event.target.value
                    )
                  }
                  placeholder="Optional order notes"
                  className="mt-1.5 w-full resize-none rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs"
                />

              </details>

            </div>
          )}

          <div className={salesOnlyProfile ? 'min-h-0 flex-1 overflow-y-auto' : 'max-h-[140px] overflow-y-auto'}>

            {cart.length ===
            0 ? (

              <div className="p-5 text-center">

                <p className="font-semibold">
                  Cart Empty
                </p>

                <p className="mt-2 text-sm text-zinc-400">
                  Click a menu to add it to the order.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-zinc-100">

                {cart.map(
                  (row) => {

                    const availability =
                      availabilityMap[
                        row.menu_item_id
                      ]

                    const exceeds =
                      !salesOnlyProfile &&
                      availability &&
                      row.qty >
                        availability.available_portions

                    return (

                      <div
                        key={
                          row.menu_item_id
                        }
                        className="px-3 py-2.5"
                      >

                        <div className="flex items-start justify-between gap-4">

                          <div>

                            <p className="font-bold">
                              {row.name}
                            </p>

                            <p className="mt-1 text-xs text-zinc-400">
                              {formatRupiah(
                                row.unit_price
                              )}
                              {' × '}
                              {row.qty}
                            </p>

                            {exceeds && (
                              <p className="mt-2 text-xs font-semibold text-red-700">
                                Exceeds system stock
                              </p>
                            )}

                          </div>

                          <p className="font-bold">
                            {formatRupiah(
                              row.unit_price *
                                row.qty
                            )}
                          </p>

                        </div>

                        <div className="mt-2 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                decreaseCart(
                                  row.menu_item_id
                                )
                              }
                              className="h-10 w-10 rounded-lg border border-zinc-300 text-base font-black"
                            >
                              −
                            </button>

                            <span className="min-w-8 text-center font-bold">
                              {row.qty}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increaseCart(
                                  row
                                )
                              }
                              className="h-10 w-10 rounded-lg border border-zinc-300 text-base font-black"
                            >
                              +
                            </button>

                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeCart(
                                row.menu_item_id
                              )
                            }
                            className="text-xs font-semibold text-red-700"
                          >
                            Remove
                          </button>

                        </div>

                      <details className="mt-2">
                          <summary className="cursor-pointer select-none text-[10px] font-bold text-zinc-500">
                            {row.notes.trim()
                              ? 'Kitchen note added'
                              : '+ Kitchen note'}
                          </summary>

                          <textarea
                            rows={1}
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
                            className="mt-1.5 w-full resize-none rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-zinc-800 outline-none focus:border-amber-400"
                          />
                        </details>

                      </div>

                    )
                  }
                )}

              </div>

            )}

          </div>

          <div className={salesOnlyProfile ? 'hidden' : 'border-t border-zinc-200 p-3'}>

            <div
              className={
                `mb-1.5 rounded-lg border px-2.5 py-1.5 ${
                  shiftLoading
                    ? 'border-zinc-200 bg-zinc-50'
                    : hasMatchingShift
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                }`
              }
            >

              {shiftLoading ? (

                <p className="text-sm font-bold text-zinc-500">
                  Checking cashier shift...
                </p>

              ) : hasMatchingShift ? (

                <div className="flex items-center justify-between gap-2">

                  <div>

                    <p className="text-[10px] font-black uppercase tracking-wide text-green-700">
                      ● Shift Open
                    </p>


                    <p className="text-sm font-black leading-tight">
                      {
                        openCashierShift?.shift_no
                      }
                    </p>


                    <p className={salesOnlyProfile ? 'hidden' : 'mt-1 text-xs text-green-700'}>
                      {
                        openCashierShift?.outlet_name
                      }
                    </p>

                  </div>


                  <Link
                    href="/dashboard/pos/closing"
                    className="rounded-md border border-green-200 bg-white px-2 py-1 text-[10px] font-black text-green-700"
                  >
                    View Shift
                  </Link>

                </div>

              ) : (

                <div>

                  <p className="text-xs font-black uppercase tracking-wide text-red-700">
                    OPEN CASHIER SHIFT REQUIRED
                  </p>


                  {openCashierShift ? (

                    <p className="mt-2 text-sm font-semibold text-red-700">
                      {
                        openCashierShift.shift_no
                      } is currently open at {
                        openCashierShift.outlet_name
                      }.
                    </p>

                  ) : (

                    <p className="mt-2 text-sm font-semibold text-red-700">
                      Payment is disabled until a cashier shift is opened.
                    </p>

                  )}


                  <Link
                    href="/dashboard/pos/closing"
                    className="mt-3 inline-flex rounded-lg bg-red-900 px-3 py-2 text-xs font-black text-white"
                  >
                    Open Cashier Shift →
                  </Link>

                </div>

              )}

            </div>


            <div className="grid gap-4">

              <div>

                {/* UNIFIED_ORDER_POS_V1_UI */}
                <div className="mb-2 rounded-lg bg-zinc-50 p-2">

                  <p className="text-xs font-black text-zinc-900">
                    Order Type
                  </p>

                  <p className={salesOnlyProfile ? 'hidden' : 'mt-1 text-xs text-zinc-500'}>
                    Send to Kitchen creates an unpaid order.
                  </p>


                  <div className="mt-2 grid grid-cols-2 gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        setOrderType(
                          'DINE_IN'
                        )
                      }
                      className={`rounded-lg border px-3 py-2 text-xs font-black ${
                        orderType ===
                        'DINE_IN'
                          ? 'border-zinc-950 bg-zinc-950 text-white'
                          : 'border-zinc-300 bg-white text-zinc-700'
                      }`}
                    >
                      Dine In
                    </button>


                    <button
                      type="button"
                      onClick={() => {
                        setOrderType(
                          'TAKEAWAY'
                        )

                        setSelectedTableId(
                          ''
                        )
                      }}
                      className={`rounded-lg border px-3 py-2 text-xs font-black ${
                        orderType ===
                        'TAKEAWAY'
                          ? 'border-zinc-950 bg-zinc-950 text-white'
                          : 'border-zinc-300 bg-white text-zinc-700'
                      }`}
                    >
                      Takeaway
                    </button>

                  </div>


                  {orderType ===
                    'DINE_IN' && (

                    <div className="mt-1.5">

                      <label className="mb-1 block text-[11px] font-black">
                        Table
                      </label>

                      <select
                        value={
                          selectedTableId
                        }
                        onChange={(
                          event
                        ) =>
                          setSelectedTableId(
                            event.target.value
                          )
                        }
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm"
                      >

                        <option value="">
                          Select Table
                        </option>

                        {outletTables.map(
                          (table) => (

                            <option
                              key={
                                table.id
                              }
                              value={
                                table.id
                              }
                              disabled={
                                table.status !==
                                'AVAILABLE'
                              }
                            >
                              {table.code}
                              {' - '}
                              {table.name}
                              {' · '}
                              {table.capacity}
                              {' pax'}
                              {table.status !==
                                'AVAILABLE'
                                ? ` · ${table.status}`
                                : ''}
                            </option>

                          )
                        )}

                      </select>


                      {outletTables.length ===
                        0 && (

                        <p className="mt-2 text-xs font-semibold text-amber-700">
                          No tables configured for this location.
                        </p>

                      )}

                    </div>

                  )}

                </div>


                <label className={salesOnlyProfile ? 'hidden' : 'mb-2 block text-sm font-semibold'}>
                  Payment Method
                </label>

                <select
                  value={
                    paymentMethod
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentMethod(
                      event.target
                        .value
                    )
                  }
                  className={salesOnlyProfile ? 'hidden' : 'w-full rounded-xl border border-zinc-300 px-4 py-3'}
                >

                  <option value="QRIS">
                    QRIS
                  </option>

                  <option value="CASH">
                    Cash
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

              </div>

              <div className={salesOnlyProfile ? 'hidden' : 'rounded-xl border border-red-100 bg-red-50 p-4'}>

                <p className="text-sm font-bold text-red-900">
                  Controlled Discounts
                </p>

                <p className="mt-1 text-xs leading-5 text-red-700">
                  Free-form bill discount has been disabled. Use POS Control after posting for preset discount, manual discount, complimentary, or void with audit and manager approval.
                </p>

              </div>

              <div className={salesOnlyProfile ? 'hidden' : 'grid grid-cols-2 gap-3'}>

                <div>

                  <label className="mb-2 block text-xs font-semibold">
                    Service
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      serviceAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setServiceAmount(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  />

                </div>

                <div>

                  <label className="mb-2 block text-xs font-semibold">
                    Tax
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      taxAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setTaxAmount(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  />

                </div>

              </div>

              <div>

                <label className="mb-1 block text-[11px] font-black">
                  Notes
                </label>

                <textarea
                  rows={1}
                  value={notes}
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional order notes"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
                />

              </div>

            </div>

          </div>

          {canOverride && !salesOnlyProfile && (
            <div className="border-t border-zinc-200 bg-amber-50 p-5">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  checked={
                    overrideStock
                  }
                  onChange={(
                    event
                  ) =>
                    setOverrideStock(
                      event.target
                        .checked
                    )
                  }
                  className="mt-1"
                />

                <div>

                  <p className="font-bold text-amber-900">
                    Manager Stock Override
                  </p>

                  <p className="mt-1 text-xs text-amber-700">
                    Allow sale when system stock is insufficient. This action is audited.
                  </p>

                </div>

              </label>

              {overrideStock && (

                <textarea
                  value={
                    overrideReason
                  }
                  onChange={(
                    event
                  ) =>
                    setOverrideReason(
                      event.target
                        .value
                    )
                  }
                  rows={2}
                  placeholder="Reason for stock override..."
                  className="mt-4 w-full rounded-xl border border-amber-300 bg-white px-4 py-3"
                />

              )}

            </div>
          )}

          <div className={salesOnlyProfile ? 'shrink-0 border-t border-zinc-200 bg-white px-3 py-3' : 'border-t border-zinc-200 px-3 py-2'}>

            <div className={salesOnlyProfile ? 'hidden' : 'space-y-2 text-sm'}>

              <div className="flex justify-between">
                <span className="text-zinc-500">
                  Subtotal
                </span>
                <span>
                  {formatRupiah(
                    subtotal
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">
                  Service
                </span>
                <span>
                  {formatRupiah(
                    service
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">
                  Tax
                </span>
                <span>
                  {formatRupiah(
                    tax
                  )}
                </span>
              </div>

            </div>

            <div className={salesOnlyProfile ? 'hidden' : 'my-2 border-t border-zinc-200'} />

            <div className={salesOnlyProfile ? 'flex items-center justify-between' : 'flex items-end justify-between'}>

              <p className={salesOnlyProfile ? 'text-xs font-bold text-zinc-500' : 'text-sm text-zinc-500'}>
                Grand Total
              </p>

              <p className={salesOnlyProfile ? 'text-xl font-black text-red-900' : 'text-lg font-black text-red-900'}>
                {formatRupiah(
                  grandTotal
                )}
              </p>

            </div>

            {cartNeedsOverride && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700">
                Cart exceeds current menu stock availability.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                {success}

                {lastOrderId && (

                  <Link
                    href="/dashboard/kitchen"
                    className="mt-3 flex w-full items-center justify-center rounded-lg bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
                  >
                    Open Kitchen Display →
                  </Link>

                )}

                {lastSaleId && (
                  <Link
                    href={`/dashboard/pos/control/${lastSaleId}`}
                    className="mt-3 flex w-full items-center justify-center rounded-lg bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800"
                  >
                    Open POS Control →
                  </Link>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={
                sendToKitchen
              }
              disabled={
                sendingOrder ||
                posting ||
                cart.length === 0 ||
                (
                  orderType ===
                    'DINE_IN' &&
                  !selectedTableId
                )
              }
              className={salesOnlyProfile ? 'mt-3 w-full rounded-lg bg-zinc-950 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50' : 'mt-2 w-full rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-black text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50'}
            >
              {
                sendingOrder
                  ? 'SENDING...'
                  : 'SEND TO KITCHEN'
              }
            </button>


            <button
              type="button"
              onClick={
                postSale
              }
              disabled={
                sendingOrder ||
posting ||
                cart.length ===
                  0
              }
              className={salesOnlyProfile ? 'hidden' : 'mt-5 w-full rounded-xl bg-red-900 px-6 py-4 text-lg font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50'}
            >
              {posting
                ? 'Posting Sale...'
                : `PAY ${formatRupiah(
                    grandTotal
                  )}`}
            </button>

          </div>

        </div>

      </div>

    </div>
  )
}
