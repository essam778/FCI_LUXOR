import { describe, it, expect } from "vitest"
import {
  parseDeviceTokens,
  addDeviceToken,
  removeDeviceToken,
  isDeviceTokenValid,
  MAX_ACTIVE_DEVICES,
} from "@/lib/auth/deviceSession"

describe("Device Session Management (2-Device Policy)", () => {
  describe("parseDeviceTokens", () => {
    it("should return empty array for null, undefined, or empty string", () => {
      expect(parseDeviceTokens(null)).toEqual([])
      expect(parseDeviceTokens(undefined)).toEqual([])
      expect(parseDeviceTokens("")).toEqual([])
      expect(parseDeviceTokens("   ")).toEqual([])
    })

    it("should parse single legacy token", () => {
      expect(parseDeviceTokens("token-123")).toEqual(["token-123"])
    })

    it("should parse comma-separated tokens with spaces", () => {
      expect(parseDeviceTokens("token-1, token-2 , token-3")).toEqual([
        "token-1",
        "token-2",
        "token-3",
      ])
    })

    it("should parse JSON array of tokens", () => {
      expect(parseDeviceTokens('["token-1", "token-2"]')).toEqual([
        "token-1",
        "token-2",
      ])
    })
  })

  describe("addDeviceToken", () => {
    it("should add the first token when database is empty", () => {
      const result = addDeviceToken(null, "token-mobile")
      expect(result).toBe("token-mobile")
    })

    it("should allow a 2nd device without kicking the 1st device", () => {
      const result = addDeviceToken("token-mobile", "token-laptop", 2)
      expect(result).toBe("token-mobile,token-laptop")
    })

    it("should evict the oldest device when a 3rd device logs in (FIFO)", () => {
      const result = addDeviceToken("token-mobile,token-laptop", "token-tablet", 2)
      expect(result).toBe("token-laptop,token-tablet")
    })

    it("should refresh position if an existing device logs in again", () => {
      const result = addDeviceToken("token-mobile,token-laptop", "token-mobile", 2)
      expect(result).toBe("token-laptop,token-mobile")
    })

    it("should respect MAX_ACTIVE_DEVICES constant", () => {
      expect(MAX_ACTIVE_DEVICES).toBe(2)
      let tokens = addDeviceToken(null, "dev-1")
      tokens = addDeviceToken(tokens, "dev-2")
      expect(parseDeviceTokens(tokens)).toHaveLength(2)
      tokens = addDeviceToken(tokens, "dev-3")
      expect(parseDeviceTokens(tokens)).toEqual(["dev-2", "dev-3"])
    })
  })

  describe("removeDeviceToken", () => {
    it("should remove target token and preserve other device", () => {
      const result = removeDeviceToken("token-mobile,token-laptop", "token-mobile")
      expect(result).toBe("token-laptop")
    })

    it("should return empty string if the only device logs out", () => {
      const result = removeDeviceToken("token-mobile", "token-mobile")
      expect(result).toBe("")
    })

    it("should not modify list if token to remove is not found", () => {
      const result = removeDeviceToken("token-mobile,token-laptop", "token-unknown")
      expect(result).toBe("token-mobile,token-laptop")
    })
  })

  describe("isDeviceTokenValid", () => {
    it("should return true if clientToken is in the list", () => {
      expect(isDeviceTokenValid("token-mobile,token-laptop", "token-mobile")).toBe(true)
      expect(isDeviceTokenValid("token-mobile,token-laptop", "token-laptop")).toBe(true)
    })

    it("should return false if clientToken was evicted by newer devices", () => {
      expect(isDeviceTokenValid("token-laptop,token-tablet", "token-mobile")).toBe(false)
    })

    it("should return false if clientToken is null, undefined, or empty", () => {
      expect(isDeviceTokenValid("token-mobile", null)).toBe(false)
      expect(isDeviceTokenValid("token-mobile", undefined)).toBe(false)
      expect(isDeviceTokenValid("token-mobile", "")).toBe(false)
    })

    it("should return false if db has no active tokens", () => {
      expect(isDeviceTokenValid(null, "token-mobile")).toBe(false)
      expect(isDeviceTokenValid("", "token-mobile")).toBe(false)
    })
  })
})
