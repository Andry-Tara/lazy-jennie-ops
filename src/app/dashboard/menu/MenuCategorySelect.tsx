'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  createClient,
} from '@/lib/supabase/client'


type Category = {
  id: string
  name: string
}


type Props = {
  outletId: string
  value: string
  onChange: (
    value: string
  ) => void
}


export default function MenuCategorySelect({
  outletId,
  value,
  onChange,
}: Props) {

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([])


  const [
    loading,
    setLoading,
  ] =
    useState(true)


  const [
    error,
    setError,
  ] =
    useState('')


  useEffect(
    () => {

      let mounted =
        true


      async function load() {

        setLoading(true)

        setError('')


        const {
          data,
          error:
            queryError,
        } =
          await supabase
            .from(
              'menu_categories_secure'
            )
            .select(`
              id,
              name
            `)
            .eq(
              'outlet_id',
              outletId
            )
            .eq(
              'is_active',
              true
            )
            .order(
              'sort_order'
            )
            .order(
              'name'
            )


        if (!mounted) {
          return
        }


        if (queryError) {

          setError(
            queryError.message
          )

          setCategories([])

          setLoading(false)

          return
        }


        setCategories(
          data || []
        )

        setLoading(false)
      }


      void load()


      return () => {
        mounted =
          false
      }

    },
    [
      outletId,
      supabase,
    ]
  )


  const options =
    useMemo(
      () => {

        const result =
          [...categories]


        if (
          value &&
          !result.some(
            (
              row
            ) =>
              row.name ===
              value
          )
        ) {

          result.unshift({
            id:
              `current-${value}`,

            name:
              value,
          })

        }


        return result

      },
      [
        categories,
        value,
      ]
    )


  return (
    <div>

      <select
        value={
          value
        }
        onChange={
          (
            event
          ) =>
            onChange(
              event.target.value
            )
        }
        disabled={
          loading
        }
        className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-950 outline-none focus:border-red-800 focus:ring-4 focus:ring-red-50 disabled:bg-zinc-100"
      >

        <option value="">
          {
            loading
              ? 'Loading categories...'
              : 'Select Category'
          }
        </option>


        {options.map(
          (
            row
          ) => (

            <option
              key={
                row.id
              }
              value={
                row.name
              }
            >
              {
                row.name
              }
            </option>

          )
        )}

      </select>


      {error && (

        <p className="mt-2 text-xs font-semibold text-red-700">
          {
            error
          }
        </p>

      )}

    </div>
  )
}
