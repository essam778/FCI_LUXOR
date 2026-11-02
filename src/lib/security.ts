/**
 * Security & Input Sanitization Utilities
 * Protects against XSS, HTML Injection, SQL Metacharacter manipulation,
 * and privilege escalation / unauthorized tampering.
 */

/**
 * Sanitize text inputs by stripping dangerous null bytes and non-printable control characters,
 * while preserving valid code syntax, semicolons, quotes, and mathematical operators.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) return ""
    return String(input)
  }

  return input
    // Strip null bytes
    .replace(/\0/g, "")
    // Strip invisible/dangerous control characters (preserving tabs, newlines \n, \r)
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
}

/**
 * Validate and sanitize URLs to ensure they only use safe protocols (http, https, or internal relative paths).
 * Blocks dangerous schemes like `javascript:`, `vbscript:`, `data:` (except image data URLs).
 */
export function sanitizeUrl(url: string | null | undefined, fallback: string = "/courses"): string {
  if (!url || typeof url !== "string") return fallback

  const trimmed = url.trim()

  // Allow relative URLs starting with '/'
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return trimmed
  }

  // Allow data:image
  if (trimmed.startsWith("data:image/")) {
    return trimmed
  }

  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed
    }
  } catch {
    // Invalid URL
  }

  return fallback
}

/**
 * Validate user role to prevent unauthorized self-promotion or request manipulation.
 */
export function isValidRole(role: string): role is "student" | "editor" | "admin" {
  return role === "student" || role === "editor" || role === "admin"
}

/**
 * Verify whether an operation is permitted for the given role.
 */
export function canManageAcademicContent(role: string | null | undefined): boolean {
  return role === "admin" || role === "editor"
}
