import { Capacitor } from '@capacitor/core'
import {
  BluetoothSerial,
} from '@ascentio-it/capacitor-bluetooth-serial'

export type BluetoothPrinterDevice = {
  name: string
  address: string
}

export function isAndroidNative() {
  return (
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === 'android'
  )
}

function assertAndroidNative() {
  if (!isAndroidNative()) {
    throw new Error(
      'Bluetooth direct printing is only available in the Android app.'
    )
  }
}

export async function prepareBluetoothPrinter() {
  assertAndroidNative()

  let granted =
    await BluetoothSerial.checkBluetoothPermissions()

  if (!granted) {
    /*
     * enable() also passes through the plugin permission flow.
     * On modern Android the OS may still require Bluetooth
     * to be enabled manually by the user.
     */
    try {
      await BluetoothSerial.enable()
    } catch {
      // Re-check permissions below and return a clearer message.
    }

    granted =
      await BluetoothSerial.checkBluetoothPermissions()
  }

  if (!granted) {
    throw new Error(
      'Bluetooth permission is required. Allow Nearby devices / Bluetooth permission in Android.'
    )
  }

  const state =
    await BluetoothSerial.isEnabled()

  if (!state.enabled) {
    throw new Error(
      'Bluetooth is OFF. Turn Bluetooth on in Android, then try again.'
    )
  }
}

export async function getPairedBluetoothPrinters():
  Promise<BluetoothPrinterDevice[]> {
  await prepareBluetoothPrinter()

  const result =
    await BluetoothSerial.getPairedDevices()

  return (result.devices || [])
    .map((device) => ({
      name:
        device.name ||
        'Bluetooth Device',
      address:
        device.address ||
        '',
    }))
    .filter(
      (device) =>
        Boolean(device.address)
    )
}

export async function connectBluetoothPrinter(
  address: string
) {
  await prepareBluetoothPrinter()

  const target =
    address.trim()

  if (!target) {
    throw new Error(
      'Bluetooth printer address is empty.'
    )
  }

  const existing =
    await BluetoothSerial.isConnected({
      address: target,
    })

  if (existing.connected) {
    return
  }

  try {
    await BluetoothSerial.connect({
      address: target,
    })
  } catch (secureError) {
    try {
      await BluetoothSerial.connectInsecure({
        address: target,
      })
    } catch {
      throw secureError
    }
  }
}

export async function disconnectBluetoothPrinter(
  address: string
) {
  assertAndroidNative()

  const target =
    address.trim()

  if (!target) {
    return
  }

  const state =
    await BluetoothSerial.isConnected({
      address: target,
    })

  if (!state.connected) {
    return
  }

  await BluetoothSerial.disconnect({
    address: target,
  })
}

export async function testBluetoothPrinter(
  address: string
) {
  const target =
    address.trim()

  await connectBluetoothPrinter(
    target
  )

  const now =
    new Intl.DateTimeFormat(
      'id-ID',
      {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Jakarta',
      }
    ).format(
      new Date()
    )

  const testReceipt = [
    '',
    'RANGKA CAFE',
    'HOMETECH POS',
    '================================',
    'BLUETOOTH PRINTER TEST',
    `Time: ${now}`,
    '--------------------------------',
    'Printer connection: OK',
    'Android native: OK',
    'Bluetooth SPP: OK',
    '--------------------------------',
    '80mm Thermal Printer',
    'Direct Print Test',
    '================================',
    '',
    '',
    '',
  ].join('\n')

  await BluetoothSerial.write({
    address: target,
    value: testReceipt,
  })
}
