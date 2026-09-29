import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import BillPrintClient from './BillPrintClient'


type Props = {
  params: Promise<{
    orderId: string
  }>

  searchParams: Promise<{
    autoprint?: string
  }>
}


type BillItem = {
  id: string
  order_id: string

  menu_item_id:
    string | null

  menu_code:
    string | null

  menu_name: string

  quantity:
    number | string

  unit_price:
    number | string

  line_total:
    number | string

  notes:
    string | null

  status: string

  round_no:
    number | string

  created_at: string
}


export default async function OrderBillPage({
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
    data: order,
    error: orderError,
  } =
    await supabase
      .from(
        'restaurant_order_bill_secure'
      )
      .select('*')
      .eq(
        'id',
        orderId
      )
      .maybeSingle()


  if (
    orderError ||
    !order
  ) {
    notFound()
  }


  const {
    data: itemRows,
    error: itemError,
  } =
    await supabase
      .from(
        'restaurant_order_bill_items_secure'
      )
      .select('*')
      .eq(
        'order_id',
        orderId
      )
      .eq(
        'status',
        'ACTIVE'
      )
      .order(
        'round_no',
        {
          ascending: true,
        }
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )


  if (itemError) {
    throw new Error(
      itemError.message
    )
  }


  const items =
    (
      itemRows ||
      []
    ) as BillItem[]


  return (
    <BillPrintClient
      order={order}
      items={items}
      autoPrint={
        query.autoprint ===
        '1'
      }
    />
  )
}
