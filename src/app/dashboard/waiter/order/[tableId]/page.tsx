import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import WaiterOrderClient
  from './WaiterOrderClient'


type Props = {
  params: Promise<{
    tableId: string
  }>
}


export default async function WaiterOrderPage({
  params,
}: Props) {

  const {
    tableId,
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


  // ========================================================
  // WAITER PERMISSION
  // ========================================================

  const {
    data:
      permissions,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )


  const waiterPermission =
    (
      permissions ||
      []
    ).find(
      (row: any) =>
        row.module_code ===
        'WAITER'
    )


  if (
    !waiterPermission
    ||
    !waiterPermission.can_view
  ) {

    redirect(
      '/dashboard?denied=WAITER'
    )

  }


  // ========================================================
  // TABLE
  // ========================================================

  const {
    data:
      table,
  } =
    await supabase
      .from(
        'waiter_table_map_secure'
      )
      .select(`
        id,
        outlet_id,
        outlet_code,
        outlet_name,

        code,
        name,
        capacity,

        status,

        active_order_id,
        active_order_no,
        active_order_status,
        active_payment_status,
        active_order_total,
        active_order_opened_at
      `)
      .eq(
        'id',
        tableId
      )
      .maybeSingle()


  if (!table) {

    redirect(
      '/dashboard/waiter'
    )

  }


  // ========================================================
  // MENU
  // ========================================================

  const {
    data:
      menus,
  } =
    await supabase
      .from(
        'waiter_menu_items_secure'
      )
      .select(`
        outlet_id,
        id,
        code,
        name,
        category,
        selling_price,
        image_url
      `)
      .eq(
        'outlet_id',
        table.outlet_id
      )
      .order(
        'name'
      )


  // ========================================================
  // EXISTING ACTIVE ORDER
  // ========================================================

  let order:
    any =
      null


  let existingItems:
    any[] =
      []


  if (
    table.active_order_id
  ) {

    const {
      data:
        orderRow,
    } =
      await supabase
        .from(
          'waiter_orders_secure'
        )
        .select(`
          id,
          order_no,

          outlet_id,

          table_id,
          table_code,
          table_name,

          source,
          status,
          payment_status,

          guest_name,
          notes,

          subtotal,
          grand_total,

          opened_at
        `)
        .eq(
          'id',
          table.active_order_id
        )
        .maybeSingle()


    order =
      orderRow


    if (orderRow) {

      const {
        data:
          itemRows,
      } =
        await supabase
          .from(
            'waiter_order_items_secure'
          )
          .select(`
            id,
            order_id,

            menu_item_id,
            menu_code,
            menu_name,

            quantity,
            unit_price,
            line_total,

            notes,
            status,
            round_no
          `)
          .eq(
            'order_id',
            orderRow.id
          )
          .eq(
            'status',
            'ACTIVE'
          )
          .order(
            'round_no'
          )


      existingItems =
        itemRows ||
        []

    }

  }


  return (

    <WaiterOrderClient

      table={
        table
      }

      order={
        order
      }

      existingItems={
        existingItems
      }

      menus={
        menus ||
        []
      }

    />

  )
}
