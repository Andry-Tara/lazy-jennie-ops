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


type Profile = {
  outlet_id: string
  profile_code: string | null
  waiter_mode_enabled: boolean
}


type Props = {
  outlets: Outlet[]
  profiles: Profile[]
}


export default function OutletFeatureClient({
  outlets,
  profiles,
}: Props) {

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  const initialState =
    Object.fromEntries(
      profiles.map(
        (row) => [
          row.outlet_id,
          Boolean(
            row.waiter_mode_enabled
          ),
        ]
      )
    )


  const [
    waiterState,
    setWaiterState,
  ] =
    useState<
      Record<string, boolean>
    >(
      initialState
    )


  const [
    savingId,
    setSavingId,
  ] =
    useState('')


  const [
    message,
    setMessage,
  ] =
    useState('')


  async function toggleWaiter(
    outletId: string,
    enabled: boolean
  ) {

    setSavingId(
      outletId
    )

    setMessage('')


    const previous =
      Boolean(
        waiterState[
          outletId
        ]
      )


    setWaiterState(
      (current) => ({
        ...current,
        [outletId]:
          enabled,
      })
    )


    const {
      error,
    } =
      await supabase.rpc(
        'set_outlet_waiter_mode_secure',
        {
          p_outlet_id:
            outletId,

          p_enabled:
            enabled,
        }
      )


    if (error) {

      setWaiterState(
        (current) => ({
          ...current,
          [outletId]:
            previous,
        })
      )


      setMessage(
        error.message
      )

    } else {

      setMessage(
        enabled
          ? 'Waiter Mode enabled.'
          : 'Waiter Mode disabled.'
      )

    }


    setSavingId('')

  }


  return (

    <div className="mt-8 space-y-4">


      {message && (

        <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-sm font-semibold">
          {message}
        </div>

      )}


      {outlets.map(
        (outlet) => {

          const profile =
            profiles.find(
              (row) =>
                row.outlet_id ===
                outlet.id
            )


          const enabled =
            Boolean(
              waiterState[
                outlet.id
              ]
            )


          const saving =
            savingId ===
            outlet.id


          return (

            <div
              key={
                outlet.id
              }
              className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
            >

              <div className="flex flex-wrap items-center justify-between gap-5">


                <div>

                  <p className="text-xl font-black">
                    {
                      outlet.name
                    }
                  </p>

                  <p className="mt-1 text-sm font-semibold text-zinc-500">
                    {
                      outlet.code
                    }
                  </p>

                  <p className="mt-2 text-xs text-zinc-400">
                    Profile: {
                      profile
                        ?.profile_code ||
                      'Not configured'
                    }
                  </p>

                </div>


                <div className="flex items-center gap-4">

                  <div className="text-right">

                    <p className="font-black">
                      Waiter Mode
                    </p>

                    <p
                      className={`mt-1 text-xs font-bold ${
                        enabled
                          ? 'text-emerald-700'
                          : 'text-zinc-400'
                      }`}
                    >
                      {
                        enabled
                          ? 'ENABLED'
                          : 'DISABLED'
                      }
                    </p>

                  </div>


                  <button
                    type="button"
                    disabled={
                      !profile ||
                      saving
                    }
                    onClick={() =>
                      void toggleWaiter(
                        outlet.id,
                        !enabled
                      )
                    }
                    className={`relative h-8 w-14 rounded-full transition ${
                      enabled
                        ? 'bg-emerald-600'
                        : 'bg-zinc-300'
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >

                    <span
                      className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                        enabled
                          ? 'left-7'
                          : 'left-1'
                      }`}
                    />

                  </button>

                </div>

              </div>


              {!profile && (

                <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                  Outlet App Profile belum tersedia.
                </div>

              )}

            </div>

          )

        }
      )}

    </div>

  )
}
