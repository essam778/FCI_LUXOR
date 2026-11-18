"use client"

import * as React from "react"
import {
  HelpCircle,
  Clock,
  X,
  Award,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { QuizQuestion } from "@/data/coursesData"
import { formatDuration, formatStopwatch } from "@/lib/quizTracker"

export interface ActiveQuizSession {
  lectureId: string
  lectureTitle: string
  questions: QuizQuestion[]
  currentIndex: number
  isGraded: boolean
  startTime?: number
  elapsedSeconds: number
  isMockExam?: boolean
  isMistakePractice?: boolean
  timeLimitSeconds?: number
}

export interface QuizAssessmentModalProps {
  courseCode: string
  session: ActiveQuizSession | null
  quizAnswers: Record<string, Record<string, number>>
  onClose: () => void
  onSelectAnswer: (lectureId: string, questionId: string | number, optionIndex: number) => void
  onSubmitQuiz: (lectureId: string) => void
  onResetQuiz: (lectureId: string) => void
  onSetSession: React.Dispatch<React.SetStateAction<ActiveQuizSession | null>>
}

export function QuizAssessmentModal({
  courseCode,
  session,
  quizAnswers,
  onClose,
  onSelectAnswer,
  onSubmitQuiz,
  onResetQuiz,
  onSetSession,
}: QuizAssessmentModalProps) {
  if (!session) return null

  const currentAnswers = quizAnswers[session.lectureId] || {}
  const total = session.questions.length

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-xl flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
    >
      {/* Header Bar */}
      <div className="w-full border-b border-border/60 bg-card/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shrink-0">
            <HelpCircle className="size-5" />
          </div>
          <div className="text-start">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-primary uppercase tracking-wider font-mono">
                {courseCode}
              </span>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground font-semibold truncate max-w-[200px] sm:max-w-md">
                {session.lectureTitle}
              </span>
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-foreground">
              {session.isGraded ? "تقرير أداء الاختبار الأكاديمي" : "الاختبار التفاعلي المباشر"}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live stopwatch / timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs font-mono font-bold text-foreground">
            <Clock className="size-3.5 text-primary animate-pulse" />
            <span>
              {session.timeLimitSeconds
                ? `متبقي: ${formatStopwatch(Math.max(0, session.timeLimitSeconds - session.elapsedSeconds))}`
                : `الوقت: ${formatStopwatch(session.elapsedSeconds)}`}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-9 px-3 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted text-xs font-bold gap-1 cursor-pointer"
          >
            <span>العودة للمحاضرة</span>
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        {session.isGraded ? (
          /* ===== SCORECARD & COMPREHENSIVE REVIEW ===== */
          <div className="space-y-6 animate-in zoom-in-95 duration-200 py-4">
            {/* Score Hero Card */}
            {(() => {
              const correct = session.questions.filter(
                (q) => currentAnswers[q.id] === q.correctIndex
              ).length
              const pct = total > 0 ? Math.round((correct / total) * 100) : 0
              const isPassed = pct >= 60
              const isExcellent = pct >= 85

              return (
                <div className="p-6 sm:p-8 rounded-3xl border border-border bg-gradient-to-b from-card to-card/60 shadow-2xl space-y-6 text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500" />

                  <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto">
                    <Award className="size-8" />
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-xl sm:text-2xl font-black text-foreground">
                      {isExcellent ? "أداء استثنائي ومتميز" : isPassed ? "اجتياز الاختبار بنجاح" : "بحاجة لمزيد من المراجعة"}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {isPassed
                        ? "أظهرت استيعاباً متميزاً لمفاهيم المحاضرة والأسئلة التقنية."
                        : "يرجى مراجعة التفسير الأكاديمي للأسئلة بالأسفل وإعادة المحاولة لترسيخ المفاهيم."}
                    </p>
                  </div>

                  {/* Score metric cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-lg mx-auto pt-2">
                    <div className="p-3 sm:p-4 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="text-xl sm:text-3xl font-black text-primary font-mono">{pct}%</div>
                      <div className="text-[11px] text-muted-foreground font-semibold mt-1">النسبة المئوية</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="text-xl sm:text-3xl font-black text-emerald-400 font-mono">{correct}</div>
                      <div className="text-[11px] text-muted-foreground font-semibold mt-1">إجابات صحيحة</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="text-xl sm:text-3xl font-black text-rose-400 font-mono">{total - correct}</div>
                      <div className="text-[11px] text-muted-foreground font-semibold mt-1">إجابات خاطئة</div>
                    </div>
                    <div className="p-3 sm:p-4 rounded-2xl bg-muted/40 border border-border/60">
                      <div className="text-sm sm:text-lg font-black text-amber-400 font-mono">
                        {formatDuration(session.elapsedSeconds)}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-semibold mt-1">الوقت المستغرق</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                    <Button
                      onClick={() => {
                        onResetQuiz(session.lectureId)
                        onSetSession((prev) =>
                          prev ? { ...prev, currentIndex: 0, isGraded: false } : null
                        )
                      }}
                      variant="outline"
                      className="h-10 px-5 rounded-xl border-border text-xs font-bold gap-2 cursor-pointer hover:bg-muted"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>إعادة الاختبار من البداية</span>
                    </Button>
                    <Button
                      onClick={onClose}
                      className="btn-primary-glow h-10 px-6 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <span>العودة للمحاضرة</span>
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* Detailed Questions Review List (English / LTR) */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-bold text-foreground">
                  مراجعة الأسئلة والتفسير الأكاديمي بالتفصيل
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {total} Items
                </span>
              </div>

              <div className="space-y-3.5">
                {session.questions.map((q, qIdx) => {
                  const chosenOpt = currentAnswers[q.id]
                  const isCorrect = chosenOpt === q.correctIndex
                  const isUnanswered = chosenOpt === undefined

                  return (
                    <div
                      key={q.id || qIdx}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all text-start space-y-3 ${
                        isCorrect
                          ? "border-emerald-500/30 bg-emerald-950/10"
                          : "border-rose-500/30 bg-rose-950/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          QUESTION #{qIdx + 1}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            isCorrect
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {isCorrect ? "إجابة صحيحة" : isUnanswered ? "لم يتم الإجابة" : "إجابة غير صحيحة"}
                        </span>
                      </div>

                      {/* Question text in English LTR */}
                      <div dir="ltr" className="font-semibold text-slate-100 text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap text-left">
                        {q.question}
                      </div>

                      {/* Options list in English LTR */}
                      <div dir="ltr" className="space-y-2 pt-1 font-sans text-left">
                        {q.options.map((opt, optIdx) => {
                          const isThisChosen = chosenOpt === optIdx
                          const isThisCorrect = q.correctIndex === optIdx

                          let style = "border-border/50 bg-card/60 text-muted-foreground"
                          if (isThisCorrect) {
                            style = "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 font-bold"
                          } else if (isThisChosen && !isThisCorrect) {
                            style = "border-rose-500/60 bg-rose-500/15 text-rose-300 font-bold"
                          }

                          const optionLetters = ["A", "B", "C", "D", "E"]

                          return (
                            <div
                              key={optIdx}
                              className={`p-2.5 sm:p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between gap-3 ${style}`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="size-6 rounded-lg bg-black/30 border border-current/20 flex items-center justify-center font-mono font-black text-xs shrink-0">
                                  {optionLetters[optIdx] || optIdx + 1}
                                </span>
                                <span className="leading-relaxed whitespace-pre-wrap">{opt}</span>
                              </div>
                              {isThisCorrect && (
                                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                              )}
                              {isThisChosen && !isThisCorrect && (
                                <XCircle className="size-4 text-rose-400 shrink-0" />
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Academic Explanation */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-1.5 text-primary font-bold text-[11px]">
                            <HelpCircle className="size-3.5" />
                            <span>Academic Explanation / التفسير الأكاديمي:</span>
                          </div>
                          <p dir="ltr" className="text-left font-sans leading-relaxed whitespace-pre-wrap text-foreground/90">
                            {q.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ===== LIVE INTERACTIVE ASSESSMENT MODE ===== */
          (() => {
            const currentQ = session.questions[session.currentIndex]
            const answeredCount = Object.keys(currentAnswers).length
            const currentChosen = currentQ ? currentAnswers[currentQ.id] : undefined
            const progressPct = ((session.currentIndex + 1) / total) * 100
            const optionLetters = ["A", "B", "C", "D", "E"]

            return (
              <div className="space-y-6 animate-in fade-in-50 duration-200 py-4">
                {/* Top Progress Bar & Step Tracker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
                    <span className="font-bold text-foreground">
                      Question {session.currentIndex + 1} of {total}
                    </span>
                    <span>{answeredCount} of {total} answered</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-300 rounded-full"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>

                {/* Question Navigator Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none justify-start sm:justify-center">
                  {session.questions.map((q, idx) => {
                    const isAns = currentAnswers[q.id] !== undefined
                    const isCur = idx === session.currentIndex
                    return (
                      <button
                        key={q.id || idx}
                        type="button"
                        onClick={() =>
                          onSetSession((prev) => (prev ? { ...prev, currentIndex: idx } : null))
                        }
                        className={`h-8 min-w-[32px] px-2.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                          isCur
                            ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/40 scale-105"
                            : isAns
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                            : "bg-muted/40 text-muted-foreground border border-border/50 hover:bg-muted"
                        }`}
                      >
                        {idx + 1}
                      </button>
                    )
                  })}
                </div>

                {/* Active Question Box (Strict LTR for English technical content) */}
                {currentQ && (
                  <div className="p-5 sm:p-8 rounded-3xl border border-border/80 bg-card/80 backdrop-blur-sm shadow-xl space-y-6">
                    <div className="flex items-center justify-between border-b border-border/40 pb-3">
                      <span className="text-xs font-mono font-black text-primary px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
                        QUESTION {String(session.currentIndex + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-sans">
                        Select one answer
                      </span>
                    </div>

                    {/* Question Text (LTR English) */}
                    <div
                      dir="ltr"
                      className="font-semibold text-slate-100 text-sm sm:text-base md:text-lg font-sans leading-relaxed whitespace-pre-wrap text-left"
                    >
                      {currentQ.question}
                    </div>

                    {/* Options List (LTR English) */}
                    <div dir="ltr" className="space-y-3 font-sans text-left">
                      {currentQ.options.map((opt, optIdx) => {
                        const isSelected = currentChosen === optIdx
                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() =>
                              onSelectAnswer(session.lectureId, currentQ.id, optIdx)
                            }
                            className={`w-full p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm transition-all flex items-center justify-between gap-3 text-left cursor-pointer group ${
                              isSelected
                                ? "border-primary bg-primary/15 text-foreground font-bold shadow-md shadow-primary/10 ring-1 ring-primary/50"
                                : "border-border/60 bg-muted/20 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`size-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-colors ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground font-black"
                                    : "bg-muted/70 text-foreground group-hover:bg-muted"
                                }`}
                              >
                                {optionLetters[optIdx] || optIdx + 1}
                              </span>
                              <span className="leading-relaxed whitespace-pre-wrap">{opt}</span>
                            </div>
                            {isSelected && (
                              <div className="size-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                                <Check className="size-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Navigation and Submission Controls */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <Button
                    variant="outline"
                    disabled={session.currentIndex === 0}
                    onClick={() =>
                      onSetSession((prev) =>
                        prev ? { ...prev, currentIndex: Math.max(0, prev.currentIndex - 1) } : null
                      )
                    }
                    className="h-10 px-4 rounded-xl text-xs font-bold gap-1.5 cursor-pointer disabled:opacity-30"
                  >
                    <ArrowRight className="size-4" />
                    <span>السابق</span>
                  </Button>

                  {session.currentIndex === total - 1 ? (
                    <Button
                      onClick={() => {
                        onSubmitQuiz(session.lectureId)
                        onSetSession((prev) => (prev ? { ...prev, isGraded: true } : null))
                      }}
                      className="btn-primary-glow h-11 px-6 rounded-xl text-xs sm:text-sm font-bold gap-2 cursor-pointer shadow-xl shadow-primary/20"
                    >
                      <CheckCircle2 className="size-4" />
                      <span>إنهاء الاختبار واعتماد النتيجة</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={() =>
                        onSetSession((prev) =>
                          prev ? { ...prev, currentIndex: Math.min(total - 1, prev.currentIndex + 1) } : null
                        )
                      }
                      className="h-10 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold gap-1.5 cursor-pointer"
                    >
                      <span>التالي</span>
                      <ArrowLeft className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            )
          })()
        )}
      </div>
    </div>
  )
}
