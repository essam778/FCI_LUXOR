/**
 * Subscription & Course Access Utility Functions
 * Safe for use in both Server Components and Client Components
 */

/**
 * Check if a course is the free trial / demo course.
 * Electronics (ELEC101) or any course with ELEC / electronics in slug/code/title is open for evaluation.
 */
export function isFreeTrialCourse(course?: { slug?: string; code?: string; title?: string } | null): boolean {
  if (!course) return false
  const slug = (course.slug || "").toLowerCase()
  const code = (course.code || "").toLowerCase()
  const title = (course.title || "").toLowerCase()
  return (
    slug.includes("elec") ||
    code.includes("elec") ||
    title.includes("electronics") ||
    title.includes("إلكترونيات") ||
    title.includes("الكترونيات")
  )
}

