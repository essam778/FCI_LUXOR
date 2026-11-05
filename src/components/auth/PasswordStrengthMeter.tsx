"use client"

import * as React from "react"
import { Check, X } from "lucide-react"

export interface PasswordCriteria {
  label: string
  valid: boolean
}

export function evaluatePassword(password: string) {
  const criteria: PasswordCriteria[] = [
    { label: "8 أحرف على الأقل", valid: password.length >= 8 },
    { label: "حرف كبير بالإنجليزية (A-Z)", valid: /[A-Z]/.test(password) },
    { label: "حرف صغير بالإنجليزية (a-z)", valid: /[a-z]/.test(password) },
    { label: "رقم واحد على الأقل (0-9)", valid: /[0-9]/.test(password) },
    { label: "رمز أو علامة خاصة (!@#$...)", valid: /[^A-Za-z0-9]/.test(password) },
  ]

  const passedCount = criteria.filter((c) => c.valid).length
  const percentage = Math.round((passedCount / criteria.length) * 100)

  let label = "ضعيفة جداً"
  let colorClass = "bg-primary/30"

  if (passedCount === 0) {
    label = "أدخل كلمة المرور"
    colorClass = "bg-muted"
  } else if (passedCount === 1) {
    label = "ضعيفة جداً"
    colorClass = "bg-primary/40 shadow-xs shadow-primary/20"
  } else if (passedCount === 2) {
    label = "مقبولة"
    colorClass = "bg-primary/60 shadow-xs shadow-primary/30"
  } else if (passedCount === 3) {
    label = "جيدة"
    colorClass = "bg-primary/80 shadow-sm shadow-primary/40"
  } else if (passedCount === 4) {
    label = "قوية"
    colorClass = "bg-primary shadow-md shadow-primary/50"
  } else if (passedCount === 5) {
    label = "قوية جداً ومحمية بالكامل"
    colorClass = "bg-primary shadow-lg shadow-primary/70"
  }

  return { criteria, passedCount, percentage, label, colorClass, isStrong: passedCount >= 4 }
}

interface PasswordStrengthMeterProps {
  password: string
  showCriteria?: boolean
}

export function PasswordStrengthMeter({
  password,
  showCriteria = true,
}: PasswordStrengthMeterProps) {
  const { criteria, percentage, label, colorClass } = evaluatePassword(password)

  if (!password && !showCriteria) {
    return null
  }

  return (
    <div className="space-y-2.5 pt-1 text-xs animate-in fade-in duration-200">
      {/* Header & Percentage */}
      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-muted-foreground flex items-center gap-1.5">
          <span>قوة كلمة المرور:</span>
          <span className="text-primary font-bold">{password ? label : "في انتظار الإدخال"}</span>
        </span>
        <span className="font-mono text-primary font-bold" dir="ltr">
          {percentage}%
        </span>
      </div>

      {/* Blue Progress Bar that advances and lights up in site primary blue */}
      <div className="h-2 w-full rounded-full bg-muted/70 overflow-hidden p-0.5 border border-border/40">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${colorClass}`}
          style={{ width: `${Math.max(percentage, password ? 10 : 0)}%` }}
        />
      </div>

      {/* Real-time requirements checklist */}
      {showCriteria && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1.5 border-t border-border/40">
          {criteria.map((item, index) => {
            const active = item.valid && password.length > 0
            return (
              <div
                key={index}
                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                  active
                    ? "text-primary font-bold dark:text-primary-foreground/90"
                    : "text-muted-foreground/60"
                }`}
              >
                <div
                  className={`size-4 rounded-full flex items-center justify-center shrink-0 text-[10px] transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs shadow-primary/40 scale-105"
                      : "bg-muted/80 text-muted-foreground/50 border border-border/60"
                  }`}
                >
                  {active ? (
                    <Check className="size-2.5 stroke-[3]" />
                  ) : (
                    <X className="size-2 stroke-[2.5]" />
                  )}
                </div>
                <span className="text-[11px]">{item.label}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

