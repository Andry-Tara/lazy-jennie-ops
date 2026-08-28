import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import POReceivingForm from './POReceivingForm'

type PageProps = {
  params: Promise<{
    id: string
  }>
}

export default async function ReceivePurchaseOrderPage({
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
    data: purchaseOrder,
    error: poError,
  } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_no,
      order_date,
      expected_date,
      outlet_id,
      supplier_id,
      status,
      total_amount,
      notes
    `)
    .eq('id', id)
    .single()

  if (poError || !purchaseOrder) {
    notFound()
  }

  // =====================================================
  // PO ITEMS
  // =====================================================

  const { data: poItems } = await supabase
    .from('purchase_order_items')
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
    .from('suppliers')
    .select(`
      id,
      code,
      name
    `)
    .eq('id', purchaseOrder.supplier_id)
    .single()

  // =====================================================
  // OUTLET
  // =====================================================

  const { data: outlet } = await supabase
    .from('outlets')
    .select(`
      id,
      code,
      name
    `)
    .eq('id', purchaseOrder.outlet_id)
    .single()

  // =====================================================
  // ITEMS
  // =====================================================

  const itemIds = (poItems || []).map(
    (row) => row.item_id
  )

  let items: {
    id: string
    sku: string
    name: string
    track_batch: boolean
    track_expiry: boolean
  }[] = []

  if (itemIds.length > 0) {
    const { data } = await supabase
      .from('items')
      .select(`
        id,
        sku,
        name,
        track_batch,
        track_expiry
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
    symbol: string
  }[] = []

  if (unitIds.length > 0) {
    const { data } = await supabase
      .from('units')
      .select(`
        id,
        code,
        name,
        symbol
      `)
      .in('id', unitIds)

    units = data || []
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        <Link
          href="/dashboard/purchasing"
          className="text-sm text-zinc-500 hover:text-red-800"
        >
          ← Purchasing
        </Link>

        <div className="mt-6">

          <p className="text-sm font-bold tracking-wider text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Receive Purchase Order
          </h1>

          <p className="mt-2 text-zinc-500">
            Receive supplier goods against Purchase Order.
          </p>

        </div>

        <POReceivingForm
          purchaseOrder={purchaseOrder}
          poItems={poItems || []}
          supplier={supplier}
          outlet={outlet}
          items={items}
          units={units}
        />

      </div>
    </main>
  )
}
