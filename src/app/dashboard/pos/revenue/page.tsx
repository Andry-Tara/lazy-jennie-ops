import Link from 'next/link'

import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'


type SearchParams =
  Promise<{
    from?: string
    to?: string
    payment?: string
    orderType?: string
  }>


type SaleRow = {
  id: string
  sale_no: string
  sale_date: string
  transaction_date: string
  subtotal: number
  service_amount: number
  tax_amount: number
  net_sales: number
  grand_total: number
  payment_method: string | null
}


type SaleItemRow = {
  sale_id: string
  menu_item_id: string
  quantity: number
  net_amount: number
}


type RestaurantOrderRow = {
  id: string
  order_no: string
  sale_id: string | null
  order_type: string
  table_id: string | null
}


function jakartaDate() {

  return new Intl.DateTimeFormat(
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
    new Date()
  )
}


function shiftDate(
  date: string,
  amount: number
) {

  const value =
    new Date(
      `${date}T12:00:00Z`
    )


  value.setUTCDate(
    value.getUTCDate() +
    amount
  )


  return value
    .toISOString()
    .slice(
      0,
      10
    )
}


function rupiah(
  value: number
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
    value
  )
}


function number(
  value: number
) {

  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits:
        2,
    }
  ).format(
    value
  )
}


function shortDate(
  value: string
) {

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'Asia/Jakarta',

      day:
        '2-digit',

      month:
        'short',

      year:
        'numeric',
    }
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  )
}


