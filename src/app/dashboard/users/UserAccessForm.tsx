'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'

type Role = {
  id: string
  code: string
  name: string
}

type Outlet = {
  id: string
  code: string
  name: string
  type: string
  is_active: boolean
}

type Props = {
  userId: string

  currentRoleId:
    string |
    null

  currentOutletId:
    string |
    null

  currentActive:
    boolean

  isCurrentUser:
    boolean

  roles:
    Role[]

  outlets:
    Outlet[]
}

export default function UserAccessForm({
  userId,
  currentRoleId,
  currentOutletId,
  currentActive,
  isCurrentUser,
  roles,
  outlets,
}: Props) {
  const router =
    useRouter()

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )

  const [
    roleId,
    setRoleId,
  ] =
    useState(
      currentRoleId ||
      ''
    )

  const [
    outletId,
    setOutletId,
  ] =
    useState(
      currentOutletId ||
      ''
    )

  const [
    isActive,
    setIsActive,
  ] =
    useState(
      currentActive
    )

  const [
    saving,
    setSaving,
  ] =
    useState(false)

  const [
    error,
    setError,
  ] =
    useState('')

  const [
    success,
    setSuccess,
  ] =
    useState('')

  const selectedRole =
    roles.find(
      (role) =>
        role.id ===
        roleId
    )

  const roleNeedsOutlet =
    selectedRole
      ? [
          'OUTLET_MANAGER',
          'CASHIER',
          'INVENTORY_STAFF',
          'CK_MANAGER',
          'CK_STAFF',
        ].includes(
          selectedRole.code
        )
      : false

  const isCKRole =
    selectedRole
      ? [
          'CK_MANAGER',
          'CK_STAFF',
        ].includes(
          selectedRole.code
        )
      : false

  const visibleOutlets =
    isCKRole
      ? outlets.filter(
          (outlet) =>
            outlet.type ===
            'CENTRAL_KITCHEN'
        )
      : outlets

  // =====================================================
  // ROLE CHANGE
  // =====================================================

  function handleRoleChange(
    value: string
  ) {
    setRoleId(value)

    const nextRole =
      roles.find(
        (role) =>
          role.id ===
          value
      )

    if (
      nextRole &&
      [
        'SUPER_ADMIN',
        'MANAGEMENT',
        'FINANCE',
        'PURCHASING',
      ].includes(
        nextRole.code
      )
    ) {
      setOutletId('')
    }

    if (
      nextRole &&
      [
        'CK_MANAGER',
        'CK_STAFF',
      ].includes(
        nextRole.code
      )
    ) {
      const centralKitchen =
        outlets.find(
          (outlet) =>
            outlet.type ===
            'CENTRAL_KITCHEN'
        )

      setOutletId(
        centralKitchen?.id ||
        ''
      )
    }
  }

  // =====================================================
  // SAVE
  // =====================================================

  async function saveAccess() {
    setError('')
    setSuccess('')

    if (!roleId) {
      setError(
        'Role wajib dipilih.'
      )

      return
    }

    if (
      roleNeedsOutlet &&
      !outletId
    ) {
      setError(
        'Role ini wajib memiliki outlet/location.'
      )

      return
    }

    setSaving(true)

    try {
      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'update_user_access',
          {
            p_user_id:
              userId,

            p_role_id:
              roleId,

            p_outlet_id:
              outletId ||
              null,

            p_is_active:
              isActive,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      setSuccess(
        'Access updated.'
      )

      router.refresh()
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to update access.'

      setError(
        message
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>

      <div className="grid gap-4 md:grid-cols-3">

        {/* ROLE */}

        <div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Role
          </label>

          <select
            value={
              roleId
            }
            onChange={
              (event) =>
                handleRoleChange(
                  event.target.value
                )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
          >

            <option value="">
              Select Role
            </option>

            {roles.map(
              (role) => (

                <option
                  key={
                    role.id
                  }
                  value={
                    role.id
                  }
                >
                  {role.name}
                  {' ('}
                  {role.code}
                  {')'}
                </option>

              )
            )}

          </select>

        </div>

        {/* OUTLET */}

        <div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Outlet / Location
          </label>

          <select
            value={
              outletId
            }
            onChange={
              (event) =>
                setOutletId(
                  event.target.value
                )
            }
            disabled={
              !roleNeedsOutlet
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm disabled:bg-zinc-100 disabled:text-zinc-400"
          >

            <option value="">
              {roleNeedsOutlet
                ? 'Select Location'
                : 'All Locations'}
            </option>

            {visibleOutlets.map(
              (outlet) => (

                <option
                  key={
                    outlet.id
                  }
                  value={
                    outlet.id
                  }
                >
                  {outlet.code}
                  {' - '}
                  {outlet.name}
                </option>

              )
            )}

          </select>

        </div>

        {/* STATUS */}

        <div>

          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-400">
            Account Status
          </label>

          <select
            value={
              isActive
                ? 'ACTIVE'
                : 'INACTIVE'
            }
            onChange={
              (event) =>
                setIsActive(
                  event.target.value ===
                  'ACTIVE'
                )
            }
            className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm"
          >

            <option value="ACTIVE">
              Active
            </option>

            <option value="INACTIVE">
              Inactive
            </option>

          </select>

        </div>

      </div>

      {isCurrentUser && (

        <p className="mt-3 text-xs text-amber-700">
          This is your currently logged-in account.
        </p>

      )}

      {error && (

        <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-red-700">
          {error}
        </div>

      )}

      {success && (

        <div className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-medium text-green-700">
          {success}
        </div>

      )}

      <div className="mt-4 flex justify-end">

        <button
          type="button"
          onClick={
            saveAccess
          }
          disabled={
            saving
          }
          className="rounded-xl bg-red-900 px-5 py-3 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : 'Save Access'}
        </button>

      </div>

    </div>
  )
}
