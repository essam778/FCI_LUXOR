import type { Metadata } from "next"
import { Alexandria, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/layout/Navbar"
import { StudentNotesWidget } from "@/components/notes/StudentNotesWidget"
import { Footer } from "@/components/layout/Footer"
import { KineticGrid } from "@/components/ui/kinetic-grid"
import { SingleDeviceEnforcer } from "@/components/auth/SingleDeviceEnforcer"

const alexandria = Alexandria({
  subsets: ["arabic", "latin"],
  variable: "--font-alexandria",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
})

import { createClient } from "@/lib/supabase/server"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fci-luxor-essam778s-projects.vercel.app"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "STUDY++ | المنصة الشاملة لطلاب كلية الحاسبات والمعلومات والذكاء الاصطناعي",
    template: "%s | STUDY++",
  },
  description:
    "المنصة الشاملة لطلاب كليات الحاسبات والمعلومات STUDY++: شروحات منظمة، خرائط ذهنية، بنك أسئلة محلولة، ومتابعة أكاديمية مستمرة.",
  icons: {
    icon: [
      { url: "/download.jpg", type: "image/jpeg" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/download.jpg",
    apple: "/download.jpg",
  },
  openGraph: {
    title: "STUDY++ | المنصة الشاملة لطلاب كلية الحاسبات والمعلومات والذكاء الاصطناعي",
    description: "شروحات منظمة، خرائط ذهنية، بنك أسئلة محلولة، ومتابعة أكاديمية مستمرة.",
    url: siteUrl,
    siteName: "STUDY++",
    images: [
      {
        url: "/download.jpg",
        width: 1200,
        height: 630,
        alt: "STUDY++ منصة حاسبات والمعلومات",
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "STUDY++ | المنصة الشاملة لطلاب كلية الحاسبات والمعلومات والذكاء الاصطناعي",
    description: "شروحات منظمة، خرائط ذهنية، بنك أسئلة محلولة، ومتابعة أكاديمية مستمرة.",
    images: ["/download.jpg"],
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let user = null
  let userDisplayName: string | null = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle()
      userDisplayName =
        (profile as { display_name?: string | null } | null)?.display_name ||
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        null
    }
  } catch {
    // Fallback gracefully if server cookies cannot be read
  }

  return (
    <html
      lang="ar"
      dir="rtl"
      suppressHydrationWarning
      className={`${alexandria.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground antialiased overflow-x-hidden w-full max-w-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SingleDeviceEnforcer />
          <KineticGrid className="min-h-screen flex flex-col w-full">
            <Navbar initialUser={user} initialDisplayName={userDisplayName} />
            <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
            <Footer user={user} userDisplayName={userDisplayName} />
            <StudentNotesWidget initialUser={user} />
          </KineticGrid>
        </ThemeProvider>
      </body>
    </html>
  )
}
