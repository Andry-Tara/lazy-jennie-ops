'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'


type MenuRow = {
  id: string
  code: string
  name: string
  category: string | null
  selling_price: number
  image_url: string | null
  is_active: boolean
  station: string
  route_active: boolean
}


type Props = {
  brandName: string
  outletCode: string
  menus: MenuRow[]
}


function rupiah(
  value: number
) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }
  ).format(value)
}


export default function SalesOnlyMenuMaster({
  brandName,
  outletCode,
  menus,
}: Props) {

  const [search, setSearch] =
    useState('')

  const [category, setCategory] =
    useState('ALL')

  const [station, setStation] =
    useState('ALL')

  const [status, setStatus] =
    useState('ALL')

  const [pageSize, setPageSize] =
    useState(20)

  const [page, setPage] =
    useState(1)


  const categories =
    useMemo(() => {

      return Array.from(
        new Set(
          menus
            .map(
              row =>
                row.category?.trim()
            )
            .filter(Boolean) as string[]
        )
      ).sort(
        (a, b) =>
          a.localeCompare(b)
      )

    }, [menus])


  const filtered =
    useMemo(() => {

      const keyword =
        search
          .trim()
          .toLowerCase()


      return menus.filter(
        menu => {

          const active =
            menu.is_active &&
            menu.route_active


          const matchSearch =
            !keyword ||
            menu.name
              .toLowerCase()
              .includes(keyword) ||
            menu.code
              .toLowerCase()
              .includes(keyword) ||
            String(
              menu.category || ''
            )
              .toLowerCase()
              .includes(keyword)


          const matchCategory =
            category === 'ALL' ||
            menu.category === category


          const matchStation =
            station === 'ALL' ||
            menu.station === station


          const matchStatus =
            status === 'ALL' ||
            (
              status === 'ACTIVE'
                ? active
                : !active
            )


          return (
            matchSearch &&
            matchCategory &&
            matchStation &&
            matchStatus
          )
        }
      )

    }, [
      menus,
      search,
      category,
      station,
      status,
    ])


  useEffect(() => {
    setPage(1)
  }, [
    search,
    category,
    station,
    status,
    pageSize,
  ])


  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filtered.length /
        pageSize
      )
    )


  useEffect(() => {

    if (page > totalPages) {
      setPage(totalPages)
    }

  }, [
    page,
    totalPages,
  ])


  const start =
    (page - 1) *
    pageSize


  const rows =
    filtered.slice(
      start,
      start + pageSize
    )


  const activeCount =
    menus.filter(
      row =>
        row.is_active &&
        row.route_active
    ).length


  const kitchenCount =
    menus.filter(
      row =>
        row.station === 'KITCHEN'
    ).length


  const barCount =
    menus.filter(
      row =>
        row.station === 'BAR'
    ).length


  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-950 lg:p-8">

      <div className="mx-auto max-w-[1500px]">

        <header className="mb-7 flex flex-wrap items-end justify-between gap-4">

          <div>

            <Link
              href="/dashboard"
              className="text-sm font-semibold text-zinc-500 hover:text-red-800"
            >
              ← Dashboard
            </Link>


            <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-red-800">
              {brandName}
            </p>


            <h1 className="mt-2 text-3xl font-black">
              Menu Master
            </h1>


            <p className="mt-2 text-sm text-zinc-500">
              POS menu, pricing and Kitchen / Bar routing.
            </p>

          </div>


          <div className="flex flex-wrap gap-2">

            <Link
              href="/dashboard/menu/categories"
              className="rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-800 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
            >
              Manage Categories
            </Link>


            <Link
              href="/dashboard/menu/new"
              className="rounded-xl bg-red-900 px-5 py-3 text-sm font-black text-white hover:bg-red-800"
            >
              + Add Menu
            </Link>

          </div>

        </header>


        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">

          <Metric
            label="Total Menu"
            value={menus.length}
          />

          <Metric
            label="Active"
            value={activeCount}
          />

          <Metric
            label="Kitchen"
            value={kitchenCount}
          />

          <Metric
            label="Bar"
            value={barCount}
          />

        </section>


        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">

          <div className="border-b border-zinc-100 p-5">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>

                <h2 className="font-black">
                  Menu Directory
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  {outletCode} · Search and filter restaurant menu.
                </p>

              </div>


              <span className="rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-black text-green-700">
                SALES-ONLY
              </span>

            </div>


            <div className="mt-5 grid gap-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">

              <input
                value={search}
                onChange={
                  event =>
                    setSearch(
                      event.target.value
                    )
                }
                placeholder="Search code, menu or category..."
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50"
              />


              <select
                value={category}
                onChange={
                  event =>
                    setCategory(
                      event.target.value
                    )
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
              >
                <option value="ALL">
                  All Categories
                </option>

                {categories.map(
                  value => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  )
                )}

              </select>


              <select
                value={station}
                onChange={
                  event =>
                    setStation(
                      event.target.value
                    )
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
              >
                <option value="ALL">
                  All Stations
                </option>

                <option value="KITCHEN">
                  Kitchen
                </option>

                <option value="BAR">
                  Bar
                </option>
              </select>


              <select
                value={status}
                onChange={
                  event =>
                    setStatus(
                      event.target.value
                    )
                }
                className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm"
              >
                <option value="ALL">
                  All Status
                </option>

                <option value="ACTIVE">
                  Active
                </option>

                <option value="INACTIVE">
                  Inactive
                </option>
              </select>

            </div>

          </div>


          <div className="overflow-x-auto">

            <table className="w-full min-w-[900px] text-left">

              <thead className="bg-zinc-50 text-[11px] font-black uppercase tracking-wider text-zinc-500">

                <tr>
                  <th className="px-5 py-4">
                    Menu
                  </th>

                  <th className="px-5 py-4">
                    Code
                  </th>

                  <th className="px-5 py-4">
                    Category
                  </th>

                  <th className="px-5 py-4">
                    Station
                  </th>

                  <th className="px-5 py-4 text-right">
                    Price
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

                {rows.map(
                  menu => {

                    const active =
                      menu.is_active &&
                      menu.route_active


                    return (
                      <tr
                        key={menu.id}
                        className="hover:bg-zinc-50/70"
                      >

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3">

                            <div
                              className="h-12 w-12 flex-none overflow-hidden rounded-xl bg-zinc-100 bg-cover bg-center"
                              style={
                                menu.image_url
                                  ? {
                                      backgroundImage:
                                        `url("${menu.image_url}")`,
                                    }
                                  : undefined
                              }
                            >
                              {!menu.image_url && (
                                <div className="flex h-full items-center justify-center">
                                  🍽️
                                </div>
                              )}
                            </div>


                            <p className="font-black">
                              {menu.name}
                            </p>

                          </div>

                        </td>


                        <td className="px-5 py-4 font-mono text-xs text-zinc-600">
                          {menu.code}
                        </td>


                        <td className="px-5 py-4">

                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
                            {
                              menu.category ||
                              'Uncategorized'
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4">

                          <span
                            className={
                              menu.station === 'BAR'
                                ? 'rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700'
                                : 'rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700'
                            }
                          >
                            {menu.station}
                          </span>

                        </td>


                        <td className="px-5 py-4 text-right font-black">
                          {
                            rupiah(
                              menu.selling_price
                            )
                          }
                        </td>


                        <td className="px-5 py-4">

                          <span
                            className={
                              active
                                ? 'rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-700'
                                : 'rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-black text-zinc-500'
                            }
                          >
                            {
                              active
                                ? 'ACTIVE'
                                : 'INACTIVE'
                            }
                          </span>

                        </td>


                        <td className="px-5 py-4 text-right">

                          <Link
                            href={
                              `/dashboard/menu/${menu.id}/edit`
                            }
                            className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                          >
                            Edit
                          </Link>

                        </td>

                      </tr>
                    )
                  }
                )}


                {!rows.length && (

                  <tr>

                    <td
                      colSpan={7}
                      className="px-5 py-16 text-center text-sm font-semibold text-zinc-400"
                    >
                      No menu found.
                    </td>

                  </tr>

                )}

              </tbody>

            </table>

          </div>


          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-zinc-100 px-5 py-4">

            <p className="text-xs text-zinc-500">
              Showing{' '}
              <strong className="text-zinc-800">
                {
                  filtered.length
                    ? start + 1
                    : 0
                }
                –
                {
                  Math.min(
                    start + pageSize,
                    filtered.length
                  )
                }
              </strong>
              {' '}of{' '}
              <strong className="text-zinc-800">
                {filtered.length}
              </strong>
              {' '}menus
            </p>


            <div className="flex items-center gap-2">

              <select
                value={pageSize}
                onChange={
                  event =>
                    setPageSize(
                      Number(
                        event.target.value
                      )
                    )
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold"
              >
                <option value="20">
                  20 / page
                </option>

                <option value="50">
                  50 / page
                </option>

                <option value="100">
                  100 / page
                </option>
              </select>


              <button
                type="button"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    current =>
                      Math.max(
                        1,
                        current - 1
                      )
                  )
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black disabled:opacity-30"
              >
                ←
              </button>


              <span className="min-w-16 text-center text-xs font-black">
                {page} / {totalPages}
              </span>


              <button
                type="button"
                disabled={
                  page >= totalPages
                }
                onClick={() =>
                  setPage(
                    current =>
                      Math.min(
                        totalPages,
                        current + 1
                      )
                  )
                }
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-black disabled:opacity-30"
              >
                →
              </button>

            </div>

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
        {label}
      </p>

      <p className="mt-2 text-2xl font-black">
        {value}
      </p>

    </div>
  )
}
