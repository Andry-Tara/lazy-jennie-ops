'use client'


import {
  useMemo,
  useState,
} from 'react'


import {
  createClient,
} from '@/lib/supabase/client'


type Role = {
  id: string
  code: string
  name: string
}


type Permission = {

  role_id: string

  module_code: string

  can_view: boolean

  can_create: boolean

  can_update: boolean

  can_post: boolean

  can_approve: boolean

}


type PermissionState = {

  module_code: string

  can_view: boolean

  can_create: boolean

  can_update: boolean

  can_post: boolean

  can_approve: boolean

}


type Props = {

  roles:
    Role[]

  initialPermissions:
    Permission[]

}


type ActionKey =
  | 'can_view'
  | 'can_create'
  | 'can_update'
  | 'can_post'
  | 'can_approve'


const MODULES = [

  {
    code: 'POS',
    name: 'Point of Sale',
    section: 'Sales',
    actions: [
      'can_view',
      'can_create',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'SALES_HISTORY',
    name: 'Sales History',
    section: 'Sales',
    actions: [
      'can_view',
    ],
  },

  {
    code: 'SALES_REPORT',
    name: 'Management Sales Report',
    section: 'Sales',
    actions: [
      'can_view',
    ],
  },

  {
    code: 'INVENTORY',
    name: 'Inventory',
    section: 'Inventory',
    actions: [
      'can_view',
    ],
  },

  {
    code: 'INVENTORY_VALUATION',
    name: 'Inventory Valuation',
    section: 'Inventory',
    actions: [
      'can_view',
    ],
  },

  {
    code: 'RECEIVING',
    name: 'Receiving',
    section: 'Operations',
    actions: [
      'can_view',
      'can_create',
      'can_update',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'PURCHASING',
    name: 'Purchasing',
    section: 'Operations',
    actions: [
      'can_view',
      'can_create',
      'can_update',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'PRODUCTION',
    name: 'Production',
    section: 'Operations',
    actions: [
      'can_view',
      'can_create',
      'can_update',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'STOCK_TRANSFER',
    name: 'Stock Transfer',
    section: 'Operations',
    actions: [
      'can_view',
      'can_create',
      'can_update',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'STOCK_OPNAME',
    name: 'Stock Opname',
    section: 'Operations',
    actions: [
      'can_view',
      'can_create',
      'can_update',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'WASTE',
    name: 'Waste Management',
    section: 'Operations',
    actions: [
      'can_view',
      'can_create',
      'can_update',
      'can_post',
      'can_approve',
    ],
  },

  {
    code: 'MASTER_ITEM',
    name: 'Master Item',
    section: 'Master Data',
    actions: [
      'can_view',
      'can_create',
      'can_update',
    ],
  },

  {
    code: 'MASTER_RECIPE',
    name: 'Master Recipe',
    section: 'Master Data',
    actions: [
      'can_view',
      'can_create',
      'can_update',
    ],
  },

  {
    code: 'MENU_MASTER',
    name: 'Menu Master',
    section: 'Master Data',
    actions: [
      'can_view',
      'can_create',
      'can_update',
    ],
  },

  {
    code: 'SUPPLIERS',
    name: 'Suppliers',
    section: 'Master Data',
    actions: [
      'can_view',
      'can_create',
      'can_update',
    ],
  },

  {
    code: 'OUTLETS',
    name: 'Master Outlet',
    section: 'Master Data',
    actions: [
      'can_view',
      'can_create',
      'can_update',
    ],
  },

  {
    code: 'COSTING',
    name: 'COGS & Costing',
    section: 'Management',
    actions: [
      'can_view',
    ],
  },

  {
    code: 'USERS',
    name: 'Users & Access',
    section: 'Administration',
    actions: [
      'can_view',
      'can_update',
    ],
  },

] as const


const ACTION_LABELS: Record<
  ActionKey,
  string
> = {

  can_view:
    'View',

  can_create:
    'Create',

  can_update:
    'Update',

  can_post:
    'Post',

  can_approve:
    'Approve',

}


export default function RolePermissionEditor({

  roles,

  initialPermissions,

}: Props) {

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  const editableRoles =
    roles.filter(
      (role) =>
        role.code !==
        'SUPER_ADMIN'
    )


  const initialRoleId =
    editableRoles[0]?.id ||
    roles[0]?.id ||
    ''


  const [
    roleId,
    setRoleId,
  ] =
    useState(
      initialRoleId
    )


  const [
    permissionRows,
    setPermissionRows,
  ] =
    useState<
      Permission[]
    >(
      initialPermissions
    )


  const [
    editingRows,
    setEditingRows,
  ] =
    useState<
      PermissionState[]
    >(
      buildRoleState(
        initialRoleId,
        initialPermissions
      )
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


  const isSuperAdmin =
    selectedRole?.code ===
    'SUPER_ADMIN'


  // =====================================================
  // BUILD ROLE STATE
  // =====================================================

  function buildRoleState(

    selectedRoleId:
      string,

    sourcePermissions:
      Permission[]

  ): PermissionState[] {

    return MODULES.map(
      (module) => {

        const current =
          sourcePermissions.find(
            (permission) =>

              permission.role_id ===
                selectedRoleId &&

              permission.module_code ===
                module.code

          )


        const superAdmin =
          roles.find(
            (role) =>
              role.id ===
              selectedRoleId
          )?.code ===
          'SUPER_ADMIN'


        return {

          module_code:
            module.code,

          can_view:
            superAdmin
              ? true
              : Boolean(
                  current?.can_view
                ),

          can_create:
            superAdmin
              ? true
              : Boolean(
                  current?.can_create
                ),

          can_update:
            superAdmin
              ? true
              : Boolean(
                  current?.can_update
                ),

          can_post:
            superAdmin
              ? true
              : Boolean(
                  current?.can_post
                ),

          can_approve:
            superAdmin
              ? true
              : Boolean(
                  current?.can_approve
                ),

        }

      }
    )

  }


  // =====================================================
  // ROLE CHANGE
  // =====================================================

  function changeRole(
    nextRoleId: string
  ) {

    setRoleId(
      nextRoleId
    )


    setEditingRows(
      buildRoleState(
        nextRoleId,
        permissionRows
      )
    )


    setError('')
    setSuccess('')

  }


  // =====================================================
  // TOGGLE
  // =====================================================

  function togglePermission(

    moduleCode:
      string,

    action:
      ActionKey

  ) {

    if (
      isSuperAdmin
    ) {
      return
    }


    if (
      moduleCode ===
      'USERS'
    ) {
      return
    }


    setEditingRows(
      (current) =>
        current.map(
          (row) => {

            if (
              row.module_code !==
              moduleCode
            ) {
              return row
            }


            const nextValue =
              !row[action]


            const updated = {
              ...row,
              [action]:
                nextValue,
            }


            if (
              action !==
                'can_view' &&
              nextValue
            ) {
              updated.can_view =
                true
            }


            if (
              action ===
                'can_view' &&
              !nextValue
            ) {

              updated.can_create =
                false

              updated.can_update =
                false

              updated.can_post =
                false

              updated.can_approve =
                false

            }


            return updated

          }
        )
    )

  }


  // =====================================================
  // RESET
  // =====================================================

  function resetRole() {

    setEditingRows(
      buildRoleState(
        roleId,
        permissionRows
      )
    )

    setError('')
    setSuccess('')

  }


  // =====================================================
  // SAVE
  // =====================================================

  async function savePermissions() {

    if (
      !roleId ||
      isSuperAdmin
    ) {
      return
    }


    setSaving(true)
    setError('')
    setSuccess('')


    try {

      const payload =
        editingRows.map(
          (row) => ({
            module_code:
              row.module_code,

            can_view:
              row.can_view,

            can_create:
              row.can_create,

            can_update:
              row.can_update,

            can_post:
              row.can_post,

            can_approve:
              row.can_approve,
          })
        )


      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'update_role_permissions',
          {
            p_role_id:
              roleId,

            p_permissions:
              payload,
          }
        )


      if (
        rpcError
      ) {
        throw rpcError
      }


      const updatedPermissions =
        permissionRows.filter(
          (row) =>
            row.role_id !==
            roleId
        )


      for (
        const row of
          editingRows
      ) {

        updatedPermissions.push({

          role_id:
            roleId,

          module_code:
            row.module_code,

          can_view:
            row.can_view,

          can_create:
            row.can_create,

          can_update:
            row.can_update,

          can_post:
            row.can_post,

          can_approve:
            row.can_approve,

        })

      }


      setPermissionRows(
        updatedPermissions
      )


      setSuccess(
        'Role permissions updated.'
      )


    } catch (
      err
    ) {

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to update role permissions.'
      )


    } finally {

      setSaving(false)

    }

  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="space-y-6">


      {/* ROLE SELECT */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="grid gap-5 md:grid-cols-[1fr_2fr]">

          <div>

            <label className="mb-2 block text-sm font-bold">
              Role
            </label>

            <select
              value={
                roleId
              }
              onChange={
                (event) =>
                  changeRole(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            >

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


          <div className="flex items-end">

            {isSuperAdmin ? (

              <div className="w-full rounded-xl bg-green-50 p-4 text-sm text-green-800">

                <span className="font-bold">
                  SUPER_ADMIN
                </span>

                {' '}
                has permanent full access and cannot be modified.

              </div>

            ) : (

              <div className="w-full rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">

                Editing permissions for{' '}

                <span className="font-bold">
                  {selectedRole?.name}
                </span>

              </div>

            )}

          </div>

        </div>

      </div>


      {/* MATRIX */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="border-b border-zinc-200 px-6 py-5">

          <h2 className="font-bold">
            Permission Matrix
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Uncheck View to remove the module completely from the role.
          </p>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full text-left text-sm">

            <thead className="bg-zinc-50 text-zinc-500">

              <tr>

                <th className="px-5 py-4">
                  Module
                </th>

                <th className="px-5 py-4">
                  Section
                </th>

                <th className="px-5 py-4 text-center">
                  View
                </th>

                <th className="px-5 py-4 text-center">
                  Create
                </th>

                <th className="px-5 py-4 text-center">
                  Update
                </th>

                <th className="px-5 py-4 text-center">
                  Post
                </th>

                <th className="px-5 py-4 text-center">
                  Approve
                </th>

              </tr>

            </thead>


            <tbody className="divide-y divide-zinc-100">

              {MODULES.map(
                (module) => {

                  const row =
                    editingRows.find(
                      (permission) =>
                        permission.module_code ===
                        module.code
                    )


                  if (!row) {
                    return null
                  }


                  const usersLocked =
                    module.code ===
                    'USERS' &&
                    !isSuperAdmin


                  return (

                    <tr
                      key={
                        module.code
                      }
                      className="hover:bg-zinc-50"
                    >

                      <td className="px-5 py-4">

                        <p className="font-bold">
                          {module.name}
                        </p>

                        <p className="mt-1 text-xs text-zinc-400">
                          {module.code}
                        </p>

                        {usersLocked && (

                          <p className="mt-2 text-xs font-semibold text-red-700">
                            Super Admin only
                          </p>

                        )}

                      </td>


                      <td className="px-5 py-4 text-zinc-500">
                        {module.section}
                      </td>


                      {(
                        [
                          'can_view',
                          'can_create',
                          'can_update',
                          'can_post',
                          'can_approve',
                        ] as ActionKey[]
                      ).map(
                        (action) => {

                          const actionAllowed =
                            module.actions.includes(
                              action as never
                            )


                          if (
                            !actionAllowed
                          ) {

                            return (

                              <td
                                key={
                                  action
                                }
                                className="px-5 py-4 text-center text-zinc-300"
                              >
                                —
                              </td>

                            )

                          }


                          return (

                            <td
                              key={
                                action
                              }
                              className="px-5 py-4 text-center"
                            >

                              <input
                                type="checkbox"
                                checked={
                                  row[action]
                                }
                                disabled={
                                  isSuperAdmin ||
                                  usersLocked
                                }
                                onChange={() =>
                                  togglePermission(
                                    module.code,
                                    action
                                  )
                                }
                                aria-label={`${module.name} ${ACTION_LABELS[action]}`}
                                className="h-5 w-5 accent-red-900"
                              />

                            </td>

                          )

                        }
                      )}

                    </tr>

                  )

                }
              )}

            </tbody>

          </table>

        </div>

      </div>


      {/* MESSAGE */}

      {error && (

        <div className="rounded-xl bg-red-50 p-4 text-sm font-medium text-red-700">
          {error}
        </div>

      )}


      {success && (

        <div className="rounded-xl bg-green-50 p-4 text-sm font-medium text-green-700">
          {success}
        </div>

      )}


      {/* ACTION */}

      {!isSuperAdmin && (

        <div className="flex flex-wrap justify-end gap-3">

          <button
            type="button"
            onClick={
              resetRole
            }
            disabled={
              saving
            }
            className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-semibold hover:bg-zinc-50"
          >
            Reset Changes
          </button>


          <button
            type="button"
            onClick={
              savePermissions
            }
            disabled={
              saving
            }
            className="rounded-xl bg-red-900 px-6 py-3 font-bold text-white hover:bg-red-800 disabled:opacity-50"
          >

            {saving
              ? 'Saving...'
              : 'Save Permissions'}

          </button>

        </div>

      )}


    </div>

  )

}
