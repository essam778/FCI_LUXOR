import { describe, it, expect } from "vitest"
import { isFreeTrialCourse } from "@/lib/subscriptionUtils"

describe("Subscription & Course Access Utils (Unit Tests)", () => {
  describe("isFreeTrialCourse", () => {
    it("should return false for null or undefined course", () => {
      expect(isFreeTrialCourse(null)).toBe(false)
      expect(isFreeTrialCourse(undefined)).toBe(false)
    })

    it("should identify free trial courses by code (ELEC101, ELEC105, etc.)", () => {
      expect(isFreeTrialCourse({ code: "ELEC101" })).toBe(true)
      expect(isFreeTrialCourse({ code: "elec-intro" })).toBe(true)
    })

    it("should identify free trial courses by slug", () => {
      expect(isFreeTrialCourse({ slug: "electronics-fundamentals" })).toBe(true)
      expect(isFreeTrialCourse({ slug: "intro-to-electronics" })).toBe(true)
    })

    it("should identify free trial courses by title in Arabic or English", () => {
      expect(isFreeTrialCourse({ title: "Electronics for Engineers" })).toBe(true)
      expect(isFreeTrialCourse({ title: "مقدمة في الإلكترونيات" })).toBe(true)
      expect(isFreeTrialCourse({ title: "الكترونيات 1" })).toBe(true)
    })

    it("should return false for regular paid courses", () => {
      expect(isFreeTrialCourse({ code: "CS101", slug: "intro-to-cs", title: "مقدمة في الحاسب" })).toBe(false)
      expect(isFreeTrialCourse({ code: "MATH201", slug: "calculus-2", title: "تفاضل وتكامل 2" })).toBe(false)
      expect(isFreeTrialCourse({ code: "AI301", slug: "machine-learning", title: "تعلم الآلة" })).toBe(false)
    })
  })
})

