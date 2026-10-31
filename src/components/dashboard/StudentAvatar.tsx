"use client"

import * as React from "react"
import { User as UserIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface StudentAvatarProps {
  size?: "sm" | "md" | "lg"
  className?: string
  fallbackText?: string
  userId?: string | null
  userEmail?: string | null
  avatarUrl?: string | null
}

export function StudentAvatar({
  size = "md",
  className = "",
  fallbackText,
  userId,
  userEmail,
  avatarUrl,
}: StudentAvatarProps) {
  const [avatarImage, setAvatarImage] = React.useState<string | null>(avatarUrl || null)
  const [avatarEmoji, setAvatarEmoji] = React.useState<string>("🎓")

  // Sync when prop changes
  React.useEffect(() => {
    if (avatarUrl !== undefined) {
      setAvatarImage(avatarUrl)
    }
  }, [avatarUrl])

  const loadAvatar = React.useCallback(() => {
    if (typeof window === "undefined") return

    // Clean up legacy unscoped keys
    try {
      localStorage.removeItem("fci_user_avatar_image")
      localStorage.removeItem("fci_user_avatar")
    } catch {
      // ignore
    }

    if (avatarUrl) {
      setAvatarImage(avatarUrl)
      return
    }

    if (userId) {
      // 1. Check scoped cache for fast paint
      try {
        const scopedImage = localStorage.getItem(`fci_avatar_image_${userId}`)
        const scopedEmoji = localStorage.getItem(`fci_avatar_emoji_${userId}`)
        if (scopedImage) setAvatarImage(scopedImage)
        if (scopedEmoji) setAvatarEmoji(scopedEmoji)
      } catch {
        // ignore
      }

      // 2. Fetch ground truth from Supabase database
      try {
        const supabase = createClient()
        supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .single()
          .then(({ data }) => {
            const profileData = data as { avatar_url?: string | null } | null
            if (profileData?.avatar_url) {
              setAvatarImage(profileData.avatar_url)
              try {
                localStorage.setItem(`fci_avatar_image_${userId}`, profileData.avatar_url)
              } catch {
                // ignore
              }
            } else if (!avatarUrl) {
              // No image in Supabase
              setAvatarImage(null)
              try {
                localStorage.removeItem(`fci_avatar_image_${userId}`)
              } catch {
                // ignore
              }
            }
          })
      } catch {
        // ignore
      }
    } else {
      setAvatarImage(null)
    }
  }, [userId, avatarUrl])

  React.useEffect(() => {
    loadAvatar()

    const handleUpdate = () => {
      loadAvatar()
    }

    window.addEventListener("fci_avatar_updated", handleUpdate)
    window.addEventListener("storage", handleUpdate)
    return () => {
      window.removeEventListener("fci_avatar_updated", handleUpdate)
      window.removeEventListener("storage", handleUpdate)
    }
  }, [loadAvatar])

  const sizeClasses = {
    sm: "size-8 text-sm",
    md: "size-10 text-base",
    lg: "size-16 text-2xl",
  }[size]

  const initials = (fallbackText || userEmail || "")
    .replace(/@.*$/, "")
    .trim()
    .slice(0, 2)
    .toUpperCase()

  if (avatarImage) {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-primary/30 shadow-xs shrink-0 ${sizeClasses} ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarImage}
          alt="الصورة الشخصية"
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs shrink-0 select-none ${sizeClasses} ${className}`}
    >
      {initials ? (
        <span className="font-black text-xs sm:text-sm">{initials}</span>
      ) : avatarEmoji ? (
        <span>{avatarEmoji}</span>
      ) : (
        <UserIcon className="size-1/2" />
      )}
    </div>
  )
}
