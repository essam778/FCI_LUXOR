"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export interface ProfileActionResult {
  success?: boolean
  error?: string
  message?: string
}

export async function updateProfile(
  prevState: ProfileActionResult | null,
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "يجب تسجيل الدخول أولاً لتعديل الملف الشخصي" }
    }

    const displayName = (formData.get("displayName") as string)?.trim()
    const levelStr = formData.get("level") as string
    const university = (formData.get("university") as string)?.trim()

    const level = levelStr ? parseInt(levelStr, 10) : 1

    if (!displayName) {
      return { error: "يرجى إدخال الاسم" }
    }

    if (level < 1 || level > 4) {
      return { error: "الفرقة الدراسية يجب أن تكون بين 1 و 4" }
    }

    const avatarData = (formData.get("avatarData") as string)?.trim()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profilePayload: any = {
      display_name: displayName,
      level,
      university: university || null,
    }

    if (avatarData) {
      profilePayload.avatar_url = avatarData
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("profiles") as any)
      .update(profilePayload)
      .eq("id", user.id)

    if (error) {
      return { error: `حدث خطأ أثناء حفظ البيانات: ${error.message}` }
    }

    // Also persist into user_avatars table if avatarData provided
    if (avatarData) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("user_avatars") as any).upsert(
          {
            user_id: user.id,
            image_data: avatarData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
      } catch (avatarErr) {
        console.warn("Avatar table upsert warning:", avatarErr)
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/courses")
    return { success: true, message: "تم تحديث بياناتك بنجاح!" }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "فشل تحديث البيانات"
    return { error: msg }
  }
}
