'use client'

import {
  useMemo,
  useState,
} from 'react'

import {
  createClient,
} from '@/lib/supabase/client'

import {
  type BluetoothPrinterDevice,
  getPairedBluetoothPrinters,
  isAndroidNative,
  testBluetoothPrinter,
} from '@/lib/pos/bluetooth-printer'


type Outlet = {
  id: string
  code: string
  name: string
  type: string
}


type PrinterSetting = {
  id: string
  outlet_id: string
  outlet_code: string | null
  outlet_name: string | null
  printer_role: string
  device_name: string | null
  connection_type: string
  device_identifier: string | null
  paper_width_mm: number
  auto_print_after_payment: boolean
  is_active: boolean
}


type Props = {
  roleCode: string
  assignedOutletId: string
  outlets: Outlet[]
  settings: PrinterSetting[]
}


export default function PrinterSettingsClient({
  roleCode,
  assignedOutletId,
  outlets,
  settings,
}: Props) {

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    )


  const isGlobalRole =
    roleCode ===
      'SUPER_ADMIN' ||
    roleCode ===
      'MANAGEMENT'


  const initialOutletId =
    isGlobalRole
      ? (
          outlets[0]
            ?.id ||
          ''
        )
      : assignedOutletId


  const [
    outletId,
    setOutletId,
  ] =
    useState(
      initialOutletId
    )


  function settingFor(
    targetOutletId: string
  ) {

    return settings.find(
      (row) =>
        row.outlet_id ===
          targetOutletId &&
        row.printer_role ===
          'RECEIPT'
    )

  }


  const initialSetting =
    settingFor(
      initialOutletId
    )


  const [
    deviceName,
    setDeviceName,
  ] =
    useState(
      initialSetting
        ?.device_name ||
      'MP-80M'
    )


  const [
    connectionType,
    setConnectionType,
  ] =
    useState(
      initialSetting
        ?.connection_type ||
      'BROWSER'
    )


  const [
    deviceIdentifier,
    setDeviceIdentifier,
  ] =
    useState(
      initialSetting
        ?.device_identifier ||
      ''
    )


  const [
    paperWidth,
    setPaperWidth,
  ] =
    useState(
      String(
        initialSetting
          ?.paper_width_mm ||
        80
      )
    )


  const [
    autoPrint,
    setAutoPrint,
  ] =
    useState(
      Boolean(
        initialSetting
          ?.auto_print_after_payment
      )
    )


  const [
    active,
    setActive,
  ] =
    useState(
      initialSetting
        ? Boolean(
            initialSetting
              .is_active
          )
        : true
    )


  const [
    busy,
    setBusy,
  ] =
    useState(
      false
    )


  const [
    error,
    setError,
  ] =
    useState(
      ''
    )


  const [
    success,
    setSuccess,
  ] =
    useState(
      ''
    )


  const [
    bluetoothDevices,
    setBluetoothDevices,
  ] = useState<BluetoothPrinterDevice[]>([])

  const [
    bluetoothBusy,
    setBluetoothBusy,
  ] = useState(false)

  const nativeAndroid =
    isAndroidNative()


  const selectedOutlet =
    outlets.find(
      (row) =>
        row.id ===
        outletId
    )


  function loadSetting(
    targetOutletId: string
  ) {

    const row =
      settingFor(
        targetOutletId
      )


    setOutletId(
      targetOutletId
    )

    setDeviceName(
      row?.device_name ||
      'MP-80M'
    )

    setConnectionType(
      row?.connection_type ||
      'BROWSER'
    )

    setDeviceIdentifier(
      row?.device_identifier ||
      ''
    )

    setPaperWidth(
      String(
        row?.paper_width_mm ||
        80
      )
    )

    setAutoPrint(
      Boolean(
        row?.auto_print_after_payment
      )
    )

    setActive(
      row
        ? Boolean(
            row.is_active
          )
        : true
    )

    setError('')
    setSuccess('')

  }


  async function loadBluetoothDevices() {

    if (!nativeAndroid) {
      setError(
        'Bluetooth printer discovery is only available in the HomeTech POS Android app.'
      )
      return
    }

    setBluetoothBusy(true)
    setError('')
    setSuccess('')

    try {

      const rows =
        await getPairedBluetoothPrinters()

      setBluetoothDevices(rows)

      if (!rows.length) {
        setError(
          'No paired Bluetooth devices found. Pair the printer in Android Settings first.'
        )
        return
      }

      const matched =
        rows.find(
          (row) =>
            row.address ===
            deviceIdentifier
        ) || rows[0]

      setDeviceName(
        matched.name
      )

      setDeviceIdentifier(
        matched.address
      )

      setSuccess(
        `${rows.length} paired Bluetooth device(s) found.`
      )

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load paired Bluetooth devices.'
      )

    } finally {

      setBluetoothBusy(false)

    }

  }


  function selectBluetoothDevice(
    address: string
  ) {

    const device =
      bluetoothDevices.find(
        (row) =>
          row.address === address
      )

    setDeviceIdentifier(
      address
    )

    if (device) {
      setDeviceName(
        device.name
      )
    }

    setError('')
    setSuccess('')

  }


  async function saveSetting() {

    if (!outletId) {

      setError(
        'Branch / outlet wajib dipilih.'
      )

      return
    }


    if (
      connectionType === 'ANDROID_BLUETOOTH' &&
      !deviceIdentifier.trim()
    ) {

      setError(
        'Bluetooth printer wajib dipilih sebelum Save Settings.'
      )

      return
    }


    setBusy(true)
    setError('')
    setSuccess('')


    try {

      const {
        error:
          rpcError,
      } =
        await supabase.rpc(
          'save_pos_printer_setting_secure',
          {
            p_outlet_id:
              outletId,

            p_printer_role:
              'RECEIPT',

            p_device_name:
              deviceName.trim() ||
              null,

            p_connection_type:
              connectionType,

            p_device_identifier:
              deviceIdentifier.trim() ||
              null,

            p_paper_width_mm:
              Number(
                paperWidth
              ),

            p_auto_print_after_payment:
              autoPrint,

            p_is_active:
              active,
          }
        )


      if (rpcError) {
        throw rpcError
      }


      setSuccess(
        'Printer setting berhasil disimpan.'
      )

    } catch (
      err: any
    ) {

      setError(
        err?.message ||
        'Failed to save printer setting.'
      )

    } finally {

      setBusy(false)

    }

  }


  function browserTestPrint() {

    const popup =
      window.open(
        '',
        '_blank',
        'width=420,height=720'
      )


    if (!popup) {

      setError(
        'Popup diblokir browser. Izinkan popup untuk Test Print.'
      )

      return
    }


    const outletName =
      selectedOutlet
        ?.name ||
      'Rangka Cafe'


    popup.document.open()

    popup.document.write(`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Printer Test</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }

    html,
    body {
      width: 80mm;
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
      font-family: "Courier New", monospace;
    }

    .receipt {
      width: 80mm;
      padding: 4mm;
      box-sizing: border-box;
      font-size: 11px;
      line-height: 1.35;
    }

    h1 {
      margin: 0;
      text-align: center;
      font-size: 18px;
    }

    .center {
      text-align: center;
    }

    .dash {
      border-top: 1px dashed #000;
      margin: 10px 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
    }

    .big {
      margin-top: 10px;
      text-align: center;
      font-size: 16px;
      font-weight: 900;
    }
  </style>
</head>

<body>

  <div class="receipt">

    <h1>${outletName}</h1>

    <div class="center">
      PRINTER TEST
    </div>

    <div class="dash"></div>

    <div class="row">
      <span>Printer</span>
      <strong>${deviceName || 'MP-80M'}</strong>
    </div>

    <div class="row">
      <span>Paper</span>
      <strong>${paperWidth} mm</strong>
    </div>

    <div class="row">
      <span>Connection</span>
      <strong>${connectionType}</strong>
    </div>

    <div class="dash"></div>

    <div class="big">
      TEST PRINT OK
    </div>

    <div class="center">
      Rangka POS
    </div>

  </div>

  <script>
    window.onload = function () {
      setTimeout(function () {
        window.print()
      }, 250)
    }
  </script>

</body>
</html>
    `)

    popup.document.close()

  }


  async function testPrint() {

    if (
      connectionType !==
      'ANDROID_BLUETOOTH'
    ) {

      browserTestPrint()
      return

    }


    if (!nativeAndroid) {

      setError(
        'Android Bluetooth Test Print hanya tersedia di HomeTech POS Android app.'
      )

      return
    }


    if (!deviceIdentifier.trim()) {

      setError(
        'Pilih Bluetooth printer terlebih dahulu.'
      )

      return
    }


    setBluetoothBusy(true)
    setError('')
    setSuccess('')

    try {

      await testBluetoothPrinter(
        deviceIdentifier.trim()
      )

      setSuccess(
        `Bluetooth test print sent to ${deviceName || deviceIdentifier}.`
      )

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : 'Bluetooth test print failed.'
      )

    } finally {

      setBluetoothBusy(false)

    }

  }


  return (

    <div className="mt-8 space-y-6">


      <section className="rounded-2xl bg-white p-7 shadow-sm">


        <div className="grid gap-5 md:grid-cols-2">


          <div className="md:col-span-2">

            <label className="mb-2 block text-sm font-bold">
              Branch / Outlet
            </label>


            <select
              value={
                outletId
              }
              disabled={
                !isGlobalRole
              }
              onChange={(
                event
              ) =>
                loadSetting(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 disabled:bg-zinc-100"
            >

              {outlets.map(
                (outlet) => (

                  <option
                    key={
                      outlet.id
                    }
                    value={
                      outlet.id
                    }
                  >
                    {
                      outlet.name
                    }
                    {
                      outlet.code
                        ? ` · ${outlet.code}`
                        : ''
                    }
                  </option>

                )
              )}

            </select>

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Receipt Printer
            </label>


            <input
              value={
                deviceName
              }
              onChange={(
                event
              ) =>
                setDeviceName(
                  event.target.value
                )
              }
              placeholder="MP-80M"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Connection
            </label>


            <select
              value={
                connectionType
              }
              onChange={(
                event
              ) =>
                setConnectionType(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
            >

              <option value="BROWSER">
                Browser / System Print
              </option>

              <option value="ANDROID_BLUETOOTH">
                Android Bluetooth
              </option>

              <option value="NETWORK">
                Network Printer
              </option>

            </select>

          </div>

          {connectionType ===
            'ANDROID_BLUETOOTH' && (

            <div className="md:col-span-2 rounded-2xl border border-blue-200 bg-blue-50 p-5">

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="font-black text-blue-950">
                    Android Bluetooth Printer
                  </p>

                  <p className="mt-1 text-sm text-blue-800">
                    Select a paired Bluetooth Classic / SPP thermal printer.
                  </p>

                </div>


                <div className="rounded-xl bg-white px-4 py-2 text-xs font-black text-blue-900">

                  {
                    nativeAndroid
                      ? 'ANDROID NATIVE'
                      : 'WEB / NON-NATIVE'
                  }

                </div>

              </div>


              {!nativeAndroid && (

                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                  Open Printer Settings from the HomeTech POS Android app to discover Bluetooth devices.
                </div>

              )}


              {deviceIdentifier && (

                <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">

                  <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
                    Selected / Saved Printer
                  </p>

                  <p className="mt-1 font-black text-zinc-900">
                    {deviceName || 'Bluetooth Printer'}
                  </p>

                  <p className="mt-1 font-mono text-sm text-zinc-500">
                    {deviceIdentifier}
                  </p>

                </div>

              )}


              <button
                type="button"
                disabled={
                  bluetoothBusy ||
                  !nativeAndroid
                }
                onClick={() =>
                  void loadBluetoothDevices()
                }
                className="mt-4 w-full rounded-xl bg-blue-700 px-5 py-3 font-black text-white hover:bg-blue-800 disabled:opacity-40"
              >
                {
                  bluetoothBusy
                    ? 'PLEASE WAIT...'
                    : 'REFRESH PAIRED DEVICES'
                }
              </button>


              {bluetoothDevices.length > 0 && (

                <div className="mt-4">

                  <label className="mb-2 block text-sm font-bold">
                    Paired Bluetooth Device
                  </label>

                  <select
                    value={
                      deviceIdentifier
                    }
                    onChange={(event) =>
                      selectBluetoothDevice(
                        event.target.value
                      )
                    }
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3"
                  >

                    {bluetoothDevices.map(
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

                </div>

              )}

            </div>

          )}



          <div>

            <label className="mb-2 block text-sm font-bold">
              Paper Width
            </label>


            <select
              value={
                paperWidth
              }
              onChange={(
                event
              ) =>
                setPaperWidth(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3"
            >

              <option value="80">
                80 mm
              </option>

              <option value="58">
                58 mm
              </option>

            </select>

          </div>


          <div>

            <label className="mb-2 block text-sm font-bold">
              Device Identifier
            </label>


            <input
              value={
                deviceIdentifier
              }
              onChange={(
                event
              ) =>
                setDeviceIdentifier(
                  event.target.value
                )
              }
              readOnly={
                connectionType === 'ANDROID_BLUETOOTH'
              }
              placeholder="Bluetooth MAC / IP / future device ID"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3"
            />

          </div>


          <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">


            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4">

              <div>

                <p className="font-black">
                  Auto Print After Payment
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Automatically print receipt after successful payment.
                </p>

              </div>


              <input
                type="checkbox"
                checked={
                  autoPrint
                }
                onChange={(
                  event
                ) =>
                  setAutoPrint(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />

            </label>


            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-zinc-200 p-4">

              <div>

                <p className="font-black">
                  Printer Active
                </p>

                <p className="mt-1 text-xs text-zinc-500">
                  Enable receipt printing for this branch.
                </p>

              </div>


              <input
                type="checkbox"
                checked={
                  active
                }
                onChange={(
                  event
                ) =>
                  setActive(
                    event.target.checked
                  )
                }
                className="h-5 w-5"
              />

            </label>


          </div>

        </div>


        {connectionType ===
          'BROWSER' && (

          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">

            Browser mode uses the operating system print dialog.
            Direct automatic Bluetooth printing will be enabled in
            the Android app.

          </div>

        )}


        {error && (

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 font-semibold text-red-700">
            {error}
          </div>

        )}


        {success && (

          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 font-semibold text-green-700">
            {success}
          </div>

        )}


        <div className="mt-7 grid gap-3 sm:grid-cols-2">

          <button
            type="button"
            disabled={
              busy
            }
            onClick={() =>
              void saveSetting()
            }
            className="rounded-xl bg-zinc-950 px-5 py-4 font-black text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {
              busy
                ? 'SAVING...'
                : 'SAVE SETTINGS'
            }
          </button>


          <button
            type="button"
            disabled={
              busy ||
              bluetoothBusy
            }
            onClick={() =>
              void testPrint()
            }
            className="rounded-xl border border-zinc-300 bg-white px-5 py-4 font-black hover:bg-zinc-50"
          >
            TEST PRINT
          </button>

        </div>

      </section>


      <section className="rounded-2xl border border-zinc-200 bg-white p-6">

        <p className="text-xs font-black uppercase tracking-wider text-zinc-400">
          Current Configuration
        </p>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">

          <div>
            <span className="text-zinc-500">
              Branch
            </span>

            <p className="font-black">
              {
                selectedOutlet
                  ?.name ||
                '-'
              }
            </p>
          </div>


          <div>
            <span className="text-zinc-500">
              Printer
            </span>

            <p className="font-black">
              {
                deviceName ||
                '-'
              }
            </p>
          </div>


          <div>
            <span className="text-zinc-500">
              Connection
            </span>

            <p className="font-black">
              {
                connectionType
              }
            </p>
          </div>


          <div>
            <span className="text-zinc-500">
              Paper
            </span>

            <p className="font-black">
              {
                paperWidth
              } mm
            </p>
          </div>

        </div>

      </section>


    </div>

  )
}
