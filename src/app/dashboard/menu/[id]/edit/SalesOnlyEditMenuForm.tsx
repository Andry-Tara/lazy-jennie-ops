'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import Link from 'next/link'

import MenuCategorySelect
  from '../../MenuCategorySelect'

import {
  createClient,
} from '@/lib/supabase/client'


type Station =
  | 'KITCHEN'
  | 'BAR'


type Menu = {
  id: string
  code: string
  name: string
  category: string | null
  selling_price: number
  image_url: string | null
  notes: string | null
}


type Props = {
  outletId: string
  brandName: string
  menu: Menu
  initialStation: Station
  initialActive: boolean
}


export default function SalesOnlyEditMenuForm({
  outletId,
  brandName,
  menu,
  initialStation,
  initialActive,
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
    code,
    setCode,
  ] =
    useState(
      menu.code
    )


  const [
    name,
    setName,
  ] =
    useState(
      menu.name
    )


  const [
    category,
    setCategory,
  ] =
    useState(
      menu.category ||
      ''
    )


  const [
    sellingPrice,
    setSellingPrice,
  ] =
    useState(
      String(
        menu.selling_price
      )
    )


  const [
    station,
    setStation,
  ] =
    useState<Station>(
      initialStation
    )


  const [
    notes,
    setNotes,
  ] =
    useState(
      menu.notes ||
      ''
    )


  const [
    isActive,
    setIsActive,
  ] =
    useState(
      initialActive
    )


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


  async function handleSubmit(
    event:
      React.FormEvent
  ) {

    event.preventDefault()

    setError('')


    if (!code.trim()) {

      setError(
        'Menu code wajib diisi.'
      )

      return
    }


    if (!name.trim()) {

      setError(
        'Menu name wajib diisi.'
      )

      return
    }


    const price =
      Number(
        sellingPrice
      )


    if (
      Number.isNaN(
        price
      ) ||
      price < 0
    ) {

      setError(
        'Selling price tidak valid.'
      )

      return
    }


    setLoading(
      true
    )


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'update_sales_only_menu_secure',
          {
            p_outlet_id:
              outletId,

            p_menu_item_id:
              menu.id,

            p_code:
              code.trim(),

            p_name:
              name.trim(),

            p_category:
              category.trim() ||
              null,

            p_selling_price:
              price,

            p_station:
              station,

            p_notes:
              notes.trim() ||
              null,

            p_is_active:
              isActive,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      router.push(
        '/dashboard/menu'
      )

      router.refresh()

    } catch (
      err: any
    ) {

      console.error(
        'SALES ONLY MENU UPDATE ERROR:',
        err
      )


      setError(
        err?.message ||
        err?.details ||
        err?.hint ||
        'Failed to update menu.'
      )


      setLoading(
        false
      )

    }

  }


  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >

      {menu.image_url && (

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">
            Menu Photo
          </p>


          <div
            className="mt-4 aspect-[4/3] max-w-xs rounded-2xl bg-zinc-100 bg-cover bg-center"
            style={{
              backgroundImage:
                `url("${menu.image_url}")`,
            }}
          />

        </section>

      )}


      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">

        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">

          <div>

            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-800">
              Sales Menu
            </p>


            <h2 className="mt-2 text-xl font-black">
              Menu Information
            </h2>


            <p className="mt-1 text-sm text-zinc-500">
              Update POS menu and Kitchen Display routing.
            </p>

          </div>


          <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-black text-green-700">
            SALES-ONLY
          </span>

        </div>


        <div className="grid gap-5 md:grid-cols-2">

          <div>

            <label className="mb-2 block text-sm font-bold">
              Menu Code
            </label>

            <input
              value={
                code
              }
              onChange={
                (
                  event
                ) =>
                  setCode(
                    event
                      .target
                      .value
                      .toUpperCase()
                  )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Menu Name
            </label>

            <input
              value={
                name
              }
              onChange={
                (
                  event
                ) =>
                  setName(
                    event.target.value
                  )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Category
            </label>

            <MenuCategorySelect
              outletId={
                outletId
              }
              value={
                category
              }
              onChange={
                setCategory
              }
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Selling Price
            </label>

            <div className="relative">

              <span className="absolute left-4 top-3.5 font-semibold text-zinc-500">
                Rp
              </span>

              <input
                type="number"
                min="0"
                step="1"
                value={
                  sellingPrice
                }
                onChange={
                  (
                    event
                  ) =>
                    setSellingPrice(
                      event.target.value
                    )
                }
                className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-12 pr-4 text-zinc-950 outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50"
              />

            </div>

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Kitchen Station
            </label>


            <div className="grid grid-cols-2 gap-3">

              <button
                type="button"
                onClick={() =>
                  setStation(
                    'KITCHEN'
                  )
                }
                className={
                  station ===
                  'KITCHEN'
                    ? 'rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white'
                    : 'rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black text-zinc-700'
                }
              >
                KITCHEN
              </button>


              <button
                type="button"
                onClick={() =>
                  setStation(
                    'BAR'
                  )
                }
                className={
                  station ===
                  'BAR'
                    ? 'rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white'
                    : 'rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black text-zinc-700'
                }
              >
                BAR
              </button>

            </div>


            <p className="mt-2 text-xs text-zinc-400">
              New order items will be routed to this KDS station.
            </p>

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Menu Status
            </label>


            <select
              value={
                isActive
                  ? 'ACTIVE'
                  : 'INACTIVE'
              }
              onChange={
                (
                  event
                ) =>
                  setIsActive(
                    event.target.value ===
                    'ACTIVE'
                  )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950"
            >
              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>
            </select>

          </div>


          <div className="md:col-span-2">

            <label className="mb-2 block text-sm font-bold">
              Notes
            </label>

            <textarea
              rows={
                3
              }
              value={
                notes
              }
              onChange={
                (
                  event
                ) =>
                  setNotes(
                    event.target.value
                  )
              }
              placeholder="Optional notes"
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50"
            />

          </div>

        </div>

      </section>


      <section className="rounded-2xl border border-green-200 bg-green-50 p-5">

        <p className="text-sm font-black text-green-900">
          {
            brandName
          } · Sales-Only Menu
        </p>

        <p className="mt-1 text-sm text-green-800">
          Inventory BOM, ingredient quantities, low-stock calculation and COGS are not used by this operation profile.
        </p>

      </section>


      {error && (

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {
            error
          }
        </div>

      )}


      <div className="flex justify-end gap-3">

        <Link
          href="/dashboard/menu"
          className="rounded-xl border border-zinc-300 bg-white px-5 py-3 font-bold hover:bg-zinc-50"
        >
          Cancel
        </Link>


        <button
          type="submit"
          disabled={
            loading
          }
          className="rounded-xl bg-red-900 px-6 py-3 font-black text-white hover:bg-red-800 disabled:cursor-wait disabled:opacity-50"
        >
          {
            loading
              ? 'Saving...'
              : 'Save Changes'
          }
        </button>

      </div>

    </form>
  )
}
