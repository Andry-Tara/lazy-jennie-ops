'use client'

import {
  useMemo,
  useState,
} from 'react'

import Link from 'next/link'

import { createClient } from '@/lib/supabase/client'

type Approval = {
  id: string
  outlet_code: string | null
  outlet_name: string | null
  sale_id: string | null
  sale_no: string | null
  sale_item_id: string | null
  menu_code: string | null
  menu_name: string | null
  action_type: string
  requested_amount: number
  reason_name: string | null
  reason_text: string | null
  status: string
  requested_by_name: string | null
  requested_at: string
}

export default function ApprovalQueueClient({
  approvals,
}: {
  approvals: Approval[]
}) {
  const supabase = useMemo(
    () => createClient(),
    []
  )

  const [
    busyId,
    setBusyId,
  ] = useState('')

  const [
    notes,
    setNotes,
  ] = useState<
    Record<string, string>
  >({})

  const [
    error,
    setError,
  ] = useState('')

  function formatRupiah(
    value: number
  ) {
    return new Intl.NumberFormat(
      'id-ID',
      {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }
    ).format(value)
  }

  async function decide(
    id: string,
    decision: 'APPROVED' | 'REJECTED'
  ) {
    setBusyId(id)
    setError('')

    try {
      const {
        error: rpcError,
      } =
        await supabase.rpc(
          'decide_pos_approval_request',
          {
            p_request_id:
              id,

            p_decision:
              decision,

            p_decision_note:
              notes[id]?.trim() ||
              null,
          }
        )

      if (rpcError) {
        throw rpcError
      }

      window.location.reload()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to decide approval.'
      )
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="mt-8">

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!approvals.length ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

          <p className="text-lg font-bold">
            Approval Queue Empty
          </p>

          <p className="mt-2 text-sm text-zinc-500">
            Tidak ada request yang menunggu approval.
          </p>

        </div>
      ) : (
        <div className="space-y-4">

          {approvals.map(
            (approval) => (
              <div
                key={
                  approval.id
                }
                className="rounded-2xl bg-white p-5 shadow-sm"
              >

                <div className="flex flex-wrap items-start justify-between gap-4">

                  <div>

                    <div className="flex flex-wrap items-center gap-2">

                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                        {approval.action_type}
                      </span>

                      <span className="text-xs text-zinc-400">
                        {approval.outlet_code ||
                          approval.outlet_name ||
                          '-'}
                      </span>

                    </div>

                    <h2 className="mt-3 text-lg font-bold">
                      {approval.sale_no || 'Sale'}
                      {' — '}
                      {approval.menu_name ||
                        approval.menu_code ||
                        'Item'}
                    </h2>

                    <p className="mt-2 text-sm text-zinc-500">
                      Requested by{' '}
                      <strong>
                        {approval.requested_by_name ||
                          'User'}
                      </strong>
                      {' • '}
                      {new Date(
                        approval.requested_at
                      ).toLocaleString(
                        'id-ID'
                      )}
                    </p>

                    <p className="mt-3 text-xl font-bold text-red-900">
                      {formatRupiah(
                        approval.requested_amount
                      )}
                    </p>

                    {approval.reason_name && (
                      <p className="mt-3 text-sm">
                        Reason:{' '}
                        <strong>
                          {approval.reason_name}
                        </strong>
                      </p>
                    )}

                    {approval.reason_text && (
                      <p className="mt-1 text-sm text-zinc-500">
                        {approval.reason_text}
                      </p>
                    )}

                  </div>

                  {approval.sale_id && (
                    <Link
                      href={`/dashboard/pos/control/${approval.sale_id}`}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold"
                    >
                      Open Sale
                    </Link>
                  )}

                </div>

                <textarea
                  rows={2}
                  value={
                    notes[
                      approval.id
                    ] || ''
                  }
                  onChange={(
                    event
                  ) =>
                    setNotes(
                      (current) => ({
                        ...current,
                        [approval.id]:
                          event.target.value,
                      })
                    )
                  }
                  placeholder="Decision note (optional)"
                  className="mt-5 w-full rounded-xl border border-zinc-300 px-4 py-3"
                />

                <div className="mt-4 flex gap-3">

                  <button
                    type="button"
                    disabled={
                      busyId ===
                      approval.id
                    }
                    onClick={() =>
                      void decide(
                        approval.id,
                        'APPROVED'
                      )
                    }
                    className="rounded-lg bg-green-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Approve
                  </button>

                  <button
                    type="button"
                    disabled={
                      busyId ===
                      approval.id
                    }
                    onClick={() =>
                      void decide(
                        approval.id,
                        'REJECTED'
                      )
                    }
                    className="rounded-lg bg-red-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Reject
                  </button>

                </div>

              </div>
            )
          )}

        </div>
      )}

    </div>
  )
}
