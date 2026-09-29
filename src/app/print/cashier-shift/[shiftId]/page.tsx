import {
  notFound,
  redirect,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/server'

import ShiftPrintClient from './ShiftPrintClient'


type Props = {
  params: Promise<{
    shiftId: string
  }>

  searchParams: Promise<{
    format?: string
    autoprint?: string
  }>
}


export default async function ShiftPrintPage({
  params,
  searchParams,
}: Props) {

  const {
    shiftId,
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
    data: shift,
  } =
    await supabase
      .from(
        'cashier_shifts_secure'
      )
      .select('*')
      .eq(
        'id',
        shiftId
      )
      .maybeSingle()


  if (!shift) {
    notFound()
  }


  const {
    data: transactions,
  } =
    await supabase
      .from(
        'cashier_shift_transactions_secure'
      )
      .select('*')
      .eq(
        'shift_id',
        shiftId
      )
      .order(
        'posted_at',
        {
          ascending: true,
        }
      )


  const {
    data: movements,
  } =
    await supabase
      .from(
        'cashier_cash_movements_secure'
      )
      .select('*')
      .eq(
        'shift_id',
        shiftId
      )
      .order(
        'created_at',
        {
          ascending: true,
        }
      )


  return (
    <ShiftPrintClient
      shift={
        shift
      }
      transactions={
        transactions || []
      }
      movements={
        movements || []
      }
      format={
        query.format ===
        'a4'
          ? 'a4'
          : '80'
      }
      autoPrint={
        query.autoprint ===
        '1'
      }
      generatedAt={
        new Date().toISOString()
      }
    />
  )
}
