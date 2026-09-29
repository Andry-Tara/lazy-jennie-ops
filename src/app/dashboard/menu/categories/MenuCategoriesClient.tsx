'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import Link from 'next/link'

import {
  createClient,
} from '@/lib/supabase/client'


type CategoryRow = {
  id: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  usage_count: number
}


type Props = {
  outletId: string
  outletCode: string
  brandName: string
  categories: CategoryRow[]
}


export default function MenuCategoriesClient({
  outletId,
  outletCode,
  brandName,
  categories,
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
    newName,
    setNewName,
  ] =
    useState('')


  const [
    newSort,
    setNewSort,
  ] =
    useState('100')


  const [
    editingId,
    setEditingId,
  ] =
    useState<string | null>(
      null
    )


  const [
    editName,
    setEditName,
  ] =
    useState('')


  const [
    editSort,
    setEditSort,
  ] =
    useState('100')


  const [
    editActive,
    setEditActive,
  ] =
    useState(true)


  const [
    loading,
    setLoading,
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


  const activeCount =
    categories.filter(
      row =>
        row.is_active
    ).length


  const inactiveCount =
    categories.length -
    activeCount


  const usedCount =
    categories.filter(
      row =>
        row.usage_count >
        0
    ).length


  async function addCategory() {

    const name =
      newName.trim()


    if (!name) {

      setError(
        'Category name wajib diisi.'
      )

      return
    }


    setLoading(true)

    setError('')

    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'create_menu_category_secure',
          {
            p_outlet_id:
              outletId,

            p_name:
              name,

            p_sort_order:
              Math.max(
                0,
                Number(
                  newSort ||
                  100
                )
              ),
          }
        )


      if (rpcError) {
        throw rpcError
      }


      setNewName('')

      setNewSort('100')

      setSuccess(
        `Category "${name}" berhasil ditambahkan.`
      )


      router.refresh()

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        err?.details ||
        err?.hint ||
        'Gagal menambahkan category.'
      )

    } finally {

      setLoading(false)

    }

  }


  function beginEdit(
    row: CategoryRow
  ) {

    setError('')

    setSuccess('')

    setEditingId(
      row.id
    )

    setEditName(
      row.name
    )

    setEditSort(
      String(
        row.sort_order
      )
    )

    setEditActive(
      row.is_active
    )

  }


  function cancelEdit() {

    setEditingId(
      null
    )

    setEditName('')

    setEditSort(
      '100'
    )

    setEditActive(
      true
    )

  }


  async function saveEdit(
    categoryId: string
  ) {

    const name =
      editName.trim()


    if (!name) {

      setError(
        'Category name wajib diisi.'
      )

      return
    }


    setLoading(true)

    setError('')

    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'update_menu_category_secure',
          {
            p_category_id:
              categoryId,

            p_name:
              name,

            p_sort_order:
              Math.max(
                0,
                Number(
                  editSort ||
                  100
                )
              ),

            p_is_active:
              editActive,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      setSuccess(
        `Category "${name}" berhasil di-update.`
      )


      cancelEdit()

      router.refresh()

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        err?.details ||
        err?.hint ||
        'Gagal update category.'
      )

    } finally {

      setLoading(false)

    }

  }


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950 lg:p-8">

      <div className="mx-auto max-w-6xl">

        <header className="mb-7">

          <Link
            href="/dashboard/menu"
            className="text-sm font-semibold text-zinc-500 hover:text-red-800"
          >
            ← Menu Master
          </Link>


          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
            {
              brandName
            }
          </p>


          <h1 className="mt-2 text-3xl font-black">
            Menu Categories
          </h1>


          <p className="mt-2 text-sm text-zinc-500">
            Manage categories used by POS menu and reporting.
          </p>

        </header>


        <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

          <Metric
            label="Total Categories"
            value={
              categories.length
            }
          />

          <Metric
            label="Active"
            value={
              activeCount
            }
          />

          <Metric
            label="Inactive"
            value={
              inactiveCount
            }
          />

          <Metric
            label="Used By Menu"
            value={
              usedCount
            }
          />

        </section>


        {success && (

          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-800">
            ✓ {
              success
            }
          </div>

        )}


        {error && (

          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
            {
              error
            }
          </div>

        )}


        <section className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

          <div className="flex flex-wrap items-start justify-between gap-4">

            <div>

              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-800">
                New Category
              </p>

              <h2 className="mt-1 text-lg font-black">
                Add Menu Category
              </h2>

              <p className="mt-1 text-xs text-zinc-500">
                {
                  outletCode
                } · Category code is generated automatically.
              </p>

            </div>


            <span className="rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-black text-green-700">
              SALES-ONLY
            </span>

          </div>


          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">

            <div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                Category Name
              </label>

              <input
                value={
                  newName
                }
                onChange={
                  event =>
                    setNewName(
                      event.target.value
                    )
                }
                placeholder="Example: Main Course"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50"
              />

            </div>


            <div>

              <label className="mb-2 block text-xs font-black uppercase tracking-wide text-zinc-500">
                Display Order
              </label>

              <input
                type="number"
                min="0"
                value={
                  newSort
                }
                onChange={
                  event =>
                    setNewSort(
                      event.target.value
                    )
                }
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
              />

            </div>


            <div className="flex items-end">

              <button
                type="button"
                disabled={
                  loading
                }
                onClick={
                  addCategory
                }
                className="w-full rounded-xl bg-red-900 px-5 py-3 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
              >
                + Add Category
              </button>

            </div>

          </div>

        </section>


        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="border-b border-zinc-100 px-5 py-4">

            <h2 className="font-black">
              Category Directory
            </h2>

            <p className="mt-1 text-xs text-zinc-500">
              Lower display order appears first in category dropdowns.
            </p>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[800px] text-left">

              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-wider text-zinc-500">

                <tr>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4">
                    Code
                  </th>

                  <th className="px-5 py-4">
                    Menus
                  </th>

                  <th className="px-5 py-4">
                    Order
                  </th>

                  <th className="px-5 py-4">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-zinc-100">

                {categories.map(
                  row => {

                    const editing =
                      editingId ===
                      row.id


                    return (
                      <tr
                        key={
                          row.id
                        }
                      >

                        <td className="px-5 py-4">

                          {editing
                            ? (
                              <input
                                value={
                                  editName
                                }
                                onChange={
                                  event =>
                                    setEditName(
                                      event.target.value
                                    )
                                }
                                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm font-bold"
                              />
                            )
                            : (
                              <p className="font-black">
                                {
                                  row.name
                                }
                              </p>
                            )
                          }

                        </td>


                        <td className="px-5 py-4 font-mono text-xs text-zinc-500">
                          {
                            row.code
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-700">
                            {
                              row.usage_count
                            } menu
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          {editing
                            ? (
                              <input
                                type="number"
                                min="0"
                                value={
                                  editSort
                                }
                                onChange={
                                  event =>
                                    setEditSort(
                                      event.target.value
                                    )
                                }
                                className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                              />
                            )
                            : (
                              <span className="font-bold">
                                {
                                  row.sort_order
                                }
                              </span>
                            )
                          }

                        </td>


                        <td className="px-5 py-4">

                          {editing
                            ? (
                              <select
                                value={
                                  editActive
                                    ? 'ACTIVE'
                                    : 'INACTIVE'
                                }
                                onChange={
                                  event =>
                                    setEditActive(
                                      event.target.value ===
                                      'ACTIVE'
                                    )
                                }
                                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold"
                              >
                                <option value="ACTIVE">
                                  Active
                                </option>

                                <option value="INACTIVE">
                                  Inactive
                                </option>
                              </select>
                            )
                            : (
                              <span
                                className={
                                  row.is_active
                                    ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700'
                                    : 'rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-500'
                                }
                              >
                                {
                                  row.is_active
                                    ? 'ACTIVE'
                                    : 'INACTIVE'
                                }
                              </span>
                            )
                          }

                        </td>


                        <td className="px-5 py-4 text-right">

                          {editing
                            ? (
                              <div className="flex justify-end gap-2">

                                <button
                                  type="button"
                                  disabled={
                                    loading
                                  }
                                  onClick={
                                    cancelEdit
                                  }
                                  className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-black"
                                >
                                  Cancel
                                </button>


                                <button
                                  type="button"
                                  disabled={
                                    loading
                                  }
                                  onClick={() =>
                                    saveEdit(
                                      row.id
                                    )
                                  }
                                  className="rounded-lg bg-red-900 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                                >
                                  Save
                                </button>

                              </div>
                            )
                            : (
                              <button
                                type="button"
                                onClick={() =>
                                  beginEdit(
                                    row
                                  )
                                }
                                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                              >
                                Edit
                              </button>
                            )
                          }

                        </td>

                      </tr>
                    )

                  }
                )}


                {!categories.length && (

                  <tr>

                    <td
                      colSpan={
                        6
                      }
                      className="px-5 py-16 text-center text-sm font-semibold text-zinc-400"
                    >
                      No categories yet.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>

        </section>

      </div>

    </main>
  )
}


function Metric({
  label,
  value,
}: {
  label: string
  value: number
}) {

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">

      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400">
        {
          label
        }
      </p>

      <p className="mt-2 text-2xl font-black">
        {
          value
        }
      </p>

    </div>
  )
}
