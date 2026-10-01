import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import PrinterSettingsClient from './PrinterSettingsClient'


export default async function PrinterSettingsPage() {

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


  const {
    data: profile,
  } =
    await supabase
      .from('profiles')
      .select(`
        role_id,
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


  let roleCode = ''


  if (
    profile?.role_id
  ) {

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
        .single()


    roleCode =
      role?.code ||
      ''

  }


  const canManage =
    [
      'SUPER_ADMIN',
      'MANAGEMENT',
      'OUTLET_MANAGER',
    ].includes(
      roleCode
    )


  if (!canManage) {
    redirect('/dashboard/pos')
  }


  const [
    outletResult,
    settingResult,
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
          type
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
        ),

      supabase
        .from(
          'pos_printer_settings_secure'
        )
        .select(`
          id,
          outlet_id,
          outlet_code,
          outlet_name,
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
        ),

    ])


  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-5xl">


        <div className="flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/pos/settings"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← POS Settings
            </Link>


            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              RESTAURANT OPERATIONS
            </p>


            <h1 className="mt-2 text-3xl font-black">
              Printer Settings
            </h1>


            <p className="mt-2 text-zinc-500">
              Receipt printer configuration per branch
            </p>

          </div>


          <Link
            href="/dashboard/pos/orders"
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold"
          >
            Open Orders
          </Link>

          <Link
            href="/dashboard/pos/settings/printers/bluetooth-test"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Bluetooth Printer Test
          </Link>

        </div>


        <PrinterSettingsClient

          roleCode={
            roleCode
          }

          assignedOutletId={
            profile?.outlet_id ||
            ''
          }

          outlets={
            outletResult.data ||
            []
          }

          settings={
            settingResult.data ||
            []
          }

        />

      </div>

    </main>

  )
}
