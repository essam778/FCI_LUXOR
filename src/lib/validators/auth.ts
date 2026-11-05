import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
  password: z.string().min(6, "كلمة المرور يجب أن لا تقل عن 6 أحرف"),
})

export const resetPasswordSchema = z.object({
  email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
})

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن لا تقل عن 8 أحرف")
      .regex(/[A-Z]/, "يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل (A-Z)")
      .regex(/[a-z]/, "يجب أن تحتوي كلمة المرور على حرف صغير واحد على الأقل (a-z)")
      .regex(/[0-9]/, "يجب أن تحتوي كلمة المرور على رقم واحد على الأقل (0-9)")
      .regex(/[^A-Za-z0-9]/, "يجب أن تحتوي كلمة المرور على رمز خاص واحد على الأقل (!@#$...)"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين",
    path: ["confirmPassword"],
  })

export const signupSchema = z
  .object({
    displayName: z.string().min(2, "الاسم يجب أن لا يقل عن حرفين"),
    email: z.string().email("يرجى إدخال بريد إلكتروني صحيح"),
    password: z
      .string()
      .min(8, "كلمة المرور يجب أن لا تقل عن 8 أحرف"),
    confirmPassword: z.string().min(1, "يرجى تأكيد كلمة المرور"),
    university: z.string().optional(),
    level: z.coerce.number().min(1).max(4).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين، يرجى التأكد من تطابق الحقلين",
    path: ["confirmPassword"],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
