'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

type Outlet = {
  id: string
  code: string
  name: string
  type: string
}

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
}

type Props = {
  outlets: Outlet[]
  menus: MenuItem[]
  defaultOutletId: string
  today: string
  roleCode: string
  canOverride: boolean
}

export default function POSClient({
  outlets,
  menus,
  defaultOutletId,
  today,
  roleCode,
  canOverride,
}: Props) {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  // =====================================================
  // STATE
  // =====================================================

  const [
    selectedOutletId,
    setSelectedOutletId,
  ] = useState(
    defaultOutletId
  )

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
    discountAmount,
    setDiscountAmount,
  ] = useState('0')

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

  // =====================================================
  // FORMAT
  // =====================================================

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

  // =====================================================
  // CATEGORIES
  // =====================================================

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

  // =====================================================
  // FILTER MENU
  // =====================================================

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

  // =====================================================
  // AVAILABILITY
  // =====================================================

  async function loadAvailability(
    outletId: string
  ) {
    if (!outletId) {
      setAvailabilityMap({})
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
  }, [selectedOutletId])

  // =====================================================
  // CART HELPERS
  // =====================================================

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

    if (!selectedOutletId) {
      setError(
        'Pilih outlet terlebih dahulu.'
      )
      return
    }

    const availability =
      availabilityMap[
        menu.id
      ]

    if (!availability) {
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

    const currentQty =
      getCartQty(
        menu.id
      )

    const nextQty =
      currentQty + 1

    // Cashier cannot exceed available stock.
    // Manager can add, but must use override on posting.
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

  // =====================================================
  // TOTALS
  // =====================================================

  const subtotal =
    cart.reduce(
      (total, row) =>
        total +
        row.unit_price *
          row.qty,
      0
    )

  const discount =
    Math.max(
      Number(
        discountAmount || 0
      ),
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

  const netSales =
    Math.max(
      subtotal -
        discount,
      0
    )

  const grandTotal =
    netSales +
    service +
    tax

  // =====================================================
  // SIMPLE OVERRIDE INDICATOR
  //
  // Final stock validation still happens atomically
  // inside create_posted_sale().
  // =====================================================

  const cartNeedsOverride =
    cart.some(
      (row) => {
        const availability =
          availabilityMap[
            row.menu_item_id
          ]

        if (!availability) {
          return false
        }

        return (
          row.qty >
          availability.available_portions
        )
      }
    )

  // =====================================================
  // POST SALE
  // =====================================================

  async function postSale() {
    setError('')
    setSuccess('')

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
      discount >
      subtotal
    ) {
      setError(
        'Discount tidak boleh lebih besar dari subtotal.'
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
          'create_posted_sale',
          {
            p_outlet_id:
              selectedOutletId,

            p_sale_date:
              today,

            p_payment_method:
              paymentMethod,

            p_discount_amount:
              discount,

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

      setSuccess(
        `Sale berhasil diposting. Sale ID: ${String(
          data
        )}`
      )

      setCart([])

      setDiscountAmount('0')
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

  // =====================================================
  // STATUS STYLE
  // =====================================================

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

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">

      {/* =================================================
          LEFT — MENU
      ================================================= */}

      <div>

        {/* OUTLET */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-3">

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

        {/* AVAILABILITY ERROR */}

        {availabilityError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {availabilityError}
          </div>
        )}

        {/* MENU GRID */}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">

          {filteredMenus.map(
            (menu) => {
              const availability =
                availabilityMap[
                  menu.id
                ]

              const status =
                availability?.status

              const available =
                Number(
                  availability?.available_portions ||
                    0
                )

              const currentCartQty =
                getCartQty(
                  menu.id
                )

              const unavailableForCashier =
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
                    availabilityLoading ||
                    unavailableForCashier
                  }
                  className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >

		<div
  className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center"
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

        <div className="text-5xl">
          🍽️
        </div>

        <p className="mt-2 text-xs text-zinc-400">
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

                      <h3 className="mt-1 text-lg font-bold">
                        {menu.name}
                      </h3>

                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-bold ${statusStyle(
                        status
                      )}`}
                    >
                      {statusLabel(
                        status
                      )}
                    </span>

                  </div>

                  <p className="mt-2 text-sm text-zinc-500">
                    {menu.category ||
                      'Uncategorized'}
                  </p>

                  <p className="mt-5 text-xl font-bold text-red-900">
                    {formatRupiah(
                      Number(
                        menu.selling_price
                      )
                    )}
                  </p>

                  <div className="mt-5 border-t border-zinc-100 pt-4">

                    <p className="text-xs text-zinc-400">
                      Available to Sell
                    </p>

                    <p
                      className={`mt-1 text-lg font-bold ${
                        available > 0
                          ? 'text-zinc-900'
                          : 'text-red-700'
                      }`}
                    >
                      {availabilityLoading
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

      {/* =================================================
          RIGHT — CART
      ================================================= */}

      <div>

        <div className="sticky top-6 rounded-2xl bg-white shadow-sm">

          {/* CART HEADER */}

          <div className="border-b border-zinc-200 p-5">

            <div className="flex items-center justify-between">

              <div>

                <h2 className="text-xl font-bold">
                  Current Order
                </h2>

                <p className="mt-1 text-xs text-zinc-400">
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

          {/* CART ITEMS */}

          <div className="max-h-[340px] overflow-y-auto">

            {cart.length ===
            0 ? (

              <div className="p-10 text-center">

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
                      availability &&
                      row.qty >
                        availability.available_portions

                    return (

                      <div
                        key={
                          row.menu_item_id
                        }
                        className="p-5"
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

                        <div className="mt-4 flex items-center justify-between">

                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() =>
                                decreaseCart(
                                  row.menu_item_id
                                )
                              }
                              className="h-9 w-9 rounded-lg border border-zinc-300 font-bold"
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
                              className="h-9 w-9 rounded-lg border border-zinc-300 font-bold"
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

                      </div>

                    )
                  }
                )}

              </div>

            )}

          </div>

          {/* PAYMENT */}

          <div className="border-t border-zinc-200 p-5">

            <div className="grid gap-4">

              <div>

                <label className="mb-2 block text-sm font-semibold">
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
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
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

              <div className="grid grid-cols-3 gap-3">

                <div>

                  <label className="mb-2 block text-xs font-semibold">
                    Discount
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      discountAmount
                    }
                    onChange={(
                      event
                    ) =>
                      setDiscountAmount(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                  />

                </div>

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

                <label className="mb-2 block text-sm font-semibold">
                  Notes
                </label>

                <textarea
                  rows={2}
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
                  className="w-full rounded-xl border border-zinc-300 px-4 py-3"
                />

              </div>

            </div>

          </div>

          {/* MANAGER OVERRIDE */}

          {canOverride && (
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

          {/* TOTAL */}

          <div className="border-t border-zinc-200 p-5">

            <div className="space-y-2 text-sm">

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
                  Discount
                </span>
                <span>
                  -
                  {formatRupiah(
                    discount
                  )}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-zinc-500">
                  Net Sales
                </span>
                <span>
                  {formatRupiah(
                    netSales
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

            <div className="my-4 border-t border-zinc-200" />

            <div className="flex items-end justify-between">

              <div>

                <p className="text-sm text-zinc-500">
                  Grand Total
                </p>

                <p className="mt-1 text-2xl font-bold text-red-900">
                  {formatRupiah(
                    grandTotal
                  )}
                </p>

              </div>

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
              </div>
            )}

            <button
              type="button"
              onClick={
                postSale
              }
              disabled={
                posting ||
                cart.length ===
                  0
              }
              className="mt-5 w-full rounded-xl bg-red-900 px-6 py-4 text-lg font-bold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
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
