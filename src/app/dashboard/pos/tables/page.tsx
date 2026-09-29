import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import TableMasterClient from './TableMasterClient'


type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}


type PageProps = {
  searchParams: Promise<{
    outlet?: string
  }>
}


export default async function RestaurantTablesPage({
  searchParams,
}: PageProps) {

  const params =
    await searchParams

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
    data:
      permissionData,
  } =
    await supabase.rpc(
      'get_my_permissions'
    )


  const permissions =
    (permissionData ||
      []) as PermissionRow[]


  const outletPermission =
    permissions.find(
      (row) =>
        row.module_code ===
        'OUTLETS'
    )


  if (
    !outletPermission
      ?.can_view
  ) {

    redirect(
      '/dashboard?denied=OUTLETS'
    )
  }


  const [
    outletResult,
    tableResult,
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
          type,
          is_active
        `)
        .eq(
          'type',
          'OUTLET'
        )
        .order(
          'name'
        ),

      supabase
        .from(
          'restaurant_tables_secure'
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
          is_active
        `)
        .order(
          'code'
        ),

    ])


  const outlets =
    (
      outletResult.data ||
      []
    ).map(
      (row) => ({
        id:
          String(
            row.id
          ),

        code:
          String(
            row.code ||
            ''
          ),

        name:
          String(
            row.name ||
            ''
          ),

        is_active:
          Boolean(
            row.is_active
          ),
      })
    )


  const tables =
    (
      tableResult.data ||
      []
    ).map(
      (row) => ({
        id:
          String(
            row.id
          ),

        outlet_id:
          String(
            row.outlet_id
          ),

        code:
          String(
            row.code ||
            ''
          ),

        name:
          String(
            row.name ||
            ''
          ),

        capacity:
          Number(
            row.capacity ||
            0
          ),

        status:
          String(
            row.status ||
            ''
          ),

        is_active:
          Boolean(
            row.is_active
          ),
      })
    )


  const requestedOutletId =
    String(
      params.outlet ||
      ''
    )


  const initialOutletId =
    outlets.some(
      (outlet) =>
        outlet.id ===
        requestedOutletId
    )
      ? requestedOutletId
      : (
          outlets[0]
            ?.id ||
          ''
        )


  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/outlets"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Master Outlet
            </Link>


            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              RESTAURANT OPERATIONS
            </p>


            <h1 className="mt-2 text-3xl font-black">
              Master Tables
            </h1>


            <p className="mt-2 text-zinc-500">
              Multi-branch restaurant table management
            </p>

          </div>

        </div>


        {outletResult.error && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {
              outletResult
                .error
                .message
            }
          </div>

        )}


        {tableResult.error && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {
              tableResult
                .error
                .message
            }
          </div>

        )}


        <TableMasterClient
          outlets={
            outlets
          }
          initialTables={
            tables
          }
          initialOutletId={
            initialOutletId
          }
          canManage={
            Boolean(
              outletPermission
                ?.can_update
            )
          }
        />

      </div>

    </main>

  )
}
