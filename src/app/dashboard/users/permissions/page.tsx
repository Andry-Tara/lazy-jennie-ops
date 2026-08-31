import { createClient } from '@/lib/supabase/server'

import { redirect } from 'next/navigation'

import Link from 'next/link'

import RolePermissionEditor
  from './RolePermissionEditor'


export default async function RolePermissionsPage() {

  const supabase =
    await createClient()


  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: {
      user,
    },
  } =
    await supabase.auth.getUser()


  if (!user) {
    redirect('/login')
  }


  // =====================================================
  // CURRENT USER
  // =====================================================

  const {
    data: profile,
  } =
    await supabase
      .from('profiles')
      .select(`
        id,
        role_id
      `)
      .eq(
        'id',
        user.id
      )
      .single()


  if (!profile?.role_id) {
    redirect('/dashboard')
  }


  const {
    data: currentRole,
  } =
    await supabase
      .from('roles')
      .select(`
        code
      `)
      .eq(
        'id',
        profile.role_id
      )
      .single()


  if (
    currentRole?.code !==
    'SUPER_ADMIN'
  ) {
    redirect('/dashboard')
  }


  // =====================================================
  // ROLES
  // =====================================================

  const {
    data: roles,
    error: rolesError,
  } =
    await supabase
      .from('roles')
      .select(`
        id,
        code,
        name
      `)
      .order('name')


  // =====================================================
  // CURRENT MATRIX
  // =====================================================

  const {
    data: permissions,
    error: permissionsError,
  } =
    await supabase
      .from(
        'role_module_permissions'
      )
      .select(`
        role_id,
        module_code,
        can_view,
        can_create,
        can_update,
        can_post,
        can_approve
      `)


  return (

    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">

      <div className="mx-auto max-w-7xl">


        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard/users"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Users & Access
            </Link>


            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>


            <h1 className="mt-2 text-3xl font-bold">
              Role Permissions
            </h1>


            <p className="mt-2 text-zinc-500">
              Module & Action Permission Matrix
            </p>

          </div>


          <div className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white">
            Super Admin Only
          </div>

        </div>


        {/* INFO */}

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">

          <p className="font-bold text-amber-900">
            Permission Control
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            Changes here affect dashboard visibility and module access.
            Sensitive database operations may also have additional security
            rules such as outlet scope and manager approval.
          </p>

        </div>


        {(rolesError ||
          permissionsError) && (

          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">

            {rolesError?.message ||
              permissionsError?.message}

          </div>

        )}


        <RolePermissionEditor

          roles={
            roles || []
          }

          initialPermissions={
            permissions || []
          }

        />


      </div>

    </main>

  )

}
