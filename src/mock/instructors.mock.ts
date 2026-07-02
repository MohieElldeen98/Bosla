import type { InstructorSlide } from "@/types/instructor";

// Stand-in for a future `instructor_profiles` table (see
// docs/database-overview.md §1). These are the same instructors who author
// courses in src/data/courses.ts, kept consistent across the site —
// studentsTaught mirrors that course's studentCount.
export const instructorsMock: InstructorSlide[] = [
  {
    id: "yasmine-el-sayed",
    nameEn: "Dr. Yasmine El-Sayed, DPT",
    nameAr: "د. ياسمين السيد",
    title: {
      en: "Senior ICU Physiotherapist",
      ar: "أخصائية علاج طبيعي أول - عناية مركزة",
    },
    qualification: {
      en: "DPT, Cairo University",
      ar: "دكتوراه العلاج الطبيعي، جامعة القاهرة",
    },
    specialty: { en: "Physiotherapy", ar: "العلاج الطبيعي" },
    bio: {
      en: "12+ years treating critically ill patients in ICU settings, specializing in early mobilization and ventilator weaning protocols.",
      ar: "أكثر من 12 عامًا في علاج المرضى الحرجين بالعناية المركزة، متخصصة في بروتوكولات التحريك المبكر وفطام أجهزة التنفس.",
    },
    experienceYears: 12,
    studentsTaught: 1240,
    featuredCourseTitle: {
      en: "ICU Physiotherapy",
      ar: "العلاج الطبيعي للعناية المركزة",
    },
    profileHref: "/#courses",
    imageId: "instructor-yasmine",
    displayOrder: 1,
    isFeatured: true,
  },
  {
    id: "omar-khaled",
    nameEn: "Omar Khaled, PT",
    nameAr: "عمر خالد",
    title: {
      en: "Neuro-Rehabilitation Specialist",
      ar: "أخصائي تأهيل عصبي",
    },
    qualification: {
      en: "MSc Neuro-Physiotherapy",
      ar: "ماجستير التأهيل العصبي",
    },
    specialty: { en: "Physiotherapy", ar: "العلاج الطبيعي" },
    bio: {
      en: "Specializes in neuro-rehabilitation with a focus on stroke recovery and gait retraining for functional independence.",
      ar: "متخصص في التأهيل العصبي مع التركيز على تعافي السكتة الدماغية وإعادة تأهيل المشي لاستعادة الاستقلالية الوظيفية.",
    },
    experienceYears: 9,
    studentsTaught: 2380,
    featuredCourseTitle: {
      en: "Stroke Rehabilitation",
      ar: "إعادة تأهيل السكتة الدماغية",
    },
    profileHref: "/#courses",
    imageId: "instructor-omar",
    displayOrder: 2,
    isFeatured: true,
  },
  {
    id: "karim-fathy",
    nameEn: "Karim Fathy, PT",
    nameAr: "كريم فتحي",
    title: {
      en: "Orthopedic Physiotherapist",
      ar: "أخصائي علاج طبيعي عظمي",
    },
    qualification: {
      en: "MSc Sports Injuries",
      ar: "ماجستير إصابات الرياضة",
    },
    specialty: { en: "Physiotherapy", ar: "العلاج الطبيعي" },
    bio: {
      en: "Focuses on structured orthopedic assessment and manual therapy for common musculoskeletal conditions.",
      ar: "يركّز على التقييم العظمي المنظّم والعلاج اليدوي للحالات العضلية الهيكلية الشائعة.",
    },
    experienceYears: 10,
    studentsTaught: 3150,
    featuredCourseTitle: {
      en: "Orthopedic Assessment & Manual Therapy",
      ar: "التقييم العظمي والعلاج اليدوي",
    },
    profileHref: "/#courses",
    imageId: "instructor-karim",
    displayOrder: 3,
    isFeatured: true,
  },
  {
    id: "laila-hassan",
    nameEn: "Laila Hassan, RD",
    nameAr: "ليلى حسن",
    title: {
      en: "Clinical Dietitian",
      ar: "أخصائية تغذية إكلينيكية",
    },
    qualification: {
      en: "MSc Clinical Nutrition",
      ar: "ماجستير التغذية الإكلينيكية",
    },
    specialty: { en: "Nutrition", ar: "التغذية" },
    bio: {
      en: "Builds clinical nutrition plans for hospitalized and outpatient populations grounded in current evidence.",
      ar: "تضع خطط تغذية إكلينيكية للمرضى داخل وخارج المستشفى مبنية على أحدث الأدلة العلمية.",
    },
    experienceYears: 7,
    studentsTaught: 4200,
    featuredCourseTitle: {
      en: "Clinical Nutrition Fundamentals",
      ar: "أساسيات التغذية الإكلينيكية",
    },
    profileHref: "/#courses",
    imageId: "instructor-laila",
    displayOrder: 4,
    isFeatured: true,
  },
  {
    id: "rana-tawfik",
    nameEn: "Dr. Rana Tawfik, RD",
    nameAr: "د. رنا توفيق",
    title: {
      en: "Sports Nutrition Specialist",
      ar: "أخصائية تغذية رياضية",
    },
    qualification: {
      en: "PhD Sports Science",
      ar: "دكتوراه علوم الرياضة",
    },
    specialty: { en: "Nutrition", ar: "التغذية" },
    bio: {
      en: "Works with competitive athletes on fueling, recovery, and body composition strategies.",
      ar: "تعمل مع الرياضيين التنافسيين على استراتيجيات التغذية والتعافي وتكوين الجسم.",
    },
    experienceYears: 8,
    studentsTaught: 1890,
    featuredCourseTitle: {
      en: "Sports Nutrition",
      ar: "التغذية الرياضية",
    },
    profileHref: "/#courses",
    imageId: "instructor-rana",
    displayOrder: 5,
    isFeatured: true,
  },
  {
    id: "sara-fahmy",
    nameEn: "Sara Fahmy, RD",
    nameAr: "سارة فهمي",
    title: {
      en: "Metabolic Nutrition Specialist",
      ar: "أخصائية تغذية استقلابية",
    },
    qualification: {
      en: "MSc Metabolic Health",
      ar: "ماجستير الصحة الاستقلابية",
    },
    specialty: { en: "Nutrition", ar: "التغذية" },
    bio: {
      en: "Helps patients manage diabetes and obesity through practical, sustainable dietary change.",
      ar: "تساعد المرضى على إدارة السكري والسمنة من خلال تغييرات غذائية عملية ومستدامة.",
    },
    experienceYears: 6,
    studentsTaught: 1560,
    featuredCourseTitle: {
      en: "Diabetes & Obesity Nutrition Management",
      ar: "إدارة تغذية السكري والسمنة",
    },
    profileHref: "/#courses",
    imageId: "instructor-sara",
    displayOrder: 6,
    isFeatured: true,
  },
];
