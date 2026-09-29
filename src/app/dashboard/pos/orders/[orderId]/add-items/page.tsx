import { redirect } from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import AddItemsClient from './AddItemsClient'


type Props = {
  params: Promise<{
    orderId: string
  }>
}


export default async function AddItemsPage({
  params,
}: Props) {

  const {
    orderId,
  } =
    await params


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
  } =
    await supabase
      .from(
        'restaurant_orders_secure'
      )
      .select(`
        id,
        order_no,
        outlet_id,
        outlet_code,
        outlet_name,
        table_code,
        table_name,
        status,
        payment_status,
        subtotal,
        grand_total
      `)
      .eq(
        'id',
        orderId
      )
      .maybeSingle()


  if (!order) {
    redirect(
      '/dashboard/pos/orders'
    )
  }


  if (
    order.payment_status ===
      'PAID' ||
    [
      'CANCELLED',
      'COMPLETED',
    ].includes(
      order.status
    )
  ) {
    redirect(
      '/dashboard/pos/orders'
    )
  }



  // =========================================================
  // SALES-ONLY OUTLET PROFILE
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
        inventory_enabled
      `)
      .eq(
        'outlet_id',
        order.outlet_id
      )
      .maybeSingle()


  const salesOnlyProfile =
    Boolean(
      appProfile &&
      appProfile.inventory_enabled ===
        false
    )


  const {
    data: menus,
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
        selling_price,
        image_url
      `)
      .eq(
        'is_active',
        true
      )
      .order(
        'name'
      )


  return (
    <AddItemsClient
      order={order}
      menus={menus || []}
          salesOnlyProfile={
        salesOnlyProfile
      }
    />
  )
}
