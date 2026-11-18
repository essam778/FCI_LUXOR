/**
 * Multi-device Session Management
 * Supports up to MAX_ACTIVE_DEVICES (default: 2 devices, e.g. Mobile + Laptop/Tablet).
 * If a 3rd device logs in, the oldest session is evicted (FIFO / LRU).
 */

export const MAX_ACTIVE_DEVICES = 2

/**
 * Parse the stored raw token string into an array of distinct active tokens.
 * Backwards compatible with:
 * - Single legacy UUID strings ("abc-123")
 * - Comma-separated token strings ("abc-123,def-456")
 * - JSON stringified arrays ('["abc-123", "def-456"]')
 */
export function parseDeviceTokens(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return []
  const trimmed = raw.trim()
  if (!trimmed) return []

  // Check for JSON array
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parsed
          .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
          .map((t) => t.trim())
      }
    } catch {
      // Fall through to comma separation
    }
  }

  // Comma-separated or single token string
  return trimmed
    .split(",")
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
}

/**
 * Register a new device session token into the profile's active tokens.
 * Retains up to `maxDevices` (default: 2) most recent tokens.
 */
export function addDeviceToken(
  rawTokens: string | null | undefined,
  newToken: string,
  maxDevices: number = MAX_ACTIVE_DEVICES
): string {
  if (!newToken || typeof newToken !== "string") {
    return rawTokens || ""
  }
  const cleanNew = newToken.trim()
  if (!cleanNew) return rawTokens || ""

  const existing = parseDeviceTokens(rawTokens)
  // Remove token if it already exists (will be re-appended as the most recent)
  const filtered = existing.filter((t) => t !== cleanNew)
  filtered.push(cleanNew)

  const retained = filtered.slice(-Math.max(1, maxDevices))
  return retained.join(",")
}

/**
 * Remove a specific device session token (e.g. on single-device logout).
 */
export function removeDeviceToken(
  rawTokens: string | null | undefined,
  tokenToRemove: string | null | undefined
): string {
  if (!tokenToRemove || typeof tokenToRemove !== "string") {
    return rawTokens || ""
  }
  const cleanTarget = tokenToRemove.trim()
  if (!cleanTarget) return rawTokens || ""

  const existing = parseDeviceTokens(rawTokens)
  const remaining = existing.filter((t) => t !== cleanTarget)
  return remaining.join(",")
}

/**
 * Check whether a given client token is currently valid and active in the database.
 */
export function isDeviceTokenValid(
  rawTokens: string | null | undefined,
  clientToken: string | null | undefined
): boolean {
  if (!clientToken || typeof clientToken !== "string") return false
  const cleanClient = clientToken.trim()
  if (!cleanClient) return false

  const activeTokens = parseDeviceTokens(rawTokens)
  return activeTokens.includes(cleanClient)
}
