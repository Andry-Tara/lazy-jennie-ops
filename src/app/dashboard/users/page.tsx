import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

import UserAccessForm from './UserAccessForm'

type PermissionRow = {
  module_code: string
  can_view: boolean
  can_create: boolean
  can_update: boolean
  can_post: boolean
  can_approve: boolean
}

type RoleRow = {
  id: string
  code: string
  name: string
}

type OutletRow = {
  id: string
  code: string
  name: string
  type: string
  is_active: boolean
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  role_id: string | null
  outlet_id: string | null
  is_active: boolean
}

export default async function UsersPage() {
  const supabase = await createClient()

  // =====================================================
  // AUTH
  // =====================================================

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // =====================================================
  // PERMISSION
  // =====================================================

  const {
    data: permissionData,
    error: permissionError,
  } = await supabase.rpc('get_my_permissions')

  const permissions = (permissionData || []) as PermissionRow[]

  const usersPermission = permissions.find(
    (row) => row.module_code === 'USERS'
  )

  if (
    permissionError ||
    !usersPermission?.can_view
  ) {
    redirect('/dashboard?denied=USERS')
  }

  // =====================================================
  // DATA
  // =====================================================

  const [
    rolesResult,
    outletsResult,
    profilesResult,
  ] = await Promise.all([
    supabase
      .from('roles')
      .select(`
        id,
        code,
        name
      `)
      .order('name'),

    supabase
      .from('outlets_secure')
      .select(`
        id,
        code,
        name,
        type,
        is_active
      `)
      .order('name'),

    supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        email,
        role_id,
        outlet_id,
        is_active
      `)
      .order('full_name'),
  ])

  const roles = (rolesResult.data || []) as RoleRow[]
  const outlets = (outletsResult.data || []) as OutletRow[]
  const profiles = (profilesResult.data || []) as ProfileRow[]

  const roleById = new Map(
    roles.map((role) => [role.id, role])
  )

  const outletById = new Map(
    outlets.map((outlet) => [outlet.id, outlet])
  )

  const pageError =
    rolesResult.error?.message ||
    outletsResult.error?.message ||
    profilesResult.error?.message ||
    ''

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-zinc-100 p-8 text-zinc-900">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="text-sm text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>

            <p className="mt-5 text-sm font-bold tracking-wider text-red-800">
              LAZY JENNIE
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Users & Access
            </h1>

            <p className="mt-2 text-zinc-500">
              User Role, Location & Account Access Management
            </p>
          </div>

          <Link
            href="/dashboard/users/permissions"
            className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-zinc-800"
          >
            Role Permissions
          </Link>
        </div>

        {/* INFO */}

        <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="font-bold text-amber-900">
            User creation
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-800">
            New login accounts are created in Supabase Authentication.
            Use this page to assign role, outlet/location and active status
            after the account exists.
          </p>
        </div>

        {pageError && (
          <div className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">
            {pageError}
          </div>
        )}

        {/* SUMMARY */}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Users
            </p>
            <p className="mt-2 text-3xl font-bold">
              {profiles.length}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Active
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {
                profiles.filter(
                  (profile) => profile.is_active
                ).length
              }
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-sm text-zinc-500">
              Inactive
            </p>
            <p className="mt-2 text-3xl font-bold text-zinc-500">
              {
                profiles.filter(
                  (profile) => !profile.is_active
                ).length
              }
            </p>
          </div>
        </div>

        {/* USERS */}

        <div className="space-y-5">
          {profiles.map((profile) => {
            const role = profile.role_id
              ? roleById.get(profile.role_id)
              : undefined

            const outlet = profile.outlet_id
              ? outletById.get(profile.outlet_id)
              : undefined

            return (
              <section
                key={profile.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold">
                      {profile.full_name?.trim() || 'Unnamed User'}
                    </h2>

                    <p className="mt-1 text-sm text-zinc-500">
                      {profile.email || profile.id}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                        {role
                          ? `${role.name} (${role.code})`
                          : 'No Role'}
                      </span>

                      <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                        {outlet
                          ? `${outlet.code} - ${outlet.name}`
                          : 'All Locations'}
                      </span>

                      {profile.is_active ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                          INACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {profile.id === user.id && (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      Current User
                    </span>
                  )}
                </div>

                <div className="border-t border-zinc-100 pt-6">
                  <UserAccessForm
                    userId={profile.id}
                    currentRoleId={profile.role_id}
                    currentOutletId={profile.outlet_id}
                    currentActive={profile.is_active}
                    isCurrentUser={profile.id === user.id}
                    roles={roles}
                    outlets={outlets}
                  />
                </div>
              </section>
            )
          })}
        </div>

        {!profiles.length && !pageError && (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">
            <p className="font-bold">
              No Users
            </p>

            <p className="mt-2 text-sm text-zinc-500">
              No user profiles are currently available.
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
