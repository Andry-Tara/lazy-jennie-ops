'use client'

import Link from 'next/link'
import {
  useState,
} from 'react'

import {
  type BluetoothPrinterDevice,
  connectBluetoothPrinter,
  disconnectBluetoothPrinter,
  getPairedBluetoothPrinters,
  isAndroidNative,
  testBluetoothPrinter,
} from '@/lib/pos/bluetooth-printer'

export default function BluetoothPrinterTestPage() {
  const [
    devices,
    setDevices,
  ] =
    useState<BluetoothPrinterDevice[]>([])

  const [
    selected,
    setSelected,
  ] =
    useState('')

  const [
    busy,
    setBusy,
  ] =
    useState(false)

  const [
    status,
    setStatus,
  ] =
    useState('')

  const nativeAndroid =
    isAndroidNative()

  async function run(
    job: () => Promise<void>
  ) {
    setBusy(true)
    setStatus('')

    try {
      await job()
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : 'Bluetooth printer error.'
      )
    } finally {
      setBusy(false)
    }
  }

  async function loadDevices() {
    await run(
      async () => {
        const rows =
          await getPairedBluetoothPrinters()

        setDevices(rows)

        if (
          rows.length &&
          !selected
        ) {
          setSelected(
            rows[0].address
          )
        }

        setStatus(
          rows.length
            ? `${rows.length} paired device(s) found.`
            : 'No paired Bluetooth devices found.'
        )
      }
    )
  }

  return (
    <main className="min-h-screen bg-zinc-100 p-6 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard/pos/settings/printers"
          className="text-sm font-semibold text-zinc-500"
        >
          ← Printer Settings
        </Link>

        <div className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-black tracking-wider text-red-800">
            HOMETECH POS
          </p>

          <h1 className="mt-2 text-3xl font-black">
            Bluetooth Printer Test
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            Android Bluetooth Classic / SPP
          </p>

          <div className="mt-6 rounded-2xl bg-zinc-100 p-4">
            <div className="text-xs font-bold uppercase text-zinc-500">
              Runtime
            </div>

            <div className="mt-1 text-lg font-black">
              {nativeAndroid
                ? 'ANDROID NATIVE'
                : 'WEB / NON-NATIVE'}
            </div>
          </div>

          {!nativeAndroid && (
            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Open this page from the HomeTech POS Android app to use Bluetooth.
            </div>
          )}

          <button
            type="button"
            disabled={
              busy ||
              !nativeAndroid
            }
            onClick={() => {
              void loadDevices()
            }}
            className="mt-6 w-full rounded-2xl bg-zinc-900 px-5 py-4 font-black text-white disabled:opacity-40"
          >
            {busy
              ? 'PLEASE WAIT...'
              : 'GET PAIRED DEVICES'}
          </button>

          {devices.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-bold">
                Bluetooth Device
              </label>

              <select
                value={selected}
                onChange={(event) =>
                  setSelected(
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-zinc-300 bg-white p-3"
              >
                {devices.map(
                  (device) => (
                    <option
                      key={
                        device.address
                      }
                      value={
                        device.address
                      }
                    >
                      {device.name}
                      {' — '}
                      {device.address}
                    </option>
                  )
                )}
              </select>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={
                    busy ||
                    !selected
                  }
                  onClick={() => {
                    void run(
                      async () => {
                        await connectBluetoothPrinter(
                          selected
                        )

                        setStatus(
                          'Printer connected.'
                        )
                      }
                    )
                  }}
                  className="rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-40"
                >
                  CONNECT
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !selected
                  }
                  onClick={() => {
                    void run(
                      async () => {
                        await testBluetoothPrinter(
                          selected
                        )

                        setStatus(
                          'Test print sent successfully.'
                        )
                      }
                    )
                  }}
                  className="rounded-xl bg-green-700 px-4 py-3 font-bold text-white disabled:opacity-40"
                >
                  TEST PRINT
                </button>

                <button
                  type="button"
                  disabled={
                    busy ||
                    !selected
                  }
                  onClick={() => {
                    void run(
                      async () => {
                        await disconnectBluetoothPrinter(
                          selected
                        )

                        setStatus(
                          'Printer disconnected.'
                        )
                      }
                    )
                  }}
                  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 font-bold"
                >
                  DISCONNECT
                </button>
              </div>
            </div>
          )}

          {status && (
            <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold">
              {status}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
