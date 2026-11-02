import type { Metadata } from "next"
import { Alexandria, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Navbar } from "@/components/layout/Navbar"
import { StudentNotesWidget } from "@/components/notes/StudentNotesWidget"
import { Footer } from "@/components/layout/Footer"
import { KineticGrid } from "@/components/ui/kinetic-grid"

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

export const metadata: Metadata = {
  title: "منصة دراسة حاسبات والمعلومات",
  description:
    "المنصة الشاملة لطلاب كليات الحاسبات والمعلومات: شروحات منظمة، خرائط ذهنية، بنك أسئلة محلولة، وتكرار متباعد.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
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
          <KineticGrid className="min-h-screen flex flex-col w-full">
            <Navbar initialUser={user} />
            <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>
            <Footer user={user} />
            <StudentNotesWidget initialUser={user} />
          </KineticGrid>
        </ThemeProvider>
      </body>
    </html>
  )
}
