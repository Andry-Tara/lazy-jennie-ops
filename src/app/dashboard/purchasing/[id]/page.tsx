import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function PurchaseOrderDetailPage({
  params,
}: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // PURCHASE ORDER
  // =====================================================

  const {
    data: po,
    error,
  } = await supabase
    .from('purchase_orders_secure')
    .select(`
      id,
      po_no,
      order_date,
      expected_date,
      outlet_id,
      supplier_id,
      status,
      total_amount,
      notes,
      posted_at,
      created_at
    `)
    .eq('id', id)
    .single()

  if (error || !po) {
    notFound()
  }

  // =====================================================
  // PO ITEMS
  // =====================================================

  const { data: poItems } = await supabase
    .from('purchase_order_items_secure')
    .select(`
      id,
      purchase_order_id,
      item_id,
      order_qty,
      unit_id,
      conversion_factor,
      base_qty,
      received_base_qty,
      unit_price,
      total_amount,
      notes,
      created_at
    `)
    .eq('purchase_order_id', id)
    .order('created_at')

  // =====================================================
  // SUPPLIER
  // =====================================================

  const { data: supplier } = await supabase
    .from('suppliers_secure')
    .select(`
      id,
      code,
      name,
      contact_person,
      phone,
      email
    `)
    .eq('id', po.supplier_id)
    .single()

  // =====================================================
  // OUTLET
  // =====================================================

  const { data: outlet } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name,
      type
    `)
    .eq('id', po.outlet_id)
    .single()

  // =====================================================
  // ITEMS
  // =====================================================

  const itemIds = Array.from(
    new Set(
      (poItems || []).map(
        (row) => row.item_id
      )
    )
  )

  let items: {
    id: string
    sku: string
    name: string
  }[] = []

  if (itemIds.length > 0) {
    const { data } = await supabase
      .from('items')
      .select(`
        id,
        sku,
        name
      `)
      .in('id', itemIds)

    items = data || []
  }

  // =====================================================
  // UNITS
  // =====================================================

  const unitIds = Array.from(
    new Set(
      (poItems || []).map(
        (row) => row.unit_id
      )
    )
  )

  let units: {
    id: string
    code: string
    name: string
  }[] = []

  if (unitIds.length > 0) {
    const { data } = await supabase
      .from('units')
      .select(`
        id,
        code,
        name
      `)
      .in('id', unitIds)

    units = data || []
  }

  // =====================================================
  // RECEIVING HISTORY
  // =====================================================

  const { data: receivings } = await supabase
    .from('purchase_receivings_secure')
    .select(`
      id,
      receiving_no,
      receiving_date,
      invoice_no,
      status,
      total_amount,
      notes,
      posted_at,
      created_at
    `)
    .eq('purchase_order_id', id)
    .order('created_at', {
      ascending: false,
    })

  // =====================================================
  // MAP
  // =====================================================

  const itemMap = new Map(
    items.map((row) => [
      row.id,
      row,
    ])
  )

  const unitMap = new Map(
    units.map((row) => [
      row.id,
      row,
    ])
  )

  // =====================================================
  // CALCULATIONS
  // =====================================================

  let orderedValue = 0
  let receivedValue = 0
  let outstandingValue = 0

  let totalLines = 0
  let completedLines = 0

  for (const row of poItems || []) {
    const factor =
      Number(
        row.conversion_factor || 1
      )

    const orderedQty =
      Number(row.order_qty || 0)

    const receivedQty =
      Number(
        row.received_base_qty || 0
      ) / factor

    const outstandingQty =
      Math.max(
        orderedQty - receivedQty,
        0
      )

    const price =
      Number(
        row.unit_price || 0
      )

    orderedValue +=
      orderedQty * price

    receivedValue +=
      receivedQty * price

    outstandingValue +=
      outstandingQty * price

    totalLines += 1

    if (
      outstandingQty <= 0
    ) {
      completedLines += 1
    }
  }

  const canReceive =
    po.status === 'POSTED' ||
    po.status ===
      'PARTIALLY_RECEIVED'

  // =====================================================
  // FORMAT
  // =====================================================

  function formatNumber(
    value: number
  ) {
    return Number(value).toLocaleString(
      'id-ID',
      {
        maximumFractionDigits: 3,
      }
    )
  }

  function formatRupiah(
    value: number | string | null
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(
      Number(value || 0)
    )
  }

  function statusClass(
    status: string
  ) {
    if (
      status ===
      'FULLY_RECEIVED'
    ) {
      return 'bg-green-100 text-green-700'
    }

    if (
      status ===
      'PARTIALLY_RECEIVED'
    ) {
      return 'bg-amber-100 text-amber-700'
    }

    if (
      status === 'CANCELLED'
    ) {
      return 'bg-red-100 text-red-700'
    }

    return 'bg-blue-100 text-blue-700'
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/purchasing"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Purchasing
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              {po.po_no}
            </h1>

            <p className="mt-2 text-zinc-500">
              Purchase Order Detail
            </p>

          </div>

          {canReceive && (
            <Link
              href={`/dashboard/purchasing/${po.id}/receive`}
              className="rounded-xl bg-red-900 px-6 py-3 font-semibold text-white hover:bg-red-800"
            >
              Receive Goods
            </Link>
          )}

        </div>

        {/* PO INFO */}

        <div className="mb-6 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Supplier
            </p>

            <p className="mt-2 font-bold">
              {supplier?.name || '-'}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {supplier?.code || ''}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Location
            </p>

            <p className="mt-2 font-bold">
              {outlet?.name || '-'}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              {outlet?.code || ''}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Order Date
            </p>

            <p className="mt-2 font-bold">
              {po.order_date}
            </p>

            <p className="mt-1 text-xs text-zinc-400">
              Expected: {po.expected_date || '-'}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Status
            </p>

            <div className="mt-3">

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                  po.status
                )}`}
              >
                {po.status}
              </span>

            </div>

          </div>

        </div>

        {/* VALUE SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-4">

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Ordered Value
            </p>

            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(
                orderedValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Received Value
            </p>

            <p className="mt-2 text-2xl font-bold text-green-700">
              {formatRupiah(
                receivedValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Outstanding Value
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-700">
              {formatRupiah(
                outstandingValue
              )}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <p className="text-sm text-zinc-500">
              Item Progress
            </p>

            <p className="mt-2 text-3xl font-bold">
              {completedLines}
              {' / '}
              {totalLines}
            </p>

          </div>

        </div>

        {/* PO ITEMS */}

        <div className="mb-8 overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Purchase Order Items
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Ordered, received and outstanding quantities
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Item
                  </th>

                  <th className="px-5 py-4 text-right">
                    Ordered
                  </th>

                  <th className="px-5 py-4 text-right">
                    Received
                  </th>

                  <th className="px-5 py-4 text-right">
                    Outstanding
                  </th>

                  <th className="px-5 py-4">
                    Unit
                  </th>

                  <th className="px-5 py-4 text-right">
                    Price
                  </th>

                  <th className="px-5 py-4 text-right">
                    Ordered Value
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(poItems || []).map(
                  (row) => {

                    const item =
                      itemMap.get(
                        row.item_id
                      )

                    const unit =
                      unitMap.get(
                        row.unit_id
                      )

                    const factor =
                      Number(
                        row.conversion_factor || 1
                      )

                    const ordered =
                      Number(
                        row.order_qty || 0
                      )

                    const received =
                      Number(
                        row.received_base_qty || 0
                      ) / factor

                    const outstanding =
                      Math.max(
                        ordered - received,
                        0
                      )

                    return (

                      <tr key={row.id}>

                        <td className="px-5 py-4">

                          <p className="font-medium">
                            {item?.name || '-'}
                          </p>

                          <p className="text-xs text-zinc-400">
                            {item?.sku || ''}
                          </p>

                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatNumber(
                            ordered
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold text-green-700">
                          {formatNumber(
                            received
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-bold text-amber-700">
                          {formatNumber(
                            outstanding
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {unit?.code || '-'}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {formatRupiah(
                            row.unit_price
                          )}
                        </td>

                        <td className="px-5 py-4 text-right font-semibold">
                          {formatRupiah(
                            row.total_amount
                          )}
                        </td>

                        <td className="px-5 py-4">

                          {outstanding <= 0 ? (

                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Complete
                            </span>

                          ) : received > 0 ? (

                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              Partial
                            </span>

                          ) : (

                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                              Open
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

        {/* RECEIVING HISTORY */}

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

          <div className="border-b border-zinc-200 px-6 py-5">

            <h2 className="font-bold">
              Receiving History
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Goods received against this Purchase Order
            </p>

          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-zinc-50 text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Receiving No
                  </th>

                  <th className="px-5 py-4">
                    Date
                  </th>

                  <th className="px-5 py-4">
                    Invoice
                  </th>

                  <th className="px-5 py-4 text-right">
                    Value
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-zinc-100">

                {(receivings || []).map(
                  (receiving) => (

                    <tr key={receiving.id}>

                      <td className="px-5 py-4 font-bold text-red-900">
                        {receiving.receiving_no}
                      </td>

                      <td className="px-5 py-4">
                        {receiving.receiving_date}
                      </td>

                      <td className="px-5 py-4">
                        {receiving.invoice_no || '-'}
                      </td>

                      <td className="px-5 py-4 text-right font-semibold">
                        {formatRupiah(
                          receiving.total_amount
                        )}
                      </td>

                      <td className="px-5 py-4">

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          {receiving.status}
                        </span>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>


            {!receivings?.length && (

              <div className="p-10 text-center text-sm text-zinc-500">
                No receiving transaction for this PO yet.
              </div>

            )}

          </div>

        </div>

      </div>

    </main>
  )
}
