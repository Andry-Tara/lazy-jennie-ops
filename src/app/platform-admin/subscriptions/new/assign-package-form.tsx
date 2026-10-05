'use client'

import Link from 'next/link'
import {
  useMemo,
  useState,
} from 'react'
import { useRouter } from 'next/navigation'

type OutletOption = {
  id: string
  company_name: string
  code: string
  name: string
  type: string
}

type PackageModule = {
  id: string
  code: string
  name: string
  status: string
}

type PackageOption = {
  id: string
  code: string
  name: string
  description: string | null
  status: string
  modules: PackageModule[]
}

type Props = {
  outlets: OutletOption[]
  packages: PackageOption[]
  initialOutletId?: string
}

function todayYmd() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0')

  const day = String(
    now.getDate()
  ).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addMonths(
  value: string,
  months: number
) {
  const parts =
    value.split('-').map(Number)

  if (
    parts.length !== 3 ||
    parts.some(
      (item) => !Number.isFinite(item)
    )
  ) {
    return null
  }

  const [
    year,
    month,
    day,
  ] = parts

  const target =
    new Date(
      year,
      month - 1 + months,
      1
    )

  const lastDay =
    new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate()

  target.setDate(
    Math.min(day, lastDay)
  )

  return target
}

function expiryLabel(
  startsOn: string,
  months: number
) {
  const expiry =
    addMonths(
      startsOn,
      months
    )

  if (!expiry) return '—'

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      dateStyle: 'long',
    }
  ).format(expiry)
}

export default function AssignPackageForm({
  outlets,
  packages,
  initialOutletId,
}: Props) {
  const router = useRouter()

  const activePackages =
    packages.filter(
      (item) =>
        item.status === 'ACTIVE'
    )

  const defaultPackage =
    activePackages.find(
      (item) =>
        item.code === 'POS_ONLY'
    ) ??
    activePackages.find(
      (item) =>
        item.code !==
        'ATTENDANCE_ONLY'
    )

  const [outletId, setOutletId] =
    useState(
      initialOutletId &&
        outlets.some(
          (item) =>
            item.id ===
            initialOutletId
        )
        ? initialOutletId
        : outlets[0]?.id ?? ''
    )

  const [
    packageId,
    setPackageId,
  ] = useState(
    defaultPackage?.id ?? ''
  )

  const [
    startsOn,
    setStartsOn,
  ] = useState(todayYmd())

  const [
    durationMonths,
    setDurationMonths,
  ] = useState(6)

  const [notes, setNotes] =
    useState('')

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState<string | null>(null)

  const selectedOutlet =
    useMemo(
      () =>
        outlets.find(
          (item) =>
            item.id === outletId
        ) ?? null,
      [outletId, outlets]
    )

  const selectedPackage =
    useMemo(
      () =>
        activePackages.find(
          (item) =>
            item.id === packageId
        ) ?? null,
      [
        activePackages,
        packageId,
      ]
    )

  async function submit(
    event: React.FormEvent
  ) {
    event.preventDefault()

    setError(null)

    if (
      !outletId ||
      !packageId
    ) {
      setError(
        'Branch and package are required.'
      )
      return
    }

    if (
      selectedPackage?.code ===
      'ATTENDANCE_ONLY'
    ) {
      setError(
        'Attendance Only is not assignable yet because the Attendance operational module has not been built.'
      )
      return
    }

    setSaving(true)

    try {
      const response =
        await fetch(
          '/api/platform-admin/subscriptions',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              outletId,
              packageId,
              startsOn,
              durationMonths,
              notes,
            }),
          }
        )

      const result =
        await response.json()

      if (!response.ok) {
        throw new Error(
          result?.error ||
            'Failed to create subscription.'
        )
      }

      router.push(
        '/platform-admin#branches'
      )

      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Failed to create subscription.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (outlets.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        All eligible branches already have
        subscriptions.
      </div>
    )
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-6"
    >
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Branch
        </label>

        <select
          value={outletId}
          onChange={(event) =>
            setOutletId(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        >
          {outlets.map(
            (outlet) => (
              <option
                key={outlet.id}
                value={outlet.id}
              >
                {outlet.company_name}
                {' — '}
                {outlet.name}
                {' / '}
                {outlet.code}
              </option>
            )
          )}
        </select>

        {selectedOutlet && (
          <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3">
            <div className="font-semibold text-slate-950">
              {
                selectedOutlet.name
              }
            </div>

            <div className="mt-1 text-sm text-slate-500">
              {
                selectedOutlet.company_name
              }
              {' · '}
              {
                selectedOutlet.code
              }
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Package
        </label>

        <select
          value={packageId}
          onChange={(event) =>
            setPackageId(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        >
          {activePackages.map(
            (item) => (
              <option
                key={item.id}
                value={item.id}
                disabled={
                  item.code ===
                  'ATTENDANCE_ONLY'
                }
              >
                {item.name}
                {item.code ===
                'ATTENDANCE_ONLY'
                  ? ' — Coming Soon'
                  : ''}
              </option>
            )
          )}
        </select>

        {selectedPackage && (
          <div className="mt-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold tracking-wide text-slate-400">
                  {
                    selectedPackage.code
                  }
                </div>

                <div className="mt-1 font-semibold text-slate-950">
                  {
                    selectedPackage.name
                  }
                </div>
              </div>

              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                ACTIVE
              </span>
            </div>

            {selectedPackage.description && (
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {
                  selectedPackage.description
                }
              </p>
            )}

            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Included Modules
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedPackage.modules.map(
                  (module) => (
                    <span
                      key={module.id}
                      className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      {module.name}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Start Date
          </label>

          <input
            type="date"
            value={startsOn}
            required
            onChange={(event) =>
              setStartsOn(
                event.target.value
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-800">
            Duration
          </label>

          <select
            value={
              durationMonths
            }
            onChange={(event) =>
              setDurationMonths(
                Number(
                  event.target.value
                )
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
          >
            <option value={1}>
              1 Month
            </option>
            <option value={3}>
              3 Months
            </option>
            <option value={6}>
              6 Months
            </option>
            <option value={12}>
              12 Months
            </option>
          </select>
        </div>
      </div>

      <div className="rounded-xl bg-slate-950 px-4 py-4 text-white">
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">
          Subscription Period
        </div>

        <div className="mt-2 text-sm font-semibold">
          {startsOn}
          {' → '}
          {expiryLabel(
            startsOn,
            durationMonths
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Notes
          <span className="ml-1 font-normal text-slate-400">
            optional
          </span>
        </label>

        <textarea
          rows={3}
          value={notes}
          onChange={(event) =>
            setNotes(
              event.target.value
            )
          }
          placeholder="Commercial or internal notes..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">
        <Link
          href="/platform-admin#branches"
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Cancel
        </Link>

        <button
          type="submit"
          disabled={
            saving ||
            !outletId ||
            !packageId
          }
          className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? 'Creating...'
            : 'Create Subscription'}
        </button>
      </div>
    </form>
  )
}
