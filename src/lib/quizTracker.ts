/**
 * Student Study Analytics, Quiz Time Tracker, Mistake Bank & Mastery Engine
 *
 * Architecture (Supabase-first):
 *  - All writes go to Supabase via Server Actions immediately (source of truth).
 *  - localStorage is used ONLY as an optimistic in-memory cache for instant UI
 *    so the user doesn't see a spinner on every click. The cache is refreshed on
 *    every page load from Supabase.
 *  - Public functions remain the same so CourseStudyView.tsx needs minimal changes.
 */

import type { QuizQuestion } from "@/data/coursesData"

export interface MistakeQuestionItem {
  questionId: string | number
  courseId: string
  lectureId: string
  lectureTitle: string
  questionText: string
  options: string[]
  correctIndex: number
  userSelectedIndex: number
  explanation?: string
  recordedAt: number
}

export interface QuizAttemptRecord {
  id: string
  courseId: string
  lectureId: string
  lectureTitle: string
  score: number
  totalQuestions: number
  correctCount: number
  durationSeconds: number
  timestamp: number
  isMockExam?: boolean
}

export interface CourseProgressRecord {
  courseId: string
  completedLectureIds: string[]
  passedQuizLectureIds: string[]
  totalStudySeconds: number
  lastStudiedAt: number
}

export interface MasteryEvaluation {
  tierName: "مبتدئ" | "مجتهد" | "متقدم" | "متميز / عبقري"
  tierBadge: string
  percentage: number
  colorClass: string
  description: string
}

// ==========================================
// 1. DURATION & FORMATTING HELPERS
// ==========================================

export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} ثانية`
  }
  const mins = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60
  if (mins < 60) {
    return remainingSecs > 0 ? `${mins} دقيقة و ${remainingSecs} ثانية` : `${mins} دقيقة`
  }
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours} ساعة و ${remainingMins} دقيقة`
}

export function formatStopwatch(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
  return `${pad(mins)}:${pad(secs)}`
}

// ==========================================
// 2. LOCAL CACHE HELPERS (private)
//    Used as optimistic UI layer only.
//    Real source of truth is Supabase.
// ==========================================

const MISTAKES_KEY_PREFIX = "fci_cache_mistakes_"
const PROGRESS_KEY_PREFIX = "fci_cache_progress_"
const QUIZ_HISTORY_KEY = "fci_cache_quiz_history"

function safeLocalGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeLocalSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

// ==========================================
// 3. MISTAKE BANK (Supabase-first)
// ==========================================

/** Returns the locally cached mistake list (populated by seedMistakesFromDb). */
export function getCourseMistakes(courseId: string): MistakeQuestionItem[] {
  return safeLocalGet<MistakeQuestionItem[]>(`${MISTAKES_KEY_PREFIX}${courseId}`, [])
}

/**
 * Seed local cache from Supabase data.
 * Call this once when CourseStudyView mounts (after server-side fetch).
 */
export function seedMistakesCache(courseId: string, mistakes: MistakeQuestionItem[]): void {
  safeLocalSet(`${MISTAKES_KEY_PREFIX}${courseId}`, mistakes)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fci_mistakes_updated"))
  }
}

/**
 * Records quiz mistakes both locally (optimistic) and to Supabase.
 * Returns arrays of mistakes and resolved question IDs to sync to DB.
 */
export function recordQuizMistakes(
  courseId: string,
  lectureId: string,
  lectureTitle: string,
  questions: QuizQuestion[],
  userAnswers: Record<string | number, number>
): { newMistakes: MistakeQuestionItem[]; resolvedIds: Array<string | number> } {
  const currentMistakes = getCourseMistakes(courseId)
  const mistakeMap = new Map<string | number, MistakeQuestionItem>(
    currentMistakes.map((m) => [m.questionId, m])
  )

  const newMistakes: MistakeQuestionItem[] = []
  const resolvedIds: Array<string | number> = []

  questions.forEach((q) => {
    const chosen = userAnswers[q.id]
    if (chosen !== undefined && chosen !== q.correctIndex) {
      const item: MistakeQuestionItem = {
        questionId: q.id,
        courseId,
        lectureId,
        lectureTitle,
        questionText: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        userSelectedIndex: chosen,
        explanation: q.explanation,
        recordedAt: Date.now(),
      }
      mistakeMap.set(q.id, item)
      newMistakes.push(item)
    } else if (chosen === q.correctIndex) {
      // Correctly answered → remove from bank
      mistakeMap.delete(q.id)
      resolvedIds.push(q.id)
    }
  })

  const updated = Array.from(mistakeMap.values())
  safeLocalSet(`${MISTAKES_KEY_PREFIX}${courseId}`, updated)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fci_mistakes_updated"))
  }

  return { newMistakes, resolvedIds }
}

export function clearResolvedMistake(courseId: string, questionId: string | number): void {
  const updated = getCourseMistakes(courseId).filter((m) => m.questionId !== questionId)
  safeLocalSet(`${MISTAKES_KEY_PREFIX}${courseId}`, updated)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fci_mistakes_updated"))
  }
}

export function clearAllCourseMistakes(courseId: string): void {
  safeLocalSet(`${MISTAKES_KEY_PREFIX}${courseId}`, [])
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fci_mistakes_updated"))
  }
}

// ==========================================
// 4. QUIZ ATTEMPTS & TIME HISTORY
// ==========================================

