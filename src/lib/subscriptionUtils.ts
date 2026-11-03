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

/**
 * Fast client-side image compression for receipts and screenshots.
 * Downscales huge 10MB mobile screenshots to ~150KB crisp JPEGs in milliseconds,
 * ensuring uploads finish in under 1 second instead of minutes on mobile connections.
 */
export async function compressReceiptImage(file: File, maxDimension = 1280, quality = 0.75): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file
  }

  // If already very lightweight, return as-is
  if (file.size <= 300 * 1024) {
    return file
  }

  return new Promise((resolve) => {
    const img = new window.Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      let { width, height } = img

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width)
          width = maxDimension
        } else {
          width = Math.round((width * maxDimension) / height)
          height = maxDimension
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(file)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file)
            return
          }
          const compressed = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
            type: "image/jpeg",
            lastModified: Date.now(),
          })
          resolve(compressed)
        },
        "image/jpeg",
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file)
    }

    img.src = objectUrl
  })
}

