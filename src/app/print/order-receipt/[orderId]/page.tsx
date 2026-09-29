import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import ReceiptPrintClient from './ReceiptPrintClient'


type Props = {
  params: Promise<{
    orderId: string
  }>

  searchParams: Promise<{
    autoprint?: string
  }>
}


export default async function OrderReceiptPage({
  params,
  searchParams,
}: Props) {

  const {
    orderId,
  } =
    await params


  const query =
    await searchParams


  const supabase =
    await createClient()


  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {
    redirect('/login')
  }


  const {
    data: receipt,
    error: receiptError,
  } =
    await supabase
      .from(
        'restaurant_order_receipt_secure'
      )
      .select('*')
      .eq(
        'order_id',
        orderId
      )
      .maybeSingle()


  if (
    receiptError ||
    !receipt
  ) {
    notFound()
  }


  const {
    data: itemRows,
    error: itemError,
  } =
    await supabase
      .from(
        'sale_items_secure'
      )
      .select(`
        id,
        sale_id,
        menu_item_id,
        menu_code,
        menu_name,
        quantity,
        unit_price,
        gross_amount,
        discount_amount,
        net_amount,
        notes,
        line_status,
        created_at
      `)
      .eq(
        'sale_id',
        receipt.sale_id
      )
      .eq(
        'line_status',
        'ACTIVE'
      )
      .order(
        'created_at',
        {
          ascending:
            true,
        }
      )


  if (itemError) {
    throw new Error(
      itemError.message
    )
  }


  return (
    <ReceiptPrintClient
      receipt={receipt}
      items={itemRows || []}
      autoPrint={
        query.autoprint ===
        '1'
      }
    />
  )
}
