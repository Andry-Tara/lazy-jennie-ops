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

type BluetoothReceipt = Record<string, any>
type BluetoothReceiptItem = Record<string, any>

const RECEIPT_WIDTH = 42
const RECEIPT_LINE = '-'.repeat(RECEIPT_WIDTH)
const RECEIPT_DOUBLE = '='.repeat(RECEIPT_WIDTH)

function cleanReceiptText(value: unknown) {
  return String(value ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function receiptAmount(value: unknown) {
  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits: 0,
    }
  ).format(
    Number(value || 0)
  )
}

function receiptQty(value: unknown) {
  const number =
    Number(value || 0)

  if (
    Number.isInteger(number)
  ) {
    return String(number)
  }

  return new Intl.NumberFormat(
    'id-ID',
    {
      maximumFractionDigits: 2,
    }
  ).format(number)
}

function receiptDateTime(value: unknown) {
  if (!value) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  ).format(
    new Date(String(value))
  )
}

function centerReceipt(
  value: unknown
) {
  const text =
    cleanReceiptText(value)
      .slice(
        0,
        RECEIPT_WIDTH
      )

  const left =
    Math.max(
      0,
      Math.floor(
        (
          RECEIPT_WIDTH -
          text.length
        ) / 2
      )
    )

  return (
    ' '.repeat(left) +
    text
  )
}

function receiptColumns(
  leftValue: unknown,
  rightValue: unknown
) {
  const left =
    cleanReceiptText(
      leftValue
    )

  const right =
    cleanReceiptText(
      rightValue
    )

  const maxLeft =
    Math.max(
      1,
      RECEIPT_WIDTH -
        right.length -
        1
    )

  const clipped =
    left.slice(
      0,
      maxLeft
    )

  const spaces =
    Math.max(
      1,
      RECEIPT_WIDTH -
        clipped.length -
        right.length
    )

  return (
    clipped +
    ' '.repeat(spaces) +
    right
  )
}

function wrapReceipt(
  value: unknown
) {
  const text =
    cleanReceiptText(value)

  if (!text) {
    return []
  }

  const words =
    text.split(' ')

  const lines: string[] = []
  let current = ''

  for (
    const word of words
  ) {
    const next =
      current
        ? `${current} ${word}`
        : word

    if (
      next.length <=
      RECEIPT_WIDTH
    ) {
      current = next
      continue
    }

    if (current) {
      lines.push(current)
    }

    current = word
  }

  if (current) {
    lines.push(current)
  }

  return lines
}

export function buildBluetoothReceipt(
  receipt: BluetoothReceipt,
  items: BluetoothReceiptItem[]
) {
  const table =
    receipt.table_code
      ? (
          receipt.table_name
            ? `${receipt.table_code} / ${receipt.table_name}`
            : receipt.table_code
        )
      : 'TAKEAWAY'

  const transactionTime =
    receipt.posted_at ||
    receipt.transaction_date ||
    receipt.created_at

  const lines: string[] = [
    '\x1B@',
    centerReceipt(
      receipt.outlet_name ||
      'RANGKA CAFE'
    ),
  ]

  if (
    receipt.outlet_address
  ) {
    lines.push(
      ...wrapReceipt(
        receipt.outlet_address
      ).map(
        (line) =>
          centerReceipt(line)
      )
    )
  }

  if (
    receipt.outlet_phone
  ) {
    lines.push(
      centerReceipt(
        `Tel. ${receipt.outlet_phone}`
      )
    )
  }

  lines.push(
    '',
    centerReceipt('RECEIPT'),
    centerReceipt('PAID'),
    RECEIPT_LINE,

    `Order   ${cleanReceiptText(
      receipt.order_no || '-'
    )}`,

    `Sale    ${cleanReceiptText(
      receipt.sale_no || '-'
    )}`,

    `Table   ${cleanReceiptText(
      table
    )}`,

    `Payment ${cleanReceiptText(
      receipt.payment_method || '-'
    )}`,

    `Date    ${cleanReceiptText(
      receiptDateTime(
        transactionTime
      )
    )}`,

    RECEIPT_LINE
  )

  for (
    const item of items
  ) {
    lines.push(
      ...wrapReceipt(
        item.menu_name ||
        'Menu Item'
      )
    )

    lines.push(
      receiptColumns(
        `${receiptQty(
          item.quantity
        )} x ${receiptAmount(
          item.unit_price
        )}`,
        receiptAmount(
          item.net_amount
        )
      )
    )

    if (
      item.notes
    ) {
      lines.push(
        ...wrapReceipt(
          `Note: ${item.notes}`
        )
      )
    }
  }

  lines.push(
    RECEIPT_LINE,

    receiptColumns(
      'Subtotal',
      receiptAmount(
        receipt.subtotal
      )
    )
  )

  if (
    Number(
      receipt.discount_amount ||
      0
    ) > 0
  ) {
    lines.push(
      receiptColumns(
        'Discount',
        `-${receiptAmount(
          receipt.discount_amount
        )}`
      )
    )
  }

  lines.push(
    receiptColumns(
      'Service',
      receiptAmount(
        receipt.service_amount
      )
    ),

    receiptColumns(
      'Tax',
      receiptAmount(
        receipt.tax_amount
      )
    ),

    RECEIPT_DOUBLE,

    receiptColumns(
      'TOTAL',
      `Rp ${receiptAmount(
        receipt.grand_total
      )}`
    ),

    RECEIPT_DOUBLE,
    '',

    centerReceipt(
      'THANK YOU'
    ),

    centerReceipt(
      'Thank you for your visit.'
    ),

    centerReceipt(
      receipt.sale_no || ''
    ),

    '',
    '',
    '',
    ''
  )

  return lines.join('\n')
}

export async function printBluetoothReceipt(
  address: string,
  receipt: BluetoothReceipt,
  items: BluetoothReceiptItem[]
) {
  const target =
    address.trim()

  if (!target) {
    throw new Error(
      'Bluetooth printer address is empty.'
    )
  }

  await connectBluetoothPrinter(
    target
  )

  await BluetoothSerial.write({
    address: target,

    value:
      buildBluetoothReceipt(
        receipt,
        items
      ),
  })
}

