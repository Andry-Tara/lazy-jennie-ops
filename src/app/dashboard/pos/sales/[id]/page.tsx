import { createClient } from '@/lib/supabase/server'

import {
  redirect,
  notFound,
} from 'next/navigation'

import Link from 'next/link'


type PageProps = {
  params: Promise<{
    id: string
  }>
}


type SalesAccess = {
  role_code: string | null
  outlet_id: string | null
  can_view_cost: boolean
  can_view_override_audit: boolean
}


export default async function SaleDetailPage({
  params,
}: PageProps) {

  const {
    id,
  } =
    await params


  const supabase =
    await createClient()


  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth
      .getUser()


  if (!user) {
    redirect('/login')
  }


  // =====================================================
  // ACCESS
  // =====================================================

  const {
    data: accessData,
  } =
    await supabase.rpc(
      'get_my_sales_access'
    )


  const access =
    accessData as unknown as
      SalesAccess |
      null


  const canViewCost =
    Boolean(
      access?.can_view_cost
    )


  const canViewOverrideAudit =
    Boolean(
      access?.can_view_override_audit
    )


  // =====================================================
  // SECURE SALE HEADER
  // =====================================================

  const {
    data: sale,
    error: saleError,
  } =
    await supabase
      .from('sales_secure')
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
        stock_override_reason,
        notes,
        posted_at,
        created_at
      `)
      .eq(
        'id',
        id
      )
      .single()


  if (
    saleError ||
    !sale
  ) {
    notFound()
  }


  // =====================================================
  // OUTLET
  // =====================================================

  const {
    data: outlet,
  } =
    await supabase
      .from('outlets_secure')
      .select(`
        id,
        code,
        name,
        type
      `)
      .eq(
        'id',
        sale.outlet_id
      )
      .single()


  // =====================================================
  // SECURE SALE ITEMS
  // =====================================================

  const {
    data: saleItems,
  } =
    await supabase
      .from('sale_items_secure')
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
        gross_profit,
        notes,
        created_at,
        menu_code,
        menu_name,
        menu_category,
        menu_image_url
      `)
      .eq(
        'sale_id',
        id
      )
      .order(
        'created_at'
      )


  // =====================================================
  // SECURE INVENTORY CONSUMPTION
  // =====================================================

  const {
    data: consumptions,
  } =
    await supabase
      .from(
        'sale_item_consumptions_secure'
      )
      .select(`
        id,
        sale_id,
        sale_item_id,
        menu_item_id,
        item_id,
        source_qty,
        source_unit_id,
        conversion_factor,
        base_qty,
        unit_cost,
        total_cost,
        created_at,
        item_sku,
        item_name,
        source_unit_code
      `)
      .eq(
        'sale_id',
        id
      )
      .order(
        'created_at'
      )


  // =====================================================
  // SECURE OVERRIDE AUDIT
  // =====================================================

  const {
    data: overrides,
  } =
    await supabase
      .from(
        'pos_stock_overrides_secure'
      )
      .select(`
        id,
        sale_id,
        item_id,
        unit_id,
        required_base_qty,
        system_base_qty,
        shortage_base_qty,
        reason,
        approved_by,
        created_at,
        item_sku,
        item_name,
        unit_code,
        approved_by_name,
        approved_by_email
      `)
      .eq(
        'sale_id',
        id
      )
      .order(
        'created_at'
      )


  // =====================================================
  // CONSUMPTION MAP
  // =====================================================

  const consumptionMap =
    new Map<
      string,
      typeof consumptions
    >()


  for (
    const row of
      consumptions || []
  ) {

    const current =
      consumptionMap.get(
        row.sale_item_id
      ) || []


    current.push(
      row
    )


    consumptionMap.set(
      row.sale_item_id,
      current
    )

  }


  // =====================================================
  // SUMMARY
  // =====================================================

  const netSales =
    Number(
      sale.net_sales || 0
    )


  const totalCogs =
    canViewCost
      ? Number(
          sale.total_cogs || 0
        )
      : 0


  const grossProfit =
    canViewCost
      ? Number(
          sale.gross_profit || 0
        )
      : 0


  const grossMargin =
    canViewCost &&
    netSales > 0

      ? (
          grossProfit /
          netSales
        ) * 100

      : 0


  const foodCost =
    canViewCost &&
    netSales > 0

      ? (
          totalCogs /
          netSales
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


  function formatQty(
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
          4,
      }
    )

  }


  function formatCost(
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
        minimumFractionDigits:
          0,

        maximumFractionDigits:
          4,
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


  function formatDateTime(
    value:
      string |
      null
  ) {

    if (!value) {
      return '-'
    }


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


        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos/sales"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Sales History
            </Link>


            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>


            <h1 className="mt-2 text-3xl font-bold">
              {sale.sale_no}
            </h1>


            <p className="mt-2 text-zinc-500">
              POS Transaction Detail
            </p>

          </div>


          <Link
            href="/dashboard/pos"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold hover:bg-zinc-50"
          >
            Point of Sale
          </Link>

        </div>


        {/* RESTRICTED INFO */}

        {!canViewCost && (

          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">

            <p className="font-bold text-blue-900">
              Operational Transaction View
            </p>

            <p className="mt-1 text-sm text-blue-800">
              COGS, Gross Profit, WAC and inventory consumption are restricted for this role.
            </p>

          </div>

        )}


        {/* TRANSACTION INFO */}

        <div className="mb-6 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Outlet
            </p>

            <p className="mt-2 font-bold">
              {outlet?.name ||
                '-'}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {outlet?.code ||
                ''}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Transaction Time
            </p>

            <p className="mt-2 font-bold">
              {formatDateTime(
                sale.transaction_date
              )}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Payment
            </p>

            <p className="mt-2 text-xl font-bold">
              {sale.payment_method ||
                '-'}
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Status
            </p>

            <div className="mt-3">

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                {sale.status}
              </span>

            </div>

          </div>

        </div>


        {/* FINANCIAL SUMMARY */}

        <div
          className={`mb-8 grid gap-4 ${
            canViewCost
              ? 'md:grid-cols-2 lg:grid-cols-5'
              : 'md:grid-cols-2'
          }`}
        >

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Net Sales
            </p>

            <p className="mt-2 text-xl font-bold">
              {formatRupiah(
                sale.net_sales
              )}
            </p>

          </div>


          {!canViewCost && (

            <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

              <p className="text-sm text-red-200">
                Total Collected
              </p>

              <p className="mt-2 text-xl font-bold">
                {formatRupiah(
                  sale.grand_total
                )}
              </p>

            </div>

          )}


          {canViewCost && (
            <>

              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm text-zinc-500">
                  Actual COGS
                </p>

                <p className="mt-2 text-xl font-bold text-red-700">
                  {formatRupiah(
                    sale.total_cogs
                  )}
                </p>

              </div>


              <div className="rounded-2xl bg-red-950 p-6 text-white shadow-sm">

                <p className="text-sm text-red-200">
                  Gross Profit
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatRupiah(
                    sale.gross_profit
                  )}
                </p>

              </div>


              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm text-zinc-500">
                  Gross Margin
                </p>

                <p className="mt-2 text-xl font-bold text-green-700">
                  {formatPercent(
                    grossMargin
                  )}
                </p>

              </div>


              <div className="rounded-2xl bg-white p-6 shadow-sm">

                <p className="text-sm text-zinc-500">
                  Food Cost %
                </p>

                <p className="mt-2 text-xl font-bold">
                  {formatPercent(
                    foodCost
                  )}
                </p>

              </div>

            </>
          )}

        </div>


        {/* PAYMENT BREAKDOWN */}

        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="font-bold">
            Payment Breakdown
          </h2>


          <div className="mt-5 grid gap-4 md:grid-cols-5">

            <div>

              <p className="text-xs text-zinc-400">
                Subtotal
              </p>

              <p className="mt-1 font-bold">
                {formatRupiah(
                  sale.subtotal
                )}
              </p>

            </div>


            <div>

              <p className="text-xs text-zinc-400">
                Discount
              </p>

              <p className="mt-1 font-bold">
                -
                {formatRupiah(
                  sale.discount_amount
                )}
              </p>

            </div>


            <div>

              <p className="text-xs text-zinc-400">
                Net Sales
              </p>

              <p className="mt-1 font-bold">
                {formatRupiah(
                  sale.net_sales
                )}
              </p>

            </div>


            <div>

              <p className="text-xs text-zinc-400">
                Service + Tax
              </p>

              <p className="mt-1 font-bold">

                {formatRupiah(
                  Number(
                    sale.service_amount || 0
                  ) +
                  Number(
                    sale.tax_amount || 0
                  )
                )}

              </p>

            </div>


            <div>

              <p className="text-xs text-zinc-400">
                Grand Total
              </p>

              <p className="mt-1 text-lg font-bold text-red-900">
                {formatRupiah(
                  sale.grand_total
                )}
              </p>

            </div>

          </div>

        </div>


        {/* SALE ITEMS */}

        <div className="mb-8 space-y-5">

          {(saleItems || []).map(
            (saleItem) => {

              const itemConsumptions =
                consumptionMap.get(
                  saleItem.id
                ) || []


              const lineNet =
                Number(
                  saleItem.net_amount || 0
                )


              const lineCogs =
                canViewCost
                  ? Number(
                      saleItem.total_cogs || 0
                    )
                  : 0


              const lineFoodCost =
                canViewCost &&
                lineNet > 0

                  ? (
                      lineCogs /
                      lineNet
                    ) * 100

                  : 0


              return (

                <div
                  key={
                    saleItem.id
                  }
                  className="overflow-hidden rounded-2xl bg-white shadow-sm"
                >

                  {/* MENU */}

                  <div className="border-b border-zinc-200 p-6">

                    <div className="flex flex-wrap items-start justify-between gap-5">

                      <div className="flex items-center gap-4">

                        <div
                          className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center"
                          style={
                            saleItem.menu_image_url
                              ? {
                                  backgroundImage:
                                    `url("${saleItem.menu_image_url}")`,
                                }
                              : undefined
                          }
                        >

                          {!saleItem.menu_image_url && (

                            <div className="flex h-full items-center justify-center text-3xl">
                              🍽️
                            </div>

                          )}

                        </div>


                        <div>

                          <p className="text-xs font-semibold text-zinc-400">
                            {saleItem.menu_code ||
                              ''}
                          </p>

                          <h2 className="mt-1 text-xl font-bold">
                            {saleItem.menu_name ||
                              'Menu'}
                          </h2>

                          <p className="mt-2 text-sm text-zinc-500">

                            {formatQty(
                              saleItem.quantity
                            )}

                            {' × '}

                            {formatRupiah(
                              saleItem.unit_price
                            )}

                          </p>

                        </div>

                      </div>


                      <div
                        className={`grid gap-6 text-right ${
                          canViewCost
                            ? 'grid-cols-3'
                            : 'grid-cols-1'
                        }`}
                      >

                        <div>

                          <p className="text-xs text-zinc-400">
                            Net Sales
                          </p>

                          <p className="mt-1 font-bold">
                            {formatRupiah(
                              saleItem.net_amount
                            )}
                          </p>

                        </div>


                        {canViewCost && (
                          <>

                            <div>

                              <p className="text-xs text-zinc-400">
                                Actual COGS
                              </p>

                              <p className="mt-1 font-bold text-red-700">
                                {formatRupiah(
                                  saleItem.total_cogs
                                )}
                              </p>

                            </div>


                            <div>

                              <p className="text-xs text-zinc-400">
                                Food Cost
                              </p>

                              <p className="mt-1 font-bold">
                                {formatPercent(
                                  lineFoodCost
                                )}
                              </p>

                            </div>

                          </>
                        )}

                      </div>

                    </div>

                  </div>


                  {/* COST / INVENTORY */}

                  {canViewCost && (

                    <div className="p-6">

                      <h3 className="font-bold">
                        Inventory Consumption
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        Inventory and WAC snapshot recorded when this menu was sold.
                      </p>


                      <div className="mt-5 overflow-x-auto">

                        <table className="w-full text-left text-sm">

                          <thead className="bg-zinc-50 text-zinc-500">

                            <tr>

                              <th className="px-4 py-3">
                                Inventory Item
                              </th>

                              <th className="px-4 py-3 text-right">
                                Consumption
                              </th>

                              <th className="px-4 py-3 text-right">
                                Base Qty
                              </th>

                              <th className="px-4 py-3 text-right">
                                WAC
                              </th>

                              <th className="px-4 py-3 text-right">
                                Actual Cost
                              </th>

                            </tr>

                          </thead>


                          <tbody className="divide-y divide-zinc-100">

                            {itemConsumptions.map(
                              (consumption) => (

                                <tr
                                  key={
                                    consumption.id
                                  }
                                >

                                  <td className="px-4 py-4">

                                    <p className="font-medium">
                                      {consumption.item_name ||
                                        '-'}
                                    </p>

                                    <p className="text-xs text-zinc-400">
                                      {consumption.item_sku ||
                                        ''}
                                    </p>

                                  </td>


                                  <td className="px-4 py-4 text-right font-semibold">

                                    {formatQty(
                                      consumption.source_qty
                                    )}

                                    {' '}

                                    {consumption.source_unit_code ||
                                      ''}

                                  </td>


                                  <td className="px-4 py-4 text-right">
                                    {formatQty(
                                      consumption.base_qty
                                    )}
                                  </td>


                                  <td className="px-4 py-4 text-right">

                                    Rp{' '}

                                    {formatCost(
                                      consumption.unit_cost
                                    )}

                                  </td>


                                  <td className="px-4 py-4 text-right font-bold text-red-700">

                                    {formatRupiah(
                                      consumption.total_cost
                                    )}

                                  </td>

                                </tr>

                              )
                            )}

                          </tbody>

                        </table>

                      </div>

                    </div>

                  )}

                </div>

              )

            }
          )}

        </div>


        {/* OVERRIDE NOTICE FOR RESTRICTED ROLE */}

        {sale.stock_override_used &&
          !canViewOverrideAudit && (

          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">

            <p className="font-bold text-amber-900">
              Manager Override Recorded
            </p>

            <p className="mt-2 text-sm text-amber-800">
              This transaction was approved using a manager stock override.
              Detailed audit information is restricted.
            </p>

          </div>

        )}


        {/* FULL OVERRIDE AUDIT */}

        {sale.stock_override_used &&
          canViewOverrideAudit && (

          <div className="mb-8 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">

            <div className="border-b border-amber-200 p-6">

              <p className="text-xs font-bold tracking-wider text-amber-700">
                AUDIT TRAIL
              </p>

              <h2 className="mt-1 text-xl font-bold text-amber-950">
                Manager Stock Override
              </h2>

              <p className="mt-2 text-sm text-amber-800">
                Sale completed while system inventory was insufficient.
              </p>

            </div>


            <div className="space-y-4 p-6">

              {(overrides || []).map(
                (override) => (

                  <div
                    key={
                      override.id
                    }
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-4">

                      <div>

                        <p className="text-xs text-zinc-400">
                          Inventory Item
                        </p>

                        <p className="mt-1 text-lg font-bold">
                          {override.item_name ||
                            '-'}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {override.item_sku ||
                            ''}
                        </p>

                      </div>


                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        STOCK SHORTAGE
                      </span>

                    </div>


                    <div className="mt-5 grid gap-4 md:grid-cols-3">

                      <div className="rounded-xl bg-zinc-50 p-4">

                        <p className="text-xs text-zinc-400">
                          Required
                        </p>

                        <p className="mt-1 text-lg font-bold">

                          {formatQty(
                            override.required_base_qty
                          )}

                          {' '}

                          {override.unit_code ||
                            ''}

                        </p>

                      </div>


                      <div className="rounded-xl bg-zinc-50 p-4">

                        <p className="text-xs text-zinc-400">
                          System Stock
                        </p>

                        <p className="mt-1 text-lg font-bold">

                          {formatQty(
                            override.system_base_qty
                          )}

                          {' '}

                          {override.unit_code ||
                            ''}

                        </p>

                      </div>


                      <div className="rounded-xl bg-red-50 p-4">

                        <p className="text-xs text-red-500">
                          Shortage
                        </p>

                        <p className="mt-1 text-lg font-bold text-red-700">

                          {formatQty(
                            override.shortage_base_qty
                          )}

                          {' '}

                          {override.unit_code ||
                            ''}

                        </p>

                      </div>

                    </div>


                    <div className="mt-5 rounded-xl bg-amber-50 p-4">

                      <p className="text-xs font-semibold text-amber-700">
                        Override Reason
                      </p>

                      <p className="mt-2 font-medium text-amber-950">
                        {override.reason ||
                          '-'}
                      </p>

                    </div>


                    <div className="mt-5 grid gap-4 border-t border-zinc-100 pt-5 md:grid-cols-2">

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Approved By
                        </p>

                        <p className="mt-2 font-bold">
                          {override.approved_by_name ||
                            'Unknown User'}
                        </p>

                        <p className="mt-1 text-sm text-zinc-500">
                          {override.approved_by_email ||
                            '-'}
                        </p>

                      </div>


                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                          Approved At
                        </p>

                        <p className="mt-2 font-bold">
                          {formatDateTime(
                            override.created_at
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        )}


        {/* NOTES */}

        {sale.notes && (

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm font-semibold text-zinc-500">
              Sale Notes
            </p>

            <p className="mt-2">
              {sale.notes}
            </p>

          </div>

        )}


      </div>

    </main>

  )

}
