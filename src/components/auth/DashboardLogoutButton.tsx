'use client'

import {
  useState,
} from 'react'

import {
  useRouter,
} from 'next/navigation'

import {
  createClient,
} from '@/lib/supabase/client'


export default function DashboardLogoutButton() {

  const router =
    useRouter()

  const supabase =
    createClient()

  const [
    loading,
    setLoading,
  ] =
    useState(false)


  async function logout() {

    if (loading) {
      return
    }

    setLoading(true)

    const {
      error,
    } =
      await supabase.auth.signOut()


    if (error) {

      console.error(
        'SIGN OUT ERROR:',
        error
      )

      setLoading(false)

      return
    }


    router.replace(
      '/login'
    )

    router.refresh()
  }


  return (
    <button
      type="button"
      onClick={
        logout
      }
      disabled={
        loading
      }
      className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-black text-zinc-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-800 disabled:cursor-wait disabled:opacity-50"
    >
      {
        loading
          ? 'Signing Out...'
          : 'Sign Out'
      }
    </button>
  )
}
