import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import OutletFeatureClient
  from './OutletFeatureClient'


export default async function OutletFeaturesPage() {

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
    data:
      permissions,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )


  const outletPermission =
    (
      permissions ||
      []
    ).find(
      (row: any) =>
        row.module_code ===
        'OUTLETS'
    )


  if (
    !outletPermission
    ||
    !outletPermission.can_update
  ) {

    redirect(
      '/dashboard?denied=OUTLETS'
    )

  }


  const [
    outletsResult,
    profilesResult,
  ] =
    await Promise.all([

      supabase
        .from(
          'outlets_secure'
        )
        .select(`
          id,
          code,
          name,
          is_active
        `)
        .eq(
          'type',
          'OUTLET'
        )
        .eq(
          'is_active',
          true
        )
        .order(
          'name'
        ),

      supabase
        .from(
          'outlet_app_profiles_secure'
        )
        .select(`
          outlet_id,
          profile_code,
          waiter_mode_enabled
        `),

    ])


  return (

    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-900">

      <div className="mx-auto max-w-5xl">

        <Link
          href="/dashboard/outlets"
          className="text-sm font-semibold text-zinc-500"
        >
          ← Master Outlet
        </Link>


        <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-red-800">
          Restaurant Operations
        </p>


        <h1 className="mt-2 text-3xl font-black">
          Outlet Features
        </h1>


        <p className="mt-2 text-zinc-500">
          Enable operational modules per branch.
        </p>


        <OutletFeatureClient

          outlets={
            outletsResult.data ||
            []
          }

          profiles={
            profilesResult.data ||
            []
          }

        />

      </div>

    </main>

  )
}
