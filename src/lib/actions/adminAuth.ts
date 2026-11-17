"use server"

export interface AdminAuthResult {
  success?: boolean
  error?: string
  message?: string
}

/**
 * Administrative verification endpoint.
 * Insecure hardcoded passkeys and backdoors have been disabled.
 * Administrative privileges must be assigned directly by platform administrators.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verifyAdminPasskey(
  _prevState: AdminAuthResult | null,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _formData: FormData
): Promise<AdminAuthResult> {
  return {
    error: "تم إلغاء الترقية الذاتية عبر الرمز السري لأسباب أمنية. تعيين رتبة المشرف يتم حصراً من قبل إدارة المنصة.",
  }
}

