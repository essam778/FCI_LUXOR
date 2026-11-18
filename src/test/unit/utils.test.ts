import { describe, it, expect } from "vitest"
import { cn, parseCourseTitle } from "@/lib/utils"

describe("UI Utils (Unit Tests)", () => {
  describe("cn (Tailwind class merger)", () => {
    it("should merge simple class strings", () => {
      const result = cn("text-sm", "font-bold")
      expect(result).toBe("text-sm font-bold")
    })

    it("should resolve conflicting Tailwind classes favoring the latter", () => {
      const result = cn("p-4", "p-6")
      expect(result).toBe("p-6")

      const bgResult = cn("bg-red-500", "bg-blue-500")
      expect(bgResult).toBe("bg-blue-500")
    })

    it("should handle conditional truthy and falsy class objects or values", () => {
      const isHidden = false
      const isActive = true
      const result = cn(
        "btn",
        isActive && "btn-active",
        isHidden && "hidden",
        undefined,
        null,
        ""
      )
      expect(result).toBe("btn btn-active")
    })

    it("should merge arrays and nested expressions properly", () => {
      const result = cn(["flex", "items-center"], ["justify-between", "gap-2"])
      expect(result).toBe("flex items-center justify-between gap-2")
    })
  })

  describe("parseCourseTitle", () => {
    it("should parse course name and code correctly from standard parenthesis format", () => {
      const result = parseCourseTitle("Software Engineering (CS301)")
      expect(result.name).toBe("Software Engineering")
      expect(result.code).toBe("CS301")
      expect(result.ar).toBe("Software Engineering")
      expect(result.en).toBe("CS301")
    })

    it("should parse Arabic name and English subtitle/code correctly", () => {
      const result = parseCourseTitle("هندسة البرمجيات (Software Engineering)")
      expect(result.ar).toBe("هندسة البرمجيات")
      expect(result.en).toBe("Software Engineering")
    })

    it("should return full title as name/ar and empty code/en when no parentheses are present", () => {
      const result = parseCourseTitle("Computer Architecture")
      expect(result.name).toBe("Computer Architecture")
      expect(result.code).toBe("")
      expect(result.ar).toBe("Computer Architecture")
      expect(result.en).toBe("")
    })

    it("should return empty strings for empty input", () => {
      const result = parseCourseTitle("")
      expect(result).toEqual({ ar: "", en: "", name: "", code: "" })
    })
  })
})

