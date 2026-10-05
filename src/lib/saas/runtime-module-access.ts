type RpcError = {
  message: string
}

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{
    data: unknown
    error: RpcError | null
  }>
}

export type RuntimeModuleOutlet = {
  company_id: string
  company_code: string
  company_name: string

  outlet_id: string
  outlet_code: string
  outlet_name: string

  commercial_module_code:
    | string
    | null

  managed_by_saas: boolean
  access_allowed: boolean
  reason: string
}

export async function getRuntimeModuleOutlets(
  client: unknown,
  moduleCode: string
) {
  const db =
    client as RpcClient

  const result =
    await db.rpc(
      'get_my_runtime_module_outlets',
      {
        p_module_code:
          moduleCode,
      }
    )

  if (result.error) {
    throw new Error(
      `Runtime module access error: ${result.error.message}`
    )
  }

  const rows: RuntimeModuleOutlet[] =
    Array.isArray(result.data)
      ? result.data
      : []

  return {
    rows,

    allowedOutletIds:
      rows
        .filter(
          (row) =>
            row.access_allowed
        )
        .map(
          (row) =>
            row.outlet_id
        ),
  }
}
