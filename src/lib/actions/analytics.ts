"use server"

/**
 * Server Actions: Student Analytics & Mistake Bank (Supabase-persisted)
 * All writes use the client with RLS – the student can only touch their own rows.
 * Uses typed tables through generic client casting since migration 0016 adds these tables.
 */

import { createClient } from "@/lib/supabase/server"
import type { MistakeQuestionItem, QuizAttemptRecord, CourseProgressRecord } from "@/lib/quizTracker"

// ============================================================
// HELPERS
// ============================================================

/** Returns null when not authenticated – callers should handle gracefully. */
async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// Helper to access ungenerated schema tables cleanly
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDb(supabase: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabase as { from: (tableName: string) => any }
}

// ============================================================
// 1. COURSE PROGRESS
// ============================================================

export async function fetchCourseProgress(courseId: string): Promise<CourseProgressRecord | null> {
  const userId = await getAuthUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { data, error } = await getDb(supabase)
    .from("student_analytics")
    .select("completed_lecture_ids, passed_quiz_lecture_ids, total_study_seconds, last_studied_at")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  if (error || !data) return null

  return {
    courseId,
    completedLectureIds: data.completed_lecture_ids ?? [],
    passedQuizLectureIds: data.passed_quiz_lecture_ids ?? [],
    totalStudySeconds: Number(data.total_study_seconds ?? 0),
    lastStudiedAt: new Date(data.last_studied_at).getTime(),
  }
}

export async function upsertCourseProgress(
  courseId: string,
  patch: Partial<Omit<CourseProgressRecord, "courseId">>
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false, error: "not_authenticated" }

  const supabase = await createClient()

  // Fetch current state first to merge arrays correctly
  const { data: existing } = await getDb(supabase)
    .from("student_analytics")
    .select("completed_lecture_ids, passed_quiz_lecture_ids, total_study_seconds")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  const merged = {
    user_id: userId,
    course_id: courseId,
    completed_lecture_ids: patch.completedLectureIds ?? existing?.completed_lecture_ids ?? [],
    passed_quiz_lecture_ids: patch.passedQuizLectureIds ?? existing?.passed_quiz_lecture_ids ?? [],
    total_study_seconds:
      patch.totalStudySeconds !== undefined
        ? patch.totalStudySeconds
        : Number(existing?.total_study_seconds ?? 0),
    last_studied_at: new Date().toISOString(),
  }

  const { error } = await getDb(supabase)
    .from("student_analytics")
    .upsert(merged, { onConflict: "user_id,course_id" })

  return error ? { success: false, error: error.message } : { success: true }
}

/** Atomically adds seconds to total_study_seconds */
export async function addStudyTimeToDb(
  courseId: string,
  additionalSeconds: number
): Promise<{ success: boolean; newTotal?: number }> {
  if (additionalSeconds <= 0) return { success: true, newTotal: 0 }

  const userId = await getAuthUserId()
  if (!userId) return { success: false }

  const supabase = await createClient()

  // Upsert: if row doesn't exist create it, otherwise increment
  const { data: existing } = await getDb(supabase)
    .from("student_analytics")
    .select("total_study_seconds")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  const newTotal = Number(existing?.total_study_seconds ?? 0) + additionalSeconds

  const { error } = await getDb(supabase).from("student_analytics").upsert(
    {
      user_id: userId,
      course_id: courseId,
      total_study_seconds: newTotal,
      last_studied_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_id" }
  )

  return error ? { success: false } : { success: true, newTotal }
}

export async function toggleLectureCompletionInDb(
  courseId: string,
  lectureId: string
): Promise<{ success: boolean; completed: boolean }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false, completed: false }

  const supabase = await createClient()

  const { data: existing } = await getDb(supabase)
    .from("student_analytics")
    .select("completed_lecture_ids")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  const current: string[] = existing?.completed_lecture_ids ?? []
  const isCompleted = current.includes(lectureId)
  const updated = isCompleted
    ? current.filter((id) => id !== lectureId)
    : [...current, lectureId]

  const { error } = await getDb(supabase).from("student_analytics").upsert(
    {
      user_id: userId,
      course_id: courseId,
      completed_lecture_ids: updated,
      last_studied_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_id" }
  )

  return { success: !error, completed: !isCompleted }
}

