"use client"

import * as React from "react"
import { useState, useId } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Typewriter } from "@/components/ui/typewriter"
import { Label } from "@/components/ui/label"

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId()
    const [showPassword, setShowPassword] = useState(false)
    const togglePasswordVisibility = () => setShowPassword((prev) => !prev)

    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <input
            id={id}
            type={showPassword ? "text" : "password"}
            dir="ltr"
            className={cn(
              "flex h-11 w-full rounded-xl border border-border/80 bg-background/60 px-4 pe-11 text-sm text-foreground shadow-xs transition-all placeholder:text-muted-foreground/60 focus-visible:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50",
              className
            )}
            ref={ref}
            {...props}
          />
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none cursor-pointer"
            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            {showPassword ? (
              <EyeOff className="size-4" aria-hidden="true" />
            ) : (
              <Eye className="size-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    )
  }
)
PasswordInput.displayName = "PasswordInput"

export interface AuthContentProps {
  image?: {
    src: string
    alt: string
  }
  quote?: {
    text: string | string[]
    author: string
  }
}

export interface AuthUIProps {
  signInContent?: AuthContentProps
  signUpContent?: AuthContentProps
  children?: React.ReactNode
  quoteSide?: "left" | "right"
  mode?: "signin" | "signup"
}

export const defaultSignInContent: AuthContentProps = {
  image: {
    src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1600&auto=format&fit=crop",
    alt: "Computer Science Coding & Focus",
  },
  quote: {
    text: [
      "التعليم ليس ملء وعاء، بل إيقاد شعلة الإبداع والبرمجة المستمرة.",
      "كل سطر برمجي تكتبه اليوم هو لبنة في صرح مستقبلك الأكاديمي والمهني.",
    ],
    author: "كلية الحاسبات والمعلومات | STUDY++",
  },
}

export const defaultSignUpContent: AuthContentProps = {
  image: {
    src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop",
    alt: "Modern Collaborative Workspace",
  },
  quote: {
    text: [
      "انضم إلى مجتمع STUDY++ الأكاديمي، وابدأ رحلة التميز الحقيقي.",
      "شروحات دقيقة، ملخصات مركزة، واختبارات تفاعلية تصنع فارقك.",
    ],
    author: "مجتمع STUDY++ الطلابي",
  },
}

export function AuthUI({
  signInContent = {},
  signUpContent = {},
  children,
  mode = "signin",
}: AuthUIProps) {
  const isSignIn = mode === "signin"

  const finalSignInContent = {
    image: { ...defaultSignInContent.image, ...signInContent.image },
    quote: { ...defaultSignInContent.quote, ...signInContent.quote },
  }
  const finalSignUpContent = {
    image: { ...defaultSignUpContent.image, ...signUpContent.image },
    quote: { ...defaultSignUpContent.quote, ...signUpContent.quote },
  }

  const currentContent = isSignIn ? finalSignInContent : finalSignUpContent

  return (
    <div className="w-full min-h-[calc(100vh-4.5rem)] lg:grid lg:grid-cols-12 overflow-hidden">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* Form Side (7 cols on lg) */}
      <div className="flex w-full items-center justify-center p-4 sm:p-8 lg:p-12 lg:col-span-7">
        <div className="w-full max-w-lg">{children}</div>
      </div>

      {/* Visual / Quote Hero Side (5 cols on lg) */}
      <div
        className="hidden lg:relative lg:flex lg:col-span-5 flex-col justify-end p-8 xl:p-12 bg-cover bg-center overflow-hidden border-s border-border/40"
        style={{
          backgroundImage: `url(${currentContent.image.src})`,
        }}
        key={currentContent.image.src}
      >
        {/* Layered dark luxury glass gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/25 dark:from-background dark:via-background/80 dark:to-background/40 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-primary/10 mix-blend-overlay" />

        {/* Content Box */}
        <div className="relative z-10 w-full rounded-2xl bg-card/60 dark:bg-card/40 backdrop-blur-xl border border-white/10 dark:border-white/5 p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-primary uppercase">
              STUDY<span className="font-black">++</span>
            </span>
          </div>

          <blockquote className="space-y-2">
            <p className="text-base sm:text-lg font-bold leading-relaxed text-foreground min-h-[3.5rem]">
              «
              <Typewriter
                key={Array.isArray(currentContent.quote.text) ? currentContent.quote.text[0] : (currentContent.quote.text || "")}
                text={currentContent.quote.text || ""}
                speed={50}
                delay={2500}
                loop={true}
              />
              »
            </p>
            <cite className="block text-xs font-medium text-muted-foreground not-italic">
              — {currentContent.quote.author}
            </cite>
          </blockquote>
        </div>
      </div>
    </div>
  )
}

export function DemoOne() {
  return <AuthUI />
}

