import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default function LoginPage() {
  async function login(formData: FormData) {
    'use server'

    const email = String(formData.get('email') || '')
    const password = String(formData.get('password') || '')

    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      redirect('/login?error=invalid')
    }

    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-xl">
        <div className="mb-8">
          <p className="text-sm font-semibold text-red-800">
            LAZY JENNIE
          </p>

          <h1 className="text-3xl font-bold text-zinc-900 mt-2">
            Operations System
          </h1>

          <p className="text-zinc-500 mt-2">
            Sign in to continue
          </p>
        </div>

        <form action={login} className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>

            <input
              name="email"
              type="email"
              required
              className="w-full border rounded-xl px-4 py-3"
              placeholder="user@lazyjennie.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Password
            </label>

            <input
              name="password"
              type="password"
              required
              className="w-full border rounded-xl px-4 py-3"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-red-900 hover:bg-red-800 text-white rounded-xl py-3 font-semibold"
          >
            Sign In
          </button>
        </form>
      </div>
    </main>
  )
}
