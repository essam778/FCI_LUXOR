import { describe, it, expect } from "vitest"
import {
  loginSchema,
  signupSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "@/lib/validators/auth"
import { evaluatePassword } from "@/components/auth/PasswordStrengthMeter"

describe("Auth Validation Schemas (Unit Tests)", () => {
  describe("loginSchema", () => {
    it("should accept valid email and password with at least 6 characters", () => {
      const result = loginSchema.safeParse({
        email: "student@example.com",
        password: "securepassword123",
      })
      expect(result.success).toBe(true)
    })

    it("should reject invalid email formats", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email-address",
        password: "password123",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("بريد إلكتروني صحيح")
      }
    })

    it("should reject password shorter than 6 characters", () => {
      const result = loginSchema.safeParse({
        email: "student@example.com",
        password: "123",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("6 أحرف")
      }
    })
  })

  describe("signupSchema", () => {
    it("should accept valid signup payload with matching passwords", () => {
      const result = signupSchema.safeParse({
        displayName: "أحمد علي",
        email: "ahmed@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
        level: 2,
        university: "Cairo University",
      })
      expect(result.success).toBe(true)
    })

    it("should fail when passwords do not match", () => {
      const result = signupSchema.safeParse({
        displayName: "أحمد علي",
        email: "ahmed@example.com",
        password: "Password123!",
        confirmPassword: "DifferentPassword123!",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const confirmErr = result.error.issues.find((i) => i.path.includes("confirmPassword"))
        expect(confirmErr).toBeDefined()
        expect(confirmErr?.message).toContain("غير متطابقتين")
      }
    })

    it("should reject short display names", () => {
      const result = signupSchema.safeParse({
        displayName: "A",
        email: "ahmed@example.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("حرفين")
      }
    })
  })

  describe("updatePasswordSchema", () => {
    it("should enforce complexity rules (uppercase, lowercase, number, special char, 8+ chars)", () => {
      // Missing special character and uppercase
      const weakResult = updatePasswordSchema.safeParse({
        password: "password123",
        confirmPassword: "password123",
      })
      expect(weakResult.success).toBe(false)

      // Complex valid password
      const strongResult = updatePasswordSchema.safeParse({
        password: "StrongPassword123!",
        confirmPassword: "StrongPassword123!",
      })
      expect(strongResult.success).toBe(true)
    })
  })

  describe("Password Strength Evaluator (Unit Tests)", () => {
    it("should score 0 for empty password", () => {
      const evaluation = evaluatePassword("")
      expect(evaluation.passedCount).toBe(0)
      expect(evaluation.percentage).toBe(0)
      expect(evaluation.isStrong).toBe(false)
      expect(evaluation.label).toBe("أدخل كلمة المرور")
    })

    it("should evaluate individual criteria accurately", () => {
      const evaluation = evaluatePassword("P@ss1")
      // Criteria:
      // Length >= 8: false (length 5)
      // Upper: true (P)
      // Lower: true (ss)
      // Digit: true (1)
      // Special: true (@)
      expect(evaluation.passedCount).toBe(4)
      expect(evaluation.criteria.find((c) => c.label.includes("8 أحرف"))?.valid).toBe(false)
      expect(evaluation.criteria.find((c) => c.label.includes("حرف كبير"))?.valid).toBe(true)
      expect(evaluation.criteria.find((c) => c.label.includes("حرف صغير"))?.valid).toBe(true)
      expect(evaluation.criteria.find((c) => c.label.includes("رقم"))?.valid).toBe(true)
      expect(evaluation.criteria.find((c) => c.label.includes("رمز"))?.valid).toBe(true)
    })

    it("should give full score (5/5) and strong status for complex password", () => {
      const evaluation = evaluatePassword("MyStr0ng!Pass")
      expect(evaluation.passedCount).toBe(5)
      expect(evaluation.percentage).toBe(100)
      expect(evaluation.isStrong).toBe(true)
      expect(evaluation.label).toContain("قوية جداً")
    })
  })
})