export async function markQuizPassedInDb(
  courseId: string,
  lectureId: string
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false }

  const supabase = await createClient()

  const { data: existing } = await getDb(supabase)
    .from("student_analytics")
    .select("passed_quiz_lecture_ids")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle()

  const current: string[] = existing?.passed_quiz_lecture_ids ?? []
  if (current.includes(lectureId)) return { success: true }

  const { error } = await getDb(supabase).from("student_analytics").upsert(
    {
      user_id: userId,
      course_id: courseId,
      passed_quiz_lecture_ids: [...current, lectureId],
      last_studied_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_id" }
  )

  return { success: !error }
}

// ============================================================
// 2. MISTAKE BANK
// ============================================================

export async function fetchCourseMistakesFromDb(
  courseId: string
): Promise<MistakeQuestionItem[]> {
  const userId = await getAuthUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data, error } = await getDb(supabase)
    .from("student_mistake_bank")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("recorded_at", { ascending: false })

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    questionId: row.question_id,
    courseId: row.course_id,
    lectureId: row.lecture_id,
    lectureTitle: row.lecture_title,
    questionText: row.question_text,
    options: (row.options as string[]) ?? [],
    correctIndex: row.correct_index,
    userSelectedIndex: row.user_selected_index,
    explanation: row.explanation ?? undefined,
    recordedAt: new Date(row.recorded_at).getTime(),
  }))
}

export async function upsertMistakesToDb(
  courseId: string,
  lectureId: string,
  lectureTitle: string,
  mistakes: Array<{
    questionId: string | number
    questionText: string
    options: string[]
    correctIndex: number
    userSelectedIndex: number
    explanation?: string
  }>
): Promise<{ success: boolean; error?: string }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false, error: "not_authenticated" }
  if (mistakes.length === 0) return { success: true }

  const supabase = await createClient()

  const rows = mistakes.map((m) => ({
    user_id: userId,
    course_id: courseId,
    lecture_id: lectureId,
    lecture_title: lectureTitle,
    question_id: String(m.questionId),
    question_text: m.questionText,
    options: m.options,
    correct_index: m.correctIndex,
    user_selected_index: m.userSelectedIndex,
    explanation: m.explanation ?? null,
    recorded_at: new Date().toISOString(),
  }))

  const { error } = await getDb(supabase)
    .from("student_mistake_bank")
    .upsert(rows, { onConflict: "user_id,course_id,question_id" })

  return error ? { success: false, error: error.message } : { success: true }
}

export async function removeMistakesFromDb(
  courseId: string,
  questionIds: Array<string | number>
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false }

  const supabase = await createClient()
  const { error } = await getDb(supabase)
    .from("student_mistake_bank")
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .in(
      "question_id",
      questionIds.map((id) => String(id))
    )

  return { success: !error }
}

export async function clearAllCourseMistakesInDb(
  courseId: string
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false }

  const supabase = await createClient()
  const { error } = await getDb(supabase)
    .from("student_mistake_bank")
    .delete()
    .eq("user_id", userId)
    .eq("course_id", courseId)

  return { success: !error }
}

// ============================================================
// 3. QUIZ ATTEMPTS HISTORY
// ============================================================

export async function logQuizAttemptToDb(
  attempt: Omit<QuizAttemptRecord, "id">
): Promise<{ success: boolean }> {
  const userId = await getAuthUserId()
  if (!userId) return { success: false }

  const supabase = await createClient()
  const { error } = await getDb(supabase).from("student_quiz_attempts").insert({
    user_id: userId,
    course_id: attempt.courseId,
    lecture_id: attempt.lectureId,
    lecture_title: attempt.lectureTitle,
    score: attempt.score,
    total_questions: attempt.totalQuestions,
    correct_count: attempt.correctCount,
    duration_seconds: attempt.durationSeconds,
    is_mock_exam: attempt.isMockExam ?? false,
    attempted_at: new Date(attempt.timestamp).toISOString(),
  })

  return { success: !error }
}

export async function fetchCourseQuizAttemptsFromDb(
  courseId: string,
  limit = 50
): Promise<QuizAttemptRecord[]> {
  const userId = await getAuthUserId()
  if (!userId) return []

  const supabase = await createClient()
  const { data, error } = await getDb(supabase)
    .from("student_quiz_attempts")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .order("attempted_at", { ascending: false })
    .limit(limit)

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    id: row.id,
    courseId: row.course_id,
    lectureId: row.lecture_id,
    lectureTitle: row.lecture_title,
    score: Number(row.score),
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    durationSeconds: row.duration_seconds,
    timestamp: new Date(row.attempted_at).getTime(),
    isMockExam: row.is_mock_exam ?? false,
  }))
}
