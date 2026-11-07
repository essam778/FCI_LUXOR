import { describe, it, expect } from "vitest"
import { cn } from "@/lib/utils"

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
})

