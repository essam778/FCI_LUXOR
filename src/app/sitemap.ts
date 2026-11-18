import type { MetadataRoute } from "next"
import { getCoursesList } from "@/lib/queries/courses"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fci-luxor-essam778s-projects.vercel.app"

  let courses: { slug: string }[] = []
  try {
    const list = await getCoursesList()
    courses = list
  } catch {
    // fallback if DB unreachable during build
  }

  const courseEntries: MetadataRoute.Sitemap = courses.map((c) => ({
    url: `${siteUrl}/courses/${encodeURIComponent(c.slug)}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }))

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/courses`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...courseEntries,
  ]
}
