import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import DashboardLogoutButton
  from '@/components/auth/DashboardLogoutButton'

import KitchenDisplayClient
  from './kitchen-display-client'
import { getRuntimeModuleOutlets } from '@/lib/saas/runtime-module-access'


export default async function KitchenPage() {

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
        outlet_id,
        role_id,
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
  // KITCHEN PERMISSION
  // ========================================================

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


  const kitchenPermission =
    (
      permissions ||
      []
    ).find(
      (row: any) =>
        row.module_code ===
        'KITCHEN'
    )


  if (
    !kitchenPermission ||
    !kitchenPermission.can_view
  ) {

    redirect(
      '/dashboard?denied=KITCHEN'
    )

  }


  const kitchenRuntime =
    await getRuntimeModuleOutlets(
      supabase,
      'KITCHEN'
    )

  const kitchenAllowedOutletIds =
    kitchenRuntime.allowedOutletIds

  if (
    profile?.outlet_id &&
    !kitchenAllowedOutletIds.includes(
      profile.outlet_id
    )
  ) {
    redirect(
      '/dashboard?denied=KITCHEN'
    )
  }

  if (
    !profile?.outlet_id &&
    kitchenAllowedOutletIds.length === 0
  ) {
    redirect(
      '/dashboard?denied=KITCHEN'
    )
  }


  // ========================================================
  // OUTLET KDS FEATURE
  //
  // Assigned outlet users can only enter when kds_enabled.
  // Global roles are handled by their normal secure scope.
  // ========================================================

  if (
    profile?.outlet_id
  ) {

    const {
      data:
        appProfile,
    } =
      await supabase
        .from(
          'outlet_app_profiles_secure'
        )
        .select(`
          kds_enabled
        `)
        .eq(
          'outlet_id',
          profile.outlet_id
        )
        .maybeSingle()


    if (
      !appProfile?.kds_enabled
    ) {

      redirect(
        '/dashboard?denied=KITCHEN'
      )

    }

  }


  const canOpenOrders =
    currentRole?.code !==
      'KITCHEN_STAFF'
    &&
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


  return (

    <>

      <div className="fixed right-5 top-5 z-[200]">
        <DashboardLogoutButton />
      </div>

      <KitchenDisplayClient
        canOpenOrders={
          canOpenOrders
        }
      />

    </>

  )
}
