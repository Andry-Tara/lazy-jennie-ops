import {
  createClient,
} from '@/lib/supabase/server'

import {
  redirect,
} from 'next/navigation'


export default function LoginPage() {

  async function login(
    formData: FormData
  ) {
    'use server'


    const email =
      String(
        formData.get(
          'email'
        ) ||
        ''
      )
        .trim()
        .toLowerCase()


    const password =
      String(
        formData.get(
          'password'
        ) ||
        ''
      )


    const supabase =
      await createClient()


    const {
      error,
    } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      })


    if (error) {
      redirect(
        '/login?error=invalid'
      )
    }


    redirect(
      '/dashboard'
    )
  }


  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 py-10 text-zinc-950">

      <div className="w-full max-w-[400px] overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-2xl">


        <div className="p-7 sm:p-8">

          {/* ===============================================
              GLOBAL BRAND
          =============================================== */}

          <div className="mb-7">

            <div className="mb-5 flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-900 text-sm font-black text-white">
                RO
              </div>


              <div>

                <p className="text-[10px] font-black uppercase tracking-[0.20em] text-red-800">
                  Restaurant Operations
                </p>


                <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                  Operations Platform
                </p>

              </div>

            </div>


            <h1 className="text-3xl font-black tracking-tight text-zinc-950">
              Operations System
            </h1>


            <p className="mt-2 max-w-sm text-[13px] leading-5 text-zinc-600">
              Secure sign in to access your restaurant workspace.
            </p>

          </div>


          {/* ===============================================
              LOGIN FORM
          =============================================== */}

          <form
            action={
              login
            }
            className="space-y-4"
          >

            <div>

              <label
                htmlFor="email"
                className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-zinc-700"
              >
                Email Address
              </label>


              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:border-red-800 focus:ring-4 focus:ring-red-100"
              />

            </div>


            <div>

              <label
                htmlFor="password"
                className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-zinc-700"
              >
                Password
              </label>


              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition placeholder:font-normal placeholder:text-zinc-400 focus:border-red-800 focus:ring-4 focus:ring-red-100"
              />

            </div>


            <button
              type="submit"
              className="mt-1 w-full rounded-xl bg-red-900 py-3 text-sm font-black text-white shadow-sm transition hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-100"
            >
              Sign In
            </button>

          </form>


          {/* ===============================================
              FOOTER
          =============================================== */}

          <div className="mt-6 border-t border-zinc-100 pt-5 text-center">

            <p className="text-[11px] font-semibold text-zinc-400">
              Authorized users only
            </p>


            <p className="mt-2 text-xs font-black tracking-wide text-zinc-500">
              Powered by HomeTech
            </p>

          </div>

        </div>

      </div>

    </main>
  )
}