function dateTime(
  value: string
) {

  return new Intl.DateTimeFormat(
    'en-GB',
    {
      timeZone:
        'Asia/Jakarta',

      day:
        '2-digit',

      month:
        'short',

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
}


function percent(
  value: number
) {

  return `${value.toFixed(1)}%`
}


export default async function RevenuePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {

  const params =
    await searchParams


  const supabase =
    await createClient()


  // =========================================================
  // AUTH
  // =========================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {
    redirect('/login')
  }


  // =========================================================
  // PROFILE
  // =========================================================

  const {
    data:
      profile,
  } =
    await supabase
      .from(
        'profiles'
      )
      .select(`
        id,
        outlet_id,
        role_id,
        is_active
      `)
      .eq(
        'id',
        user.id
      )
      .maybeSingle()


  if (
    !profile ||
    profile.is_active === false ||
    !profile.outlet_id
  ) {

    redirect(
      '/dashboard'
    )

  }


  // =========================================================
  // ROLE
  // =========================================================

  const {
    data:
      role,
  } =
    await supabase
      .from(
        'roles'
      )
      .select(`
        code,
        name
      `)
      .eq(
        'id',
        profile.role_id
      )
      .maybeSingle()


  const roleCode =
    String(
      role?.code ||
      ''
    )


  if (
    ![
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )
  ) {

    redirect(
      '/dashboard'
    )

  }


  // =========================================================
  // SALES-ONLY PROFILE
  // =========================================================

  const {
    data:
      appProfile,
  } =
    await supabase
      .from(
        'outlet_app_profiles_secure'
      )
      .select(`
        brand_name,
        inventory_enabled
      `)
      .eq(
        'outlet_id',
        profile.outlet_id
      )
      .maybeSingle()


  if (
    !appProfile ||
    appProfile.inventory_enabled !==
      false
  ) {

    redirect(
      '/dashboard/pos/report'
    )

  }


  const {
    data:
      outlet,
  } =
    await supabase
      .from(
        'outlets_secure'
      )
      .select(`
        id,
        code,
        name
      `)
      .eq(
        'id',
        profile.outlet_id
      )
      .maybeSingle()


  if (!outlet) {
    redirect(
      '/dashboard'
    )
  }


  // =========================================================
  // FILTER
  // =========================================================

  const today =
    jakartaDate()


  const fromDate =
    params.from ||
    today


  const toDate =
    params.to ||
    today


  const paymentFilter =
    String(
      params.payment ||
      'ALL'
    ).toUpperCase()


  const orderTypeFilter =
    String(
      params.orderType ||
      'ALL'
    ).toUpperCase()


  // =========================================================
  // SALES
  // =========================================================

  let salesQuery =
    supabase
      .from(
        'sales'
      )
      .select(`
        id,
        sale_no,
        sale_date,
        transaction_date,
        subtotal,
        service_amount,
        tax_amount,
        net_sales,
        grand_total,
        payment_method
      `)
      .eq(
        'outlet_id',
        profile.outlet_id
      )
      .eq(
        'status',
        'POSTED'
      )
      .gte(
        'sale_date',
        fromDate
      )
      .lte(
        'sale_date',
        toDate
      )
      .order(
        'transaction_date',
        {
          ascending:
            false,
        }
      )


  if (
    paymentFilter !==
    'ALL'
  ) {

    salesQuery =
      salesQuery.eq(
        'payment_method',
        paymentFilter
      )

  }


  const {
    data:
      rawSales,
    error:
      salesError,
  } =
    await salesQuery


  let sales: SaleRow[] =
    (
      rawSales ||
      []
    ).map(
      row => ({
        id:
          row.id,

        sale_no:
          row.sale_no,

        sale_date:
          row.sale_date,

        transaction_date:
          row.transaction_date,

        subtotal:
          Number(
            row.subtotal ||
            0
          ),

        service_amount:
          Number(
            row.service_amount ||
            0
          ),

        tax_amount:
          Number(
            row.tax_amount ||
            0
          ),

        net_sales:
          Number(
            row.net_sales ||
            0
          ),

        grand_total:
          Number(
            row.grand_total ||
            0
          ),

        payment_method:
          row.payment_method,
      })
    )


  const initialSaleIds =
    sales.map(
      sale =>
        sale.id
    )


  // =========================================================
  // RESTAURANT ORDERS
  // =========================================================

  let restaurantOrders:
    RestaurantOrderRow[] =
      []


  if (
    initialSaleIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'restaurant_orders_secure'
        )
        .select(`
          id,
          order_no,
          sale_id,
          order_type,
          table_id
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .in(
          'sale_id',
          initialSaleIds
        )


    restaurantOrders =
      (
        data ||
        []
      ).map(
        row => ({
          id:
            row.id,

          order_no:
            row.order_no,

          sale_id:
            row.sale_id,

          order_type:
            row.order_type,

          table_id:
            row.table_id,
        })
      )

  }


  if (
    orderTypeFilter !==
    'ALL'
  ) {

    const allowedSaleIds =
      new Set(
        restaurantOrders
          .filter(
            order =>
              order.order_type ===
              orderTypeFilter
          )
          .map(
            order =>
              order.sale_id
          )
          .filter(
            Boolean
          ) as string[]
      )


    sales =
      sales.filter(
        sale =>
          allowedSaleIds.has(
            sale.id
          )
      )

  }


  const saleIds =
    sales.map(
      sale =>
        sale.id
    )


  restaurantOrders =
    restaurantOrders.filter(
      order =>
        order.sale_id &&
        saleIds.includes(
          order.sale_id
        )
    )


  const orderBySale =
    new Map(
      restaurantOrders
        .filter(
          row =>
            row.sale_id
        )
        .map(
          row => [
            row.sale_id as string,
            row,
          ]
        )
    )


  // =========================================================
  // TABLES
  // =========================================================

  const tableIds =
    Array.from(
      new Set(
        restaurantOrders
          .map(
            row =>
              row.table_id
          )
          .filter(
            Boolean
          ) as string[]
      )
    )


  let tables:
    {
      id: string
      code: string
      name: string
    }[] =
      []


  if (
    tableIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'restaurant_tables_secure'
        )
        .select(`
          id,
          code,
          name
        `)
        .in(
          'id',
          tableIds
        )


    tables =
      data ||
      []

  }


  const tableMap =
    new Map(
      tables.map(
        row => [
          row.id,
          row,
        ]
      )
    )


  // =========================================================
  // SALE ITEMS
  // =========================================================

  let saleItems:
    SaleItemRow[] =
      []


  if (
    saleIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'sale_items'
        )
        .select(`
          sale_id,
          menu_item_id,
          quantity,
          net_amount
        `)
        .in(
          'sale_id',
          saleIds
        )


    saleItems =
      (
        data ||
        []
      ).map(
        row => ({
          sale_id:
            row.sale_id,

          menu_item_id:
            row.menu_item_id,

          quantity:
            Number(
              row.quantity ||
              0
            ),

          net_amount:
            Number(
              row.net_amount ||
              0
            ),
        })
      )

  }


  const menuIds =
    Array.from(
      new Set(
        saleItems.map(
          row =>
            row.menu_item_id
        )
      )
    )


  let menus:
    {
      id: string
      code: string
      name: string
      category: string | null
      image_url: string | null
    }[] =
      []


  if (
    menuIds.length >
    0
  ) {

    const {
      data,
    } =
      await supabase
        .from(
          'menu_items'
        )
        .select(`
          id,
          code,
          name,
          category,
          image_url
        `)
        .in(
          'id',
          menuIds
        )


    menus =
      data ||
      []

  }


  const menuMap =
    new Map(
      menus.map(
        row => [
          row.id,
          row,
        ]
      )
    )


  // =========================================================
  // KPI
  // =========================================================

  const transactions =
    sales.length


  const revenue =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.net_sales,
      0
    )


  const totalCollected =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.grand_total,
      0
    )


  const totalService =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.service_amount,
      0
    )


  const totalTax =
    sales.reduce(
      (
        total,
        sale
      ) =>
        total +
        sale.tax_amount,
      0
    )


  const averageTicket =
    transactions >
    0
      ? totalCollected /
        transactions
      : 0


  // =========================================================
  // PAYMENT MIX
  // =========================================================

  const paymentMap =
    new Map<
      string,
      {
        transactions:
          number
        amount:
          number
      }
    >()


  for (
    const sale
    of sales
  ) {

    const method =
      String(
        sale.payment_method ||
        'OTHER'
      ).toUpperCase()


    const current =
      paymentMap.get(
        method
      ) ||
      {
        transactions:
          0,

        amount:
          0,
      }


    current.transactions +=
      1


    current.amount +=
      sale.grand_total


    paymentMap.set(
      method,
      current
    )

  }


  const paymentRows =
    Array.from(
      paymentMap.entries()
    )
      .map(
        ([
          method,
          value,
        ]) => ({
          method,
          ...value,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.amount -
          a.amount
      )


  // =========================================================
  // ORDER TYPE
  // =========================================================

  let dineInCount =
    0


  let takeawayCount =
    0


  for (
    const order
    of restaurantOrders
  ) {

    if (
      order.order_type ===
      'DINE_IN'
    ) {
      dineInCount +=
        1
    }


    if (
      order.order_type ===
      'TAKEAWAY'
    ) {
      takeawayCount +=
        1
    }

  }


  // =========================================================
  // TOP MENU
  // =========================================================

  const menuSummary =
    new Map<
      string,
      {
        quantity:
          number
        revenue:
          number
      }
    >()


  for (
    const row
    of saleItems
  ) {

    const current =
      menuSummary.get(
        row.menu_item_id
      ) ||
      {
        quantity:
          0,

        revenue:
          0,
      }


    current.quantity +=
      row.quantity


    current.revenue +=
      row.net_amount


    menuSummary.set(
      row.menu_item_id,
      current
    )

  }


  const topMenus =
    Array.from(
      menuSummary.entries()
    )
      .map(
        ([
          menuId,
          value,
        ]) => ({
          menuId,
          ...value,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          b.quantity -
          a.quantity ||
          b.revenue -
          a.revenue
      )
      .slice(
        0,
        10
      )


  // =========================================================
  // DAILY SALES
  // =========================================================

  const dailyMap =
    new Map<
      string,
      {
        transactions:
          number
        revenue:
          number
      }
    >()


  for (
    const sale
    of sales
  ) {

    const current =
      dailyMap.get(
        sale.sale_date
      ) ||
      {
        transactions:
          0,

        revenue:
          0,
      }


    current.transactions +=
      1


    current.revenue +=
      sale.grand_total


    dailyMap.set(
      sale.sale_date,
      current
    )

  }


  const dailyRows =
    Array.from(
      dailyMap.entries()
    )
      .map(
        ([
          date,
          value,
        ]) => ({
          date,
          ...value,
        })
      )
      .sort(
        (
          a,
          b
        ) =>
          a.date.localeCompare(
            b.date
          )
      )


  const maxDailyRevenue =
    Math.max(
      ...dailyRows.map(
        row =>
          row.revenue
      ),
      1
    )


  const last7 =
    shiftDate(
      today,
      -6
    )


  const last30 =
    shiftDate(
      today,
      -29
    )


  const brandName =
    appProfile.brand_name ||
    outlet.name


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950 lg:p-8">

      <div className="mx-auto max-w-[1500px]">


        {/* HEADER */}

        <header className="mb-7 flex flex-wrap items-end justify-between gap-5">

          <div>

            <Link
              href="/dashboard"
              className="text-sm font-semibold text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              {
                brandName
              }
            </p>


            <h1 className="mt-2 text-3xl font-black">
              Reports & Revenue
            </h1>


            <p className="mt-2 text-sm text-zinc-500">
              Sales revenue, payment mix and restaurant transaction performance.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            <Link
              href="/dashboard/pos/sales"
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black hover:bg-zinc-50"
            >
              Sales History
            </Link>


            <Link
              href="/dashboard/pos/closing/history"
              className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
            >
              Shift History
            </Link>


            <a
              href={
                `/api/pos/revenue/export/pdf?from=${encodeURIComponent(
                  fromDate
                )}&to=${encodeURIComponent(
                  toDate
                )}&payment=${encodeURIComponent(
                  paymentFilter
                )}&orderType=${encodeURIComponent(
                  orderTypeFilter
                )}`
              }
              className="rounded-xl bg-red-900 px-4 py-3 text-sm font-black text-white hover:bg-red-800"
            >
              Download PDF
            </a>


            <a
              href={
                `/api/pos/revenue/export/csv?from=${encodeURIComponent(
                  fromDate
                )}&to=${encodeURIComponent(
                  toDate
                )}&payment=${encodeURIComponent(
                  paymentFilter
                )}&orderType=${encodeURIComponent(
                  orderTypeFilter
                )}`
              }
              className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black hover:bg-zinc-50"
            >
              Export CSV
            </a>

          </div>

        </header>


        {/* FILTER */}

        <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

            <div>

              <h2 className="font-black">
                Report Period
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {
                  outlet.code
                } · {
                  outlet.name
                }
              </p>

            </div>


            <div className="flex flex-wrap gap-2">

              <Link
                href={
                  `/dashboard/pos/revenue?from=${today}&to=${today}`
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black"
              >
                Today
              </Link>


              <Link
                href={
                  `/dashboard/pos/revenue?from=${last7}&to=${today}`
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black"
              >
                Last 7 Days
              </Link>


              <Link
                href={
                  `/dashboard/pos/revenue?from=${last30}&to=${today}`
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black"
              >
                Last 30 Days
              </Link>

            </div>

          </div>


          <form
            method="get"
            className="grid gap-3 md:grid-cols-2 xl:grid-cols-5"
          >

            <div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                Start Date
              </label>

              <input
                type="date"
                name="from"
                defaultValue={
                  fromDate
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
              />

            </div>


            <div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                End Date
              </label>

              <input
                type="date"
                name="to"
                defaultValue={
                  toDate
                }
                className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
              />

            </div>


            <div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                Payment
              </label>

              <select
                name="payment"
                defaultValue={
                  paymentFilter
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
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

            </div>


            <div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                Order Type
              </label>

              <select
                name="orderType"
                defaultValue={
                  orderTypeFilter
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
              >
                <option value="ALL">
                  All Types
                </option>

                <option value="DINE_IN">
                  Dine In
                </option>

                <option value="TAKEAWAY">
                  Takeaway
                </option>
              </select>

            </div>


            <div className="flex items-end">

              <button
                type="submit"
                className="w-full rounded-xl bg-red-900 px-5 py-3 text-sm font-black text-white hover:bg-red-800"
              >
                Apply Filter
              </button>

            </div>

          </form>

        </section>


        {salesError && (

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {
              salesError.message
            }
          </div>

        )}


        {/* KPI */}

        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <Kpi
            label="Revenue"
            value={
              rupiah(
                revenue
              )
            }
            dark
          />

          <Kpi
            label="Transactions"
            value={
              number(
                transactions
              )
            }
          />

          <Kpi
            label="Average Ticket"
            value={
              rupiah(
                averageTicket
              )
            }
          />

          <Kpi
            label="Total Collected"
            value={
              rupiah(
                totalCollected
              )
            }
          />

        </section>


        <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <Kpi
            label="Dine In"
            value={
              number(
                dineInCount
              )
            }
          />

          <Kpi
            label="Takeaway"
            value={
              number(
                takeawayCount
              )
            }
          />

          <Kpi
            label="Service"
            value={
              rupiah(
                totalService
              )
            }
          />

          <Kpi
            label="Tax"
            value={
              rupiah(
                totalTax
              )
            }
          />

        </section>


        {/* DAILY TREND */}

        <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

          <div className="mb-5">

            <h2 className="font-black">
              Daily Revenue
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Sales performance for selected period.
            </p>

          </div>


          {dailyRows.length
            ? (
              <div className="space-y-4">

                {dailyRows.map(
                  row => {

                    const width =
                      (
                        row.revenue /
                        maxDailyRevenue
                      ) * 100


                    return (
                      <div
                        key={
                          row.date
                        }
                      >

                        <div className="mb-2 flex items-end justify-between gap-4">

                          <div>

                            <p className="text-sm font-black">
                              {
                                shortDate(
                                  row.date
                                )
                              }
                            </p>

                            <p className="text-xs text-zinc-400">
                              {
                                row.transactions
                              } transactions
                            </p>

                          </div>


                          <p className="font-black">
                            {
                              rupiah(
                                row.revenue
                              )
                            }
                          </p>

                        </div>


                        <div className="h-2 overflow-hidden rounded-full bg-zinc-100">

                          <div
                            className="h-full rounded-full bg-red-900"
                            style={{
                              width:
                                `${Math.max(
                                  width,
                                  1
                                )}%`,
                            }}
                          />

                        </div>

                      </div>
                    )
                  }
                )}

              </div>
            )
            : (
              <div className="py-10 text-center text-sm text-zinc-400">
                No sales for selected period.
              </div>
            )
          }

        </section>


        <section className="mb-5 grid gap-5 lg:grid-cols-2">


          {/* PAYMENT MIX */}

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <div className="border-b border-zinc-100 p-5">

              <h2 className="font-black">
                Payment Mix
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Collected amount by payment method.
              </p>

            </div>


            <div className="divide-y divide-zinc-100">

              {paymentRows.map(
                row => {

                  const mix =
                    totalCollected >
                    0
                      ? (
                          row.amount /
                          totalCollected
                        ) * 100
                      : 0


                  return (
                    <div
                      key={
                        row.method
                      }
                      className="flex items-center justify-between gap-4 p-5"
                    >

                      <div>

                        <p className="font-black">
                          {
                            row.method
                          }
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {
                            row.transactions
                          } transactions · {
                            percent(
                              mix
                            )
                          }
                        </p>

                      </div>


                      <p className="font-black">
                        {
                          rupiah(
                            row.amount
                          )
                        }
                      </p>

                    </div>
                  )
                }
              )}


              {!paymentRows.length && (

                <div className="p-10 text-center text-sm text-zinc-400">
                  No payment data.
                </div>

              )}

            </div>

          </div>


          {/* ORDER TYPE */}

          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

            <div className="border-b border-zinc-100 p-5">

              <h2 className="font-black">
                Order Type
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                Dine-in and takeaway transaction distribution.
              </p>

            </div>


            <div className="grid grid-cols-2 gap-3 p-5">

              <div className="rounded-2xl bg-zinc-50 p-5">

                <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                  Dine In
                </p>

                <p className="mt-3 text-3xl font-black">
                  {
                    dineInCount
                  }
                </p>

              </div>


              <div className="rounded-2xl bg-zinc-50 p-5">

                <p className="text-xs font-black uppercase tracking-wide text-zinc-400">
                  Takeaway
                </p>

                <p className="mt-3 text-3xl font-black">
                  {
                    takeawayCount
                  }
                </p>

              </div>

            </div>

          </div>

        </section>


        {/* TOP MENU */}

        <section className="mb-5 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="border-b border-zinc-100 p-5">

            <h2 className="font-black">
              Top Menu
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Ranked by quantity sold.
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[700px] text-left">

              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-wide text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Menu
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4 text-right">
                    Qty Sold
                  </th>

                  <th className="px-5 py-4 text-right">
                    Revenue
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-zinc-100">

                {topMenus.map(
                  row => {

                    const menu =
                      menuMap.get(
                        row.menuId
                      )


                    return (
                      <tr
                        key={
                          row.menuId
                        }
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div
                              className="h-12 w-12 shrink-0 rounded-xl bg-zinc-100 bg-cover bg-center"
                              style={
                                menu?.image_url
                                  ? {
                                      backgroundImage:
                                        `url("${menu.image_url}")`,
                                    }
                                  : undefined
                              }
                            />


                            <div>

                              <p className="font-black">
                                {
                                  menu?.name ||
                                  '-'
                                }
                              </p>

                              <p className="mt-1 text-xs text-zinc-400">
                                {
                                  menu?.code ||
                                  ''
                                }
                              </p>

                            </div>

                          </div>

                        </td>


                        <td className="px-5 py-4 text-sm text-zinc-500">
                          {
                            menu?.category ||
                            '-'
                          }
                        </td>


                        <td className="px-5 py-4 text-right font-black">
                          {
                            number(
                              row.quantity
                            )
                          }
                        </td>


                        <td className="px-5 py-4 text-right font-black">
                          {
                            rupiah(
                              row.revenue
                            )
                          }
                        </td>

                      </tr>
                    )
                  }
                )}


                {!topMenus.length && (

                  <tr>

                    <td
                      colSpan={
                        4
                      }
                      className="px-5 py-12 text-center text-sm text-zinc-400"
                    >
                      No menu sales.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>


        {/* TRANSACTION HISTORY */}

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="border-b border-zinc-100 p-5">

            <h2 className="font-black">
              Transaction History
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Posted transactions for selected report period.
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left">

              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-wide text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Date / Time
                  </th>

                  <th className="px-5 py-4">
                    Sale
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

                  <th className="px-5 py-4 text-right">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-zinc-100">

                {sales.map(
                  sale => {

                    const order =
                      orderBySale.get(
                        sale.id
                      )


                    const table =
                      order?.table_id
                        ? tableMap.get(
                            order.table_id
                          )
                        : null


                    return (
                      <tr
                        key={
                          sale.id
                        }
                      >

                        <td className="px-5 py-4 text-sm text-zinc-500">
                          {
                            dateTime(
                              sale.transaction_date
                            )
                          }
                        </td>


                        <td className="px-5 py-4 font-mono text-xs font-bold">
                          {
                            sale.sale_no
                          }
                        </td>


                        <td className="px-5 py-4 font-mono text-xs">
                          {
                            order?.order_no ||
                            '-'
                          }
                        </td>


                        <td className="px-5 py-4 text-sm">
                          {
                            table?.code ||
                            '-'
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
                            {
                              order?.order_type ||
                              'POS'
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700">
                            {
                              sale.payment_method ||
                              '-'
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-right font-black">
                          {
                            rupiah(
                              sale.grand_total
                            )
                          }
                        </td>


                        <td className="px-5 py-4 text-right">

                          <Link
                            href={
                              `/dashboard/pos/sales/${sale.id}`
                            }
                            className="text-xs font-black text-red-800 hover:underline"
                          >
                            Detail →
                          </Link>

                        </td>

                      </tr>
                    )
                  }
                )}


                {!sales.length && (

                  <tr>

                    <td
                      colSpan={
                        8
                      }
                      className="px-5 py-14 text-center text-sm text-zinc-400"
                    >
                      No transactions found.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>


        <div className="mt-5 rounded-2xl bg-zinc-950 p-5 text-white">

          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            Sales-Only Reporting
          </p>

          <p className="mt-2 text-sm text-zinc-300">
            Revenue reporting only. Inventory, BOM, COGS and gross-margin calculations are disabled for this operation profile.
          </p>

        </div>

      </div>

    </main>
  )
}


function Kpi({
  label,
  value,
  dark = false,
}: {
  label: string
  value: string
  dark?: boolean
}) {

  return (
    <div
      className={
        dark
          ? 'rounded-2xl bg-zinc-950 p-5 text-white shadow-sm'
          : 'rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm'
      }
    >

      <p
        className={
          dark
            ? 'text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400'
            : 'text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400'
        }
      >
        {
          label
        }
      </p>

      <p className="mt-2 text-2xl font-black">
        {
          value
        }
      </p>

    </div>
  )
}
