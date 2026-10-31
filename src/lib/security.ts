/**
 * Security & Input Sanitization Utilities
 * Protects against XSS, HTML Injection, SQL Metacharacter manipulation,
 * and privilege escalation / unauthorized tampering.
 */

/**
 * Sanitize text inputs by escaping HTML entities and stripping dangerous script tags and null bytes.
 */
export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") {
    if (input === null || input === undefined) return ""
    return String(input)
  }

  return input
    // Remove null bytes
    .replace(/\0/g, "")
    // Escape HTML special characters to prevent XSS
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    // Remove potential SQL injection patterns if used in raw query contexts
    .replace(/(--|\/\*|\*\/|;)/g, "")
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
