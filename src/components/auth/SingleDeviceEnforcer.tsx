"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { verifyDeviceSessionAction } from "@/lib/actions/sessionCheck"

export function SingleDeviceEnforcer() {
  const router = useRouter()
  const pathname = usePathname()

  const checkSession = React.useCallback(async () => {
    // Never kick out if user is on auth pages or public pages
    if (
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/signup") ||
      pathname?.startsWith("/reset-password") ||
      pathname?.startsWith("/auth")
    ) {
      return
    }

    try {
      const res = await verifyDeviceSessionAction()
      if (!res.valid && res.reason === "other_device") {
        router.replace("/login?error=session_expired_other_device")
      }
    } catch {
      // ignore network hiccups
    }
  }, [router, pathname])

  React.useEffect(() => {
    // Grace period on initial mount (3 seconds) to allow auth hydration & cookies to settle
    const initialTimer = setTimeout(() => {
      checkSession()
    }, 3000)

    // Check when user returns to the tab
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Periodic check every 60 seconds
    const interval = setInterval(() => {
      checkSession()
    }, 60000)

    return () => {
      clearTimeout(initialTimer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(interval)
    }
  }, [checkSession])

  return null
}

