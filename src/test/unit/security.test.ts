import { describe, it, expect } from "vitest"
import {
  sanitizeInput,
  sanitizeUrl,
  isValidRole,
  canManageAcademicContent,
} from "@/lib/security"

describe("Security & Input Sanitization (Unit Tests)", () => {
  it("should remove null byte characters and dangerous control characters", () => {
    const malicious = "hello\0world\x01\x07test"
    const cleaned = sanitizeInput(malicious)
    expect(cleaned).toBe("helloworldtest")
    expect(cleaned).not.toContain("\0")
  })

  it("should trim surrounding whitespace", () => {
    const input = "   مرحباً بك في المنصة   "
    expect(sanitizeInput(input)).toBe("مرحباً بك في المنصة")
  })

  it("should safely handle non-string or empty inputs without throwing", () => {
    expect(sanitizeInput(null)).toBe("")
    expect(sanitizeInput(undefined)).toBe("")
    expect(sanitizeInput(12345)).toBe("12345")
  })

  it("should preserve legitimate Arabic text, numbers, and allowed punctuation", () => {
    const valid = "محاضرة 1: مقدمة في الخوارزميات (CS101) - التكلفة O(n log n)"
    expect(sanitizeInput(valid)).toBe(valid)
  })

  describe("sanitizeUrl", () => {
    it("should accept safe relative URLs", () => {
      expect(sanitizeUrl("/courses/electronics")).toBe("/courses/electronics")
      expect(sanitizeUrl("/dashboard")).toBe("/dashboard")
    })

    it("should accept valid https URLs", () => {
      expect(sanitizeUrl("https://youtube.com/watch?v=123")).toBe("https://youtube.com/watch?v=123")
    })

    it("should block javascript: pseudo-protocol and return fallback", () => {
      expect(sanitizeUrl("javascript:alert(1)")).toBe("/courses")
      expect(sanitizeUrl("javascript:alert(1)", "/login")).toBe("/login")
    })

    it("should block vbscript: and illegal schemes", () => {
      expect(sanitizeUrl("vbscript:msgbox(1)")).toBe("/courses")
      expect(sanitizeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe("/courses")
    })

    it("should accept data:image URLs", () => {
      const dataImg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE="
      expect(sanitizeUrl(dataImg)).toBe(dataImg)
    })

    it("should return fallback for invalid or null URL strings", () => {
      expect(sanitizeUrl(null)).toBe("/courses")
      expect(sanitizeUrl("")).toBe("/courses")
      expect(sanitizeUrl("not a valid url :// test")).toBe("/courses")
    })
  })

  describe("Role Authorization & Permission Checks", () => {
    it("should validate allowed user roles", () => {
      expect(isValidRole("student")).toBe(true)
      expect(isValidRole("editor")).toBe(true)
      expect(isValidRole("admin")).toBe(true)
      expect(isValidRole("superadmin")).toBe(false)
      expect(isValidRole("hacker")).toBe(false)
    })

    it("should verify content management privileges", () => {
      expect(canManageAcademicContent("admin")).toBe(true)
      expect(canManageAcademicContent("editor")).toBe(true)
      expect(canManageAcademicContent("student")).toBe(false)
      expect(canManageAcademicContent(null)).toBe(false)
      expect(canManageAcademicContent(undefined)).toBe(false)
    })
  })
})
