"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full"
        aria-label="تبديل المظهر"
      >
        <span className="size-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      title={resolvedTheme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
      aria-label="تبديل المظهر بين الداكن والفاتح"
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-5 text-slate-700 transition-transform hover:-rotate-12" />
      )}
    </Button>
  )
}
