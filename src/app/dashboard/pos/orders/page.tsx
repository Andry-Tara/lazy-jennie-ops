import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OrdersClient from './OrdersClient'


export default async function OrdersPage() {

  const supabase =
    await createClient()


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


  // ========================================================
  // POS ORDERS ACCESS
  //
  // Kitchen / Waiter users must not gain access simply by
  // entering the URL manually.
  // ========================================================

  const {
    data:
      profile,
  } =
    await supabase
      .from('profiles')
      .select('role_id')
      .eq(
        'id',
        user.id
      )
      .maybeSingle()


  const {
    data:
      currentRole,
  } =
    profile?.role_id

      ? await supabase
          .from('roles')
          .select('code')
          .eq(
            'id',
            profile.role_id
          )
          .maybeSingle()

      : {
          data: null,
        }



  const {
    data:
      permissions,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )


  const canViewPos =
    (
      permissions ||
      []
    ).some(
      (row: any) =>
        row.module_code ===
          'POS'
        &&
        row.can_view ===
          true
    )


  if (
    currentRole?.code ===
      'KITCHEN_STAFF'
    ||
    !canViewPos
  ) {

    redirect(
      '/dashboard'
    )

  }


  const {
    data:
      printerRows,
  } =
    await supabase
      .from(
        'pos_printer_settings_secure'
      )
      .select(`
        outlet_id,
        printer_role,
        device_name,
        connection_type,
        device_identifier,
        paper_width_mm,
        auto_print_after_payment,
        is_active
      `)
      .eq(
        'printer_role',
        'RECEIPT'
      )


  const printerSettings =
    (
      printerRows ||
      []
    ).map(
      (row) => ({

        outlet_id:
          String(
            row.outlet_id
          ),

        printer_role:
          String(
            row.printer_role ||
            ''
          ),

        device_name:
          row.device_name
            ? String(
                row.device_name
              )
            : null,

        connection_type:
          String(
            row.connection_type ||
            'BROWSER'
          ),

        device_identifier:
          row.device_identifier
            ? String(
                row.device_identifier
              )
            : null,


        paper_width_mm:
          Number(
            row.paper_width_mm ||
            80
          ),

        auto_print_after_payment:
          Boolean(
            row.auto_print_after_payment
          ),

        is_active:
          Boolean(
            row.is_active
          ),

      })
    )


  return (
    <OrdersClient
      printerSettings={
        printerSettings
      }
    />
  )
}
