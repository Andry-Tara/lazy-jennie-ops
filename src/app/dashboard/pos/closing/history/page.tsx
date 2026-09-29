import {
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import ShiftHistoryClient from './ShiftHistoryClient'


export default async function ShiftHistoryPage() {

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
    data: outlets,
  } =
    await supabase
      .from(
        'outlets_secure'
      )
      .select(`
        id,
        code,
        name
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


  return (
    <ShiftHistoryClient
      outlets={
        outlets || []
      }
    />
  )
}
