'use client'


import {
  useMemo,
  useState,
} from 'react'

import {
  createClient,
} from '@/lib/supabase/client'


type Outlet = {
  id: string
  code: string
  name: string
  is_active: boolean
}


type RestaurantTable = {
  id: string
  outlet_id: string
  code: string
  name: string
  capacity: number
  status: string
  is_active: boolean
}


type Props = {
  outlets: Outlet[]
  initialTables: RestaurantTable[]
  initialOutletId: string
  canManage: boolean
}


function tableNumber(
  code: string
) {

  const match =
    /^T(\d+)$/i.exec(
      code
    )


  if (!match) {
    return null
  }


  return Number(
    match[1]
  )
}


function currentTarget(
  rows: RestaurantTable[],
  outletId: string
) {

  const values =
    rows
      .filter(
        (row) =>
          row.outlet_id ===
            outletId &&
          row.is_active
      )
      .map(
        (row) =>
          tableNumber(
            row.code
          )
      )
      .filter(
        (
          value
        ): value is number =>
          value !== null &&
          Number.isFinite(
            value
          )
      )


  if (
    values.length ===
    0
  ) {
    return 0
  }


  return Math.max(
    ...values
  )
}


export default function TableMasterClient({
  outlets,
  initialTables,
  initialOutletId,
  canManage,
}: Props) {

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  const [
    rows,
    setRows,
  ] =
    useState<
      RestaurantTable[]
    >(
      initialTables
    )


  const [
    selectedOutletId,
    setSelectedOutletId,
  ] =
    useState(
      initialOutletId
    )


  const [
    totalTables,
    setTotalTables,
  ] =
    useState(
      String(
        currentTarget(
          initialTables,
          initialOutletId
        )
      )
    )


  const [
    defaultCapacity,
    setDefaultCapacity,
  ] =
    useState(
      '2'
    )


  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    )


  const [
    savingId,
    setSavingId,
  ] =
    useState(
      ''
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  const [
    success,
    setSuccess,
  ] =
    useState(
      ''
    )


  const selectedOutlet =
    outlets.find(
      (outlet) =>
        outlet.id ===
        selectedOutletId
    )


  const selectedRows =
    useMemo(

      () =>
        rows
          .filter(
            (row) =>
              row.outlet_id ===
              selectedOutletId
          )
          .sort(
            (a, b) =>
              a.code.localeCompare(
                b.code,
                undefined,
                {
                  numeric: true,
                }
              )
          ),

      [
        rows,
        selectedOutletId,
      ]

    )


  const activeCount =
    selectedRows.filter(
      (row) =>
        row.is_active
    ).length


  const occupiedCount =
    selectedRows.filter(
      (row) =>
        row.status ===
        'OCCUPIED'
    ).length


  const inactiveCount =
    selectedRows.filter(
      (row) =>
        !row.is_active
    ).length


  async function refreshTables(
    outletId =
      selectedOutletId
  ) {

    if (!outletId) {
      return
    }


    const {
      data,
      error:
        loadError,
    } =
      await supabase
        .from(
          'restaurant_tables_secure'
        )
        .select(`
          id,
          outlet_id,
          code,
          name,
          capacity,
          status,
          is_active
        `)
        .eq(
          'outlet_id',
          outletId
        )
        .order(
          'code'
        )


    if (loadError) {
      throw loadError
    }


    const nextRows =
      (
        data ||
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


    setRows(
      (current) => [

        ...current.filter(
          (row) =>
            row.outlet_id !==
            outletId
        ),

        ...nextRows,

      ]
    )

  }


  function selectOutlet(
    outletId: string
  ) {

    setSelectedOutletId(
      outletId
    )

    setTotalTables(
      String(
        currentTarget(
          rows,
          outletId
        )
      )
    )

    setError('')
    setSuccess('')


    const url =
      new URL(
        window.location.href
      )

    url.searchParams.set(
      'outlet',
      outletId
    )

    window.history.replaceState(
      null,
      '',
      url.toString()
    )

  }


  function updateLocalRow(
    id: string,
    patch:
      Partial<
        RestaurantTable
      >
  ) {

    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id === id
              ? {
                  ...row,
                  ...patch,
                }
              : row
        )
    )

  }


  async function syncTables() {

    if (
      !canManage ||
      !selectedOutletId
    ) {
      return
    }


    const total =
      Number(
        totalTables
      )

    const capacity =
      Number(
        defaultCapacity
      )


    if (
      !Number.isInteger(
        total
      ) ||
      total < 0 ||
      total > 500
    ) {

      setError(
        'Total tables harus 0 sampai 500.'
      )

      return
    }


    if (
      !Number.isInteger(
        capacity
      ) ||
      capacity < 1 ||
      capacity > 100
    ) {

      setError(
        'Default capacity harus 1 sampai 100.'
      )

      return
    }


    setBusy(true)
    setError('')
    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'sync_restaurant_tables_secure',
          {
            p_outlet_id:
              selectedOutletId,

            p_total_tables:
              total,

            p_default_capacity:
              capacity,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      await refreshTables(
        selectedOutletId
      )


      setSuccess(
        `Master table ${selectedOutlet?.name || ''} berhasil disinkronkan.`
      )

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        'Failed to sync restaurant tables.'
      )

    } finally {

      setBusy(false)

    }

  }


  async function saveRow(
    row: RestaurantTable
  ) {

    if (!canManage) {
      return
    }


    if (
      !row.name.trim()
    ) {

      setError(
        'Nama table wajib diisi.'
      )

      return
    }


    if (
      !Number.isInteger(
        row.capacity
      ) ||
      row.capacity < 1 ||
      row.capacity > 100
    ) {

      setError(
        'Capacity harus 1 sampai 100.'
      )

      return
    }


    setSavingId(
      row.id
    )

    setError('')
    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'update_restaurant_table_secure',
          {
            p_table_id:
              row.id,

            p_name:
              row.name.trim(),

            p_capacity:
              row.capacity,

            p_is_active:
              row.is_active,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      await refreshTables(
        selectedOutletId
      )


      setSuccess(
        `${row.code} berhasil diperbarui.`
      )

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        'Failed to update restaurant table.'
      )

    } finally {

      setSavingId('')
    }

  }


  return (

    <div className="space-y-6">


      <section className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr_1fr_auto] lg:items-end">


          <div>

            <label className="mb-2 block text-sm font-bold">
              Branch / Outlet
            </label>


            <select
              value={
                selectedOutletId
              }
              onChange={(
                event
              ) =>
                selectOutlet(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
            >

              {outlets.map(
                (outlet) => (

                  <option
                    key={
                      outlet.id
                    }
                    value={
                      outlet.id
                    }
                  >
                    {
                      outlet.name
                    }
                    {
                      outlet.code
                        ? ` · ${outlet.code}`
                        : ''
                    }
                  </option>

                )
              )}

            </select>

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Total Tables
            </label>


            <input
              type="number"
              min={0}
              max={500}
              value={
                totalTables
              }
              disabled={
                !canManage
              }
              onChange={(
                event
              ) =>
                setTotalTables(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 disabled:bg-zinc-100"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Default Capacity
            </label>


            <input
              type="number"
              min={1}
              max={100}
              value={
                defaultCapacity
              }
              disabled={
                !canManage
              }
              onChange={(
                event
              ) =>
                setDefaultCapacity(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 disabled:bg-zinc-100"
            />

          </div>


          <button
            type="button"
            disabled={
              busy ||
              !canManage ||
              !selectedOutletId
            }
            onClick={() =>
              void syncTables()
            }
            className="rounded-xl bg-red-900 px-6 py-3 font-black text-white hover:bg-red-800 disabled:opacity-50"
          >
            {
              busy
                ? 'SYNCING...'
                : 'GENERATE / SYNC'
            }
          </button>

        </div>


        <p className="mt-4 text-xs text-zinc-500">
          Existing table names and capacities are preserved. Reducing the number of tables deactivates unused tables instead of deleting history.
        </p>

      </section>


      {error && (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
          {error}
        </div>

      )}


      {success && (

        <div className="rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
          {success}
        </div>

      )}


      <section className="grid gap-4 sm:grid-cols-3">

        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Active
          </p>

          <p className="mt-2 text-3xl font-black">
            {activeCount}
          </p>

        </div>


        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Occupied
          </p>

          <p className="mt-2 text-3xl font-black text-red-800">
            {occupiedCount}
          </p>

        </div>


        <div className="rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Inactive
          </p>

          <p className="mt-2 text-3xl font-black text-zinc-500">
            {inactiveCount}
          </p>

        </div>

      </section>


      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">

        <div className="border-b border-zinc-200 px-6 py-5">

          <p className="text-xs font-bold uppercase tracking-wider text-red-800">
            {
              selectedOutlet
                ?.name ||
              'Branch'
            }
          </p>

          <h2 className="mt-1 text-xl font-black">
            Restaurant Tables
          </h2>

        </div>


        <div className="overflow-x-auto">

          <table className="w-full min-w-[850px] text-left text-sm">

            <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">

              <tr>
                <th className="px-5 py-4">
                  Code
                </th>

                <th className="px-5 py-4">
                  Table Name
                </th>

                <th className="px-5 py-4">
                  Capacity
                </th>

                <th className="px-5 py-4">
                  Live Status
                </th>

                <th className="px-5 py-4">
                  Master Status
                </th>

                <th className="px-5 py-4 text-right">
                  Action
                </th>
              </tr>

            </thead>


            <tbody className="divide-y divide-zinc-100">

              {selectedRows.map(
                (row) => (

                  <tr
                    key={
                      row.id
                    }
                    className={
                      row.is_active
                        ? ''
                        : 'bg-zinc-50 opacity-70'
                    }
                  >

                    <td className="px-5 py-4">

                      <span className="font-black text-red-900">
                        {row.code}
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      <input
                        value={
                          row.name
                        }
                        disabled={
                          !canManage
                        }
                        onChange={(
                          event
                        ) =>
                          updateLocalRow(
                            row.id,
                            {
                              name:
                                event.target.value,
                            }
                          )
                        }
                        className="w-full min-w-[190px] rounded-lg border border-zinc-300 px-3 py-2 disabled:border-transparent disabled:bg-transparent"
                      />

                    </td>


                    <td className="px-5 py-4">

                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={
                          row.capacity
                        }
                        disabled={
                          !canManage
                        }
                        onChange={(
                          event
                        ) =>
                          updateLocalRow(
                            row.id,
                            {
                              capacity:
                                Number(
                                  event.target.value
                                ),
                            }
                          )
                        }
                        className="w-24 rounded-lg border border-zinc-300 px-3 py-2 disabled:border-transparent disabled:bg-transparent"
                      />

                      <span className="ml-2 text-zinc-400">
                        pax
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      <span
                        className={
                          `rounded-full px-3 py-1 text-xs font-black ${
                            row.status ===
                              'OCCUPIED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`
                        }
                      >
                        {row.status}
                      </span>

                    </td>


                    <td className="px-5 py-4">

                      <select
                        value={
                          String(
                            row.is_active
                          )
                        }
                        disabled={
                          !canManage ||
                          row.status ===
                            'OCCUPIED'
                        }
                        onChange={(
                          event
                        ) =>
                          updateLocalRow(
                            row.id,
                            {
                              is_active:
                                event.target.value ===
                                'true',
                            }
                          )
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 disabled:bg-zinc-100"
                      >

                        <option value="true">
                          Active
                        </option>

                        <option value="false">
                          Inactive
                        </option>

                      </select>

                    </td>


                    <td className="px-5 py-4 text-right">

                      <button
                        type="button"
                        disabled={
                          !canManage ||
                          savingId ===
                            row.id
                        }
                        onClick={() =>
                          void saveRow(
                            row
                          )
                        }
                        className="rounded-lg bg-zinc-950 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 disabled:opacity-50"
                      >
                        {
                          savingId ===
                            row.id
                            ? 'SAVING...'
                            : 'SAVE'
                        }
                      </button>

                    </td>

                  </tr>

                )
              )}


              {selectedRows.length ===
                0 && (

                <tr>

                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-zinc-400"
                  >
                    No tables configured for this branch.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>

    </div>

  )
}
