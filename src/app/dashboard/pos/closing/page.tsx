import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import CashierShiftClient from './CashierShiftClient'


export default async function CashierClosingPage() {

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
    data: profile,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        role_id,
        outlet_id,
        is_active
      `)
      .eq(
        'id',
        user.id
      )
      .maybeSingle()


  if (
    profile &&
    !profile.is_active
  ) {
    redirect('/dashboard')
  }


  // =====================================================
  // CURRENT ROLE
  // =====================================================

  let roleCode = ''

  if (profile?.role_id) {

    const {
      data: role,
    } =
      await supabase
        .from('roles')
        .select('code')
        .eq(
          'id',
          profile.role_id
        )
        .maybeSingle()


    roleCode =
      String(
        role?.code || ''
      ).toUpperCase()

  }



  const {
    data:
      outletRows,
  } =
    await supabase
      .from(
        'outlets_secure'
      )
      .select(`
        id,
        code,
        name,
        type,
        is_active
      `)
      .eq(
        'is_active',
        true
      )
      .eq(
        'type',
        'OUTLET'
      )
      .order(
        'name'
      )


  const outlets =
    outletRows || []


  const defaultOutletId =
    profile?.outlet_id ||
    outlets[0]?.id ||
    ''


  return (
    <CashierShiftClient
      outlets={
        outlets
      }
      defaultOutletId={
        defaultOutletId
      }
      cashierEmail={
        user.email ||
        'Cashier'
      }
      currentUserId={
        user.id
      }
      roleCode={
        roleCode
      }
    />
  )
}
