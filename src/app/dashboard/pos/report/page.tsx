import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

type SearchParams = Promise<{
  from?: string
  to?: string
  outlet?: string
}>

type SaleRow = {
  id: string
  sale_no: string
  sale_date: string
  transaction_date: string
  outlet_id: string
  status: string
  subtotal: number
  discount_amount: number
  service_amount: number
  tax_amount: number
  net_sales: number
  grand_total: number
  total_cogs: number
  gross_profit: number
  payment_method: string | null
  stock_override_used: boolean
  stock_override_reason: string | null
}

type SaleItemRow = {
  id: string
  sale_id: string
  menu_item_id: string
  quantity: number
  unit_price: number
  gross_amount: number
  discount_amount: number
  net_amount: number
  total_cogs: number
  gross_profit: number
}

export default async function PosManagementReportPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams

  const supabase = await createClient()

  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // TODAY JAKARTA
  // =====================================================

  const today = new Intl.DateTimeFormat(
    'en-CA',
    {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }
  ).format(new Date())

  const fromDate =
    params.from || today

  const toDate =
    params.to || today

  const outletFilter =
    params.outlet || ''

  // =====================================================
  // OUTLETS
  // =====================================================

  const {
    data: outlets,
  } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name,
      type
    `)
    .eq('is_active', true)
    .order('name')

  const outletMap = new Map(
    (outlets || []).map(
      (outlet) => [
        outlet.id,
        outlet,
      ]
    )
  )

  // =====================================================
  // SALES
  // =====================================================

  let salesQuery =
    supabase
      .from('sales')
      .select(`
        id,
        sale_no,
        sale_date,
        transaction_date,
        outlet_id,
        status,
        subtotal,
        discount_amount,
        service_amount,
        tax_amount,
        net_sales,
        grand_total,
        total_cogs,
        gross_profit,
        payment_method,
        stock_override_used,
        stock_override_reason
      `)
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
          ascending: false,
        }
      )

  if (outletFilter) {
    salesQuery =
      salesQuery.eq(
        'outlet_id',
        outletFilter
      )
  }

  const {
    data: rawSales,
    error: salesError,
  } = await salesQuery

  const sales: SaleRow[] =
    (rawSales || []).map(
      (sale) => ({
        id: sale.id,
        sale_no: sale.sale_no,
        sale_date: sale.sale_date,
        transaction_date:
          sale.transaction_date,
        outlet_id: sale.outlet_id,
        status: sale.status,

        subtotal:
          Number(
            sale.subtotal || 0
          ),

        discount_amount:
          Number(
            sale.discount_amount || 0
          ),

        service_amount:
          Number(
            sale.service_amount || 0
          ),

        tax_amount:
          Number(
            sale.tax_amount || 0
          ),

        net_sales:
          Number(
            sale.net_sales || 0
          ),

        grand_total:
          Number(
            sale.grand_total || 0
          ),

        total_cogs:
          Number(
            sale.total_cogs || 0
          ),

        gross_profit:
          Number(
            sale.gross_profit || 0
          ),

        payment_method:
          sale.payment_method,

        stock_override_used:
          Boolean(
            sale.stock_override_used
          ),

        stock_override_reason:
          sale.stock_override_reason,
      })
    )

  // =====================================================
  // SALE ITEMS
  // =====================================================

  const saleIds =
    sales.map(
      (sale) =>
        sale.id
    )

  let saleItems:
    SaleItemRow[] = []

  if (
    saleIds.length >
    0
  ) {
    const {
      data,
    } = await supabase
      .from('sale_items')
      .select(`
        id,
        sale_id,
        menu_item_id,
        quantity,
        unit_price,
        gross_amount,
        discount_amount,
        net_amount,
        total_cogs,
        gross_profit
      `)
      .in(
        'sale_id',
        saleIds
      )

    saleItems =
      (data || []).map(
        (row) => ({
          id: row.id,
          sale_id:
            row.sale_id,

          menu_item_id:
            row.menu_item_id,

          quantity:
            Number(
              row.quantity || 0
            ),

          unit_price:
            Number(
              row.unit_price || 0
            ),

          gross_amount:
            Number(
              row.gross_amount || 0
            ),

          discount_amount:
            Number(
              row.discount_amount || 0
            ),

          net_amount:
            Number(
              row.net_amount || 0
            ),

          total_cogs:
            Number(
              row.total_cogs || 0
            ),

          gross_profit:
            Number(
              row.gross_profit || 0
            ),
        })
      )
  }

  // =====================================================
  // MENU
  // =====================================================

  const menuIds =
    Array.from(
      new Set(
        saleItems.map(
          (row) =>
            row.menu_item_id
        )
      )
    )

  let menus: {
    id: string
    code: string
    name: string
    category: string | null
    image_url: string | null
  }[] = []

  if (
    menuIds.length >
    0
  ) {
    const {
      data,
    } = await supabase
      .from('menu_items')
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
      data || []
  }

  const menuMap =
    new Map(
      menus.map(
        (menu) => [
          menu.id,
          menu,
        ]
      )
    )

  // =====================================================
  // EXECUTIVE SUMMARY
  // =====================================================

  const transactions =
    sales.length

  const grossSales =
    sales.reduce(
      (total, sale) =>
        total +
        sale.subtotal,
      0
    )

  const totalDiscount =
    sales.reduce(
      (total, sale) =>
        total +
        sale.discount_amount,
      0
    )

  const netSales =
    sales.reduce(
      (total, sale) =>
        total +
        sale.net_sales,
      0
    )

  const totalService =
    sales.reduce(
      (total, sale) =>
        total +
        sale.service_amount,
      0
    )

  const totalTax =
    sales.reduce(
      (total, sale) =>
        total +
        sale.tax_amount,
      0
    )

  const grandTotal =
    sales.reduce(
      (total, sale) =>
        total +
        sale.grand_total,
      0
    )

  const actualCogs =
    sales.reduce(
      (total, sale) =>
        total +
        sale.total_cogs,
      0
    )

  const grossProfit =
    sales.reduce(
      (total, sale) =>
        total +
        sale.gross_profit,
      0
    )

  const averageCheck =
    transactions > 0
      ? netSales /
        transactions
      : 0

  const grossMargin =
    netSales > 0
      ? (
          grossProfit /
          netSales
        ) * 100
      : 0

  const foodCost =
    netSales > 0
      ? (
          actualCogs /
          netSales
        ) * 100
      : 0

  const discountRate =
    grossSales > 0
      ? (
          totalDiscount /
          grossSales
        ) * 100
      : 0

  // =====================================================
  // DAILY TREND
  // =====================================================

  const dailyMap =
    new Map<
      string,
      {
        transactions: number
        netSales: number
        cogs: number
        grossProfit: number
      }
    >()

  for (
    const sale of sales
  ) {
    const current =
      dailyMap.get(
        sale.sale_date
      ) || {
        transactions: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
      }

    current.transactions +=
      1

    current.netSales +=
      sale.net_sales

    current.cogs +=
      sale.total_cogs

    current.grossProfit +=
      sale.gross_profit

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
          summary,
        ]) => ({
          date,
          ...summary,
        })
      )
      .sort(
        (a, b) =>
          a.date.localeCompare(
            b.date
          )
      )

  const maxDailySales =
    Math.max(
      ...dailyRows.map(
        (row) =>
          row.netSales
      ),
      1
    )

  // =====================================================
  // PAYMENT MIX
  // =====================================================

  const paymentMap =
    new Map<
      string,
      {
        transactions: number
        amount: number
      }
    >()

  for (
    const sale of sales
  ) {
    const method =
      sale.payment_method ||
      'UNKNOWN'

    const current =
      paymentMap.get(
        method
      ) || {
        transactions: 0,
        amount: 0,
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
          summary,
        ]) => ({
          method,
          ...summary,
        })
      )
      .sort(
        (a, b) =>
          b.amount -
          a.amount
      )

  // =====================================================
  // MENU PERFORMANCE
  // =====================================================

  const menuSummaryMap =
    new Map<
      string,
      {
        quantity: number
        grossSales: number
        discount: number
        netSales: number
        cogs: number
        grossProfit: number
      }
    >()

  for (
    const row of saleItems
  ) {
    const current =
      menuSummaryMap.get(
        row.menu_item_id
      ) || {
        quantity: 0,
        grossSales: 0,
        discount: 0,
        netSales: 0,
        cogs: 0,
        grossProfit: 0,
      }

    current.quantity +=
      row.quantity

    current.grossSales +=
      row.gross_amount

    current.discount +=
      row.discount_amount

    current.netSales +=
      row.net_amount

    current.cogs +=
      row.total_cogs

    current.grossProfit +=
      row.gross_profit

    menuSummaryMap.set(
      row.menu_item_id,
      current
    )
  }

  const menuPerformance =
    Array.from(
      menuSummaryMap.entries()
    )
      .map(
        ([
          menuId,
          summary,
        ]) => {

          const margin =
            summary.netSales > 0
              ? (
                  summary.grossProfit /
                  summary.netSales
                ) * 100
              : 0

          const foodCost =
            summary.netSales > 0
              ? (
                  summary.cogs /
                  summary.netSales
                ) * 100
              : 0

          return {
            menuId,
            ...summary,
            margin,
            foodCost,
          }
        }
      )

  const topMenus =
    [...menuPerformance]
      .sort(
        (a, b) =>
          b.quantity -
          a.quantity
      )
      .slice(
        0,
        10
      )

  const lowMarginMenus =
    [...menuPerformance]
      .filter(
        (row) =>
          row.netSales > 0
      )
      .sort(
        (a, b) =>
          a.margin -
          b.margin
      )
      .slice(
        0,
        10
      )

  // =====================================================
  // DISCOUNT MONITORING
  // =====================================================

  const discountSales =
    sales.filter(
      (sale) =>
        sale.discount_amount >
        0
    )

  const discountTransactions =
    discountSales.length

  const discountTransactionRate =
    transactions > 0
      ? (
          discountTransactions /
          transactions
        ) * 100
      : 0

  const averageDiscount =
    discountTransactions > 0
      ? totalDiscount /
        discountTransactions
      : 0

  const highestDiscountSales =
    [...discountSales]
      .sort(
        (a, b) =>
          b.discount_amount -
          a.discount_amount
      )
      .slice(
        0,
        5
      )

  // =====================================================
  // OVERRIDE MONITORING
  // =====================================================

  const overrideSales =
    sales.filter(
      (sale) =>
        sale.stock_override_used
    )

  const overrideCount =
    overrideSales.length

  const overrideRate =
    transactions > 0
      ? (
          overrideCount /
          transactions
        ) * 100
      : 0

  // =====================================================
  // FORMAT
  // =====================================================

  function formatRupiah(
    value:
      number |
      string |
      null
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

  function formatNumber(
    value:
      number |
      string |
      null
  ) {
    return Number(
      value || 0
    ).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits:
          2,
      }
    )
  }

  function formatPercent(
    value: number
  ) {
    return `${value.toLocaleString(
      'id-ID',
      {
        minimumFractionDigits:
          1,

        maximumFractionDigits:
          1,
      }
    )}%`
  }

  function formatDate(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Jakarta',
      }
    ).format(
      new Date(
        `${value}T12:00:00+07:00`
      )
    )
  }

  function formatDateTime(
    value: string
  ) {
    return new Intl.DateTimeFormat(
      'id-ID',
      {
        timeZone:
          'Asia/Jakarta',

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
      }
    ).format(
      new Date(value)
    )
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Management Sales Report
            </h1>

            <p className="mt-2 text-zinc-500">
              POS Sales, COGS, Profitability & Operational Control
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <Link
              href="/dashboard/pos"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Point of Sale
            </Link>

            <Link
              href="/dashboard/pos/sales"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              Sales History
            </Link>

            <Link
              href="/dashboard/costing"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
            >
              COGS & Costing
            </Link>

          </div>

        </div>

        {/* =================================================
            FILTER
        ================================================= */}

        <form
          method="get"
          className="mb-8 grid gap-4 rounded-2xl bg-white p-6 shadow-sm md:grid-cols-4"
        >

          <div>

            <label className="mb-2 block text-sm font-semibold">
              From
            </label>

            <input
              type="date"
              name="from"
              defaultValue={
                fromDate
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold">
              To
            </label>

            <input
              type="date"
              name="to"
              defaultValue={
                toDate
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>

          <div>

            <label className="mb-2 block text-sm font-semibold">
              Outlet
            </label>

            <select
              name="outlet"
              defaultValue={
                outletFilter
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

              <option value="">
                All Locations
              </option>

              {(outlets || []).map(
                (outlet) => (

                  <option
                    key={
                      outlet.id
                    }
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

          <div className="flex items-end">

            <button
              type="submit"
              className="w-full rounded-xl bg-red-900 px-5 py-3 font-bold text-white hover:bg-red-800"
            >
              Apply Filter
            </button>

          </div>

        </form>

        {/* ERROR */}

        {salesError && (

          <div className="mb-8 rounded-xl bg-red-50 p-4 text-red-700">
            {salesError.message}
          </div>

        )}

        {/* =================================================
            EXECUTIVE SUMMARY
        ================================================= */}

        <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

            <p className="text-sm text-red-200">
              Net Sales
            </p>

            <p className="mt-2 text-3xl font-bold">
              {formatRupiah(
                netSales
              )}
            </p>

            <p className="mt-2 text-xs text-red-200">
              Selected period
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Transactions
            </p>

            <p className="mt-2 text-3xl font-bold">
              {transactions}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Average Check
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                averageCheck
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Grand Total Collected
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                grandTotal
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              Including service & tax
            </p>

          </div>

        </div>

        <div className="mb-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Actual COGS
            </p>

            <p className="mt-2 text-2xl font-bold text-red-700">
              {formatRupiah(
                actualCogs
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Food Cost %
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatPercent(
                foodCost
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Gross Profit
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatRupiah(
                grossProfit
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Gross Margin
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatPercent(
                grossMargin
              )}
            </p>

          </div>

        </div>

        {/* =================================================
            CONTROL SUMMARY
        ================================================= */}

        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Gross Sales
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                grossSales
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Total Discount
            </p>

            <p className="mt-2 text-xl font-bold text-red-700">
              {formatRupiah(
                totalDiscount
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              {formatPercent(
                discountRate
              )} of gross sales
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Service + Tax
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                totalService +
                  totalTax
              )}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              Service{' '}
              {formatRupiah(
                totalService
              )}
              {' • '}
              Tax{' '}
              {formatRupiah(
                totalTax
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Manager Override
            </p>

            <p
              className={`mt-2 text-3xl font-bold ${
                overrideCount > 0
                  ? 'text-amber-700'
                  : 'text-green-700'
              }`}
            >
              {overrideCount}
            </p>

            <p className="mt-2 text-xs text-zinc-400">
              {formatPercent(
                overrideRate
              )} of transactions
            </p>

          </div>

        </div>

        {/* =================================================
            DAILY SALES TREND
        ================================================= */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">

            <h2 className="font-bold">
              Daily Sales Trend
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Net sales and profitability by business date
            </p>

          </div>

          {dailyRows.length > 0 ? (

            <div className="space-y-5">

              {dailyRows.map(
                (row) => {

                  const barWidth =
                    Math.max(
                      (
                        row.netSales /
                        maxDailySales
                      ) * 100,
                      row.netSales > 0
                        ? 2
                        : 0
                    )

                  const dayFoodCost =
                    row.netSales > 0
                      ? (
                          row.cogs /
                          row.netSales
                        ) * 100
                      : 0

                  return (

                    <div
                      key={
                        row.date
                      }
                    >

                      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">

                        <div>

                          <p className="font-bold">
                            {formatDate(
                              row.date
                            )}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {row.transactions}{' '}
                            transaction(s)
                          </p>

                        </div>

                        <div className="flex flex-wrap gap-6 text-right text-sm">

                          <div>

                            <p className="text-xs text-zinc-400">
                              Net Sales
                            </p>

                            <p className="font-bold">
                              {formatRupiah(
                                row.netSales
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="text-xs text-zinc-400">
                              COGS
                            </p>

                            <p className="font-semibold text-red-700">
                              {formatRupiah(
                                row.cogs
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="text-xs text-zinc-400">
                              Food Cost
                            </p>

                            <p className="font-semibold">
                              {formatPercent(
                                dayFoodCost
                              )}
                            </p>

                          </div>

                        </div>

                      </div>

                      <div className="h-3 overflow-hidden rounded-full bg-zinc-100">

                        <div
                          className="h-full rounded-full bg-red-900"
                          style={{
                            width:
                              `${barWidth}%`,
                          }}
                        />

                      </div>

                    </div>

                  )
                }
              )}

            </div>

          ) : (

            <div className="py-10 text-center text-sm text-zinc-500">
              No sales data for selected period.
            </div>

          )}

        </div>

        {/* =================================================
            PAYMENT MIX
        ================================================= */}

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Payment Mix
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Collected value by payment method
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Payment Method
                  </th>

                  <th className="px-5 py-4 text-right">
                    Transactions
                  </th>

                  <th className="px-5 py-4 text-right">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-right">
                    Mix
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {paymentRows.map(
                  (row) => {

                    const share =
                      grandTotal > 0
                        ? (
                            row.amount /
                            grandTotal
                          ) * 100
                        : 0

                    return (

                      <tr
                        key={
                          row.method
                        }
                      >

                        <td className="px-5 py-4 font-bold">
                          {row.method}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {row.transactions}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            row.amount
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatPercent(
                            share
                          )}
                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

          {!paymentRows.length && (

            <div className="p-10 text-center text-sm text-zinc-500">
              No payment data.
            </div>

          )}

        </div>

        {/* =================================================
            TOP SELLING MENU
        ================================================= */}

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Top Selling Menu
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Ranked by quantity sold
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Menu
                  </th>

                  <th className="px-5 py-4 text-right">
                    Qty Sold
                  </th>

                  <th className="px-5 py-4 text-right">
                    Net Sales
                  </th>

                  <th className="px-5 py-4 text-right">
                    COGS
                  </th>

                  <th className="px-5 py-4 text-right">
                    Gross Profit
                  </th>

                  <th className="px-5 py-4 text-right">
                    Food Cost
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {topMenus.map(
                  (row) => {

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
                              className="h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center"
                              style={
                                menu?.image_url
                                  ? {
                                      backgroundImage:
                                        `url("${menu.image_url}")`,
                                    }
                                  : undefined
                              }
                            >

                              {!menu?.image_url && (

                                <div className="flex h-full items-center justify-center">
                                  🍽️
                                </div>

                              )}

                            </div>

                            <div>

                              <p className="font-bold">
                                {menu?.name ||
                                  '-'}
                              </p>

                              <p className="text-xs text-zinc-400">
                                {menu?.code ||
                                  ''}
                              </p>

                            </div>

                          </div>

                        </td>

                        <td className="px-5 py-4 text-right text-lg font-bold">
                          {formatNumber(
                            row.quantity
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            row.netSales
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-red-700">
                          {formatRupiah(
                            row.cogs
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-green-700">
                          {formatRupiah(
                            row.grossProfit
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatPercent(
                            row.foodCost
                          )}
                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

          {!topMenus.length && (

            <div className="p-10 text-center text-sm text-zinc-500">
              No menu sales.
            </div>

          )}

        </div>

        {/* =================================================
            LOW MARGIN MENU
        ================================================= */}

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Margin Monitoring
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Menu with the lowest gross margin in the selected period
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Menu
                  </th>

                  <th className="px-5 py-4 text-right">
                    Net Sales
                  </th>

                  <th className="px-5 py-4 text-right">
                    COGS
                  </th>

                  <th className="px-5 py-4 text-right">
                    Food Cost
                  </th>

                  <th className="px-5 py-4 text-right">
                    Gross Margin
                  </th>

                  <th className="px-5 py-4">
                    Review
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {lowMarginMenus.map(
                  (row) => {

                    const menu =
                      menuMap.get(
                        row.menuId
                      )

                    const needsReview =
                      row.margin < 60

                    return (

                      <tr
                        key={
                          row.menuId
                        }
                      >

                        <td className="px-5 py-4">

                          <p className="font-bold">
                            {menu?.name ||
                              '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {menu?.code ||
                              ''}
                          </p>

                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            row.netSales
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-red-700">
                          {formatRupiah(
                            row.cogs
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatPercent(
                            row.foodCost
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatPercent(
                            row.margin
                          )}
                        </td>

                        <td className="px-5 py-4">

                          {needsReview ? (

                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                              REVIEW
                            </span>

                          ) : (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                              HEALTHY
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        </div>

        {/* =================================================
            DISCOUNT MONITORING
        ================================================= */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">

            <div>

              <h2 className="font-bold">
                Discount Monitoring
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Review discount usage and high-discount transactions
              </p>

            </div>

            <div className="text-right">

              <p className="text-2xl font-bold text-red-700">
                {formatRupiah(
                  totalDiscount
                )}
              </p>

              <p className="text-xs text-zinc-400">
                Total discount
              </p>

            </div>

          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-3">

            <div className="rounded-xl bg-zinc-50 p-4">

              <p className="text-xs text-zinc-400">
                Discount Transactions
              </p>

              <p className="mt-1 text-xl font-bold">
                {discountTransactions}
              </p>

            </div>

            <div className="rounded-xl bg-zinc-50 p-4">

              <p className="text-xs text-zinc-400">
                Transaction Rate
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatPercent(
                  discountTransactionRate
                )}
              </p>

            </div>

            <div className="rounded-xl bg-zinc-50 p-4">

              <p className="text-xs text-zinc-400">
                Average Discount
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatRupiah(
                  averageDiscount
                )}
              </p>

            </div>

          </div>

          {highestDiscountSales.length >
          0 ? (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead className="bg-zinc-50 text-zinc-500">

                  <tr>

                    <th className="px-4 py-3">
                      Sale
                    </th>

                    <th className="px-4 py-3">
                      Outlet
                    </th>

                    <th className="px-4 py-3 text-right">
                      Gross
                    </th>

                    <th className="px-4 py-3 text-right">
                      Discount
                    </th>

                    <th className="px-4 py-3 text-right">
                      Net Sales
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-zinc-100">

                  {highestDiscountSales.map(
                    (sale) => {

                      const outlet =
                        outletMap.get(
                          sale.outlet_id
                        )

                      return (

                        <tr
                          key={
                            sale.id
                          }
                        >

                          <td className="px-4 py-4">

                            <Link
                              href={`/dashboard/pos/sales/${sale.id}`}
                              className="font-bold text-red-900 hover:underline"
                            >
                              {sale.sale_no}
                            </Link>

                          </td>

                          <td className="px-4 py-4">
                            {outlet?.name ||
                              '-'}
                          </td>

                          <td className="px-4 py-4 text-right">
                            {formatRupiah(
                              sale.subtotal
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-bold text-red-700">
                            {formatRupiah(
                              sale.discount_amount
                            )}
                          </td>

                          <td className="px-4 py-4 text-right font-bold">
                            {formatRupiah(
                              sale.net_sales
                            )}
                          </td>

                        </tr>

                      )
                    }
                  )}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="text-sm text-zinc-500">
              No discounted transactions.
            </p>

          )}

        </div>

        {/* =================================================
            OVERRIDE MONITORING
        ================================================= */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">

            <h2 className="font-bold">
              Manager Override Monitoring
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Sales completed despite insufficient system inventory
            </p>

          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-2">

            <div className="rounded-xl bg-amber-50 p-5">

              <p className="text-sm text-amber-700">
                Override Transactions
              </p>

              <p className="mt-2 text-3xl font-bold text-amber-900">
                {overrideCount}
              </p>

            </div>

            <div className="rounded-xl bg-zinc-50 p-5">

              <p className="text-sm text-zinc-500">
                Override Rate
              </p>

              <p className="mt-2 text-3xl font-bold">
                {formatPercent(
                  overrideRate
                )}
              </p>

            </div>

          </div>

          {overrideSales.length >
          0 ? (

            <div className="space-y-3">

              {overrideSales.map(
                (sale) => {

                  const outlet =
                    outletMap.get(
                      sale.outlet_id
                    )

                  return (

                    <Link
                      key={
                        sale.id
                      }
                      href={`/dashboard/pos/sales/${sale.id}`}
                      className="block rounded-xl border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100"
                    >

                      <div className="flex flex-wrap items-start justify-between gap-4">

                        <div>

                          <p className="font-bold text-amber-950">
                            {sale.sale_no}
                          </p>

                          <p className="mt-1 text-xs text-amber-700">
                            {outlet?.name ||
                              '-'}
                            {' • '}
                            {formatDateTime(
                              sale.transaction_date
                            )}
                          </p>

                          <p className="mt-3 text-sm text-amber-900">
                            {sale.stock_override_reason ||
                              'No reason'}
                          </p>

                        </div>

                        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-bold text-amber-900">
                          REVIEW
                        </span>

                      </div>

                    </Link>

                  )
                }
              )}

            </div>

          ) : (

            <div className="rounded-xl bg-green-50 p-5 text-sm font-medium text-green-700">
              No manager stock override during selected period.
            </div>

          )}

        </div>

        {/* =================================================
            TRANSACTIONS
        ================================================= */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <div className="flex flex-wrap items-center justify-between gap-4">

              <div>

                <h2 className="font-bold">
                  Recent Transactions
                </h2>

                <p className="mt-1 text-sm text-zinc-500">
                  POS transactions for selected period
                </p>

              </div>

              <Link
                href="/dashboard/pos/sales"
                className="text-sm font-semibold text-red-800 hover:underline"
              >
                Full Sales History →
              </Link>

            </div>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Sale No
                  </th>

                  <th className="px-5 py-4">
                    Time
                  </th>

                  <th className="px-5 py-4">
                    Outlet
                  </th>

                  <th className="px-5 py-4">
                    Payment
                  </th>

                  <th className="px-5 py-4 text-right">
                    Net Sales
                  </th>

                  <th className="px-5 py-4 text-right">
                    COGS
                  </th>

                  <th className="px-5 py-4 text-right">
                    GP
                  </th>

                  <th className="px-5 py-4">
                    Control
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {sales.slice(
                  0,
                  25
                ).map(
                  (sale) => {

                    const outlet =
                      outletMap.get(
                        sale.outlet_id
                      )

                    return (

                      <tr
                        key={
                          sale.id
                        }
                        className="hover:bg-zinc-50"
                      >

                        <td className="px-5 py-4">

                          <Link
                            href={`/dashboard/pos/sales/${sale.id}`}
                            className="font-bold text-red-900 hover:underline"
                          >
                            {sale.sale_no}
                          </Link>

                        </td>

                        <td className="px-5 py-4">
                          {formatDateTime(
                            sale.transaction_date
                          )}
                        </td>

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {outlet?.name ||
                              '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {outlet?.code ||
                              ''}
                          </p>

                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {sale.payment_method ||
                            '-'}
                        </td>

                        <td className="px-5 py-4 text-right font-bold">
                          {formatRupiah(
                            sale.net_sales
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-red-700">
                          {formatRupiah(
                            sale.total_cogs
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-green-700">
                          {formatRupiah(
                            sale.gross_profit
                          )}
                        </td>

                        <td className="px-5 py-4">

                          {sale.stock_override_used ? (

                            <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-700">
                              OVERRIDE
                            </span>

                          ) : sale.discount_amount >
                            0 ? (

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold text-blue-700">
                              DISCOUNT
                            </span>

                          ) : (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-[10px] font-bold text-green-700">
                              NORMAL
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  }
                )}

              </tbody>

            </table>

          </div>

          {!sales.length && (

            <div className="p-12 text-center">

              <p className="font-bold">
                No Sales
              </p>

              <p className="mt-2 text-sm text-zinc-500">
                No POS transactions found for selected period.
              </p>

            </div>

          )}

        </div>

      </div>

    </main>
  )
}

