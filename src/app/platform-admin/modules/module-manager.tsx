'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

type Outlet = {
  id: string
  code: string
  name: string
  company_code: string
  company_name: string
}

type Package = {
  id: string
  code: string
  name: string
  status: string
}

type ModuleConfig = {
  module_id: string
  module_code: string
  module_name: string

  package_id: string | null
  package_code: string | null
  package_name: string | null

  package_included: boolean
  addon_entitled: boolean
  entitled: boolean

  default_enabled: boolean
  setting_exists: boolean
  enabled: boolean

  access_allowed: boolean
  reason: string
}

type Props = {
  outlet: Outlet
  packages: Package[]
  modules: ModuleConfig[]
}

export default function ModuleManager({
  outlet,
  packages,
  modules,
}: Props) {
  const router = useRouter()

  const currentPackageId =
    modules[0]?.package_id ?? ''

  const currentPackageName =
    modules[0]?.package_name ?? '—'

  const currentPackageCode =
    modules[0]?.package_code ?? '—'

  const [selectedPackageId, setSelectedPackageId] =
    useState(currentPackageId)

  const [savingKey, setSavingKey] =
    useState('')

  const [message, setMessage] =
    useState('')

  const [error, setError] =
    useState('')

  const activePackages = useMemo(
    () =>
      packages.filter(
        (pkg) => pkg.status === 'ACTIVE'
      ),
    [packages]
  )

  async function post(
    payload: Record<string, unknown>
  ) {
    const response = await fetch(
      '/api/platform-admin/modules',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const result = await response.json()

    if (!response.ok) {
      throw new Error(
        result?.error || 'Action failed.'
      )
    }

    return result
  }

  async function changePackage() {
    if (
      !selectedPackageId ||
      selectedPackageId === currentPackageId
    ) {
      return
    }

    const target = activePackages.find(
      (pkg) => pkg.id === selectedPackageId
    )

    if (!target) return

    const confirmed = window.confirm(
      `Change ${outlet.name} from ${currentPackageName} to ${target.name}?\n\nStart date and expiry will stay unchanged.`
    )

    if (!confirmed) return

    setSavingKey('package')
    setMessage('')
    setError('')

    try {
      await post({
        action: 'change_package',
        outletId: outlet.id,
        packageId: target.id,
        notes:
          'Package changed from Platform Admin.',
      })

      setMessage(
        `Package changed to ${target.name}.`
      )

      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Package change failed.'
      )

      setSelectedPackageId(
        currentPackageId
      )
    } finally {
      setSavingKey('')
    }
  }

  async function toggleModule(
    module: ModuleConfig
  ) {
    const enabled = !module.enabled

    setSavingKey(
      `module:${module.module_code}`
    )
    setMessage('')
    setError('')

    try {
      await post({
        action: 'set_enabled',
        outletId: outlet.id,
        moduleCode: module.module_code,
        enabled,
      })

      setMessage(
        `${module.module_name} ${
          enabled ? 'enabled' : 'disabled'
        }.`
      )

      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Module update failed.'
      )
    } finally {
      setSavingKey('')
    }
  }

  async function setAddon(
    module: ModuleConfig,
    granted: boolean
  ) {
    const confirmed = window.confirm(
      granted
        ? `Add ${module.module_name} to ${outlet.name}?`
        : `Remove ${module.module_name} from ${outlet.name}?`
    )

    if (!confirmed) return

    setSavingKey(
      `addon:${module.module_code}`
    )
    setMessage('')
    setError('')

    try {
      await post({
        action: 'set_addon',
        outletId: outlet.id,
        moduleCode: module.module_code,
        granted,
        notes: granted
          ? 'Module add-on granted from Platform Admin.'
          : 'Module add-on removed from Platform Admin.',
      })

      setMessage(
        granted
          ? `${module.module_name} add-on granted.`
          : `${module.module_name} add-on removed.`
      )

      router.refresh()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Add-on update failed.'
      )
    } finally {
      setSavingKey('')
    }
  }

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
              Branch
            </div>

            <h2 className="mt-2 text-2xl font-semibold">
              {outlet.name}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {outlet.company_name}
              {' · '}
              {outlet.code}
            </p>
          </div>

          <div className="rounded-xl bg-slate-950 px-4 py-3 text-white">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
              Current Package
            </div>

            <div className="mt-1 font-semibold">
              {currentPackageName}
            </div>

            <div className="text-xs text-slate-400">
              {currentPackageCode}
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="text-sm font-semibold">
            Change Package
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Current subscription dates will not change.
          </p>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedPackageId}
              onChange={(event) =>
                setSelectedPackageId(
                  event.target.value
                )
              }
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
            >
              {activePackages.map((pkg) => (
                <option
                  key={pkg.id}
                  value={pkg.id}
                >
                  {pkg.name} · {pkg.code}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={
                savingKey === 'package' ||
                selectedPackageId ===
                  currentPackageId
              }
              onClick={() =>
                void changePackage()
              }
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {savingKey === 'package'
                ? 'Changing...'
                : 'Change Package'}
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
          <h2 className="text-lg font-semibold">
            Outlet Modules
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Entitled = branch may use it. Enabled = branch is currently using it.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {modules.map((module) => {
            const saving =
              savingKey ===
                `module:${module.module_code}` ||
              savingKey ===
                `addon:${module.module_code}`

            const attendanceComingSoon =
              module.module_code ===
              'ATTENDANCE'

            return (
              <div
                key={module.module_id}
                className="p-5 sm:px-6"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold">
                        {module.module_name}
                      </div>

                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                        {module.module_code}
                      </span>

                      {module.package_included && (
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                          PACKAGE
                        </span>
                      )}

                      {module.addon_entitled && (
                        <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700">
                          ADD-ON
                        </span>
                      )}

                      {!module.entitled && (
                        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-400">
                          NOT ENTITLED
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>
                        Entitled:{' '}
                        <strong>
                          {module.entitled
                            ? 'YES'
                            : 'NO'}
                        </strong>
                      </span>

                      <span>
                        Enabled:{' '}
                        <strong>
                          {module.enabled
                            ? 'ON'
                            : 'OFF'}
                        </strong>
                      </span>

                      <span>
                        Access:{' '}
                        <strong>
                          {module.reason}
                        </strong>
                      </span>
                    </div>

                    {module.module_code ===
                      'INVENTORY' &&
                      module.entitled &&
                      !module.enabled && (
                        <p className="mt-2 text-xs text-amber-700">
                          Inventory is available but disabled. POS sales remain independent.
                        </p>
                      )}

                    {attendanceComingSoon &&
                      !module.entitled && (
                        <p className="mt-2 text-xs text-slate-400">
                          SaaS entitlement is supported. Attendance application will be built later.
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-3">
                    {module.entitled ? (
                      <>
                        {module.addon_entitled &&
                          !module.package_included && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() =>
                                void setAddon(
                                  module,
                                  false
                                )
                              }
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold disabled:opacity-40"
                            >
                              Remove Add-on
                            </button>
                          )}

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            void toggleModule(
                              module
                            )
                          }
                          className={`relative h-8 w-14 rounded-full ${
                            module.enabled
                              ? 'bg-emerald-600'
                              : 'bg-slate-300'
                          } disabled:opacity-40`}
                        >
                          <span
                            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow ${
                              module.enabled
                                ? 'left-7'
                                : 'left-1'
                            }`}
                          />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          saving ||
                          attendanceComingSoon
                        }
                        onClick={() =>
                          void setAddon(
                            module,
                            true
                          )
                        }
                        className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
                      >
                        {attendanceComingSoon
                          ? 'Coming Soon'
                          : 'Add Module'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <Link
          href="/platform-admin#branches"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold"
        >
          Back to Platform Admin
        </Link>
      </div>
    </div>
  )
}
