import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fci-luxor-essam778s-projects.vercel.app"

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/courses", "/courses/*"],
      disallow: [
        "/admin/",
        "/dashboard/",
        "/auth/",
        "/reset-password/",
        "/login/",
        "/signup/",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
