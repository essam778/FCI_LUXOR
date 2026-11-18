"use client"

import * as React from "react"
import {
  AlertCircle,
  X,
  Sparkles,
  XCircle,
  CheckCircle2,
  Target,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MistakeQuestionItem } from "@/lib/quizTracker"

export interface MistakeBankModalProps {
  isOpen: boolean
  onClose: () => void
  mistakesList: MistakeQuestionItem[]
  onClearAll: () => void
  onResolveMistake: (questionId: string | number) => void
  onPracticeMistakes: () => void
}

export function MistakeBankModal({
  isOpen,
  onClose,
  mistakesList,
  onClearAll,
  onResolveMistake,
  onPracticeMistakes,
}: MistakeBankModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      <div className="bg-card border border-border/80 rounded-3xl max-w-2xl w-full p-4 sm:p-6 space-y-5 shadow-2xl my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-foreground">
                بنك مراجعة الأخطاء (Smart Mistake Bank)
              </h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground">
                الأسئلة التي أخطأت في إجابتها سابقاً لتقوم بمراجعتها وإعادة التدرب عليها
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {mistakesList.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <div className="size-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
              <Sparkles className="size-7" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-foreground">لا توجد أخطاء مسجلة حالياً!</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                رائع جداً! إما أنك لم تخطئ في أي كويز، أو قمت بمراجعة وتصحيح جميع أخطائك بنجاح.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="font-bold text-foreground">
                عدد الأسئلة المطلوب مراجعتها: {mistakesList.length}
              </span>
              <button
                type="button"
                onClick={onClearAll}
                className="text-rose-400 hover:text-rose-300 underline font-semibold cursor-pointer"
              >
                مسح السجل بالكامل
              </button>
            </div>

            <div className="max-h-[50vh] overflow-y-auto space-y-3 pe-1">
              {mistakesList.map((m) => (
                <div
                  key={m.questionId}
                  className="p-3.5 sm:p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-2 text-start"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                      {m.lectureTitle}
                    </span>
                    <button
                      type="button"
                      onClick={() => onResolveMistake(m.questionId)}
                      className="text-[11px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                    >
                      تحديد كتم فهمه وتصحيحه ✓
                    </button>
                  </div>

                  <div dir="ltr" className="text-xs sm:text-sm font-semibold text-foreground text-left font-sans">
                    {m.questionText}
                  </div>

                  <div className="text-xs space-y-1 pt-1">
                    <div className="text-rose-400 flex items-center gap-1.5 font-medium">
                      <XCircle className="size-3.5 shrink-0" />
                      <span>إجابتك السابقة: {m.options[m.userSelectedIndex] || "غير محددة"}</span>
                    </div>
                    <div className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="size-3.5 shrink-0" />
                      <span>الإجابة الصحيحة: {m.options[m.correctIndex]}</span>
                    </div>
                    {m.explanation && (
                      <p dir="ltr" className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded-lg text-left font-sans mt-1">
                        {m.explanation}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/60">
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs font-bold"
              >
                إغلاق
              </Button>
              <Button
                size="sm"
                onClick={onPracticeMistakes}
                className="bg-primary text-primary-foreground text-xs font-bold gap-1.5"
              >
                <Target className="size-3.5" />
                <span>بدء اختبار تدريبي على هذه الأخطاء الآن</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