export function logQuizAttempt(attempt: QuizAttemptRecord): void {
  const list = safeLocalGet<QuizAttemptRecord[]>(QUIZ_HISTORY_KEY, [])
  list.unshift(attempt)
  if (list.length > 100) list.length = 100
  safeLocalSet(QUIZ_HISTORY_KEY, list)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fci_quiz_history_updated"))
  }
}

export function seedQuizHistoryCache(attempts: QuizAttemptRecord[]): void {
  safeLocalSet(QUIZ_HISTORY_KEY, attempts)
}

export function getCourseQuizHistory(courseId: string): QuizAttemptRecord[] {
  return safeLocalGet<QuizAttemptRecord[]>(QUIZ_HISTORY_KEY, []).filter(
    (item) => item.courseId === courseId
  )
}

// ==========================================
// 5. ACTIVE STUDY TIME & COURSE PROGRESS
// ==========================================

export function getCourseProgress(courseId: string): CourseProgressRecord {
  return safeLocalGet<CourseProgressRecord>(`${PROGRESS_KEY_PREFIX}${courseId}`, {
    courseId,
    completedLectureIds: [],
    passedQuizLectureIds: [],
    totalStudySeconds: 0,
    lastStudiedAt: Date.now(),
  })
}

/**
 * Seed local cache from Supabase data.
 * Call this once when CourseStudyView mounts.
 */
export function seedProgressCache(progress: CourseProgressRecord): void {
  safeLocalSet(`${PROGRESS_KEY_PREFIX}${progress.courseId}`, progress)
}

/** Updates local cache optimistically. The caller must also call addStudyTimeToDb(). */
export function addStudyTime(courseId: string, additionalSeconds: number): number {
  if (typeof window === "undefined" || additionalSeconds <= 0) return 0
  const current = getCourseProgress(courseId)
  current.totalStudySeconds += additionalSeconds
  current.lastStudiedAt = Date.now()
  safeLocalSet(`${PROGRESS_KEY_PREFIX}${courseId}`, current)
  return current.totalStudySeconds
}

/** Updates local cache. Caller must also call toggleLectureCompletionInDb(). */
export function toggleLectureCompletion(courseId: string, lectureId: string): boolean {
  if (typeof window === "undefined") return false
  const current = getCourseProgress(courseId)
  const exists = current.completedLectureIds.includes(lectureId)
  if (exists) {
    current.completedLectureIds = current.completedLectureIds.filter((id) => id !== lectureId)
  } else {
    current.completedLectureIds.push(lectureId)
  }
  current.lastStudiedAt = Date.now()
  safeLocalSet(`${PROGRESS_KEY_PREFIX}${courseId}`, current)
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("fci_progress_updated"))
  }
  return !exists
}

/** Updates local cache. Caller must also call markQuizPassedInDb(). */
export function markQuizPassed(courseId: string, lectureId: string): void {
  if (typeof window === "undefined") return
  const current = getCourseProgress(courseId)
  if (!current.passedQuizLectureIds.includes(lectureId)) {
    current.passedQuizLectureIds.push(lectureId)
    safeLocalSet(`${PROGRESS_KEY_PREFIX}${courseId}`, current)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("fci_progress_updated"))
    }
  }
}

// ==========================================
// 6. STUDENT MASTERY EVALUATION ENGINE
// ==========================================

export function calculateMastery(
  progress: CourseProgressRecord,
  totalLectures: number,
  recentQuizScores: number[]
): MasteryEvaluation {
  const safeTotalLecs = Math.max(1, totalLectures)
  const lecsRatio = Math.min(1, progress.completedLectureIds.length / safeTotalLecs)

  const avgQuizScore =
    recentQuizScores.length > 0
      ? recentQuizScores.reduce((a, b) => a + b, 0) / recentQuizScores.length
      : progress.passedQuizLectureIds.length > 0
      ? 75
      : 0

  const timeBonus = Math.min(15, (progress.totalStudySeconds / 14400) * 15)
  const score = Math.round(lecsRatio * 45 + (avgQuizScore / 100) * 40 + timeBonus)
  const clamped = Math.max(0, Math.min(100, score))

  if (clamped >= 88) {
    return {
      tierName: "متميز / عبقري",
      tierBadge: "🏆 عبقري المادة",
      percentage: clamped,
      colorClass: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
      description: "أداء استثنائي وإتقان كامل للمفاهيم الأكاديمية والتطبيقات التقنية.",
    }
  }

  if (clamped >= 70) {
    return {
      tierName: "متقدم",
      tierBadge: "🌟 مستوى متقدم",
      percentage: clamped,
      colorClass: "text-sky-400 bg-sky-500/10 border-sky-500/30",
      description: "استيعاب ممتاز لمعظم أبواب المنهج مع انتظام مشهود في المذاكرة.",
    }
  }

  if (clamped >= 45) {
    return {
      tierName: "مجتهد",
      tierBadge: "📚 طالب مجتهد",
      percentage: clamped,
      colorClass: "text-amber-400 bg-amber-500/10 border-amber-500/30",
      description: "بداية جيدة ومتقدمة في دراسة المادة، واصل حل الكويزات لرفع تقييمك.",
    }
  }

  return {
    tierName: "مبتدئ",
    tierBadge: "🌱 في بداية الرحلة",
    percentage: clamped,
    colorClass: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    description: "ابدأ بمشاهدة المحاضرة الأولى وحل الكويز الخاص بها لتفعيل تقييمك.",
  }
}
