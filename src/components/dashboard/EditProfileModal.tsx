"use client"

import * as React from "react"
import { useActionState } from "react"
import { Pencil, Loader2, CheckCircle2, AlertCircle, X, Upload, Trash2, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateProfile, type ProfileActionResult } from "@/lib/actions/profile"

interface EditProfileModalProps {
  userId?: string
  currentName: string
  currentLevel: number
  currentUniversity: string
  currentAvatarUrl?: string | null
}

const AVATAR_OPTIONS = ["👨‍💻", "👩‍💻", "🚀", "⚡", "🎓", "🤖", "💡", "🧠"]

export function EditProfileModal({
  userId,
  currentName,
  currentLevel,
  currentUniversity,
  currentAvatarUrl,
}: EditProfileModalProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadedImage, setUploadedImage] = React.useState<string | null>(() => {
    if (currentAvatarUrl) return currentAvatarUrl
    if (typeof window !== "undefined") {
      if (userId) {
        return localStorage.getItem(`fci_avatar_image_${userId}`)
      }
    }
    return null
  })

  // Sync with currentAvatarUrl if it loads or changes
  React.useEffect(() => {
    if (currentAvatarUrl !== undefined) {
      setUploadedImage(currentAvatarUrl)
    }
  }, [currentAvatarUrl])

  const [selectedAvatar, setSelectedAvatar] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      if (userId) {
        return localStorage.getItem(`fci_avatar_emoji_${userId}`) || "🎓"
      }
    }
    return "🎓"
  })

  const [state, formAction, isPending] = useActionState<ProfileActionResult | null, FormData>(
    updateProfile,
    null
  )

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("يرجى اختيار ملف صورة صالح (JPG, PNG, WebP).")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string
      // Automatically resize and compress image to 400x400 max so it is sharp, instant, and lightweight (< 60KB)
      const img = new Image()
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas")
          const maxDim = 400
          let { width, height } = img
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height)
            const compressed = canvas.toDataURL("image/jpeg", 0.85)
            setUploadedImage(compressed)
          } else {
            setUploadedImage(rawDataUrl)
          }
        } catch {
          setUploadedImage(rawDataUrl)
        }
      }
      img.onerror = () => {
        setUploadedImage(rawDataUrl)
      }
      img.src = rawDataUrl
    }
    reader.readAsDataURL(file)
  }


  const handleRemoveImage = () => {
    setUploadedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  React.useEffect(() => {
    if (state?.success) {
      localStorage.removeItem("fci_user_avatar_image")
      localStorage.removeItem("fci_user_avatar")

      if (userId) {
        if (uploadedImage) {
          localStorage.setItem(`fci_avatar_image_${userId}`, uploadedImage)
        } else {
          localStorage.removeItem(`fci_avatar_image_${userId}`)
        }
        localStorage.setItem(`fci_avatar_emoji_${userId}`, selectedAvatar)
      }
      window.dispatchEvent(new Event("fci_avatar_updated"))

      const timer = setTimeout(() => {
        setIsOpen(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [state, uploadedImage, selectedAvatar, userId])

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="gap-2 text-xs font-bold"
      >
        <Pencil className="size-3.5 text-primary" />
        <span>تعديل الملف والصورة</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50 duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 end-4 text-muted-foreground hover:text-foreground p-1"
            >
              <X className="size-4" />
            </button>

            <div className="space-y-1 text-start">
              <h3 className="text-lg font-black text-foreground">تعديل الملف والصورة الشخصية</h3>
              <p className="text-xs text-muted-foreground">
                يمكنك رفع صورة شخصية حقيقية لك أو اختيار رمز تعبيري وتحديث بياناتك الدراسية.
              </p>
            </div>

            {/* Real Student Image Upload Box */}
            <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 text-start">
              <label className="text-xs font-bold text-foreground block">
                الصورة الشخصية الحقيقية للطالب:
              </label>

              <div className="flex items-center gap-4">
                {uploadedImage ? (
                  <div className="relative size-16 rounded-2xl overflow-hidden border-2 border-primary shadow-sm shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={uploadedImage}
                      alt="معاينة الصورة"
                      className="size-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="size-16 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground shrink-0">
                    <Camera className="size-6 text-muted-foreground/60" />
                    <span className="text-[9px] mt-1">لا توجد صورة</span>
                  </div>
                )}

                <div className="space-y-2 flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id="student-photo-upload"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs gap-1.5 h-8 bg-card hover:bg-muted font-bold"
                    >
                      <Upload className="size-3.5 text-primary" />
                      <span>{uploadedImage ? "تغيير الصورة" : "رفع صورة من جهازك"}</span>
                    </Button>

                    {uploadedImage && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleRemoveImage}
                        className="text-xs text-destructive hover:bg-destructive/10 h-8 gap-1"
                      >
                        <Trash2 className="size-3.5" />
                        <span>حذف</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    يدعم JPG و PNG و WebP (الحد الأقصى 3 ميجابايت)
                  </p>
                </div>
              </div>
            </div>

            {/* Emoji Avatar Fallback Selector */}
            {!uploadedImage && (
              <div className="space-y-2 text-start">
                <label className="text-xs font-bold text-muted-foreground">
                  أو اختر رمزاً تعبيرياً بديلاً:
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setSelectedAvatar(emoji)}
                      className={`size-10 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                        selectedAvatar === emoji
                          ? "bg-primary/20 border-2 border-primary scale-110 shadow-xs"
                          : "bg-muted/40 border border-border hover:bg-muted"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {state?.error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
                <AlertCircle className="size-4 shrink-0" />
                <span>{state.error}</span>
              </div>
            )}

            {state?.success && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>{state.message}</span>
              </div>
            )}

            <form action={formAction} className="space-y-4 text-start">
              <input type="hidden" name="avatarData" value={uploadedImage || ""} />
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground" htmlFor="displayName">
                  الاسم الكامل:
                </label>
                <Input
                  id="displayName"
                  name="displayName"
                  defaultValue={currentName}
                  required
                  placeholder="اسمك الكامل"
                  className="text-xs bg-muted/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground" htmlFor="level">
                    الفرقة الدراسية:
                  </label>
                  <select
                    id="level"
                    name="level"
                    defaultValue={currentLevel}
                    className="w-full h-9 rounded-xl border border-input bg-muted/30 px-3 text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value={1} className="bg-card">الفرقة الأولى</option>
                    <option value={2} className="bg-card">الفرقة الثانية</option>
                    <option value={3} className="bg-card">الفرقة الثالثة</option>
                    <option value={4} className="bg-card">الفرقة الرابعة</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground" htmlFor="university">
                    الجامعة:
                  </label>
                  <Input
                    id="university"
                    name="university"
                    defaultValue={currentUniversity}
                    placeholder="جامعة القاهرة"
                    className="text-xs bg-muted/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="text-xs"
                >
                  إلغاء
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="text-xs font-bold gap-1.5 px-5"
                >
                  {isPending && <Loader2 className="size-3.5 animate-spin" />}
                  <span>حفظ التعديلات</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
