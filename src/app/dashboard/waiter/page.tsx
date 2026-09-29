import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import WaiterTableMapClient
  from './WaiterTableMapClient'

import DashboardLogoutButton
  from '@/components/auth/DashboardLogoutButton'


export default async function WaiterPage() {

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
  // PROFILE
  // ========================================================

  const {
    data:
      profile,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        outlet_id,
        is_active
      `)
      .eq(
        'id',
        user.id
      )
      .single()


  if (
    profile &&
    !profile.is_active
  ) {
    redirect('/dashboard')
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
  // WAITER DATA
  // ========================================================

  const [
    outletResult,
    tableResult,
  ] =
    await Promise.all([

      supabase
        .from(
          'waiter_outlets_secure'
        )
        .select(`
          id,
          code,
          name
        `)
        .order(
          'name'
        ),

      supabase
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
          is_active,

          active_order_id,
          active_order_no,
          active_order_status,
          active_payment_status,
          active_order_total,
          active_order_opened_at,
          active_order_count
        `)
        .order(
          'code'
        ),

    ])


  return (

    <main className="min-h-screen bg-zinc-100 text-zinc-900">

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">


        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard"
              className="text-sm font-semibold text-zinc-500 hover:text-zinc-950"
            >
              ← Dashboard
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              Restaurant Operations
            </p>


            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Waiter Mode
            </h1>


            <p className="mt-2 text-sm text-zinc-500">
              Table service · order taking · kitchen workflow
            </p>

          </div>


          <div className="flex flex-wrap items-center gap-3">

            <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 shadow-sm">

              <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Signed In
              </p>

              <p className="mt-1 font-black">
                {
                  profile?.full_name ||
                  user.email ||
                  'Waiter'
                }
              </p>

            </div>

            <DashboardLogoutButton />

          </div>

        </div>


        <WaiterTableMapClient

          outlets={
            outletResult.data ||
            []
          }

          tables={
            tableResult.data ||
            []
          }

          assignedOutletId={
            profile?.outlet_id ||
            ''
          }

        />

      </div>

    </main>

  )
}
