import Link from "next/link"
import {
  BookOpen,
  ArrowLeft,
  Code2,
  Cpu,
  Database,
  Brain,
  Network,
  HelpCircle,
  LayoutDashboard,
  Terminal,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  let user = null
  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // If not authenticated or SSR fallback
  }

  return (
    <div className="flex flex-col items-center overflow-x-hidden">
      {/* Hero Section (2-Column with C++ Terminal Code Showcase) */}
      <section className="w-full py-12 sm:py-16 lg:py-20 border-b border-border/50 bg-radial-[at_top] from-primary/15 via-transparent to-transparent">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Right Column: Heading & Description */}
            <div className="lg:col-span-7 space-y-6 text-start">
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground leading-[1.3]">
                  ادرس بذكاء.
                  <br />
                  افهم بعمق.
                  <br />
                  <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                    تفوّق في الامتحان.
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground max-w-xl leading-relaxed pt-1">
                  لا تشتت بعد اليوم بين مئات السلايدات والفيديوهات العشوائية. وفّرنا لك مساراً دراسياً واضحاً لكل مقرر: شروحات مركزة، خرائط ذهنية، وأهم أسئلة الامتحانات المحلولة.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href="/courses">
                  <Button size="lg" className="btn-primary-glow gap-2 text-xs sm:text-sm font-bold px-7">
                    <BookOpen className="size-4" />
                    <span>استكشف المقررات الدراسية</span>
                  </Button>
                </Link>

                {user ? (
                  <Link href="/dashboard">
                    <Button size="lg" variant="outline" className="gap-2 text-xs sm:text-sm font-bold px-6">
                      <LayoutDashboard className="size-4 text-primary" />
                      <span>متابعة لوحة التحكم</span>
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signup">
                    <Button size="lg" variant="outline" className="gap-2 text-xs sm:text-sm font-bold px-6">
                      <span>ابدأ مجاناً</span>
                      <ArrowLeft className="size-4 rtl:rotate-0 rotate-180" />
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Left Column: Computer Science Code & Terminal Showcase Card */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-2xl space-y-3 font-mono relative overflow-hidden card-hover">
                {/* Window header dots */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="size-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="size-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Terminal className="size-3 text-primary" />
                    <span className="font-semibold text-foreground">BinarySearch.cpp</span>
                  </div>
                  <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md font-bold">
                    C++ 20
                  </span>
                </div>

                {/* Code Window Body */}
                <div className="text-[11px] sm:text-xs text-muted-foreground space-y-1.5 ltr leading-relaxed py-1">
                  <div>
                    <span className="text-primary font-bold">int</span>{" "}
                    <span className="text-foreground font-semibold">binarySearch</span>(vector&lt;<span className="text-primary">int</span>&gt;&amp; arr, <span className="text-primary">int</span> target) &#123;
                  </div>
                  <div className="ps-4">
                    <span className="text-primary font-bold">int</span> low = 0, high = arr.size() - 1;
                  </div>
                  <div className="ps-4">
                    <span className="text-indigo-400 font-bold">while</span> (low &lt;= high) &#123;
                  </div>
                  <div className="ps-8">
                    <span className="text-primary font-bold">int</span> mid = low + (high - low) / 2;
                  </div>
                  <div className="ps-8 text-amber-300">
                    <span className="text-indigo-400 font-bold">if</span> (arr[mid] == target) <span className="text-indigo-400 font-bold">return</span> mid;
                  </div>
                  <div className="ps-8">
                    <span className="text-indigo-400 font-bold">else if</span> (arr[mid] &lt; target) low = mid + 1;
                  </div>
                  <div className="ps-8">
                    <span className="text-indigo-400 font-bold">else</span> high = mid - 1;
                  </div>
                  <div className="ps-4">&#125;</div>
                  <div className="ps-4">
                    <span className="text-indigo-400 font-bold">return</span> -1; <span className="text-muted-foreground/60">{"// O(log n) Time"}</span>
                  </div>
                  <div>&#125;</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Subjects Section */}
      <section className="w-full py-14 sm:py-16 border-b border-border/50 bg-muted/10 backdrop-blur-[2px]">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-8">
          <div className="space-y-2 text-start">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              إذا كانت في حاسبات والمعلومات، فنحن نغطيها.
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
              تغطية علمية دقيقة لمقررات كليات الحاسبات من الفرقة الأولى وحتى مواد التخصص ومشاريع التخرج.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { title: "هياكل البيانات", code: "Data Structures", icon: Code2 },
              { title: "الخوارزميات", code: "Algorithms", icon: Cpu },
              { title: "قواعد البيانات", code: "Databases & SQL", icon: Database },
              { title: "الذكاء الاصطناعي", code: "AI & ML", icon: Brain },
              { title: "نظم التشغيل", code: "Operating Systems", icon: Network },
              { title: "الرياضيات والمنطق", code: "Discrete & Math", icon: HelpCircle },
            ].map((item, idx) => (
              <Link
                key={idx}
                href={`/courses?q=${encodeURIComponent(item.title)}`}
                className="rounded-xl border border-border/80 bg-card/80 backdrop-blur-md p-4 space-y-2 card-hover block text-start group"
              >
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <item.icon className="size-4" />
                </div>
                <h3 className="font-bold text-xs sm:text-sm text-foreground truncate">{item.title}</h3>
                <span className="font-mono text-[10px] text-muted-foreground block">{item.code}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works (3 Clean Steps) */}
      <section className="w-full py-14 sm:py-16 border-b border-border/50 bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 max-w-6xl space-y-10">
          <div className="space-y-2 text-start">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              ثلاث خطوات تفصلك عن التفوق.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-start">
            <div className="space-y-2.5 p-5 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md card-hover">
              <span className="font-mono text-3xl font-black text-primary">01</span>
              <h3 className="text-base font-bold text-foreground">اختر فرقتك ومادتك</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                سجل حسابك وحدد فرقتك الدراسية لتظهر لك مواد فصلك الدراسي تلقائياً دون تشتت.
              </p>
            </div>

            <div className="space-y-2.5 p-5 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md card-hover">
              <span className="font-mono text-3xl font-black text-primary">02</span>
              <h3 className="text-base font-bold text-foreground">ادرس الشرح والخريطة الذهنية</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                افتح المحاضرة، اقرأ الشرح المركز، واستعن بالخريطة الذهنية التفاعلية لتثبيت المفاهيم.
              </p>
            </div>

            <div className="space-y-2.5 p-5 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md card-hover">
              <span className="font-mono text-3xl font-black text-primary">03</span>
              <h3 className="text-base font-bold text-foreground">حل أسئلة الامتحانات وتتبع استيعابك</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                أجب عن أسئلة السنين السابقة مع إظهار الحل والتفسير، وتابع رصيدك حتى تضمن الـ A+.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="w-full py-16 sm:py-24 bg-transparent">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="rounded-3xl border-2 border-primary/40 bg-gradient-to-b from-primary/20 via-card/85 to-card/95 backdrop-blur-xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden ring-1 ring-primary/20">
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight text-foreground">
                عندك امتحان قادم؟
                <br />
                <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  ابدأ المذاكرة والتنظيم من الآن.
                </span>
              </h2>
              <p className="text-xs sm:text-sm font-medium max-w-xl mx-auto text-muted-foreground leading-relaxed">
                جميع المقررات الدراسية، المحاضرات، وبنوك الأسئلة متاحة مجاناً لكل الطلاب.
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <Link href="/courses">
                <Button
                  size="lg"
                  className="btn-primary-glow font-black text-xs sm:text-sm px-8 shadow-lg transition-all"
                >
                  <BookOpen className="size-4" />
                  <span>تصفح المقررات الدراسية</span>
                </Button>
              </Link>

              {user ? (
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-bold text-xs sm:text-sm px-6"
                  >
                    <LayoutDashboard className="size-4 text-primary" />
                    <span>لوحة التحكم</span>
                  </Button>
                </Link>
              ) : (
                <Link href="/signup">
                  <Button
                    size="lg"
                    variant="outline"
                    className="font-bold text-xs sm:text-sm px-6"
                  >
                    <span>إنشاء حساب جديد</span>
                    <ArrowLeft className="size-4 rtl:rotate-0 rotate-180" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
