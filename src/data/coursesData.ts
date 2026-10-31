export interface TopicItem {
  id: string
  slug: string
  title: string
  summary?: string
  importance?: number // 1-5
  durationMinutes?: number
  doctorNote?: string
  videoUrl?: string
}

export interface VideoItem {
  id: string
  title: string
  url: string
  source?: string
  duration?: string
}

export interface PdfItem {
  id: string
  title: string
  url: string
  size?: string
}

export interface RoadmapItem {
  id: string
  title: string
  imageUrl: string
  description?: string
}

export interface QuizQuestion {
  id: string | number
  question: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export interface LectureChapter {
  id: string
  number: number
  title: string
  summary: string
  videoUrl?: string
  pdfUrl?: string
  pdfName?: string
  videos?: VideoItem[]
  pdfs?: PdfItem[]
  roadmaps?: RoadmapItem[]
  quiz?: QuizQuestion[]
  topics: TopicItem[]
}

export interface Course {
  id: string
  slug: string
  code: string
  title: string
  description: string
  level: number // 1, 2, 3, 4
  semester: number // 1, 2
  status: 'published' | 'reviewed' | 'draft'
  studyPlanDays?: number
  lectures: LectureChapter[]
}

export const ACADEMIC_YEARS = [
  { level: 1, name: "الفرقة الأولى", desc: "المفاهيم التأسيسية للبرمجة والرياضيات والإلكترونيات" },
  { level: 2, name: "الفرقة الثانية", desc: "هياكل البيانات، نظم التشغيل، الخوارزميات وقواعد البيانات" },
  { level: 3, name: "الفرقة الثالثة", desc: "الذكاء الاصطناعي، تعلم الآلة، الشبكات وأمن المعلومات" },
  { level: 4, name: "الفرقة الرابعة", desc: "الرؤية الحاسوبية، النظم الموزعة، ومشاريع التخرج المتخصصة" },
]

export const COURSES_DATA: Course[] = [
  // ================= LEVEL 1 - SEMESTER 1 (السبع مواد الأساسية) =================
  {
    id: "l1-s1-it101",
    slug: "intro-to-computers-it",
    code: "IT101",
    title: "مقدمة في الحاسبات والمعلوماتية (Introduction to IT)",
    description: "أساسيات الحاسب والأنظمة الرقمية، أنظمة العد، تمثيل البيانات، ومكونات الحاسب والشبكات.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 10,
    lectures: [
      {
        id: "l1-s1-it-lec1",
        number: 1,
        title: "المحاضرة 1: مدخل إلى تكنولوجيا المعلومات وأنظمة العد الرقمية",
        summary: "التحويل بين الأنظمة العددية (Binary, Octal, Decimal, Hexadecimal) وتمثيل الأعداد السالبة.",
        videoUrl: "https://www.youtube.com/watch?v=k_Q_iQnU6d4",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "سلايدات المحاضرة 1 - أنظمة العد.pdf",
        videos: [
          {
            id: "it-v1",
            title: "فيديو 1: الشرح النظري - أنظمة العد والتحويلات الثنائية والست عشرية",
            url: "https://www.youtube.com/watch?v=k_Q_iQnU6d4",
            duration: "45 دقيقة",
            source: "YouTube",
          },
          {
            id: "it-v2",
            title: "فيديو 2: حل مسائل وتمارين شيت الكلية خطوة بخطوة",
            url: "https://www.youtube.com/watch?v=FZGugFqDr60",
            duration: "25 دقيقة",
            source: "YouTube",
          },
        ],
        pdfs: [
          {
            id: "it-pdf-1",
            title: "سلايدات الدكتور الرسمية - أنظمة العد والتحويلات",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            size: "3.2 MB",
          },
          {
            id: "it-pdf-2",
            title: "شيت التمارين والمسائل المحلولة للتحويلات العددية",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            size: "1.8 MB",
          },
        ],
        roadmaps: [
          {
            id: "it-map-1",
            title: "خريطة المفاهيم: مخطط قواعد التحويل بين الأنظمة (Binary -> Octal -> Hex)",
            imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
            description: "رسم توضيحي شامل يختصر كافة قواعد وقوانين التحويل بين الأنظمة في صفحة واحدة.",
          },
        ],
        topics: [
          { id: "t-it-1", slug: "number-systems", title: "التحويل بين الأنظمة العددية (Binary, Hex, Decimal)", importance: 5, durationMinutes: 30, doctorNote: "مسائل حسابية مضمونة في الميدتيرم والفاينال" },
          { id: "t-it-2", slug: "twos-complement", title: "تمثيل الأعداد السالبة والـ Two's Complement", importance: 4, durationMinutes: 25 }
        ]
      },
      {
        id: "l1-s1-it-lec2",
        number: 2,
        title: "المحاضرة 2: عتاد الحاسب وهندسة وحدة المعالجة المركزية (CPU & Architecture)",
        summary: "دورة جلب وتنفيذ التعليمات (Fetch-Decode-Execute)، تسلسل الذاكرة، ووحدات التخزين.",
        videoUrl: "https://www.youtube.com/watch?v=FZGugFqDr60",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "سلايدات المحاضرة 2 - معمارية الحاسب.pdf",
        videos: [
          {
            id: "it-v3",
            title: "فيديو 1: دورة المعالج Fetch-Decode-Execute والمسجلات Registers",
            url: "https://www.youtube.com/watch?v=FZGugFqDr60",
            duration: "38 دقيقة",
            source: "YouTube",
          },
        ],
        pdfs: [
          {
            id: "it-pdf-3",
            title: "سلايدات المحاضرة 2 - معمارية وهندسة الحاسب",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            size: "4.5 MB",
          },
        ],
        roadmaps: [
          {
            id: "it-map-2",
            title: "مخطط معمارية الحاسب والناقلات وعلاقة الـ CPU بالذاكرة",
            imageUrl: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=1200&q=80",
            description: "مخطط مسار البيانات بين المعالج، الذاكرة الرئيسية، وذاكرة الكاش.",
          },
        ],
        topics: [
          { id: "t-it-3", slug: "cpu-cycle", title: "دورة عمل المعالج وعلاقة الـ Registers بالذاكرة", importance: 4, durationMinutes: 30 },
          { id: "t-it-4", slug: "memory-hierarchy", title: "هرمية الذاكرة من الكاش إلى القرص الصلب", importance: 4, durationMinutes: 20 }
        ]
      }
    ]
  },
  {
    id: "l1-s1-cs101",
    slug: "programming-fundamentals-cplusplus",
    code: "CS101",
    title: "مقدمة في البرمجة (Introduction to Programming)",
    description: "تأسيس المفاهيم البرمجية الأساسية، التفكير المنطقي، المتغيرات، الدوال، والمصفوفات بلغة C++.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 14,
    lectures: [
      {
        id: "l1-s1-cs101-lec1",
        number: 1,
        title: "المحاضرة 1: بنية الكود وبيئة التطوير والمدخلات والمخرجات",
        summary: "بنية برنامج C++، الـ Data Types، الإدخال والإخراج عبر cin و cout، وحساب العمليات الرياضية.",
        videoUrl: "https://www.youtube.com/watch?v=vLnPwxZdW4Y",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 1 - أساسيات لغة C++.pdf",
        videos: [
          {
            id: "cs-v1",
            title: "فيديو 1: بناء البرنامج الأول في C++ وهيكلية main() والـ namespaces",
            url: "https://www.youtube.com/watch?v=vLnPwxZdW4Y",
            duration: "35 دقيقة",
            source: "YouTube",
          },
          {
            id: "cs-v2",
            title: "فيديو 2: التدريب العملي في المعمل على الـ cin و cout والعمليات الرياضية",
            url: "https://www.youtube.com/watch?v=ZzaPdXTrSb8",
            duration: "20 دقيقة",
            source: "YouTube",
          },
        ],
        pdfs: [
          {
            id: "cs-pdf-1",
            title: "سلايدات المحاضرة 1: مدخل للبرمجة وكتابة الأكواد بلغة C++",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            size: "2.9 MB",
          },
          {
            id: "cs-pdf-2",
            title: "شيت المعمل الأول: مسائل برمجية محلولة خطوة بخطوة",
            url: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
            size: "1.4 MB",
          },
        ],
        roadmaps: [
          {
            id: "cs-map-1",
            title: "خريطة المفاهيم: هيكلية برنامج C++ ودورة ترجمة الكود (Compilation Flow)",
            imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80",
            description: "شرح بياني يوضح كيفية تحول كود C++ المصدري إلى ملف تنفيذي Machine Code.",
          },
        ],
        topics: [
          { id: "t-101-1", slug: "cpp-intro-io", title: "هيكلية البرنامج الأساسي وعمليات الإدخال والإخراج (cin / cout)", importance: 5, durationMinutes: 25, doctorNote: "سؤال أساسي في الامتحان العملي والشفوي" },
          { id: "t-101-2", slug: "cpp-datatypes-memory", title: "أنواع البيانات وأحجامها في الذاكرة (int, float, double, char, bool)", importance: 4, durationMinutes: 20 },
          { id: "t-101-3", slug: "cpp-operators-precedence", title: "المعاملات الحسابية والمنطقية وترتيب أولويات التنفيذ", importance: 4, durationMinutes: 15 }
        ]
      },
      {
        id: "l1-s1-cs101-lec2",
        number: 2,
        title: "المحاضرة 2: جمل التحكم والقرارات المنطقية (Conditionals)",
        summary: "اتخاذ القرارات البرمجية عبر if, else-if, nested if وجمل الاختيار المتعدد switch-case.",
        videoUrl: "https://www.youtube.com/watch?v=ZzaPdXTrSb8",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 2 - الشروط والتحكم.pdf",
        topics: [
          { id: "t-101-4", slug: "cpp-if-else", title: "جمل الشروط البسيطة والمتداخلة (if / else / nested if)", importance: 5, durationMinutes: 30, doctorNote: "التركيز على شروط الحدود Boundary Conditions" },
          { id: "t-101-5", slug: "cpp-switch-case", title: "جملة الاختيار المتعدد switch والفرق بينها وبين if-else", importance: 3, durationMinutes: 20 }
        ]
      },
      {
        id: "l1-s1-cs101-lec3",
        number: 3,
        title: "المحاضرة 3: حلقات التكرار والأنماط (Loops & Nested Loops)",
        summary: "تكرار تنفيذ العمليات عبر for, while, do-while وتتبع الحلقات المتداخلة وطباعة الأشكال.",
        videoUrl: "https://www.youtube.com/watch?v=GQp1zzTwrIg",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 3 - حلقات التكرار.pdf",
        topics: [
          { id: "t-101-6", slug: "cpp-loops-for-while", title: "حلقات For و While ومتى تستخدم كل نوع", importance: 5, durationMinutes: 35 },
          { id: "t-101-7", slug: "cpp-nested-loops", title: "الحلقات المتداخلة (Nested Loops) وتتبع أنماط النجوم والأرقام", importance: 5, durationMinutes: 40, doctorNote: "سؤال دائم في الامتحانات الورقية (Code Tracing)" }
        ]
      }
    ]
  },
  {
    id: "l1-s1-elec101",
    slug: "electronics-fundamentals",
    code: "ELEC101",
    title: "إلكترونيات (Electronics)",
    description: "العناصر الإلكترونية الأساسية، الصمامات الثنائية (Diodes)، الترانزستورات (Transistors)، والدوائر الإلكترونية المتكاملة.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 10,
    lectures: [
      {
        id: "l1-s1-elec-lec1",
        number: 1,
        title: "المحاضرة 1: أشباه الموصلات والدايود (Semiconductors & Diodes)",
        summary: "تركيب المواد شبه الموصلة من النوع P و N، وصلة PN Junction، وتطبيقات الدايود في تقويم التيار.",
        videoUrl: "https://www.youtube.com/watch?v=33vbFFFn04k",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 1 - أشباه الموصلات والدايود.pdf",
        topics: [
          { id: "t-el-1", slug: "pn-junction", title: "خصائص وصلة PN Junction والانحياز الأمامي والعكسي", importance: 5, durationMinutes: 30 },
          { id: "t-el-2", slug: "diode-rectifiers", title: "دوائر توحيد التيار (Half-wave & Full-wave Rectifiers)", importance: 5, durationMinutes: 35, doctorNote: "رسم الدوائر وحساب جهد الخرج Vout" }
        ]
      },
      {
        id: "l1-s1-elec-lec2",
        number: 2,
        title: "المحاضرة 2: الترانزستور ثنائي القطبية (BJT Transistors)",
        summary: "أنواع الترانزستور BPN و PNP، مناطق التشغيل (Cutoff, Active, Saturation)، واستخدامه كمفتاح ومكبر.",
        videoUrl: "https://www.youtube.com/watch?v=J4oO7PT_nGQ",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 2 - ترانزستور BJT.pdf",
        topics: [
          { id: "t-el-3", slug: "bjt-operation", title: "مناطق عمل الترانزستور وحساب تيارات الباعث والمجمع والقاعدة", importance: 4, durationMinutes: 30 },
          { id: "t-el-4", slug: "transistor-switch", title: "استخدام الترانزستور كمفتاح إلكتروني (Electronic Switch)", importance: 4, durationMinutes: 25 }
        ]
      }
    ]
  },
  {
    id: "l1-s1-phys101",
    slug: "physics-fundamentals",
    code: "PHYS101",
    title: "فيزياء (Physics)",
    description: "المجال الكهربي، الجهد والكهروستاتيكا، قوانين كيرشوف للدوائر، والمجالات المغناطيسية.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 10,
    lectures: [
      {
        id: "l1-s1-phys-lec1",
        number: 1,
        title: "المحاضرة 1: المجال الكهربي والجهد والمكثفات (Electric Field & Capacitors)",
        summary: "قانون كولوم، خطوط المجال الكهربي، فرق الجهد، وسعة المكثفات وتوصيلها توالي وتوازي.",
        videoUrl: "https://www.youtube.com/watch?v=mdulzBjhvd0",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 1 - المجال الكهربي والمكثفات.pdf",
        topics: [
          { id: "t-ph-1", slug: "coulomb-law", title: "قانون كولوم وحساب القوى الكهربية والمجال", importance: 4, durationMinutes: 30 },
          { id: "t-ph-2", slug: "capacitors-circuits", title: "المكثفات وشحن وتفريغ الشحنة الكهربية", importance: 5, durationMinutes: 35, doctorNote: "مسائل حساب سعة المكثف المكافئة" }
        ]
      },
      {
        id: "l1-s1-phys-lec2",
        number: 2,
        title: "المحاضرة 2: قوانين الدوائر الكهربية وكيرشوف (DC Circuits & Kirchhoff)",
        summary: "تحليل دوائر التيار المستمر، المقاومة الداخلية، وقوانين كيرشوف للجهد والتيار.",
        videoUrl: "https://www.youtube.com/watch?v=w82aSjLuD_8",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 2 - قوانين كيرشوف.pdf",
        topics: [
          { id: "t-ph-3", slug: "kirchhoff-rules", title: "قوانين كيرشوف للتيار KCL وللجهد KVL", importance: 5, durationMinutes: 40, doctorNote: "مسألة ثابتة في كل امتحان فاينال" }
        ]
      }
    ]
  },
  {
    id: "l1-s1-math101",
    slug: "calculus-mathematics",
    code: "MATH101",
    title: "رياضيات (Mathematics)",
    description: "التفاضل والتكامل 1، الدوال الحقيقية، النهايات والاتصال، قواعد الاشتقاق المتقدمة وتطبيقاتها.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 12,
    lectures: [
      {
        id: "l1-s1-math-lec1",
        number: 1,
        title: "المحاضرة 1: النهايات والاتصال وقاعدة لوبيتال (Limits & Continuity)",
        summary: "حساب نهايات الدوال الكسرية والمثلثية، إزالة عدم التعيين، وقاعدة L'Hôpital.",
        videoUrl: "https://www.youtube.com/watch?v=riXcZT2ICjA",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 1 - النهايات وقاعدة لوبيتال.pdf",
        topics: [
          { id: "t-m1-1", slug: "limits-lhoptial", title: "حساب النهايات وتطبيق قاعدة L'Hôpital", importance: 5, durationMinutes: 35 },
          { id: "t-m1-2", slug: "continuity", title: "شروط اتصال الدوال الحقيقية عند نقطة وعلى فترة", importance: 4, durationMinutes: 25 }
        ]
      },
      {
        id: "l1-s1-math-lec2",
        number: 2,
        title: "المحاضرة 2: قواعد الاشتقاق وتطبيقات القيم العظمى والصغرى",
        summary: "مشتقات الدوال المركبة (Chain Rule)، التفاضل الضمني، وتحديد القيم القصوى.",
        videoUrl: "https://www.youtube.com/watch?v=rAof9Ld5sOg",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 2 - قواعد الاشتقاق والتطبيقات.pdf",
        topics: [
          { id: "t-m1-3", slug: "chain-rule", title: "قاعدة السلسلة والاشتقاق الضمني للدوال", importance: 5, durationMinutes: 30 },
          { id: "t-m1-4", slug: "max-min-problems", title: "تطبيقات القيم العظمى والصغرى ونقاط الانقلاب", importance: 4, durationMinutes: 30 }
        ]
      }
    ]
  },
  {
    id: "l1-s1-comm101",
    slug: "communication-skills",
    code: "COMM101",
    title: "مهارات الاتصال (Communication Skills)",
    description: "مهارات التواصل اللفظي وغير اللفظي، كتابة التقارير الفنية، العروض التقديمية الفعالة، والعمل الجماعي.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 7,
    lectures: [
      {
        id: "l1-s1-comm-lec1",
        number: 1,
        title: "المحاضرة 1: مبادئ الاتصال الفعال ونماذج نقل الرسالة",
        summary: "عناصر عملية الاتصال (المرسل، المستقبل، القناة، التغذية الراجعة) وتخطي عوائق التواصل.",
        videoUrl: "https://www.youtube.com/watch?v=HAnw168huqA",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 1 - مبادئ الاتصال الفعال.pdf",
        topics: [
          { id: "t-cm-1", slug: "communication-process", title: "مكونات دائرة الاتصال وعوائق الاستيعاب الفعال", importance: 4, durationMinutes: 25 },
          { id: "t-cm-2", slug: "verbal-nonverbal", title: "التواصل اللفظي ولغة الجسد (Body Language)", importance: 4, durationMinutes: 20 }
        ]
      },
      {
        id: "l1-s1-comm-lec2",
        number: 2,
        title: "المحاضرة 2: كتابة التقارير الفنية والعروض التقديمية (Presentations)",
        summary: "هيكل التقرير الهندسي الفني، تقنيات إلقاء العرض التقديمي، وإدارة الوقت.",
        videoUrl: "https://www.youtube.com/watch?v=dEDcc3aCChA",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 2 - كتابة التقارير والعروض.pdf",
        topics: [
          { id: "t-cm-3", slug: "technical-reports", title: "هيكلية التقرير الفني والمراجع العلمية", importance: 5, durationMinutes: 25 },
          { id: "t-cm-4", slug: "presentation-skills", title: "قواعد العرض التقديمي الفعال وتجنب التشتت", importance: 4, durationMinutes: 25 }
        ]
      }
    ]
  },
  {
    id: "l1-s1-eng101",
    slug: "english-language",
    code: "ENG101",
    title: "لغة إنجليزية (English Language)",
    description: "المصطلحات التقنية في علوم الحاسب، القراءة والاستيعاب للنصوص البرمجية، وقواعد الكتابة الأكاديمية.",
    level: 1,
    semester: 1,
    status: "published",
    studyPlanDays: 7,
    lectures: [
      {
        id: "l1-s1-eng-lec1",
        number: 1,
        title: "المحاضرة 1: المصطلحات التقنية وقراءة التوثيقات البرمجية (Technical Reading)",
        summary: "المفردات الأساسية للبرمجيات والعتاد وقراءة مواصفات ومتطلبات المشاريع التقنية.",
        videoUrl: "https://www.youtube.com/watch?v=b1h5qE_a830",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 1 - المصطلحات التقنية بالإنجليزية.pdf",
        topics: [
          { id: "t-en-1", slug: "cs-terminology", title: "المصطلحات الأساسية في هندسة البرمجيات والعتاد", importance: 4, durationMinutes: 25 },
          { id: "t-en-2", slug: "reading-comprehension", title: "استراتيجيات استخراج الأفكار الرئيسية من النصوص العلمية", importance: 4, durationMinutes: 20 }
        ]
      },
      {
        id: "l1-s1-eng-lec2",
        number: 2,
        title: "المحاضرة 2: الكتابة الأكاديمية وصياغة الملخصات (Technical Writing)",
        summary: "تراكيب الجمل العلمية بالإنجليزية وتجنب الأخطاء اللغوية الشائعة في كتابة الأبحاث.",
        videoUrl: "https://www.youtube.com/watch?v=GkSg7nI2_iM",
        pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
        pdfName: "محاضرة 2 - الكتابة الفنية بالإنجليزية.pdf",
        topics: [
          { id: "t-en-3", slug: "sentence-structures", title: "بناء الجمل الأكاديمية وصياغة الفقرات التقنية", importance: 4, durationMinutes: 25 },
          { id: "t-en-4", slug: "email-professional", title: "كتابة المراسلات الرسمية والرسائل المهنية", importance: 4, durationMinutes: 20 }
        ]
      }
    ]
  }
]
