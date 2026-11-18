import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface ParsedCourseTitle {
  ar: string
  en: string
  name: string
  code: string
}

/**
 * Parses a course title string like "هندسة البرمجيات (Software Engineering)"
 * or "Software Engineering (CS301)" into Arabic/Name and English/Code parts.
 */
export function parseCourseTitle(title: string): ParsedCourseTitle {
  if (!title) return { ar: "", en: "", name: "", code: "" }
  const match = title.match(/^(.*?)\s*[\(\[]([A-Za-z0-9\s.,&/\-_]+)[\)\]]$/)
  if (match && match[1].trim() && match[2].trim()) {
    const ar = match[1].trim()
    const en = match[2].trim()
    return { ar, en, name: ar, code: en }
  }
  const trimmed = title.trim()
  return { ar: trimmed, en: "", name: trimmed, code: "" }
}
