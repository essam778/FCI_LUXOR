"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { verifyDeviceSessionAction } from "@/lib/actions/sessionCheck"

export function SingleDeviceEnforcer() {
  const router = useRouter()

  const checkSession = React.useCallback(async () => {
    try {
      const res = await verifyDeviceSessionAction()
      if (!res.valid && res.reason === "other_device") {
        router.replace("/login?error=session_expired_other_device")
      }
    } catch {
      // ignore network hiccups
    }
  }, [router])

  React.useEffect(() => {
    // Initial check on mount
    checkSession()

    // Check when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Periodic check every 45 seconds
    const interval = setInterval(() => {
      checkSession()
    }, 45000)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
    }
  }, [checkSession])

  return null
}

