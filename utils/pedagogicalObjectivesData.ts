// utils/pedagogicalObjectivesData.ts
// التوجيهات التربوية الخاصة بمادة التربية البدنية والرياضية 2009 (OP EPS Maroc 2009)

export interface PedagogicalSessionGoal {
  seanceNumber: number;
  phase: 'diagnostic' | 'learning' | 'integration' | 'summative';
  phaseLabelAr: string;
  titleAr: string;
  titleFr: string;
  motorObjective: string;        // الهدف الحركي / المهاري
  cognitiveObjective: string;    // الهدف المعرفي / المفاهيمي
  behavioralObjective: string;  // الهدف السلوكي / الوجداني
  situation: string;             // وضعية التعلم والإنجاز
  criteria: string;              // معايير التقويم والنجاح
}

export interface SportProgression {
  sportKey: string;
  sportNameAr: string;
  sportNameFr: string;
  categoryAr: string;
  otcCollegeAr: string;          // الهدف الختامي للإعدادي OTC
  otcLycéeAr: string;            // الهدف الختامي للتأهيلي OTC
  levels: {
    college: PedagogicalSessionGoal[];
    lycee: PedagogicalSessionGoal[];
  };
}

export const MOROCCAN_EPS_SPORTS: SportProgression[] = [
  // 1. الجري السريع (Course de vitesse)
  {
    sportKey: 'vitesse',
    sportNameAr: 'الجري السريع',
    sportNameFr: 'Course de vitesse',
    categoryAr: 'ألعاب القوى (أنشطة قياس المسافة والزمن)',
    otcCollegeAr: 'إنتاج أقصى سرعة ممكنة والحفاظ عليها على مسافة محددة انطلاقاً من بداية فعالة، مع احترام ممرات السباق وقواعد التحكيم.',
    otcLycéeAr: 'تحسين مراحل الانطلاق والتسارع والحفاظ على أقصى سرعة حتى خط النهاية بتنسيق حركي متوازن وتدبير أمثل للجهد.',
    levels: {
      college: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'التقويم التشخيصي: قياس زمن رد الفعل والسرعة القصوى الأولية',
          titleFr: 'Évaluation diagnostique : Temps de réaction et vitesse initiale',
          motorObjective: 'قطع مسافة 40م أو 50م بأقصى سرعة ممكنة انطلاقاً من إشارة صوتية.',
          cognitiveObjective: 'معرفة الإشارات القانونية للانطلاق (استعد - خذ مكانك - انطلق) وشروط المسار.',
          behavioralObjective: 'الانخراط الإيجابي في الاختبار وتقبل النتائج المسجلة واحترام الزملاء.',
          situation: 'سباقات ثنائية متكافئة على مسافة 40م/50م مع قياس دقيق للزمن وتدوين الملاحظات الأولية.',
          criteria: 'زمن الانطلاق بعد الإشارة، الحفاظ على خط مستقيم، عدم التباطؤ قبل خط الوصول.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تحسين وضعية الانطلاق المنخفض والتفاعل اللحظي مع الإشارة',
          titleFr: 'Amélioration du départ accroupi et temps de réaction',
          motorObjective: 'اتخاذ وضعية انطلاق منخفضة صحيحة والاندفاع القوي للأمام دون رفع الجذع مبكراً.',
          cognitiveObjective: 'فهم زوايا الدفع الفعال وتوزيع الثقل على اليدين والرجلين.',
          behavioralObjective: 'التركيز الذهني والانضباط التام عند الاستعداد للإشارة.',
          situation: 'تمارين دفع الحائط، انطلاقات من وضعيات متنوعة (جلوس، انبطاح، انطلاق منخفض) على مسافة 15م.',
          criteria: 'دفع قوي بالرجل الأمامية، ميلان الجذع إلى الأمام، انعدام الأخطاء في الانطلاق.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير مرحلة التسارع (La phase de mise en action)',
          titleFr: 'Développement de la phase d\'accélération',
          motorObjective: 'الانتقال التدريجي من وضعية الميلان إلى الانتصاب مع زيادة سرعة الخطوات.',
          cognitiveObjective: 'إدراك الفارق بين تواتر الخطوات (Fréquence) وسعتها (Amplitude).',
          behavioralObjective: 'التحلي بروح التحدي ومحاولة بلوغ أقصى تسارع في أول 20 متراً.',
          situation: 'الجري داخل ممر لافتات أو أطواق متباعدة تدريجياً لفرض زيادة تدريجية في طول الخطوة.',
          criteria: 'استقامة تدريجية للجذع عند حدود 20م، تسارع ملحوظ دون انقطاع أو تشنج عضلي.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التنسيق بين حركة الذراعين وتواتر الرجلين (Coordination motrice)',
          titleFr: 'Coordination motrice bras-jambes en course',
          motorObjective: 'حركة ترددية نشطة ومتوازنة للذراعين في اتجاه الجري بزاوية 90 درجة.',
          cognitiveObjective: 'معرفة دور الذراعين في الموازنة ودفع الجسم للأمام واقتصاد الجهد.',
          behavioralObjective: 'التركيز على التصحيح الذاتي والتنفس الإيقاعي المنتظم.',
          situation: 'ورشات جري سريع مع حركات الذراعين بالأثقال الخفيفة، وجري في ممرات ضيقة.',
          criteria: 'ثبات الجذع، عدم التمايل الجانبي للكتفين، حركة ذراعين أمامية-خلفية سليمة.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير السرعة القصوى (Vitesse maximale aérobie / anaérobie)',
          titleFr: 'Développement de la vitesse de pointe lancée',
          motorObjective: 'بلوغ السرعة القصوى والحفاظ عليها بواسطة دفع خلفي كامل وارتكاز نشط على مشط القدم.',
          cognitiveObjective: 'الوعي بأهمية الجري على مقدمة القدم وتفادي الارتكاز على الكعب.',
          behavioralObjective: 'بذل أقصى جهد بدني وتجاوز الشعور بالتعب السريع.',
          situation: 'جري سريع منطلق (Course lancée): 15م تسارع + 30م بأقصى سرعة ممكنة.',
          criteria: 'ارتكاز ديناميكي خفيف، صعود الركبة للأمام والأعلى، مسار مستقيم تماماً.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'مقاومة انخفاض السرعة وتدبير نهاية السباق (Fin de course)',
          titleFr: 'Maintien de la vitesse et franchissement de la ligne',
          motorObjective: 'الحفاظ على وتيرة الخطوات حتى خط النهاية واجتيازه باندفاع دون تباطؤ مسبق.',
          cognitiveObjective: 'استيعاب تقنية إمالة الصدر (Le cassé de buste) عند خط الوصول.',
          behavioralObjective: 'الروح الرياضية والمنافسة الشريفة حتى الرمق الأخير.',
          situation: 'تحديات تنافسية 50م مع خط وصول وهمي يبعد 5 أمتار بعد خط النهاية الحقيقي.',
          criteria: 'عدم رفع الرأس أو التباطؤ قبل الوصول، إمالة الصدر في اللحظة الحاسمة.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'سباق التتابع والتنسيق الجماعي (Course de relais)',
          titleFr: 'Transmission du témoin et travail collectif',
          motorObjective: 'استلام وتسليم الشاهد داخل المنطقة القانونية دون فقدان السرعة.',
          cognitiveObjective: 'معرفة قواعد منطقة التسليم (20م) وتوقيت الانطلاق للعداء المستقبل.',
          behavioralObjective: 'التعاون والتواصل الفعال وتنمية روح الفريق والتضامن.',
          situation: 'سباق تتابع 4×50م أو 4×60م في مجموعات متكافئة مع التركيز على التسليم البصري/اللاعيني.',
          criteria: 'عدم سقوط الشاهد، استلام داخل المنطقة القانونية، المحافظة على السرعة.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحكيم، قياس الزمن وتنظيم المنافسة الرسمية',
          titleFr: 'Rôles sociaux : chronométrage, starter et arbitrage',
          motorObjective: 'تطبيق التقنيات المكتسبة في مضمار السباق في ظروف مماثلة للمنافسة.',
          cognitiveObjective: 'إتقان مسك الميقاتية (Chronomètre) وقراءة النتائج وتطبيق قوانين السباق.',
          behavioralObjective: 'تحمل المسؤولية والنزاهة في التحكيم وتدوين النتائج بمصداقية.',
          situation: 'أدوار متبادلة: عداء، ميقاتي، منطلق (Starter)، مراقب خط الوصول، كاتب النتائج.',
          criteria: 'دقة التوقيت، احترام إشارات الانطلاق، تحكيم نزيه وخالٍ من الأخطاء.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'حصة الإدماج والمحاكاة التنافسية (Séance d\'intégration)',
          titleFr: 'Simulation de compétition et remédiation personnalisée',
          motorObjective: 'إدماج مراحل الانطلاق، التسارع، السرعة القصوى واجتياز خط النهاية في سباق متكامل.',
          cognitiveObjective: 'تحليل الأخطاء المرتكبة ومقارنة الأداء الحالي مع نتائج التقويم التشخيصي.',
          behavioralObjective: 'الثقة بالنفس، تقييم الزميل نقدياً وبناءً، والاستعداد للامتحان النهائي.',
          situation: 'سباقات تصفيات نصف نهائية ونهائية وفق مستويات الأداء مع معالجة الثغرات.',
          criteria: 'تكامل مراحل السباق، تحسن ملحوظ في التوقيت الشخصي، تطبيق كامل للتعليمات.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي النهائي ورصد المكتسبات (Évaluation sommative)',
          titleFr: 'Évaluation sommative finale et notation du cycle',
          motorObjective: 'تحقيق أفضل إنجاز زمني ممكن على مسافة 60م مع الانطلاق المنخفض السليم.',
          cognitiveObjective: 'الإلمام التام بجميع معايير التنقيط المعتمدة في التوجيهات التربوية 2009.',
          behavioralObjective: 'الانضباط التام، الروح الرياضية، والالتزام بمعايير التقويم المستمر.',
          situation: 'اختبار رسمي فردي من محاولتين على مسافة 60م، مع تطبيق سلم التنقيط الوزاري.',
          criteria: 'الإنجاز الرقمي (السرعة)، التقنية الحركية، والسلوك والمواظبة (نقطة /20).'
        }
      ],
      lycee: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'التقويم التشخيصي لسرعة الانطلاق والسرعة الحركية على مسافة 60م',
          titleFr: 'Évaluation diagnostique : Vitesse de réaction et accélération 60m',
          motorObjective: 'تحقيق أقصى إنجاز زمني انطلاقاً من جهاز الانطلاق (Starting-blocks).',
          cognitiveObjective: 'التمكن من ضبط جهاز الانطلاق بما يناسب قياسات الجسم وقوة الدفع.',
          behavioralObjective: 'الجدية والالتزام بمعايير السلامة وتنظيم مسارات المضمار.',
          situation: 'سباق 60م رسمي بتوقيت مزدوج وجهاز انطلاق لتحديد المستويات الأولية.',
          criteria: 'الخروج المتوازن من جهاز الانطلاق، توقيت الاستجابة، الفعالية الحركية.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الضبط البيوميكانيكي للبدء من جهاز الانطلاق (Starting-blocks)',
          titleFr: 'Réglage et efficacité de poussée sur starting-blocks',
          motorObjective: 'تحسين زوايا المفاصل (120° و90°) وإنتاج أقصى قوة دفع أفقية لحظة الانطلاق.',
          cognitiveObjective: 'معرفة المبادئ الميكانيكية لتوجيه قوة رد الفعل للأمام.',
          behavioralObjective: 'الدقة في ضبط المعدات الرياضية والملاحظة البناءة لأداء الزميل.',
          situation: 'ورشات تجريبية لضبط المسافات بين الدواستين وقياس فعالية الانطلاق في أول 10 أمتار.',
          criteria: 'دفع متزامن وقوي، عدم وثب للأعلى، تدرج زاوية ميلان الجذع.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير قوة التسارع والارتقاء الإيقاعي (Mise en action explosive)',
          titleFr: 'Accélération explosive et allongement progressif des foulées',
          motorObjective: 'زيادة سعة وتواتر الخطوات بتوازن دون اختلال التوافق الحركي.',
          cognitiveObjective: 'القدرة على التمييز بين خطوات التسارع وخطوات السرعة القصوى المستقرة.',
          behavioralObjective: 'التركيز العالي والإصرار على الاستثمار البدني الكامل.',
          situation: 'جري مقاوم بالشد (Sled / élastique) يليه جري متحرر على مسافة 30م.',
          criteria: 'تسارع ديناميكي متصل، الحفاظ على مركز ثقل متقدم، حركة ساق دائرية كاملة.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تحسين تواتر وسعة الخطوة في مرحلة السرعة القصوى (Fréquence et amplitude)',
          titleFr: 'Optimisation du rapport fréquence/amplitude de la foulée',
          motorObjective: 'الموازنة المثلى بين عدد الخطوات في الثانية وطول الخطوة الواحدة.',
          cognitiveObjective: 'معرفة وتحديد نوع العداء (عداء تواتر أم عداء سعة) لتخصيص التدريب.',
          behavioralObjective: 'التقييم الذاتي الدقيق واستخدام أدوات القياس (شريط متري، تصوير رقمي).',
          situation: 'الجري في مضمار محدد بعلامات قياسية مع حساب عدد الخطوات على مسافة 30م.',
          criteria: 'تحقيق أعلى سرعة دون تشنج أو مبالغة مفرطة في سعة الخطوة.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الارتكاز الديناميكي النشط على المشط واقتصاد الجهد (Pied actif)',
          titleFr: 'Griffé du sol et réduction du temps de contact',
          motorObjective: 'تقليص زمن تلامس القدم مع الأرض عبر حركة السحب الخلفي الخاطف (Griffé).',
          cognitiveObjective: 'فهم الدور الحاسم لعضلات الساق والكاحل في إعادة إنتاج الطاقة المرنة.',
          behavioralObjective: 'المثابرة في أداء التدريبات النوعية لتنمية القوة الارتدادية (Pliométrie).',
          situation: 'حواجز واطئة متقاربة، وثبات إيقاعية، وجري سريع مع التركيز على ارتداد المشط.',
          criteria: 'صوت ارتكاز خفيف وسريع، ارتداد رأسي مباشر، ثبات الكاحل أثناء الدفع.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'استقرار الجذع وتوجيه الحركات في اتجاه الجري (Gainage dynamique)',
          titleFr: 'Gainage dynamique et alignement tête-tronc-bassin',
          motorObjective: 'الحفاظ على المحاذاة المستقيمة للرأس والجذع والحوض لتفادي تبديد الطاقة.',
          cognitiveObjective: 'استيعاب مفاهيم عزل القوى والقصور الذاتي ومقاومة الهواء.',
          behavioralObjective: 'الانضباط والتحكم في إشارات الجسم ولغة الحركة.',
          situation: 'سباقات ثنائية مع تدقيق في وضعية الحوض والكتفين بواسطة الملاحظة المزدوجة.',
          criteria: 'استقرار الحوض والكتفين، غياب الحركات الالتوائية، حركة ذراعين موازية للمسار.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'مقاومة الإجهاد اللاهوائي والحفاظ على السرعة حتى النهاية',
          titleFr: 'Résistance à la fatigue anaérobie et maintien de la vitesse',
          motorObjective: 'تثبيت سرعة الجري في الأمتار العشرين الأخيرة ومقاومة التصلب العضلي.',
          cognitiveObjective: 'معرفة آلية إنتاج الطاقة اللاهوائية اللبنية وتأثيرها على العضلات.',
          behavioralObjective: 'قوة الإرادة وتدبير الطاقة الإيجابية في مواجهة الإجهاد.',
          situation: 'تكرار سباقات 80م بسرعة 95% مع فترات استرجاع مدروسة (3 إلى 4 دقائق).',
          criteria: 'انعدام انخفاض السرعة الحاد في آخر 15 متراً، اجتياز واثق لخط النهاية.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحكيم الرسمي وتدبير ملتقيات ألعاب القوى المدرسية',
          titleFr: 'Organisation, arbitrage officiel et protocoles de compétition',
          motorObjective: 'القيام بمختلف الأدوار التقنية والتنظيمية في مسابقة رسمية للسرعة.',
          cognitiveObjective: 'الإلمام بقوانين الاتحاد الدولي لألعاب القوى (IAAF) المعتمدة مدرسياً.',
          behavioralObjective: 'النزاهة، روح المسؤولية القيادية، والقدرة على إدارة النزاعات الرياضية.',
          situation: 'تنظيم دوري مصغر للسرعة مع توزيع بطاقات التحكيم الرسمية ورصد الانطلاقات الخاطئة.',
          criteria: 'تطبيق الإجراءات القانونية بحزم، سرعة ودقة استخراج النتائج والتصنيفات.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'المحاكاة الشاملة لظروف الامتحان الوطني الموحد (Simulation officielle)',
          titleFr: 'Simulation de l\'épreuve certificative du Baccalauréat',
          motorObjective: 'تنفيذ سباق 60م كامل بأقصى إمكانات التلميذ وتحت ضغط المنافسة الحقيقي.',
          cognitiveObjective: 'قراءة شبكة التقويم الوزارية الخاصة بالسلك التأهيلي وفهم عناصر التنقيط.',
          behavioralObjective: 'التحكم في التوتر النفسي، التركيز التام، والجاهزية البدنية والذهنية.',
          situation: 'سباقات تنافسية متسلسلة وفق سلاسل المستويات مع تصوير وتحليل فوري للأداء.',
          criteria: 'تطابق تام مع معايير الاختبار الوطني، ضبط استراتيجية السباق، تحسن زمني ملموس.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم الإشهادي والنهائي للدورة وفق معايير التوجيهات التربوية 2009',
          titleFr: 'Évaluation sommative certifiée selon les OP 2009',
          motorObjective: 'تحقيق أفضل زمن مسجل على 60م باعتماد جهاز الانطلاق وتقنيات الركض المتقدمة.',
          cognitiveObjective: 'استيعاب وتقبل النتيجة المحققة وربطها بالمجهود المبذول طيلة الدورة التعلمية.',
          behavioralObjective: 'الانضباط والروح الرياضية العالية وتقاسم الخبرات مع الزملاء.',
          situation: 'إجراء محاولتين رسميتين لكل تلميذ وفق سلم التنقيط المعتمد رسمياً (20 نقطة).',
          criteria: 'الأداء الزمني (12 أو 14 نقطة)، جودة الإنجاز الحركي، والمعارف والمواظبة (نقطة /20).'
        }
      ]
    }
  },

  // 2. الجمباز الأرضي (Gymnastique au sol)
  {
    sportKey: 'gymnastique',
    sportNameAr: 'الجمباز الأرضي',
    sportNameFr: 'Gymnastique au sol',
    categoryAr: 'الأنشطة الجمبازية والفنية (أنشطة إنتاج أشكال جمالية وحركية)',
    otcCollegeAr: 'ابتكار وأداء سلسلة حركية أرضية مكونة من 4 إلى 5 عناصر جمبازية متنوعة (دحرجات، توازنات، قلبات) بتنسيق وسلاسة وأمان.',
    otcLycéeAr: 'تصميم وتنفيذ سلسلة جمبازية فردية مركبة تدمج عناصر الصعوبة (A, B, C) مع ربط سلس وإيقاع حركي متناسق وثبات عند الاستقبال.',
    levels: {
      college: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'تقويم تشخيصي: استكشاف الرصيد الجمبازي القاعدي وعناصر الأمان',
          titleFr: 'Évaluation diagnostique : Éléments gymniques de base et sécurité',
          motorObjective: 'إنجاز حركات جمبازية بسيطة (دحرجة أمامية، ثبات على ساق، وثبة مستقيمة).',
          cognitiveObjective: 'معرفة شروط السلامة وقواعد استخدام بساط الجمباز وضرورة الحماية المتبادلة.',
          behavioralObjective: 'الاحترام المتبادل، الشجاعة والانضباط، ومساعدة الزميل في الحماية (Parade).',
          situation: 'مسار جمبازي استكشافي يضم محطات متنوعة للدحرجة، التوازن، والوثب.',
          criteria: 'أداء الحركات دون تردد مع الحفاظ على سلامة الرأس والعنق، والتحكم في النزول.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إتقان الدحرجة الأمامية والخلفية مع محاذاة العمود الفقري',
          titleFr: 'Maîtrise des roulades avant et arrière dans l\'axe',
          motorObjective: 'التدحرج الكامل على الظهر المكور مع ثني الرأس والانتهاء بالوقوف دون الاستناد باليدين.',
          cognitiveObjective: 'فهم ميكانيزم التكوير (Enroulement) ودور دفع اليدين على البساط.',
          behavioralObjective: 'تجاوز الخوف من فقدان الرؤية الخلفية والثقة في قدرات الجسم.',
          situation: 'تمارين على السطح المائل (Plan incliné) لتسهيل الدوران، ثم الانتقال للبساط المستوي.',
          criteria: 'استقامة مسار الدوران، عدم ملامسة قمة الرأس للبساط، الوقوف المتوازن في النهاية.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير الوقوف على الرأس واليدين بتوازن (Équilibre trépied)',
          titleFr: 'Apprentissage de l\'équilibre sur la tête et les mains',
          motorObjective: 'رفع الجذع والرجلين والاستقرار في وضعية توازن ثلاثي القواعد لمدة 3 ثوان.',
          cognitiveObjective: 'استيعاب قاعدة تشكيل مثلث متساوي الأضلاع بين الرأس واليدين لضمان الثبات.',
          behavioralObjective: 'التركيز العضلي والتنفس الهادئ وتقديم الحماية اليقظة للزميل.',
          situation: 'تمارين ثنائية بمحاذاة الحائط مع وجود مرافق (Pareur) يسند الحوض والرجلين.',
          criteria: 'تثبيت التوازن 3 ثوانٍ كاملة، شد عضلات البطن (Gainage)، والنزول المتحكم فيه.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تعلم مدخل الوقوف على اليدين المرفوع (ATR - Appui Tendu Renversé)',
          titleFr: 'Apprentissage de l\'Appui Tendu Renversé (ATR)',
          motorObjective: 'الاندفاع برجل واحدة والصعود إلى الاستقامة العمودية مع مد الذراعين بالكامل.',
          cognitiveObjective: 'معرفة أهمية قفل مفصلي المرفقين والكتفين وشد الجسم كقطعة واحدة.',
          behavioralObjective: 'الشجاعة والانضباط الصارم لمنع السقوط العشوائي.',
          situation: 'الصعود التدريجي للأرجل على الحائط (L\'araignée) ثم محاولات حرة بمساعدة حاميَين.',
          criteria: 'ذراعان ممدودتان بالكامل، محاذاة اليدين والكتفين والحوض، نزول متدرج برجل تلو الأخرى.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تعلم القلبة الجانبية / العجلة (La roue gymnique)',
          titleFr: 'Apprentissage du renversement latéral (La roue)',
          motorObjective: 'المرور بالوضعية المقلوبة في محور مستقيم بتتابع سليم لوضع اليدين والرجلين (1-2-3-4).',
          cognitiveObjective: 'فهم إيقاع النزول المتسلسل (يد أولى - يد ثانية - رجل أولى - رجل ثانية).',
          behavioralObjective: 'الجرأة الحركية واحترام مسافة الأمان مع الزملاء.',
          situation: 'أداء الحركة فوق شريط خطي محدد على البساط مع اجتياز عائق واطئ في الوسط.',
          criteria: 'بقاء الأطراف ممدودة في خط مستقيم، الهبوط في وضعية الوقوف مع فتح الحوض.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'حركات التوازن والربط الحركي (Planche faciale et liaisons)',
          titleFr: 'Équilibre (Planche) et éléments de liaison gymniques',
          motorObjective: 'أداء حركة الميزان (Planche) مع رفع الساق الخلفية بزاوية 90° والربط بحركات تنقل رشيقة.',
          cognitiveObjective: 'معرفة كيفية استخدام حركات الربط البسيطة لتفادي التوقف الميت بين الحركات.',
          behavioralObjective: 'الحس الجمالي، أناقة الحركة، وتناسق الأطراف.',
          situation: 'تركيب ثنائيات حركية: (دحرجة + وقوف + ميزان) أو (عجلة + نصف دورة + وثبة).',
          criteria: 'ثبات حركة الميزان 3 ثوان، انسيابية الانتقال من حركة لأخرى دون انقطاع.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الوثبات الجمبازية واستقرار الاستقبال (Sauts et réceptions)',
          titleFr: 'Sauts gymniques et stabilisation à la réception',
          motorObjective: 'أداء وثبة جمبازية (وثبة تمدد، وثبة قط، أو نصف دورة) مع هبوط ثابت ملتصق بالأرض (Pilé).',
          cognitiveObjective: 'إدراك دور ثني الركبتين لامتصاص الصدمات وحماية المفاصل عند الاستقبال.',
          behavioralObjective: 'احترام شروط الجودة والشكل الجمالي النهائي للحركة.',
          situation: 'القفز من منصة منخفضة أو بعد خطوات تمهيدية مع الهبوط داخل حيز محدد دون ارتداد.',
          criteria: 'ارتقاء عمودي عالٍ، هبوط متزن على القدمين دون أي خطوة تصحيحية أو فقدان توازن.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'بناء وتركيب السلسلة الحركية الفردية (Composition de l\'enchaînement)',
          titleFr: 'Composition d\'un enchaînement individuel de 4 à 5 éléments',
          motorObjective: 'دمج 4 عناصر رئيسية مختلفة (دحرجة، دوران، توازن، وثب) في مسار هندسي واضح.',
          cognitiveObjective: 'معرفة قواعد بطاقة التنقيط الجمبازية وتوزيع الصعوبات على طول السلسلة.',
          behavioralObjective: 'الاستقلالية في الاختيار والابتكار، وتقديم المشورة البناءة للزملاء.',
          situation: 'العمل الفردي على بساط السلسلة مع استخدام بطاقة تخطيط ورقية مسبقة لاختيار الحركات.',
          criteria: 'تنوع العائلات الجمبازية، احترام المسار المختار (خطي، دائري أو زاوية)، عدم التكرار.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'المحاكاة التحكيمية والتقويم التكويني بالقرين (Évaluation par les pairs)',
          titleFr: 'Répétition générale, jugement par les pairs et régulation',
          motorObjective: 'أداء السلسلة الكاملة أمام لجنة تحكيم من التلاميذ مع مراعاة البداية والنهاية الرسمية.',
          cognitiveObjective: 'تطبيق معايير التنقيط (صعوبة الإنجاز، جودة التنفيذ، والسقوط أو الأخطاء التقنية).',
          behavioralObjective: 'تقمص دور الحكم بنزاهة وجدية، وتقبل ملاحظات الزملاء لتجويد الأداء.',
          situation: 'محاكاة بطولة صفية: تلميذ يؤدي، اثنان يحكمان، وآخران يضمنان الحماية والأمان.',
          criteria: 'تسلسل سلس، إشارة البداية والنهاية، تسجيل وتدوين نقاط موضوعية وواقعية.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي النهائي للسلسلة الجمبازية (Évaluation sommative)',
          titleFr: 'Évaluation sommative finale individuelle de l\'enchaînement',
          motorObjective: 'تقديم السلسلة الجمبازية الفردية الكاملة بأعلى درجات الإتقان والثبات والجمالية.',
          cognitiveObjective: 'الإلمام التام ببطاقة التحكيم الرسمية للجمباز المعتمدة في توجيهات 2009.',
          behavioralObjective: 'الثقة بالنفس، الانضباط في الزي والوقفة، والتحلي بروح الاحترام والتقدير.',
          situation: 'أداء رسمي فردي على بساط الجمباز أمام الأستاذ ولجنة التقييم.',
          criteria: 'صعوبة العناصر (Difficulté)، جودة الإنجاز والربط (Exécution)، والسلوك والمواظبة (نقطة /20).'
        }
      ],
      lycee: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'التقويم التشخيصي للكفاءات الجمبازية وتصنيف الصعوبات (A, B, C)',
          titleFr: 'Évaluation diagnostique du niveau gymnique et classification (Code A, B, C)',
          motorObjective: 'تنفيذ تشكيلة من الحركات الجمبازية المتقدمة لتقييم المرونة، القوة، والتوازن.',
          cognitiveObjective: 'التعرف على دليل الصعوبات المعتمد في السلك التأهيلي وتوزيع القيم النقطية.',
          behavioralObjective: 'الشجاعة المحسوبة والحرص الشديد على شروط السلامة والتأمين الذاتي والمتبادل.',
          situation: 'ورشات تقويمية متدرجة الصعوبة لاختبار مستويات التلاميذ الحركية والجمبازية.',
          criteria: 'دقة التنفيذ، التحكم في الوضعيات المقلوبة، التقدير الموضوعي للقدرات الذاتية.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إتقان الوقوف على اليدين مع الدحرجة (ATR tombé en roulade)',
          titleFr: 'Maîtrise de l\'ATR tombé en roulade avec maintien dorsal',
          motorObjective: 'الوصول إلى الاستقامة التامة للأطراف في وضع ATR ثم ثني الذراعين والتكور الهادئ.',
          cognitiveObjective: 'إدراك التوقيت المناسب لثني الذراعين وحماية الرأس لمنع الاصطدام بالبساط.',
          behavioralObjective: 'الثقة بالنفس والتحكم الذاتي في السرعة الزاوية أثناء السقوط الموجه.',
          situation: 'التدرج من ملامسة الصدر للحائط إلى الأداء الحر على بساطين متراكبين لحماية العنق.',
          criteria: 'استقامة واضحة قبل النزول، ثني بطيء ومتحكم للذراعين، دحرجة ناعمة دون ضجيج.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير حركات الدوران حول المحور الطولي (Pivot et pirouette 360°)',
          titleFr: 'Rotations longitudinales : Pivots au sol et pirouettes',
          motorObjective: 'تنفيذ دوران كامل 360° على ساق واحدة مع الحفاظ على التوازن والامتداد العمودي.',
          cognitiveObjective: 'فهم دور تثبيت البصر على نقطة مرجعية (Fixation du regard) لتفادي الدوار.',
          behavioralObjective: 'البحث عن الأناقة والتعبير الجسدي والانسجام الإيقاعي.',
          situation: 'تمارين توازن ودوران على خطوط مرسومة، والانتقال من نصف دورة إلى دورة كاملة.',
          criteria: 'دوران سريع وسلس، تثبيت التوازن في النهاية على مشط القدم دون ميلان الحوض.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'القلبة الهوائية الجانبية والعجلة بدينامية عالية (Rondade gymnique)',
          titleFr: 'Apprentissage de la rondade avec impulsion dynamique',
          motorObjective: 'تحويل السرعة الأفقية إلى ارتقاء عمودي مع ضم الرجلين في الهواء والدوران 90°.',
          cognitiveObjective: 'فهم الدور الميكانيكي لدفع اليدين السريع (Repousser du sol) لإحداث ارتداد قوي.',
          behavioralObjective: 'الجرأة في الأداء واليقظة المستمرة في الحماية المتبادلة.',
          situation: 'الاندفاع بخطوات سريعة ثم وضع اليدين على خط مائل مع الهبوط بكلا القدمين معاً.',
          criteria: 'ضم الرجلين قبل ملامسة الأرض، هبوط قوي وممتص، توجيه الجسم في عكس اتجاه الانطلاق.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'حركات القوة والمرونة المتقدمة (Éléments de souplesse et force)',
          titleFr: 'Éléments de force (Équerre) et de souplesse (Pont/Grand écart)',
          motorObjective: 'أداء حركة القوس (Pont) أو الزاوية (Équerre) أو الفتح الكامل وثباتها لـ 3 ثوان.',
          cognitiveObjective: 'معرفة المتطلبات الفيزيولوجية لتطوير المرونة وقوة عضلات الحزام البطني.',
          behavioralObjective: 'الصبر والتحمل والعمل الذاتي الهادف لتطوير المكتسبات البدنية.',
          situation: 'محطات إحماء تخصصية للمرونة، يتبعها تثبيت الحركات المعتمدة في كود الصعوبات.',
          criteria: 'مد كامل للذراعين والرجلين، ثبات زمني دقيق (3 ثوان)، خروج متزن وآمن من الحركة.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الربط الديناميكي والإيقاعي بين الصعوبات المختلفة (Liaisons acrobatiques)',
          titleFr: 'Liaisons acrobatiques et chorégraphiques fluides',
          motorObjective: 'ربط حركتين أكروباتيتين أو أكثر دون فترات توقف سلبية بينهما (مثال: عجلة + رنداد + قفزة).',
          cognitiveObjective: 'فهم مبدأ استثمار كمية الحركة المكتسبة واستغلالها في الحركة الموالية.',
          behavioralObjective: 'الشعور بالإيقاع وتناغم الأداء وتفادي الحركات الزائدة.',
          situation: 'تمارين المسارات المجمعة مع وضع علامات زمنية ومكانية للربط السلس.',
          criteria: 'انعدام الخطوات الزائدة بين الحركات، الحفاظ على الزخم الحركي، تناسق الهبوط.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تصميم السلسلة الجمبازية وفق شروط كود التنقيط التأهيلي (Code FIG Lycée)',
          titleFr: 'Conception de l\'enchaînement selon le code d\'évaluation officiel',
          motorObjective: 'بناء سلسلة تضم على الأقل 5 عناصر مصنفة (A/B/C) تشمل مختلف المجموعات الهيكلية.',
          cognitiveObjective: 'حساب القيمة الإجمالية للسلسلة واختيار الحركات التي تضمن أعلى نقطة بأقل مجازفة.',
          behavioralObjective: 'الواقعية والنضج في اتخاذ القرارات وحسن تقدير المؤهلات الفردية.',
          situation: 'إعداد بطاقة السلسلة الفردية وتجريب مقاطعها تدريجياً لضبط التوقيت والمساحة.',
          criteria: 'احترام متطلبات التنوع الهيكلي، تغطية مساحة البساط، توازن الصعوبات المختارة.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التدريب التنافسي، التحكيم الدقيق، وتصحيح الأخطاء الصغرى والكبرى',
          titleFr: 'Jugement officiel, pénalités et correction technique',
          motorObjective: 'أداء السلسلة تحت الملاحظة الدقيقة وتصحيح انثناء الركبتين وأصابع القدمين غير المشدودة.',
          cognitiveObjective: 'الإلمام بجدول الخصومات النقطية (خصم 0.10 للأخطاء البسيطة، 0.30 للمتوسطة، 0.50 للجسيمة).',
          behavioralObjective: 'القدرة على التحكيم الرياضي النزيه، والتقبل الذاتي للنقد الهادف.',
          situation: 'محاكاة لجان تحكيم متخصصة (لجنة الصعوبة D ولجنة التنفيذ E) مع تقييم زملاء القسم.',
          criteria: 'تطابق تقييم لجنة التلاميذ مع تقييم الأستاذ، تقليص الأخطاء الجزئية في الأداء.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'حصة الاندماج الشامل والاختبار التجريبي للباكالوريا (Simulation finale)',
          titleFr: 'Répétition générale en conditions réelles d\'examen',
          motorObjective: 'تقديم السلسلة كاملة دون انقطاع وبأعلى مستويات التركيز والثقة بالنفس.',
          cognitiveObjective: 'تحليل شريط الفيديو المسجل للأداء واستخلاص النصائح النهائية لرفع النقطة.',
          behavioralObjective: 'التحكم في الانفعالات وتدبير الضغط النفسي المرتبط بالامتحانات الإشهادية.',
          situation: 'تنظيم بساط رسمي للمرور الفردي بترتيب محدد مع إعلان النقط التقديرية الفورية.',
          criteria: 'انسيابية السلسلة، ثبات الهبوط النهائي (Pilé)، تدارك الأخطاء المفاجئة باحترافية.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي والنهائي المعتمد وفق التوجيهات التربوية الرسمية 2009',
          titleFr: 'Évaluation sommative certifiée du cycle de gymnastique au sol',
          motorObjective: 'إبراز أقصى درجات الإتقان الحركي في إنجاز السلسلة المصممة بثبات وجمالية فائقة.',
          cognitiveObjective: 'المعرفة الدقيقة لعناصر التقويم: الصعوبة (6ن)، التنفيذ والجمالية (8ن)، السلوك والمواظبة (6ن).',
          behavioralObjective: 'احترام قرارات التحكيم، إظهار روح الالتزام والانضباط، وتهنئة الزملاء.',
          situation: 'امتحان رسمي نهائي بمرور فردي على البساط وتسجيل النقطة النهائية في محضر رسمي.',
          criteria: 'درجة الصعوبة المحققة، خلو الأداء من الخصومات والشوائب، الحضور والمواظبة والزي (نقطة /20).'
        }
      ]
    }
  },

  // 3. كرة السلة (Basketball)
  {
    sportKey: 'basketball',
    sportNameAr: 'كرة السلة',
    sportNameFr: 'Basketball',
    categoryAr: 'الرياضات الجماعية (أنشطة التعاون والمواجهة المباشرة)',
    otcCollegeAr: 'المشاركة الفعالة في لعب جماعي هجومي ودفاعي، ونقل الكرة بسرعة نحو سلة الخصم للتصويب بنجاح، مع احترام قواعد اللعبة والتحكيم.',
    otcLycéeAr: 'تنظيم الهجوم السريع والمنظم عبر استغلال المساحات والتفوق العددي، وبناء دفاع منطقة أو رجل لرجل متماسك، مع إدارة المباريات وتطبيق خطط تكتيكية متنوعة.',
    levels: {
      college: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'تقويم تشخيصي: رصد المكتسبات في التمرير والتصويب والانتشار في الملعب',
          titleFr: 'Évaluation diagnostique : Matchs réduits 3v3 et repères spatiaux',
          motorObjective: 'المشاركة في مباريات مصغرة 3 ضد 3 مع محاولة الوصول لسلة الخصم والتصويب.',
          cognitiveObjective: 'معرفة القواعد الجوهرية لكرة السلة (تنطيط الكرة، المشي، الرجوع للمنطقة الخلفية).',
          behavioralObjective: 'اللعب الجماعي، تقبل الآخر، وتقاسم الكرة مع جميع عناصر الفريق.',
          situation: 'مباريات مصغرة 3v3 على نصف ملعب لمدة 6 دقائق مع ملاحظة سلوكيات اللعب.',
          criteria: 'المشاركة الإيجابية، تجنب الجري بالكرة دون تنطيط، محاولة التصويب على السلة.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحكم في التنطيط المتقدم وحماية الكرة من المدافع (Dribble et protection)',
          titleFr: 'Maîtrise du dribble de progression et protection de balle',
          motorObjective: 'تنطيط الكرة باليدين اليمنى واليسرى مع تغيير السرعة والاتجاه واستخدام الجسم كحاجز.',
          cognitiveObjective: 'استيعاب عدم جواز تنطيط الكرة باليدين معاً أو إعادة التنطيط بعد مسكها (Double dribble).',
          behavioralObjective: 'الثقة بالتحكم في الكرة ورفع الرأس لمراقبة الزملاء والمنافس.',
          situation: 'مسالك تنطيط متعرجة بين الحواجز مع وجود مدافع سلبي ثم إيجابي يحاول قطع الكرة.',
          criteria: 'عدم النظر للكرة أثناء التنطيط، التنطيط باليد البعيدة عن المدافع، تغيير سريع للاتجاه.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'دقة وتنوع التمريرات (Passe de poitrine, à terre et au-dessus de la tête)',
          titleFr: 'Précision et variété des passes courtes et longues',
          motorObjective: 'تمرير الكرة بدقة وقوة وسرعة مناسبة نحو صدر الزميل المتحرك في اتجاه السلة.',
          cognitiveObjective: 'معرفة التوقيت المناسب لاختيار نوع التمريرة (الصدرية، المرتدة على الأرض، أو العالية).',
          behavioralObjective: 'التواصل البصري والشجاعة في اتخاذ قرار التمرير السريع.',
          situation: 'ألعاب احتفاظ بالكرة في مربعات محددة (4 مهاجمين ضد 2 مدافعين) مع احتساب عدد التمريرات.',
          criteria: 'وصول الكرة مباشرة للزميل دون اعتراض، التمرير للأمام، تجنب التمريرات العشوائية.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إتقان التصويب في وضعية التوقف (Tir en suspension / Tir en appui)',
          titleFr: 'Apprentissage du tir en appui stabilisé',
          motorObjective: 'أداء حركة التصويب بتناسق حركي سليم (ثني الركبتين، رفع المرفق، ومتابعة اليد المصوبة).',
          cognitiveObjective: 'فهم مسار القوس المناسب للكرة واستخدام اللوحة الخلفية (Panneau) كمرجع للتصويب.',
          behavioralObjective: 'الهدوء والتركيز أثناء التصويب وتفادي التسرع غير المبرر.',
          situation: 'ورشات تصويب من زوايا ومسافات مختلفة مع احتساب نسبة النجاح الفردية والجماعية.',
          criteria: 'استقامة الذراع المصوبة نحو السلة، قوس كروي عالٍ، استقرار القدمين عند الارتقاء والهبوط.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تعلم التصويب أثناء الجري (Le double pas / Lay-up)',
          titleFr: 'Apprentissage du double pas côté droit et gauche',
          motorObjective: 'أداء خطوتين إيقاعيتين متتاليتين (يمين-يسار أو يسار-يمين) والارتقاء لوضع الكرة في السلة.',
          cognitiveObjective: 'معرفة قاعدة الخطوتين المسموح بهما بعد إيقاف التنطيط لتفادي خطأ المشي.',
          behavioralObjective: 'المثابرة والتغلب على صعوبة التنسيق الحركي على الجهة الأضعف (اليسرى).',
          situation: 'الجري بالكرة من الجناحين، استقبال التمريرة في حركة، ثم أداء الخطوتين والارتقاء للسلة.',
          criteria: 'إيقاع سليم للخطوتين دون مشي زائد، ارتقاء عمودي نحو الحلقة، استثمار اللوحة الخلفية.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحرك بدون كرة وطلب التمرير في المساحة الفارغة (Démarquage)',
          titleFr: 'Jeu sans ballon et démarquage vers le panier',
          motorObjective: 'تغيير السرعة والاتجاه للتخلص من رقابة المدافع وفتح خط تمرير مباشر.',
          cognitiveObjective: 'فهم مفهوم "المثلث الهجومي" وتوزيع اللاعبين في الملعب لتوسيع مساحة اللعب.',
          behavioralObjective: 'اليقظة والنشاط المستمر لمساعدة حامل الكرة وعدم البقاء ثابتاً.',
          situation: 'مواقف 2 ضد 1 و3 ضد 2 في نصف الملعب مع منع حامل الكرة من التنطيط لإجبار الزملاء على التحرك.',
          criteria: 'التخلص من المدافع، التواجد في زاوية رؤية حامل الكرة، طلب الكرة بكلتا اليدين.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'مبادئ الدفاع الفردي واسترجاع الكرة (Défense individuelle)',
          titleFr: 'Principes de la défense individuelle et interception',
          motorObjective: 'التموضع بين المهاجم والسلة مع ثني الركبتين وتحريك القدمين دون تقاطع (Glissements).',
          cognitiveObjective: 'استيعاب قاعدة "لاعب-سلة" وعدم ارتكاب الأخطاء الشخصية بالاحتكاك غير المشروع.',
          behavioralObjective: 'القتالية النظيفة، التعاون الدفاعي، واحترام سلامة المنافس.',
          situation: 'مبارزة 1v1 على نصف الملعب مع قيود زمنية، وتمارين ارتداد دفاعي سريع.',
          criteria: 'منع المهاجم من التوغل المباشر نحو السلة، تجنب لمس يد الرامي، استعادة الكرات المرتدة (Rebond).'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الهجوم السريع واستغلال التفوق العددي (Contre-attaque)',
          titleFr: 'Organisation de la contre-attaque rapide en surnombre',
          motorObjective: 'نقل الكرة بأقل عدد من التمريرات نحو سلة الخصم بمجرد استرجاع الكرة في الدفاع.',
          cognitiveObjective: 'معرفة ممرات الهجوم السريع (الممر المركزي وممرات الأجنحة).',
          behavioralObjective: 'سرعة رد الفعل والتحول الفوري من الحالة الدفاعية إلى الهجومية.',
          situation: 'انطلاق هجوم 3 ضد 1 ثم 3 ضد 2 فور التقاط كرة مرتدة دفاعية مع اشتراط التسجيل في أقل من 7 ثوان.',
          criteria: 'السرعة في نقل الكرة، استغلال التفوق العددي بالتمرير للاعب الشاغر، إنهاء هجومي ناجح.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'تنظيم دوري صفي وإدارة المباريات والتحكيم الذاتي',
          titleFr: 'Tournoi d\'intégration, arbitrage autonome et régulation',
          motorObjective: 'تطبيق جميع المهارات الفردية والجماعية في مباريات رسمية 4 ضد 4.',
          cognitiveObjective: 'إتقان إشارات التحكيم الرسمية وتدبير طاولة التسجيل (ورقة المباراة والوقت).',
          behavioralObjective: 'احترام قرارات الحكام والالتزام بالروح الرياضية واللعب النظيف.',
          situation: 'دوري الفرق المصغرة: فريق يلعب، فريق يحكم ويسجل، وفريق يلاحظ ويقوم.',
          criteria: 'سلاسة اللعب وتطبيق القوانين، مشاركة الجميع في التمرير والتصويب، تحكيم حازم وعادل.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي النهائي ورصد المكتسبات في كرة السلة',
          titleFr: 'Évaluation sommative finale en situation de match',
          motorObjective: 'تحقيق أعلى فاعلية ممكنة في التمرير والتنطيط والتصويب والدفاع في مباراة رسمية.',
          cognitiveObjective: 'معرفة سلم التنقيط المعتمد ومؤشرات الأداء التكتيكي والتقني الفردي والجماعي.',
          behavioralObjective: 'الانضباط والروح الجماعية، وتقبل نتيجة المباراة بروح رياضية عالية.',
          situation: 'مباريات رسمية نهائية تخضع لشبكة الملاحظة الوزارية (OP 2009).',
          criteria: 'الكفاءة التقنية والتكتيكية (الهجوم والدفاع)، التحكيم والملاحظة، والمواظبة والسلوك (نقطة /20).'
        }
      ],
      lycee: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'التقويم التشخيصي للمنظومة التكتيكية والمهارات المتقدمة (Match 4v4)',
          titleFr: 'Évaluation diagnostique : Organisation tactique et efficacité collective',
          motorObjective: 'لعب مباريات 4v4 على ملعب كامل مع تقييم جودة القرارات الهجومية والدفاعية.',
          cognitiveObjective: 'إدراك متطلبات اللعب في السلك التأهيلي (التنظيم التكتيكي، السرعة، وتدبير الوقت).',
          behavioralObjective: 'القيادة الإيجابية، التواصل اللفظي وغير اللفظي داخل الملعب.',
          situation: 'مباريات موجهة 4 ضد 4 مع رصد نسب النجاح في التصويب وعدد الكرات الضائعة (Balles perdues).',
          criteria: 'السرعة في بناء الهجمات، تقليص الأخطاء التكتيكية، التمركز الدفاعي الفعال.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير الهجوم السريع والمنظم والتصويب تحت الضغط (Jeu de transition)',
          titleFr: 'Attaque rapide en transition et tir sous pression défensive',
          motorObjective: 'الانتقال السريع من الدفاع إلى الهجوم في أقل من 5 ثوان مع إنهاء دقيق تحت مضايقة المدافع.',
          cognitiveObjective: 'معرفة مبادئ الانتقال السريع (Transition offensive) والتمركز في الأروقة الثلاثة.',
          behavioralObjective: 'الجرأة في اتخاذ القرار والتصويب دون تردد في اللحظة المناسبة.',
          situation: 'مواقف 3 ضد 2 متبوعة بارتداد سريع 2 ضد 1 في الاتجاه المعاكس.',
          criteria: 'التمرير الأمامي السريع، عدم إيقاف الكرة بالتنطيط غير المجدي، دقة التصويب في الحركة.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الهجوم المنظم ضد دفاع المنطقة ودفاع رجل لرجل (Attaque placée)',
          titleFr: 'Attaque placée contre défense de zone et homme à homme',
          motorObjective: 'تدوير الكرة بسرعة خارج خط الرمية الثلاثية لخلخلة تمركز دفاع المنطقة وخلق ثغرات.',
          cognitiveObjective: 'فهم نقاط ضعف دفاع المنطقة ونقاط ضعف دفاع رجل لرجل وكيفية استغلالها.',
          behavioralObjective: 'الصبر والهدوء في بناء الهجمة وعدم التسرع في التصويب من زوايا ميتة.',
          situation: 'هجوم 4 ضد 4 منظم في نصف الملعب مع اشتراط 4 تمريرات على الأقل قبل أي تصويب.',
          criteria: 'سرعة تدوير الكرة، استغلال المساحات الشاغرة، التصويب في وضعية مريحة مفتوحة.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التنسيق الثنائي والثلاثي: الحجز والتحرك (Écran et démarquage / Pick and Roll)',
          titleFr: 'Jeu à deux et trois : Écran direct et indirect (Pick and roll)',
          motorObjective: 'وضع حجز قانوني وثابت (Écran) لتحرير الزميل الحامل للكرة ثم الدوران نحو السلة.',
          cognitiveObjective: 'معرفة شروط الحجز القانوني (ثبات القدمين وعدم دفع المدافع) لتفادي الأخطاء الهجومية.',
          behavioralObjective: 'التنسيق الدقيق والتواصل بالإشارات والتفاهم الحركي بين اللاعبين.',
          situation: 'ورشات تدريبية لتطبيق الحجز المباشر على حامل الكرة والحجز غير المباشر للاعب الشاغر.',
          criteria: 'حجز قانوني متقن، تحرر المهاجم المصوب، استثمار التمرير للاعب المتوغل بعد الحجز.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'المنظومة الدفاعية المشتركة والمساعدة الدفاعية (Défense et aides défensives)',
          titleFr: 'Défense collective, glissements et aide défensive',
          motorObjective: 'التغطية المتبادلة والتدخل لغلق مسار المهاجم المتوغل دون ترك المهاجم المباشر حراً.',
          cognitiveObjective: 'استيعاب مفهوم "المثلث الدفاعي" وحركة المدافعين حسب تموضع الكرة في الملعب.',
          behavioralObjective: 'التضامن الدفاعي المطلق والتواصل الصوتي المستمر (صراخ المدافع: "مساعدة!").',
          situation: 'مواقف 4 ضد 4 مع التركيز الحصري على التغطية والمساعدة عند اختراق المهاجم لمنطقة الارتكاز.',
          criteria: 'إغلاق زوايا التمرير نحو السلة، التحرك الجماعي المتناسق ككتلة واحدة، استرجاع الكرة.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير التصويب البعيد والرميات الحرة (Tir à 3 points et lancers francs)',
          titleFr: 'Efficacité du tir à mi-distance, à 3 points et lancers francs',
          motorObjective: 'رفع نسبة نجاح الرميات المتوسطة والبعيدة والرميات الحرة الثابتة بتكنيك مستقر.',
          cognitiveObjective: 'التحليل الحركي لمسار الكرة وعوامل الاستقرار والتركيز الذهني أثناء الرمية الحرة.',
          behavioralObjective: 'القدرة على عزل المشتتات والتركيز التام تحت وطأة التعب البدني.',
          situation: 'سلسلة رميات حرة وتصويبات حرة بعد مجهود بدني مكثف لاختبار الثبات تحت الإرهاق.',
          criteria: 'نسبة نجاح تفوق 50% في الرميات الحرة، استقرار حركة المتابعة باليد والرسغ (Fouetté).'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التقاط الكرات المرتدة والسيطرة على الأجواء (Rebond offensif et défensif)',
          titleFr: 'Verrouillage et conquête du rebond offensif et défensif',
          motorObjective: 'حجز المدافع أو المهاجم بالجسم (Box out) والارتقاء في التوقيت المثالي للالتقاط بكلتا اليدين.',
          cognitiveObjective: 'توقع مسار ارتداد الكرة من الحلقة أو اللوحة الخلفية بناءً على زاوية التصويب.',
          behavioralObjective: 'الشجاعة والقتالية الرياضية في الالتحام البدني القانوني.',
          situation: 'مواقف ثنائية وثلاثية تحت السلة فور إطلاق التصويبة للمنافسة على الكرة المرتدة.',
          criteria: 'حجز المنافس بالظهر، ارتقاء في أعلى نقطة، تأمين الكرة بالصدر والمرفقين بعد الاستلام.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تدبير اللحظات الحرجة وإدارة التكتيك في المباريات (Gestion du money time)',
          titleFr: 'Gestion tactique du score, du chrono et arbitrage officiel',
          motorObjective: 'تطبيق خطط لعب هجومية ودفاعية محددة في الدقائق الأخيرة من المباراة وفق فارق النقاط.',
          cognitiveObjective: 'فهم كيفية استغلال وقت الهجمة (24 ثانية) وطلب الأوقات المستقطعة وارتكاب الأخطاء التكتيكية.',
          behavioralObjective: 'النضج الانفعالي، القيادة، والالتزام المطلق بقرارات المدرب وقوانين اللعبة.',
          situation: 'سيناريوهات مباريات تبدأ من الدقيقة الأخيرة مع فارق نقطتين (سيناريو التقدم وسيناريو التأخر).',
          criteria: 'اتخاذ قرارات ذكية تناسب وضعية النتيجة، المحافظة على الكرة أو إيقاف التوقيت بوعي.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'المحاكاة الرسمية للاختبار النهائي وفق ضوابط التوجيهات التربوية (Match officiel)',
          titleFr: 'Tournoi préparatoire et auto-évaluation aux normes du Baccalauréat',
          motorObjective: 'دمج جميع الخطط الهجومية والدفاعية والمهارات الفردية في مباريات كاملة وتنافسية.',
          cognitiveObjective: 'قراءة شبكة التقويم الوزارية للباكالوريا والتعرف على مؤشرات تقييم كل تلميذ.',
          behavioralObjective: 'الانضباط والروح الرياضية وممارسة التحكيم بدقة واحترافية.',
          situation: 'مباريات رسمية بين فرق متكافئة مع تحكيم وتوثيق إحصائي (نقاط، تمريرات، تصويبات، أخطاء).',
          criteria: 'مردودية عالية في الهجوم والدفاع، التزام بالخطة الجماعية، تحكيم نزيه ومحترف.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي والنهائي في كرة السلة (Évaluation sommative certifiée)',
          titleFr: 'Évaluation sommative finale individuelle et collective (OP 2009)',
          motorObjective: 'إبراز أعلى مستويات الفعالية الهجومية والدفاعية والمهارية أثناء المواجهة الرسمية.',
          cognitiveObjective: 'استيعاب نتائج التقويم وإدراك مجالات القوة ونقاط التحسين المستقبلية.',
          behavioralObjective: 'الاحترام المتبادل، الروح الرياضية العالية، والالتزام الصارم بقواعد السلوك الرياضي.',
          situation: 'مباريات نهائية رسمية يتم تنقيط كل تلميذ فيها على حدة بناءً على شبكة الملاحظة المعتمدة.',
          criteria: 'الفعالية الفردية والجماعية في اللعب (12ن)، التحكيم والمهام الموازية (4ن)، السلوك والمواظبة (4ن).'
        }
      ]
    }
  },

  // 4. كرة اليد (Handball)
  {
    sportKey: 'handball',
    sportNameAr: 'كرة اليد',
    sportNameFr: 'Handball',
    categoryAr: 'الرياضات الجماعية (أنشطة التعاون والمواجهة المباشرة)',
    otcCollegeAr: 'المشاركة في هجوم جماعي سريع نحو مرمى الخصم والتصويب الفعال من خارج منطقة المرمى، مع بناء جدار دفاعي متماسك واحترام قواعد اللعبة.',
    otcLycéeAr: 'بناء وتنفيذ هجمات منسقة ضد دفاعات مختلفة (6-0، 5-1) عبر تبادل المراكز والتصويب المتنوع، وتدبير الارتداد الدفاعي والمشاركة في التحكيم الرسمي.',
    levels: {
      college: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'تقويم تشخيصي: رصد المكتسبات في التمرير والتنطيط والتصويب على المرمى',
          titleFr: 'Évaluation diagnostique : Matchs réduits 4v4 et observation des acquis',
          motorObjective: 'المشاركة في مباريات مصغرة والتقدم بالكرة نحو المرمى للتصويب دون الدخول لمنطقة 6 أمتار.',
          cognitiveObjective: 'معرفة القوانين الأساسية: منطقة المرمى، المشي لأكثر من 3 خطوات، ومسك الكرة لأكثر من 3 ثوان.',
          behavioralObjective: 'اللعب الجماعي ومساعدة الزميل والحرص على عدم ارتكاب أخطاء خشنة.',
          situation: 'مباريات مصغرة 4 ضد 4 مع حارس مرمى على ملعبي كرة اليد.',
          criteria: 'عدم لمس خط منطقة المرمى، التمرير السليم للأمام، التصويب الموجه نحو الزوايا.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحكم في خطوات الجري بالكرة (La règle des 3 pas)',
          titleFr: 'Maîtrise de la règle des 3 pas avant le tir ou la passe',
          motorObjective: 'أداء 3 خطوات قانونية متتابعة بالكرة بسرعة تمهيداً للتصويب أو التمرير الحاسم.',
          cognitiveObjective: 'فهم إيقاع الخطوات (يسار-يمين-يسار للعداء الأيمن) وقانون استئناف التنطيط.',
          behavioralObjective: 'التركيز على إيقاع الأقدام والتحكم في توازن الجسم.',
          situation: 'مسالك حركية تتضمن تنطيطاً ثم التوقف واستلام الكرة وأداء 3 خطوات سريعة والتصويب.',
          criteria: 'احترام قانون 3 خطوات بدقة دون ارتكاب خطأ المشي، التنسيق المتزن بين الخطوات والرمي.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التمرير الدقيق في الحركة واستقبال الكرة (Passe et réception en mouvement)',
          titleFr: 'Passe d\'appui et réception en mouvement vers le but',
          motorObjective: 'تمرير الكرة بذراع ممدودة ومرفوعة فوق الكتف مع استقبال الكرة بكلتا اليدين أثناء الجري.',
          cognitiveObjective: 'معرفة مسار الكرة المناسب لسرعة الزميل الجاري وتفادي التمرير خلفه.',
          behavioralObjective: 'التواصل البصري وتشجيع الزملاء على فتح خطوط التمرير.',
          situation: 'تمارين التمرير الثنائي والثلاثي في شكل أمواج (Vagues de passes) نحو المرمى.',
          criteria: 'استقبال نظيف للكرة دون سقوطها، تمرير دقيق في متناول يد الزميل، استمرار الحركة للأمام.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إتقان التصويب أثناء الارتقاء (Le tir en suspension)',
          titleFr: 'Apprentissage du tir en suspension au-dessus de la défense',
          motorObjective: 'الارتقاء برجل واحدة للأعلى والأمام ورمي الكرة بقوة في أقصى نقطة ارتقاء قبل الهبوط.',
          cognitiveObjective: 'فهم ضرورة رمي الكرة قبل ملامسة الأرض خارج أو داخل منطقة المرمى.',
          behavioralObjective: 'الشجاعة في مواجهة حارس المرمى والتحكم في الهبوط الآمن.',
          situation: 'التصويب على المرمى مع الارتقاء فوق عائق واطئ (مقعد سويدي أو خط إسفنجي).',
          criteria: 'ارتقاء عمودي عالٍ، سحب الذراع للخلف وللأعلى، توجيه الكرة نحو زوايا المرمى البعيدة.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'بناء الجدار الدفاعي حول منطقة 6 أمتار (La défense alignée)',
          titleFr: 'Organisation de la défense alignée autour de la zone',
          motorObjective: 'التحرك الجانبي السريع بمحاذاة خط 6 أمتار ورفع الذراعين لصد تصويبات المهاجمين.',
          cognitiveObjective: 'معرفة قاعدة عدم الدخول لمنطقة المرمى كمدافع لتفادي رمية الـ 7 أمتار.',
          behavioralObjective: 'التعاون والتلاحم الدفاعي والالتزام باللعب الرجولي النظيف.',
          situation: 'مواقف 4 مدافعين ضد 4 مهاجمين مع التركيز على الانزلاق الدفاعي الجماعي باتجاه الكرة.',
          criteria: 'منع المهاجمين من التصويب المباشر، عدم ارتكاب أخطاء دفع أو جذب، رفع اليدين للصد.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الهجوم المضاد السريع واستثمار الكرة المسترجعة (La contre-attaque)',
          titleFr: 'Développement de la contre-attaque rapide après récupération',
          motorObjective: 'الانطلاق السريع نحو مرمى الخصم بمجرد استرجاع الكرة وتمريرها الطويل والدقيق للأجنحة.',
          cognitiveObjective: 'إدراك أن الهجوم السريع هو الوسيلة الأكثر نجاعة لتسجيل أهداف سهلة.',
          behavioralObjective: 'سرعة البديهة واليقظة الذهنية للتحول الفوري من الدفاع إلى الهجوم.',
          situation: 'حارس المرمى يلتقط الكرة ويمررها فوراً للاعبين المنطلقين على الجناحين للتصويب الانفرادي.',
          criteria: 'تمريرة طولية دقيقة من الحارس، استقبال سلس في أقصى سرعة، تسجيل الهدف بنجاح.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الانتشار الهجومي واللعب على الأطراف (Jeu sur les ailes)',
          titleFr: 'Occupation rationnelle de l\'espace et jeu sur les ailes',
          motorObjective: 'توسيع رقعة الهجوم عبر الأجنحة (Ailiers) لفتح ثغرات في عمق الدفاع الخصم.',
          cognitiveObjective: 'استيعاب زوايا التصويب المفتوحة والمغلقة وأهمية القفز نحو نقطة الرمية الحرة.',
          behavioralObjective: 'الانضباط التكتيكي في المركز المخصص وعدم التجمع العشوائي حول الكرة.',
          situation: 'هجوم موجه 5 ضد 4 مع اشتراط وصول الكرة للجناح والتصويب بزاوية مفتوحة.',
          criteria: 'توسيع الجبهة الهجومية، ارتقاء الجناح للداخل نحو المرمى، اتخاذ القرار الصائب.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحكيم الرسمي وتطبيق قواعد الأخطاء والعقوبات التصاعدية',
          titleFr: 'Arbitrage officiel, gestuelle et sanctions progressives',
          motorObjective: 'إدارة أطوار المباراة كحكم ساحة أو حكم مرمى مع إشارات يدوية واضحة وصافرة حازمة.',
          cognitiveObjective: 'فهم درجات العقوبة (إنذار بالبطاقة الصفراء، توقيف دقيقتين، استبعاد بالبطاقة الحمراء).',
          behavioralObjective: 'العدالة والشجاعة في اتخاذ القرار وفرض احترام قواعد اللعبة على الجميع.',
          situation: 'مباريات تنافسية يديرها طاقم تحكيمي من التلاميذ بإشراف وتوجيه الأستاذ.',
          criteria: 'صافرة مسموعة وقاطعة، إشارات دقيقة، تطبيق العقوبات دون تردد أو انحياز.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'المحاكاة الشاملة والاندماج التكتيكي في المباريات (Matchs à thèmes)',
          titleFr: 'Tournoi d\'intégration et régulation technico-tactique',
          motorObjective: 'التوظيف المتكامل لمهارات التمرير والخطوات الثلاث والارتقاء والمنظومة الدفاعية.',
          cognitiveObjective: 'تحليل أداء الفريق والتعرف على مكامن الخلل التكتيكي لتصحيحها قبل الامتحان.',
          behavioralObjective: 'التضامن والروح الرياضية وتوجيه الزملاء بإيجابية.',
          situation: 'دوري صفي مصغر بمباريات كاملة مع تطبيق خطط لعب موجهة ونظام النقاط الإضافية.',
          criteria: 'تنوع سبل الوصول للمرمى، تماسك خط الدفاع، سرعة التحول بين الحالات.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي والنهائي في كرة اليد وفق معايير 2009',
          titleFr: 'Évaluation sommative finale en match officiel (OP 2009)',
          motorObjective: 'تحقيق أعلى فاعلية حركية وتكتيكية في التسجيل والدفاع وصناعة اللعب في مباراة رسمية.',
          cognitiveObjective: 'المعرفة الكاملة بشبكة التقويم الوزارية وعناصر تقييم الفرد والجماعة.',
          behavioralObjective: 'الروح الرياضية النبيلة، احترام الخصم والحكام، والمواظبة المثالية.',
          situation: 'مباراة نهائية رسمية يتم فيها تنقيط كل تلميذ على حركيته الهجومية والدفاعية وسلوكه.',
          criteria: 'الأداء الهجومي والدفاعي الفردي والجماعي، التحكيم، والمواظبة والانضباط (نقطة /20).'
        }
      ],
      lycee: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'التقويم التشخيصي للفاعلية التكتيكية في كرة اليد (Match 6v6)',
          titleFr: 'Évaluation diagnostique : Organisation collective et efficacité de tir',
          motorObjective: 'لعب مباريات 6 ضد 6 مع تقييم جودة صناعة الفرص والتصويب من مسافات متباينة.',
          cognitiveObjective: 'إدراك متطلبات اللعب في السلك التأهيلي من حيث الخطط وتوزيع المراكز المتخصصة.',
          behavioralObjective: 'الجدية والالتزام بالتمركز والتعاون الفعال داخل الفريق.',
          situation: 'مباريات 6v6 رسمية مع حارس مرمى وتدوين إحصائي لنسب الأهداف والكرات الضائعة.',
          criteria: 'التصويب الدقيق، التمركز السليم في الدفاع والهجوم، سرعة نقل الهجمة.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الهجوم السريع المتدرج في موجات متتالية (Montée de balle rapide)',
          titleFr: 'Montée de balle rapide en 1ère et 2ème intention',
          motorObjective: 'نقل الكرة في أقل من 4 تمريرات من المنطقة الدفاعية إلى التصويب قبل اكتمال دفاع الخصم.',
          cognitiveObjective: 'التمييز بين الموجة الأولى (المهاجم المنفرد) والموجة الثانية (الدعم المتأخر).',
          behavioralObjective: 'الشجاعة في اتخاذ القرار وسرعة الانطلاق دون انتظار.',
          situation: 'حالات لعب تبدأ من تصدٍ لحارس المرمى مع انطلاق الأجنحة وصناع اللعب في خطوط متوازية.',
          criteria: 'عدم توقف الكرة، التمرير الموجه للأمام، تسجيل أهداف بنسب نجاح عالية.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تنظيم الهجوم ضد دفاع 6-0 المترابط (Attaque contre défense 6-0)',
          titleFr: 'Circulation de balle et étirement du bloc défensif 6-0',
          motorObjective: 'تدوير الكرة بسرعة عبر الخط الخلفي وسحب المدافعين لخلق فجوات للاعبي الدائرة والأجنحة.',
          cognitiveObjective: 'فهم ضرورة الهجوم بين المدافعين (Intervalle) بدلاً من الهجوم المباشر على صدر المدافع.',
          behavioralObjective: 'الصبر والتحكم في إيقاع الهجمة والتواصل التكتيكي المستمر.',
          situation: 'مواقف هجومية 6 ضد 6 في نصف الملعب مع تدريب المهاجمين على التوغل الذكي في الفجوات.',
          criteria: 'سرعة حركة الكرة من طرف لآخر، اختراق ناجح للفجوات، التصويب في غياب حائط الصد.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التقاطعات التكتيكية وحجب الرؤية (Les croisements et blocs)',
          titleFr: 'Combinaisons tactiques : Croisés et blocs du pivot',
          motorObjective: 'تنفيذ حركة التقاطع (Croisé) بين صانع الألعاب والظهير مع تبادل الكرة بسرعة للتصويب.',
          cognitiveObjective: 'معرفة التوقيت الحرج لبدء التقاطع لاستغلال ارتباك المدافعين.',
          behavioralObjective: 'التفاهم الحركي العالي والتنسيق الدقيق بين أفراد الخط الخلفي.',
          situation: 'تدريبات هجومية مكررة لتطبيق التقاطع البسيط والمزدوج بمساعدة لاعب الدائرة (Pivot).',
          criteria: 'سلاسة التقاطع، انطلاق المهاجم المستلم في الفراغ، تصويب قوي ومفاجئ.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تنظيم الدفاع المتقدم 5-1 وإغلاق زوايا التمرير (Défense avancée 5-1)',
          titleFr: 'Organisation de la défense 5-1 et harcèlement du demi-centre',
          motorObjective: 'تحرك المدافع المتقدم لمضايقة صانع الألعاب ومنع التمريرات السهلة مع تماسك الخماسي الخلفي.',
          cognitiveObjective: 'استيعاب أدوار المدافع المتقدم والمسافات الفاصلة بينه وبين الخط الدفاعي الخلفي.',
          behavioralObjective: 'الحيوية واليقظة الدفاعية الفائقة والجاهزية لاعتراض الكرات الطائشة.',
          situation: 'مواقف تطبيقية لدفاع 5-1 ضد هجمات متكررة مع توجيه المدافع المتقدم لقطع خطوط الاتصال.',
          criteria: 'إرباك صانع ألعاب الخصم، قطع الكرة والانطلاق السريع، تغطية ذكية للمساحة خلف المتقدم.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تطوير تصويبات المسافات البعيدة وتغيير زوايا الرمي (Tirs aux 9 mètres)',
          titleFr: 'Tir à distance (9m), tir à la hanche et feintes de corps',
          motorObjective: 'التصويب الصاروخي من مسافة 9 أمتار فوق جدار الصد أو التصويب بالتمويه من مستوى الورك.',
          cognitiveObjective: 'معرفة كيفية استخدام حركات الخداع (Feintes) لتجاوز المدافع أو مفاجأة الحارس.',
          behavioralObjective: 'الشجاعة والجرأة الهجومية والقدرة على مباغتة الخصم في اللحظات الحاسمة.',
          situation: 'ورشات التصويب ضد حائط صد متماسك مع توظيف تمويهات الجسم والدوران المفاجئ.',
          criteria: 'قوة وسرعة الرمية، تغيير زاوية التصويب، مخادعة حارس المرمى بمهارة.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'دور لاعب الدائرة وتفريغ المساحات (Le rôle clé du pivot)',
          titleFr: 'Placement, réception et finition du pivot au cœur de la zone',
          motorObjective: 'تثبيت المدافع بالظهر، استقبال الكرات الصعبة في وضعيات حرجة، والالتفاف السريع للتصويب.',
          cognitiveObjective: 'فهم كيفية خلق المساحات لزملائه عبر تحريك كتلة المدافعين والتمركز الذكي.',
          behavioralObjective: 'الصلابة البدنية والقتالية الرياضية العالية تحت الضغط الشديد.',
          situation: 'تمارين تغذية لاعب الدائرة بتمريرات بينية متقنة والإنهاء المباشر في المرمى.',
          criteria: 'الاستلام المحكم بكلتا اليدين، الالتفاف الفوري، التصويب الناجح داخل الشباك.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إدارة النقص والتفوق العددي والتحكيم الرسمي (Supériorité et infériorité)',
          titleFr: 'Gestion des supériorités et infériorités numériques (Sanctions 2 min)',
          motorObjective: 'تطبيق خطط تكتيكية خاصة عند إقصاء لاعب لمدة دقيقتين (سواء لصالح الفريق أو ضده).',
          cognitiveObjective: 'معرفة كيفية تدوير الكرة لإيجاد اللاعب الزائد أو استهلاك الوقت عند النقص العددي.',
          behavioralObjective: 'الانضباط التكتيكي الذاتي والهدوء وتجنب الأخطاء المجانية التي تكلف الفريق إقصاءات.',
          situation: 'سيناريوهات 6 ضد 5 و5 ضد 6 لمدة 2 دقيقة مع تدريب الحكام على احتساب أوقات الإقصاء.',
          criteria: 'التسجيل في وضعية التفوق، الصمود الدفاعي عند النقص، احترام القوانين بصرامة.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'المحاكاة الرسمية التنافسية للامتحان الإشهادي (Match de cadrage)',
          titleFr: 'Match de simulation officielle selon la grille du Baccalauréat',
          motorObjective: 'التوظيف الأمثل لجميع العناصر التكتيكية والمهارية في مباراة تنافسية متكافئة.',
          cognitiveObjective: 'الاطلاع على شبكة الملاحظة التحكيمية الرسمية للباكالوريا وفهم معايير التنقيط.',
          behavioralObjective: 'التحكم في الضغط التنافسي والالتزام بالروح الرياضية والتعاون القيادي.',
          situation: 'مباريات رسمية مسجلة بكاميرا لمراجعة الأخطاء مع لجان تحكيم وملاحظة تلميذية.',
          criteria: 'فاعلية هجومية ودفاعية ملموسة، انعدام الأخطاء الساذجة، تطبيق تكتيكي منظم.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم الإشهادي والنهائي في كرة اليد وفق التوجيهات التربوية 2009',
          titleFr: 'Évaluation sommative certifiée du cycle de handball (OP 2009)',
          motorObjective: 'تحقيق أعلى كفاءة ممكنة في الأداء الفردي والجماعي التنافسي داخل الميدان.',
          cognitiveObjective: 'معرفة درجات الاستحقاق النقطي وتقبل التقييم النهائي بموضوعية.',
          behavioralObjective: 'إظهار أرقى صور الروح الرياضية، الانضباط في الزي والمواعيد، والمواظبة المثالية.',
          situation: 'امتحان رسمي موجه على شوطين يخضع للشبكة الوزارية للتقويم المستمر والنهائي.',
          criteria: 'الإنجاز والفاعلية التكتيكية (12ن)، التحكيم والمهام الإدارية (4ن)، السلوك والمواظبة (4ن).'
        }
      ]
    }
  },

  // 5. الوثب الطولي (Saut en longueur)
  {
    sportKey: 'saut_longueur',
    sportNameAr: 'الوثب الطولي',
    sportNameFr: 'Saut en longueur',
    categoryAr: 'ألعاب القوى (أنشطة قياس المسافة والزمن)',
    otcCollegeAr: 'الربط المتناسق بين اقتراب سريع ومستقر وارتقاء قوي على لوحة الارتقاء، لتحقيق أقصى امتداد أفقي ممكن مع هبوط آمن في حفرة الرمل.',
    otcLycéeAr: 'تحسين دقة الاقتراب بأقصى سرعة ممكنة، وتوجيه قوة الدفع زاوياً في الارتقاء، مع توظيف تقنية طيران فعالة وتفادي تضييع المسافة عند الاستقبال.',
    levels: {
      college: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'تقويم تشخيصي: قياس الأداء الأولي وتحديد رجل الارتقاء المفضلة',
          titleFr: 'Évaluation diagnostique : Détermination du pied d\'appel et performance initiale',
          motorObjective: 'القيام بوثبات طولية انطلاقاً من اقتراب قصير لتحديد رجل الارتقاء ومستوى الإنجاز الأولي.',
          cognitiveObjective: 'التعرف على قوانين مسابقة الوثب الطولي (لوحة الارتقاء، المحاولة الملغاة، القياس من الرمل).',
          behavioralObjective: 'الانخراط الواثق والحرص على شروط السلامة عند الهبوط في حفرة الرمل.',
          situation: 'وثبات طولية حرة من مسافة اقتراب 10 أمتار مع قياس المسافة وتسجيل رجل الارتقاء المعتمدة.',
          criteria: 'تحديد قاطع لرجل الارتقاء، هبوط آمن على القدمين معاً، تفادي السقوط للخلف.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تثبيت وقياس مسافة الاقتراب (Course d\'élan régulière)',
          titleFr: 'Stabilisation et étalonnage de la course d\'élan',
          motorObjective: 'الاقتراب بإيقاع متسارع منتظم على مسافة تتراوح بين 10 و14 خطوة وبلوغ لوحة الارتقاء بدقة.',
          cognitiveObjective: 'معرفة كيفية قياس خطوات الاقتراب بالقدمين أو بالشريط المتري لتثبيت علامة البداية.',
          behavioralObjective: 'الدقة في الملاحظة والتعاون مع الزميل لتحديد علامة الانطلاق ومتابعة الخطوات.',
          situation: 'الجري على المضمار بجانب حفرة الوثب مع حساب عدد الخطوات وتصحيح العلامة حتى ضبط مكان الارتقاء.',
          criteria: 'تطابق رجل الارتقاء مع منطقة الوثب في 4 محاولات متتالية دون إبطاء أو تردد قبل اللوحة.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تحسين مرحلة الارتقاء والدفع الانفجاري (L\'impulsion explosive)',
          titleFr: 'Amélioration de l\'impulsion sur la planche d\'appel',
          motorObjective: 'تحويل السرعة الأفقية إلى ارتقاء قطري للأمام والأعلى برجل ممدودة بالكامل وصعود الركبة الحرة.',
          cognitiveObjective: 'فهم دور الركبة المعاكسة والذراعين في رفع مركز ثقل الجسم أثناء لحظة الدفع.',
          behavioralObjective: 'التركيز الذهني وإطلاق أقصى طاقة انفجارية لحظة ملامسة اللوحة.',
          situation: 'الارتقاء فوق منصة مرتفعة قليلاً أو حاجز منخفض لاكتساب الإحساس بالطيران العمودي.',
          criteria: 'امتداد كامل لمفاصل رجل الارتقاء (كاحل، ركبة، حوض)، صعود واضح للركبة الحرة للأعلى.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التوافق بين سرعة الاقتراب ودقة الارتقاء (Liaison course-appel)',
          titleFr: 'Coordination entre vitesse d\'élan et impulsion',
          motorObjective: 'خفض نسبي لمركز الثقل في الخطوة قبل الأخيرة ثم الارتقاء السريع الخاطف دون فقدان السرعة.',
          cognitiveObjective: 'استيعاب الإيقاع الحركي الخاص بالخطوتين الأخيرتين (خطوة طويلة تليها خطوة قصيرة وسريعة).',
          behavioralObjective: 'التحكم الحركي والتغلب على التردد الذهني قبل لوحة الارتقاء.',
          situation: 'تمارين الاقتراب السريع مع وضع علامة وسيطة قبل لوحة الارتقاء بخطوتين.',
          criteria: 'عدم التباطؤ في آخر 3 خطوات، ضربة ارتقاء سريعة ونشطة على اللوحة، انعدام التجاوز غير القانوني.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'مرحلة الطيران: التوازن في الهواء (Phase de suspension simple)',
          titleFr: 'Équilibration et maintien de la trajectoire aérienne',
          motorObjective: 'الحفاظ على توازن الجسم في الجو بواسطة حركة الذراعين وتفادي الدوران أو الالتواء الجانبي.',
          cognitiveObjective: 'معرفة زاوية الطيران المثالية (حوالي 20 إلى 22 درجة) والمسار المكافئ المقذوف.',
          behavioralObjective: 'الاستمتاع بحس الطيران الهوائي والثقة في التحكم بكتلة الجسم.',
          situation: 'الوثب من منصة أو صندوق جمبازي واطئ لزيادة زمن البقاء في الهواء والتدرب على التوازن.',
          criteria: 'بقاء الجذع مستقيماً، حركة ذراعين دائرية متوازنة، ثبات النظر نحو الأمام.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إتقان مرحلة الهبوط والاستقبال في الرمل (La réception économique)',
          titleFr: 'Technique de réception pour maximiser la distance',
          motorObjective: 'مد الرجلين للأمام عند الهبوط وامتصاص الصدمة مع دفع الجذع للأمام لتفادي السقوط للخلف.',
          cognitiveObjective: 'معرفة أن قياس المسافة يعتمد على آخر أثر يتركه جسم الواثب في حفرة الرمل.',
          behavioralObjective: 'السلامة الجسدية والتفاني في حصد كل سنتمتر إضافي من الإنجاز.',
          situation: 'القفز داخل أطواق أو علامات محددة في الرمل مع تدريب السقوط الأمامي المنزلق.',
          criteria: 'ملامسة الكعبين للرمل معاً أولاً، انثناء الركبتين، سقوط الجذع للأمام أو الجانب وليس للخلف.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الربط الكامل لمراحل الوثبة الطولية (Enchaînement global du saut)',
          titleFr: 'Enchaînement fluide des 4 phases du saut en longueur',
          motorObjective: 'تنفيذ وثبة كاملة تدمج الاقتراب، الارتقاء، الطيران، والهبوط بتدفق حركي متصل.',
          cognitiveObjective: 'القدرة على التحليل الذاتي وتحديد المرحلة التي تحتاج إلى تحسين في الوثبة.',
          behavioralObjective: 'المثابرة والتصحيح الذاتي المتبادل بمساعدة ملاحظات الزميل.',
          situation: 'محاولات وثب متتالية مع تقديم تغذية راجعة فورية بعد كل محاولة عبر بطاقة ملاحظة.',
          criteria: 'سلاسة الانتقال بين المراحل، ثبات مسافة الوثب عبر محاولات متتالية.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'التحكيم الرسمي وقياس المسافات وإدارة المسابقة (Mesure et arbitrage)',
          titleFr: 'Arbitrage officiel, mesure au centimètre et gestion du concours',
          motorObjective: 'أداء الوثبات الرسمية مع ممارسة مهام التحكيم: القاضي الرئيسي، الميقاتي، والماسح للشريط.',
          cognitiveObjective: 'إتقان قراءة الشريط المتري من نقطة الصفر عند حافة الأثر إلى الحافة الداخلية للوحة.',
          behavioralObjective: 'الدقة، النزاهة التامة، واحترام الترتيب القانوني للمتسابقين.',
          situation: 'محاكاة منافسة رسمية: كل تلميذ ينجز 3 محاولات، وتتولى مجموعات التلاميذ إدارة وقياس الوثبات.',
          criteria: 'قياس عمودي دقيق على لوحة الارتقاء، إشهار الرايات (بيضاء للمحاولة الصحيحة، حمراء للملغاة).'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'حصة الإدماج والمنافسة التجريبية (Simulation de concours)',
          titleFr: 'Concours blanc d\'intégration et régulation finale',
          motorObjective: 'إنجاز 3 محاولات رسمية بأقصى تركيز لتحقيق أحسن إنجاز متري شخصي.',
          cognitiveObjective: 'مقارنة الإنجاز المحقق مع نتائج التقويم التشخيصي لحساب نسبة التقدم المنجزة.',
          behavioralObjective: 'إدارة المشاعر التنافسية والتركيز الذهني قبل بدء كل محاولة.',
          situation: 'دوري تصنيفي للمسابقة بمجموعات متكافئة مع ترتيب الأفضلية واحتساب أفضل قفزة.',
          criteria: 'محاولات صحيحة بنسبة تفوق 70%، تحسن الإنجاز المتري، احترام البروتوكول التنافسي.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم التحصيلي والنهائي في الوثب الطولي وفق معايير 2009',
          titleFr: 'Évaluation sommative finale individuelle (Barème officiel OP 2009)',
          motorObjective: 'تحقيق أبعد مسافة ممكنة في 3 محاولات رسمية مع احترام اللوحة وتقنية الطيران السليمة.',
          cognitiveObjective: 'المعرفة الدقيقة لعناصر شبكة التنقيط (الإنجاز المتري، السلوك والتحكيم).',
          behavioralObjective: 'الروح الرياضية، الانضباط في الزي والمضمار، وتهنئة المتفوقين.',
          situation: 'اختبار رسمي فردي من 3 محاولات، تحتسب فيه أفضل قفزة صحيحة وفق السلم الوزاري.',
          criteria: 'الإنجاز الرقمي بالمتر (12ن)، التقنية الحركية، والسلوك والمواظبة والتحكيم (نقطة /20).'
        }
      ],
      lycee: [
        {
          seanceNumber: 1,
          phase: 'diagnostic',
          phaseLabelAr: 'تقويم تشخيصي',
          titleAr: 'التقويم التشخيصي لسرعة الاقتراب وفعالية الدفع الزاوي للوثب الطولي',
          titleFr: 'Évaluation diagnostique : Vitesse d\'élan et impulsion angulaire',
          motorObjective: 'تحقيق أقصى إنجاز متري ممكن عبر اقتراب كامل (14 إلى 18 خطوة) وتقنية فردية.',
          cognitiveObjective: 'استيعاب متطلبات الوثب الطولي في السلك التأهيلي (التكنيك المتقدم والسرعة القصوى).',
          behavioralObjective: 'الجدية والالتزام بتدابير السلامة في حفرة الرمل.',
          situation: 'مسابقة تشخيصية رسمية من 3 محاولات مع قياس السرعة في آخر 5 أمتار قبل الارتقاء.',
          criteria: 'القدرة على نقل السرعة، عدم التردد على اللوحة، تسجيل معطيات دقيقة للإنجاز الأولي.'
        },
        {
          seanceNumber: 2,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'الضبط الدقيق للإيقاع الحركي للاقتراب (Vitesse optimale et étalonnage)',
          titleFr: 'Précision et régularité métronomique de la course d\'élan',
          motorObjective: 'تثبيت مسافة اقتراب محددة بدقة السنتيمتر وبلوغ أقصى سرعة مضبوطة على لوحة الارتقاء.',
          cognitiveObjective: 'التحكم في استخدام العلامات المرجعية (Marques de contrôle) لتعديل سرعة الرياح والخطوات.',
          behavioralObjective: 'الدقة في الملاحظة، الصبر في إعادة القياسات، والتصحيح الذاتي المستمر.',
          situation: 'الجري على المضمار مع رصد مكان هبوط القدم في الخطوات (4 و8 و12) وضبط الانطلاق.',
          criteria: 'نسبة خطأ لا تتعدى 5 سم في ملامسة اللوحة في 5 محاولات متتالية بأقصى سرعة.'
        },
        {
          seanceNumber: 3,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'ميكانيزم الارتقاء الفعال وخفض مركز الثقل (Préparation de l\'appel)',
          titleFr: 'Abaissement du centre de gravité et impulsion dynamique',
          motorObjective: 'خفض طفيف لمركز الثقل في الخطوة قبل الأخيرة ثم هجوم نشط وخاطف على لوحة الارتقاء.',
          cognitiveObjective: 'فهم التبادل الميكانيكي بين الطاقة الحركية الأفقية وطاقة الارتقاء العمودية.',
          behavioralObjective: 'الشجاعة والجرأة في الهجوم على اللوحة دون خوف من المحاولة الملغاة.',
          situation: 'تمارين وثب مع الاستعانة بصناديق واطئة لتعزيز التماسك الحركي وسرعة الارتقاء.',
          criteria: 'زاوية دفع مثالية، امتداد ثلاثي المفاصل، صعود قوي وسريع للركبة الحرة.'
        },
        {
          seanceNumber: 4,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تعلم تقنية المشي في الهواء (Technique du ciseau / Course dans l\'air)',
          titleFr: 'Technique du ciseau (1 foulée et demie ou 2 foulées et demie)',
          motorObjective: 'أداء خطوة ونصف أو خطوتين ونصف في الهواء لمقاومة الدوران الأمامي غير المرغوب فيه.',
          cognitiveObjective: 'فهم العزم الدوراني للجسم في الهواء وكيف تعادله حركات الأطراف الدائرية.',
          behavioralObjective: 'التنسيق الحركي العالي والمثابرة في أداء حركة هوائية مركبة.',
          situation: 'الوثب من منصة مرتفعة أو من جهاز ترامبولين واطئ للتدرب على الخطوات في الفضاء.',
          criteria: 'استمرار حركة المشي بالرجلين في الهواء، استقامة الجذع، تنسيق متزن للذراعين.'
        },
        {
          seanceNumber: 5,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'أو تقنية الامتداد والانحناء المعكوس (Technique de l\'extension)',
          titleFr: 'Technique de l\'extension (Cintré) et regroupement terminal',
          motorObjective: 'تقويس الجذع للخلف مع سحب الذراعين والساقين للخلف ثم طي الجسم السريع للأمام قبل الهبوط.',
          cognitiveObjective: 'معرفة الفارق بين تقنية المشي وتقنية التمدد لاختيار الأنسب لفيزيولوجيا التلميذ.',
          behavioralObjective: 'الشعور بالحرية الحركية وتطوير المرونة العمودية.',
          situation: 'تدريبات على البساط والمنصة لتقويس الظهر ثم التجميع السريع للأمام (Fermeture).',
          criteria: 'تقوس واضح في الهواء متبوع بغلق سريع وحاسم للجسم لحظة ملامسة الرمل.'
        },
        {
          seanceNumber: 6,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تعظيم الاستفادة من مرحلة الهبوط المتقدم (La ramenée des jambes)',
          titleFr: 'Optimisation de la ramenée des jambes et projection avant',
          motorObjective: 'مد الساقين إلى أقصى حد للأمام مع غرس الكعبين والدفع الفوري للحوض للأمام أو الجانب.',
          cognitiveObjective: 'إدراك أن الهبوط الخاطئ قد يضيع ما بين 30 إلى 50 سنتيمتراً من القفزة.',
          behavioralObjective: 'الحرص على التفاصيل التقنية والدقة في استثمار كل إمكانات القفزة.',
          situation: 'تمارين هبوط فوق خطوط متدرجة في الرمل مع إلزامية انزلاق المؤخرة في اتجاه القدمين.',
          criteria: 'مد كامل للرجلين قبل الملامسة، سقوط الثقل للأمام فوراً، خلو الحفرة من آثار السقوط الخلفي.'
        },
        {
          seanceNumber: 7,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'تكامل السرعة القصوى مع التقنية الهوائية المختارة (Intégration vitesse-technique)',
          titleFr: 'Intégration de la vitesse maximale et de la gestuelle aérienne',
          motorObjective: 'الاقتراب بالسرعة التنافسية الكاملة وأداء التقنية الهوائية دون أدنى تردد.',
          cognitiveObjective: 'تحليل تسجيلات الفيديو للحركات ومقارنتها بالنماذج التقنية المثالية.',
          behavioralObjective: 'التركيز العالي والثقة بالنفس والقدرة على إعادة الإنتاج الحركي الدقيق.',
          situation: 'سلسلة قفزات كاملة بتوقيت الاقتراب وتحليل زاوية الارتقاء ومكان الهبوط.',
          criteria: 'سرعة اقتراب تتجاوز 90%، ثبات تقنية الطيران، تحقيق مسافات قريبة من الرقم القياسي الشخصي.'
        },
        {
          seanceNumber: 8,
          phase: 'learning',
          phaseLabelAr: 'تعلم وبناء',
          titleAr: 'إدارة المسابقة والتحكيم الإلكتروني/الرسمي المتقدم (Gestion de concours officiel)',
          titleFr: 'Protocoles de compétition, gestion des essais et arbitrage officiel',
          motorObjective: 'المشاركة في مسابقة مصغرة كاملة مع تسيير أوقات الاستعداد لكل محاولة (دقيقة واحدة).',
          cognitiveObjective: 'فهم قواعد كسر التعادل (Départage des ex-aequo) وحساب سرعة الرياح المقبولة قانوناً.',
          behavioralObjective: 'النزاهة الرياضية العالية، احترام توقيت المحاولة، والتحلي بروح القيادة.',
          situation: 'محاكاة دورة تنافسية كاملة مع قياس الرياح وتطبيق بروتوكول الأولمبياد المدرسي.',
          criteria: 'احترام قانون الدقيقة الواحدة لكل محاولة، دقة التحكيم، انعدام الأخطاء التنظيمية.'
        },
        {
          seanceNumber: 9,
          phase: 'integration',
          phaseLabelAr: 'إدماج وتقويم تكويني',
          titleAr: 'المحاكاة الرسمية الشاملة للامتحان الوطني للباكالوريا (Simulation Baccalauréat)',
          titleFr: 'Simulation de l\'épreuve certificative du Baccalauréat EPS',
          motorObjective: 'إنجاز 3 محاولات رسمية تحت ضغط الامتحان الموحد واستهداف تحطيم الرقم الشخصي.',
          cognitiveObjective: 'معرفة سلم التنقيط الوزاري للباكالوريا وتحديد الهدف النقطي المنشود بدقة.',
          behavioralObjective: 'التحكم في التوتر النفسي، التهيئة الذهنية والبدنية قبل الوثب.',
          situation: 'إجراء امتحان تجريبي مطابق تماماً للامتحان الوطني للباكالوريا بمضمار ألعاب القوى.',
          criteria: 'تسجيل قفزات صحيحة متتالية، تحسن ملموس في المسافة، احترام تام لقواعد المسابقة.'
        },
        {
          seanceNumber: 10,
          phase: 'summative',
          phaseLabelAr: 'تقويم تحصيلي إجمالي',
          titleAr: 'التقويم الإشهادي والنهائي في الوثب الطولي (Évaluation sommative officielle)',
          titleFr: 'Évaluation sommative finale certifiée selon les OP 2009',
          motorObjective: 'تحقيق أبعد مسافة ممكنة مسجلة رسمياً وفق السلم المعتمد لوزارة التربية الوطنية.',
          cognitiveObjective: 'استيعاب النتيجة المحققة وربطها بالتطور المكتسب خلال الدورة التعليمية.',
          behavioralObjective: 'الروح الرياضية، الانضباط، والافتخار بالمجهودات والإنجازات المحققة.',
          situation: 'اختبار نهائي رسمي مسجل في محاضر الامتحان، يمنح التلميذ 3 محاولات رسمية.',
          criteria: 'الإنجاز المتري الرقمي (14 أو 12 نقطة)، الأداء التقني، والمواظبة والسلوك (نقطة /20).'
        }
      ]
    }
  },

  // كرة القدم (Football)
  {
    sportKey: 'football',
    sportNameAr: 'كرة القدم',
    sportNameFr: 'Football',
    categoryAr: 'الألعاب الرياضية الجماعية (Sports collectifs)',
    otcCollegeAr: 'التحكم في الكرة، التمرير المتقن، والتعاون الجماعي الفعال لبناء هجمة وتجسيدها في وضعية هجومية ضد دفاع منظم.',
    otcLycéeAr: 'إتقان التمرير القصير والطويل، التمركز الهجومي والدفاعي، والالتزام بأدوار تكتيكية جماعية فعالة خلال المقابلة المصغرة.',
    levels: {
      college: [
        { seanceNumber: 1, phase: 'diagnostic', phaseLabelAr: 'تقويم تشخيصي', titleAr: 'التقويم التشخيصي: استكشاف التحكم في الكرة والتمرير الأساسي', titleFr: 'Évaluation diagnostique : Maîtrise du ballon et passes', motorObjective: 'التحكم في الكرة بالقدمين، التمرير لمسافة متوسطة، والتسديد نحو المرمى.', cognitiveObjective: 'معرفة قوانين اللعبة الأساسية وشروط السلامة ومناطق الملعب.', behavioralObjective: 'التعاون مع الزملاء واحترام روح الفريق.', situation: 'ألعاب مصغرة 3 ضد 3 مع تتبع المهارات الفردية الأساسية.', criteria: 'دقة التمرير، التحكم في الاستلام، استجابة الحركة.' },
        { seanceNumber: 2, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التحكم في الكرة والروابط الفردية (Contrôle et conduite)', titleFr: 'Conduite de balle et contrôle orienté', motorObjective: 'التحكم في الكرة بمختلف أجزاء القدم والقيام بتمريرات موجهة.', cognitiveObjective: 'إدراك أهمية النظرة الاستباقية ومحيط اللعب.', behavioralObjective: 'التركيز العالي والتواصل الحركي مع الزملاء.', situation: 'ورشات تنافسية للتحكم بالكرة واجتياز الحواجز بالقدمين.', criteria: 'بقاء الكرة قريبة من القدم، رفع الرأس أثناء الجري بالكرة.' },
        { seanceNumber: 3, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التمرير القصير واستقبال الكرة بسلامة (Passes et réceptions)', titleFr: 'Passes courtes et réceptions orientées', motorObjective: 'أداء تمريرات وجه القدم الداخلي والخارجي بدقة نحو الزميل.', cognitiveObjective: 'فهم زوايا التمرير واختيار توقيت إخراج الكرة.', behavioralObjective: 'الانضباط والتعاون والتواصل الصوتي والمرئي.', situation: 'تمريرات ثنائية وثلاثية في حركة مستمرة لمسافة 10-15 متر.', criteria: 'دقة إصابة الزميل، استلام موجه يسهل الحركة الموالية.' },
        { seanceNumber: 4, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التسديد نحو المرمى وتوظيف مساحات التسجيل (Tirs au but)', titleFr: 'Tirs au but et finition', motorObjective: 'التسديد القوي والموجه نحو المرمى من وضعيات مختلفة.', cognitiveObjective: 'تقدير المسافات وزاوية التسديد المناسبة.', behavioralObjective: 'الجرأة الهجومية والروح التنافسية الإيجابية.', situation: 'مواجهات ثنائية ضد حارس المرمى بعد استلام تمريرة.', criteria: 'توجيه الكرة نحو زوايا المرمى، ثبات جذع الجسم.' },
        { seanceNumber: 5, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'الاحتفاظ بالكرة والمساندة الهجومية (Soutien et conservation)', titleFr: 'Conservation du ballon et soutien', motorObjective: 'حماية الكرة أمام المدافع وبناء تمريرات قصيرة لفك الضغط.', cognitiveObjective: 'فهم مبدأ المساندة الخلفية والجانبية لحامل الكرة.', behavioralObjective: 'التضامن الجماعي واللعب الجماعي المنسجم.', situation: 'مباراة مصغرة 4 ضد 2 في مساحة ضيقة.', criteria: 'الحفاظ على الاستحواذ، التحرك المستمر بدون كرة.' },
        { seanceNumber: 6, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التمركز الدفاعي وقطع الكرة (Défense et interception)', titleFr: 'Placement défensif et interception', motorObjective: 'التمركز السليم بين الخصم والمرمي ومحاولة قطع التمريرات.', cognitiveObjective: 'استيعاب قواعد الدفاع الفردي والجماعي (ضغط وتغطية).', behavioralObjective: 'الروح الرياضية والالتزام بالقواعد وعدم الخشونة.', situation: 'تمارين 2 ضد 2 لاسترجاع الكرة في أقل وقت.', criteria: 'احترام مسافة الأمان، عدم الاندفاع المفرط، قطع الكرة بنجاح.' },
        { seanceNumber: 7, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'الربط بين الهجوم الدفاع والتحول السريع (Transition jeu)', titleFr: 'Transition rapide attaque-défense', motorObjective: 'التحول الفوري من الاستحواذ الهجومي إلى التنظيم الدفاعي عند فقدان الكرة.', cognitiveObjective: 'سرعة القراءة التكتيكية للموقف الميداني.', behavioralObjective: 'سرعة الاستجابة والمسؤولية الجماعية.', situation: 'مباريات مصغرة بشرط التسجيل في أقل من 10 ثوان.', criteria: 'سرعة رد الفعل، التغطية المتبادلة الفورية.' },
        { seanceNumber: 8, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'قواعد التحكيم المدرسي وتنظيم المباريات المصغرة', titleFr: 'Arbitrage scolaire et organisation de tournoi', motorObjective: 'تطبيق خطط اللعب المكتسبة في مباراة رسمية مصغرة.', cognitiveObjective: 'الإلمام بقوانين التحكيم المدرسي وتسيير المقابلة.', behavioralObjective: 'النزاهة، احترام الحكام والخصوم والزملاء.', situation: 'دوري مصغر يتناوب فيه التلاميذ أدوار اللعب والتحكيم.', criteria: 'تطبيق القوانين بدقة، إدارة نزيهة وخالية من الاحتجاجات.' },
        { seanceNumber: 9, phase: 'integration', phaseLabelAr: 'إدماج وتقويم تكويني', titleAr: 'حصة الإدماج والمحاكاة التنافسية (Séance d\'intégration)', titleFr: 'Simulation de match et remédiation', motorObjective: 'إدماج المهارات الفردية والتكتيكية في مباراة متكاملة.', cognitiveObjective: 'تحليل الأداء الفردي والجماعي ومعالجة الثغرات.', behavioralObjective: 'الثقة بالنفس والتقييم البناء لأداء الفريق.', situation: 'مباريات تطبيقية تقويمية بين فرق القسم.', criteria: 'تكامل الجانب المهاري والتكتيكي والسلوكي.' },
        { seanceNumber: 10, phase: 'summative', phaseLabelAr: 'تقويم تحصيلي إجمالي', titleAr: 'التقويم التحصيلي النهائي لكرة القدم (Évaluation sommative)', titleFr: 'Évaluation sommative finale en football', motorObjective: 'إظهار الكفاءة التقنية والتكتيكية والسلوكية المكتسبة أثناء المقابلة.', cognitiveObjective: 'الإلمام بمعايير التنقيط الوزارية للرياضات الجماعية.', behavioralObjective: 'الانضباط والروح الرياضية والالتزام بقواعد اللعب.', situation: 'مباراة تقويمية رسمية خاضعة لشبكة التنقيط (20 نقطة).', criteria: 'التقنية الفردية، اللعب الجماعي، السلوك، والمعارف.' }
      ],
      lycee: [
        { seanceNumber: 1, phase: 'diagnostic', phaseLabelAr: 'تقويم تشخيصي', titleAr: 'التقويم التشخيصي للكفاءات التكتيكية والمهارية المتقدمة', titleFr: 'Évaluation diagnostique des aptitudes technico-tactiques', motorObjective: 'تقييم القدرة على التحكم في الكرة، التمرير الطويل، والتمركز الهجومي.', cognitiveObjective: 'فهم أنظمة اللعب الحديثة وشروط التنفيذ الفعال.', behavioralObjective: 'الجدية والالتزام بروح الفريق والمسؤولية.', situation: 'مباراة تقويمية أولية 7 ضد 7 لتحديد المستويات.', criteria: 'جودة التمرير، الرؤية الميدانية، الفعالية التكتيكية.' },
        { seanceNumber: 2, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'بناء الهجمة المريحة والاحتفاظ بالاستحواذ (Construction du jeu)', titleFr: 'Construction de l\'attaque et circulation du ballon', motorObjective: 'تنفيذ تمريرات قصيرة وطويلة بدقة عالية لضرب خطوط الدفاع.', cognitiveObjective: 'استيعاب مفاهيم اتساع وعمق الملعب (Largeur et profondeur).', behavioralObjective: 'الصبر التكتيكي والتعاون الجماعي المتناسق.', situation: 'تمارين احتفاظ بالكرة 5 ضد 3 مع تغيير جهة اللعب.', criteria: 'سرعة اتخاذ القرار، دقة التمرير في المساحات الفارغة.' },
        { seanceNumber: 3, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التوغل الهجومي والتبادل الثنائي (Une-deux et dédoublement)', titleFr: 'Combinaisons offensives : Une-deux et dédoublement', motorObjective: 'تنفيذ تبادل سريع للكرة (One-two) وخرق الدفاع من الأطراف.', cognitiveObjective: 'إدراك توقيت الانطلاق والتمرير في العمق (Temps de passe et d\'appel).', behavioralObjective: 'الجرأة الهجومية والانسجام الثنائي.', situation: 'ورشات تطبيقية للهجوم المنظم من الأجنحة.', criteria: 'توقيت الانطلاق السليم، دقة التمريرة الحاسمة.' },
        { seanceNumber: 4, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'الضغط العالي والدفاع الجماعي المتقدم (Pressing et bloc défensif)', titleFr: 'Bloc équipe et pressing haut', motorObjective: 'تطبيق الضغط المتناسق لاسترجاع الكرة في نصف ملعب الخصم.', cognitiveObjective: 'معرفة آليات الدفاع بالمنطقة الدفاع الفردي الضاغط.', behavioralObjective: 'المجهود البدني الجماعي والانضباط التكتيكي.', situation: 'تمارين استرجاع الكرة في مناطق الخصم (4 ضد 4).', criteria: 'التنسيق بين الخطوط، تقليص المساحات، قطع التمريرات.' },
        { seanceNumber: 5, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تنويع الهجمات واستغلال الكرات الثابتة (Balles arrêtées)', titleFr: 'Exploitation des coups de pied arrêtés', motorObjective: 'تنفيذ ركلات حرة وركنية بدقة نحو مناطق الخطورة.', cognitiveObjective: 'معرفة الخطط التكتيكية للكرات الثابتة هجومياً ودفاعياً.', behavioralObjective: 'التركيز الذهني والدقة في التنفيذ الجماعي.', situation: 'تطبيقات عملية للركلات الركنية والركلات الحرة.', criteria: 'جودة التنفيذ العرضي، التمركز السليم للمهاجمين والمدافعين.' },
        { seanceNumber: 6, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التدبير البدني للجهد وتسيير إيقاع المقابلة (Gestion de l\'effort)', titleFr: 'Gestion de l\'effort et rythme de match', motorObjective: 'الحفاظ على الفعالية والتركيز طيلة أطوار المقابلة المصغرة.', cognitiveObjective: 'فهم استراتيجيات تسيير المباريات وتوزيع الجهد البدني.', behavioralObjective: 'الروح القيادية وضبط النفس تحت الضغط.', situation: 'مباريات تنافسية بمدة زمنية كاملة مع التوجيه التكتيكي.', criteria: 'عدم التراجع البدني المفاجئ، اتخاذ قرارات صحيحة تحت التعب.' },
        { seanceNumber: 7, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التحكيم الرسمي وتدبير أدوار البطولة المدرسية', titleFr: 'Arbitrage officiel et gestion de tournoi', motorObjective: 'إدارة أطوار المقابلة باحترافية وتطبيق قانون كرة القدم.', cognitiveObjective: 'الإلمام التام بقوانين التحكيم وانضباط الملاعب.', behavioralObjective: 'النزاهة، الحياد، وتقبل القرارات التحكيمية بروح رياضية.', situation: 'إدارة دوري مصغر للقسم مع توزيع مهام التحكيم والتنظيم.', criteria: 'سرعة وسلاسة اتخاذ القرارات، فرض الانضباط والروح الرياضية.' },
        { seanceNumber: 8, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التصحيح التكتيكي ومعالجة الأخطاء الجماعية (Remédiation tactique)', titleFr: 'Correction tactique et remédiation collective', motorObjective: 'تطبيق الخطط البديلة عند مواجهة دفاع منظم أو ضغط مكثف.', cognitiveObjective: 'تحليل نقاط القوة والضعف في الأداء الجماعي للفريق.', behavioralObjective: 'التشاور البناء والعمل بروح الفريق الواحد.', situation: 'مباريات موجهة مع توقفات لتصحيح التمركز والتكتيك.', criteria: 'التجاوب السريع مع التوجيهات، تصحيح الأخطاء الملاحظة.' },
        { seanceNumber: 9, phase: 'integration', phaseLabelAr: 'إدماج وتقويم تكويني', titleAr: 'المحاكاة الشاملة لظروف الامتحان الإشهادي في كرة القدم', titleFr: 'Simulation globale de l\'épreuve certificative', motorObjective: 'أداء دور اللاعب بفعالية كاملة وتقديم أفضل مستوى تقني وتكتيكي.', cognitiveObjective: 'معرفة معايير التنقيط الإشهادي الخاصة بالرياضات الجماعية.', behavioralObjective: 'الثقة بالنفس والالتزام بقواعد اللعب النظيف.', situation: 'مقابلة تطبيقية رسمية كاملة بشروط الامتحان الإشهادي.', criteria: 'التكامل المهاري، الالتزام التكتيكي، والسلوك الرياضي.' },
        { seanceNumber: 10, phase: 'summative', phaseLabelAr: 'تقويم تحصيلي إجمالي', titleAr: 'التقويم التحصيلي والنهائي الإشهادي لكرة القدم (Évaluation sommative)', titleFr: 'Évaluation sommative finale certifiée en football', motorObjective: 'تحقيق أقصى مستويات النجاعة الفردية والجماعية في المقابلة النهائية.', cognitiveObjective: 'الاستيعاب الشامل لمعايير التقويم والتنقيط الوزاري.', behavioralObjective: 'الانضباط التام، الروح الرياضية، والتقدير الإيجابي للجهد.', situation: 'إجراء المقابلة الإشهادية النهائية ورصد النقط الرسمية (/20).', criteria: 'التقنية الفردية (6 ن)، اللعب الجماعي (6 ن)، السلوك (4 ن)، المعارف (4 ن).' }
      ]
    }
  },

  // كرة الطائرة (Volleyball)
  {
    sportKey: 'volleyball',
    sportNameAr: 'كرة الطائرة',
    sportNameFr: 'Volleyball',
    categoryAr: 'الألعاب الرياضية الجماعية (Sports collectifs)',
    otcCollegeAr: 'التحكم في التمرير بالأصابع من الأعلى ومن الأسفل (Manchette)، والقدرة على إرجاع الكرة للساحة المضادة في 3 لمسات بتنسيق جماعي.',
    otcLycéeAr: 'إتقان الإرسال الموجه، التمرير الدقيق، الإعداد والتسديد (Smash)، والتنظيم الدفاعي والهجومي في وضعية ثلاثية حقيقية.',
    levels: {
      college: [
        { seanceNumber: 1, phase: 'diagnostic', phaseLabelAr: 'تقويم تشخيصي', titleAr: 'التقويم التشخيصي: استكشاف التمرير الأساسي وضرب الكرة', titleFr: 'Évaluation diagnostique : Maniement de base et renvoi', motorObjective: 'إرسال الكرة للساحة المضادة واستقبالها بطريقة بسيطة.', cognitiveObjective: 'معرفة قوانين الملعب والشبكة وشروط السلامة.', behavioralObjective: 'الانخراط الإيجابي والتعاون مع الزملاء.', situation: 'لعب مصغر فوق الشبكة لتحديد المهارات الأولية.', criteria: 'الاستجابة الحركية، دقة التوجيه الأولي للكرة.' },
        { seanceNumber: 2, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التمرير بالأصابع من الأعلى (La passe haute)', titleFr: 'Apprentissage de la passe haute', motorObjective: 'استقبال وتمرير الكرة بالأصابع من الأعلى بتوافق سليم.', cognitiveObjective: 'فهم وضعية اليدين على شكل سلة واستخدام مرونة الساقين.', behavioralObjective: 'التركيز العالي والتنسيق مع حركة الزميل.', situation: 'تمارين ثنائية للتمرير بالأصابع فوق الرأس بمسافات متزايدة.', criteria: 'لمس الكرة بأطراف الأصابع وليس بباطن الكف، امتداد متناسق للذراعين.' },
        { seanceNumber: 3, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التمرير من الأسفل / المانشيت (La manchette)', titleFr: 'Apprentissage de la manchette', motorObjective: 'توجيه الكرة الساقطة نحو الأعلى والأمام باستخدام الساعدين المضمومين.', cognitiveObjective: 'إدراك سطح التلامس السليم (الساعدان معا) وتثبيت المرفقين.', behavioralObjective: 'المثابرة والثقة في استقبال الكرة.', situation: 'تبادل المانشيت بين تلميذين دون سقوط الكرة.', criteria: 'ساعدان ممدودتان ومقفلتان، عدم ثني المرفقين، توجيه دقيق للأعلى.' },
        { seanceNumber: 4, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'الإرسال من الأسفل (Le service de sécurité)', titleFr: 'Le service de sécurité par en bas', motorObjective: 'إرسال الكرة من خلف خط الخلفي لتجتاز الشبكة وتستقر في ساحة الخصم.', cognitiveObjective: 'معرفة مسار الكرة وقوة الضرب المناسبة للوصول للساحة المضادة.', behavioralObjective: 'التركيز والثقة بالنفس عند الإرسال.', situation: 'محاولات إرسال فردية نحو أهداف محددة في ساحة الخصم.', criteria: 'ضرب الكرة براحة اليد بقوة مناسبة، متابعة حركة الذراع للأمام.' },
        { seanceNumber: 5, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'بناء الهجمة في 3 لمسات (1 استقبال - 2 إعداد - 3 إرسال للخصم)', titleFr: 'Organisation offensive en 3 touches', motorObjective: 'تنفيذ تسلسل 3 لمسات (مانشيت -> تمريرة عالية -> إرجاع بالضرب).', cognitiveObjective: 'فهم أهمية احترام ثلاث لمسات قبل إعادة الكرة للخصم.', behavioralObjective: 'التواصل الصوتي والتنسيق الجماعي الفعال.', situation: 'ورشات عمل ثلاثية لتطبيق قاعدة 3 لمسات متتالية.', criteria: 'احترام عدد اللمسات، الانتقال السلس للكرة بين اللاعبين الثلاثة.' },
        { seanceNumber: 6, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التمركز الدفاعي وتغطية المنطقة (Placement défensif)', titleFr: 'Placement et couverture de zone', motorObjective: 'التمركز السليم في الملعب واستقبال كرات الخصم بمانشيت موجّه.', cognitiveObjective: 'معرفة مناطق التغطية الفردية والجماعية في الملعب.', behavioralObjective: 'اليقظة الذهنية والتعاون المستمر.', situation: 'استقبال إرسالات متسلسلة وتوزيعها نحو صانع اللعب.', criteria: 'التحرك الاستباقي نحو مكان سقوط الكرة، قراءة مسار الكرة.' },
        { seanceNumber: 7, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'محاولات التسديد الهجومي البسيط (Smash d\'initiation)', titleFr: 'Initiation au smash et frappe haute', motorObjective: 'القفز والضرب القوي للكرة نحو الأسفل في ساحة الخصم.', cognitiveObjective: 'تحديد توقيت الوقف والقفز للتفاعل مع الكرة العالية.', behavioralObjective: 'الشجاعة والجرأة الهجومية المدروسة.', situation: 'تسديد كرات مرفوعة بدقة من الزميل فوق الشبكة الواطئة.', criteria: 'توقيت ارتقاء سليم، ضرب الكرة في نقطة عالية وأمام الجسم.' },
        { seanceNumber: 8, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'قواعد التحكيم المدرسي وتسيير المقابلة (Arbitrage)', titleFr: 'Arbitrage et règles du volleyball', motorObjective: 'تطبيق القواعد في مباراة مصغرة وتأدية أدوار التحكيم.', cognitiveObjective: 'فهم أخطاء اللمسات الأربع، اللمسة المزدوجة، وخطأ الشبكة.', behavioralObjective: 'النزاهة، الحياد، واحترام القرارات.', situation: 'مباريات مصغرة مع تناوب التلاميذ على التحكيم وتدوين الأخطاء.', criteria: 'دقة الصافرة وتطبيق القوانين بصرامة وعدل.' },
        { seanceNumber: 9, phase: 'integration', phaseLabelAr: 'إدماج وتقويم تكويني', titleAr: 'حصة الإدماج والمحاكاة التنافسية (Séance d\'intégration)', titleFr: 'Matchs d\'intégration et régulation', motorObjective: 'إدماج الإرسال، الاستقبال، التمرير والتسديد في مباراة متكاملة.', cognitiveObjective: 'تقييم الأداء الفردي والجماعي ومعالجة النقص.', behavioralObjective: 'الروح الرياضية والعمل الجماعي المتناسق.', situation: 'دوري مصغر للقسم بقواعد اللعب الكاملة (3 ضد 3 أو 4 ضد 4).', criteria: 'احترام المهارات المدروسة، دينامية اللعب الجماعي.' },
        { seanceNumber: 10, phase: 'summative', phaseLabelAr: 'تقويم تحصيلي إجمالي', titleAr: 'التقويم التحصيلي النهائي لكرة الطائرة (Évaluation sommative)', titleFr: 'Évaluation sommative finale en volleyball', motorObjective: 'أداء مهارات كرة الطائرة بكفاءة عالية خلال المباراة الرسمية.', cognitiveObjective: 'استيعاب معايير التنقيط المعتمدة في التوجيهات الرسمية.', behavioralObjective: 'الانضباط التام والروح الرياضية العالية.', situation: 'إجراء مباراة تقويمية رسمية خاضعة لشبكة التنقيط النهائية (/20).', criteria: 'التقنية الفردية، اللعب الجماعي، السلوك، والمعارف.' }
      ],
      lycee: [
        { seanceNumber: 1, phase: 'diagnostic', phaseLabelAr: 'تقويم تشخيصي', titleAr: 'التقويم التشخيصي لمستويات اللعب التكتيكي والمهاري المتقدم', titleFr: 'Évaluation diagnostique des acquis en volleyball', motorObjective: 'تقييم جودة الإرسال، التمرير الموجه، والقدرة على بناء هجمة.', cognitiveObjective: 'فهم قواعد التموضع وأنظمة اللعب المتطورة (5-1 أو 4-2 مبسطة).', behavioralObjective: 'الجدية والالتزام بروح الفريق والتنظيم.', situation: 'مباراة مصغرة أولية لتحديد مستويات التحكم في الكرة.', criteria: 'دقة التمرير، التحكم في الاستقبال، التنظيم الدفاعي.' },
        { seanceNumber: 2, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'إتقان الإرسال من الأعلى (Le service tennis / flottant)', titleFr: 'Perfectionnement du service tennis et flottant', motorObjective: 'إرسال قوي وموجه نحو مناطق الضعف في ساحة الخصم.', cognitiveObjective: 'استيعاب ميكانيزم ضرب الكرة من الأعلى بقوة واتجاه دقيق.', behavioralObjective: 'الثقة بالنفس وتحمل المسؤولية الفردية.', situation: 'ورشات إرسال نحو زوايا مستهدفة في ملعب الخصم.', criteria: 'قوة وسرعة الكرة، اجتياز الشبكة بانتظام نحو المربع المستهدف.' },
        { seanceNumber: 3, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التمرير في وضعية متقدمة وتوجيه اللعب (Passe en suspension)', titleFr: 'Passe en suspension et choix tactiques', motorObjective: 'توزيع الكرة بدقة نحو المهاجمين (صانع اللعب - Passeur).', cognitiveObjective: 'تحديد الخيار الهجومي الأمثل بناءً على تموضع دفاع الخصم.', behavioralObjective: 'القيادة الجماعية والذكاء الميداني.', situation: 'تمارين خاصة لصانعي اللعب لتوزيع الكرات على الأجنحة والوسط.', criteria: 'دقة الارتفاع والمكان، سرعة اتخاذ القرار التكتيكي.' },
        { seanceNumber: 4, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'الإعداد للتسديد الهجومي والهجوم السريع (Smash et feinte)', titleFr: 'Apprentissage du smash appuyé et feintes', motorObjective: 'الارتقاء القوي والضرب الساحق للكرة متجاوزاً حائط الصد.', cognitiveObjective: 'اختيار توقيت وزاوية التسديد المناسبة لتفادي الصد.', behavioralObjective: 'الجرأة والشجاعة والتركيز البصري الحاد.', situation: 'هجمات منسقة بعد إعداد عالٍ من الزميل مع وجود مدافعين.', criteria: 'قوة وسرعة الضربة، توجيه دقيق نحو المساحات الفارغة.' },
        { seanceNumber: 5, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تنظيم حائط الصد الفردي والثنائي (Le contre / Block)', titleFr: 'Organisation du contre individuel et collectif', motorObjective: 'القفز فوق الشبكة بسواعد ممدودة لمنع تسديدات الخصم.', cognitiveObjective: 'قراءة مسار الكرات الموجهة وتوقع مكان التسديد.', behavioralObjective: 'التضحية، التناسق، والتواصل الفوري بين المدافعين.', situation: 'ورشات صد هجمات السمش (Smash) الواردة من الخصم.', criteria: 'توقيت ارتقاء متزامن، سواعد متماسكة وموجهة لداخل ملعب الخصم.' },
        { seanceNumber: 6, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التنظيم الدفاعي الخلفي والتغطية الشاملة (Défense en L)', titleFr: 'Organisation de la défense arrière et couverture', motorObjective: 'استقبال الكرات الصعبة المرتدة من حائط الصد بحركات مانشيت رشيقة.', cognitiveObjective: 'فهم مناطق التغطية الدفاعية الخلفية والدفاع عن المنطقة.', behavioralObjective: 'اليقظة التامة، الإصرار، وعدم الاستسلام للكرة.', situation: 'مباريات مصغرة بركز على جودة الدفاع الخلفي والاستقبال.', criteria: 'سرعة رد الفعل، الوصول للكرة قبل سقوطها، توجيهها لصانع اللعب.' },
        { seanceNumber: 7, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التحكيم الرسمي وتدبير أدوار البطولة المدرسية', titleFr: 'Arbitrage officiel et gestion de tournoi', motorObjective: 'إدارة أطوار المقابلة باحترافية وتطبيق قانون كرة الطائرة.', cognitiveObjective: 'الإلمام التام بقوانين التحكيم (أخطاء الدوران، التموضع، الشبكة).', behavioralObjective: 'النزاهة، الحياد، واحترام القرارات التحكيمية.', situation: 'إدارة دوري مصغر للقسم مع توزيع مهام التحكيم والتسجيل.', criteria: 'دقة تطبيق القانون، إدارة نظيفة ومحايدة للمقابلات.' },
        { seanceNumber: 8, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التصحيح التكتيكي ومعالجة الأخطاء الجماعية (Remédiation)', titleFr: 'Remédiation tactique et correction collective', motorObjective: 'معالجة الثغرات في حائط الصد أو الاستقبال وتطبيق خطط بديلة.', cognitiveObjective: 'تحليل نقاط القوة والضعف أثناء المقابلة الحية.', behavioralObjective: 'التشاور البناء والعمل بروح الفريق الواحد.', situation: 'مباريات موجهة مع توقفات لتصحيح التموضع والتكتيك.', criteria: 'التجاوب السريع مع التوجيهات، تصحيح الأخطاء الملاحظة.' },
        { seanceNumber: 9, phase: 'integration', phaseLabelAr: 'إدماج وتقويم تكويني', titleAr: 'المحاكاة الشاملة لظروف الامتحان الإشهادي في كرة الطائرة', titleFr: 'Simulation globale de l\'épreuve certificative', motorObjective: 'أداء دور اللاعب بفعالية كاملة وتقديم أفضل مستوى تقني وتكتيكي.', cognitiveObjective: 'معرفة معايير التنقيط الإشهادي الخاصة بالرياضات الجماعية.', behavioralObjective: 'الثقة بالنفس والالتزام بقواعد اللعب النظيف.', situation: 'مقابلة تطبيقية رسمية كاملة بشروط الامتحان الإشهادي.', criteria: 'التكامل المهاري، الالتزام التكتيكي، والسلوك الرياضي.' },
        { seanceNumber: 10, phase: 'summative', phaseLabelAr: 'تقويم تحصيلي إجمالي', titleAr: 'التقويم التحصيلي والنهائي الإشهادي لكرة الطائرة (Évaluation sommative)', titleFr: 'Évaluation sommative finale certifiée en volleyball', motorObjective: 'تحقيق أقصى مستويات النجاعة الفردية والجماعية في المقابلة النهائية.', cognitiveObjective: 'الاستيعاب الشامل لمعايير التقويم والتنقيط الوزاري.', behavioralObjective: 'الانضباط التام، الروح الرياضية، والتقدير الإيجابي للجهد.', situation: 'إجراء المقابلة الإشهادية النهائية ورصد النقط الرسمية (/20).', criteria: 'التقنية الفردية (6 ن)، اللعب الجماعي (6 ن)، السلوك (4 ن)، المعارف (4 ن).' }
      ]
    }
  },

  // دفع الجلة (Lancer du poids)
  {
    sportKey: 'lancer_poids',
    sportNameAr: 'دفع الجلة',
    sportNameFr: 'Lancer du poids',
    categoryAr: 'ألعاب القوى (أنشطة الرمي والدفع)',
    otcCollegeAr: 'إتقان مسك الجلة، وضعية الانطلاق من الكتف، والدفع القوي بزاوية 45° داخل قطاع الرمي القانوني.',
    otcLycéeAr: 'إتقان تقنية الانزلاق (Glissement) أو الدوران، التنسيق بين دفع الساقين ودوران الجذع لتحقيق أقصى مدى رمي.',
    levels: {
      college: [
        { seanceNumber: 1, phase: 'diagnostic', phaseLabelAr: 'تقويم تشخيصي', titleAr: 'التقويم التشخيصي: استكشاف القدرة على الدفع والقوة الانفجارية', titleFr: 'Évaluation diagnostique : Force explosive et lancer initial', motorObjective: 'دفع الجلة أو الكرة الطبية لمسافة معينة بطريقة سليمة وآمنة.', cognitiveObjective: 'معرفة قواعد السلامة وخطورة رمي الجلة بدون مراقبة قطاع الرمي.', behavioralObjective: 'الانضباط الصارم، احترام شروط الأمن والسلامة.', situation: 'محاولات دفع أولية للكرة الطبية أو الجلة الخفيفة مع قياس المسافة.', criteria: 'عدم رمي الجلة بطريقة خطرة، احترام قطاع الرمي، استجابة بدنية أولية.' },
        { seanceNumber: 2, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تقنية مسك الجلة والوضع الصحيح للرقبة والكتف (Prise et position)', titleFr: 'Prise du poids et placement au cou', motorObjective: 'استقرار الجلة على قاعدة الأصابع (غير راحة الكف) وملامستها لعظم الترقوة والرقبة.', cognitiveObjective: 'معرفة نقطة ارتكاز الجلة على الجسم لتفادي الإصابة وضمان نقل القوة.', behavioralObjective: 'التركيز والعناية بالمعدات الرياضية.', situation: 'تمارين إحساس ومسك الجلة، والضغط الخفيف على العنق والكتف.', criteria: 'عدم ارتكاز الجلة على راحة الكف، ملامستها الدقيقة للرقبة.' },
        { seanceNumber: 3, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'وضعية الانطلاق والوقفة الجانبية (Position de départ)', titleFr: 'Position de départ et orientation latérale', motorObjective: 'اتخاذ وضعية جانبية مع ثني الرجل الخلفية وتحويل ثقل الجسم إليها.', cognitiveObjective: 'فهم أهمية الوضعية الجانبية لمضاعفة مسافة وقوة الدفع.', behavioralObjective: 'الانضباط والالتزام بالملاحظة الدقيقة للأستاذ.', situation: 'تدريبات الوقوف الجانبي بدون حركة أو انزلاق مع الدفع الثابت.', criteria: 'ثقل الجسم على الرجل الخلفية، جذع مائل قليلاً، رؤية أفقية موجهة.' },
        { seanceNumber: 4, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'دفع الجلة من الثبات وتنسيق عمل الساقين والجذع (Poussée de face/profil)', titleFr: 'Poussée statique et coordination jambes-tronc', motorObjective: 'دفع الجلة بانفجار الساقين والدوران السريع للجذع نحو الأمام.', cognitiveObjective: 'معرفة التسلسل الحركي لانتقال القوة من الأرض عبر الساقين إلى الذراع.', behavioralObjective: 'بذل أقصى مجهود انفجاري والتحلي بالشجاعة.', situation: 'محاولات دفع الجلة من وضع الثبات الجانبي نحو قطاع الرمي.', criteria: 'انفجار قوي بالساقين، دوران متزامن للحالج، خروج الجلة من قاعدة الأصابع.' },
        { seanceNumber: 5, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'متابعة حركة اليد وتجنب السقوط بعد الدفع (Le fouetté et rétablissement)', titleFr: 'Geste final et équilibre après le lancer', motorObjective: 'مد الذراع بالكامل وتوجيه الأصابع نحو الخارج مع الحفاظ على التوازن وعدم تجاوز الخط.', cognitiveObjective: 'معرفة قانون الدائرة والدائرة وعدم تجاوز خط الرمي الأمامي.', behavioralObjective: 'التحكم الذاتي والانضباط القانوني الصارم.', situation: 'تطبيقات عملية مع التركيز على حركة اليد النهائية ومتابعة التوازن.', criteria: 'مد ذراع الدفع بالكامل، عدم السقوط للأمام، البقاء داخل الدائرة.' },
        { seanceNumber: 6, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'مبدأ زاوية الرمي المثلى (45 درجة) والمدى (Angle de sortie)', titleFr: 'Recherche de l\'angle optimal de sortie (45°)', motorObjective: 'إطلاق الجلة بزاوية تتراوح بين 40 و45 درجة لتحقيق أقصى مدى أفقي.', cognitiveObjective: 'فهم العلاقة الفيزيائية بين زاوية الانطلاق والمسافة المقطوعة.', behavioralObjective: 'الرغبة في تحسين الإنجاز الشخصي والتقييم الذاتي.', situation: 'رمي فوق حبل مرتفع أو نحو علامات محددة في الهواء لفرض زوايا صحيحة.', criteria: 'ارتفاع مناسب لمسار الجلة، تفادي الرمي الأفقي المباشر للأرض.' },
        { seanceNumber: 7, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'مقدمة في تقنية الانزلاق البسيط (Initiation au glissement)', titleFr: 'Initiation au glissement de dos', motorObjective: 'أداء خطوة انزلاقية تمهيدية نحو الخلف لزيادة كمية الحركة قبل الدفع.', cognitiveObjective: 'استيعاب دور خطوة الانزلاق في إضافة طاقة حركية للجلة.', behavioralObjective: 'الجرأة الحركية وتجاوز صعوبة التنسيق الخلفي.', situation: 'تمارين الانزلاق بدون جلة أولاً، ثم باستخدام الجلة الخفيفة.', criteria: 'انزلاق منخفض ومستقيم، عدم القفز لأعلى، استمرارية الحركة نحو الدفع.' },
        { seanceNumber: 8, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تنظيم المنافسة المدرسية وقواعد التحكيم (Arbitrage officiel)', titleFr: 'Organisation de concours et arbitrage', motorObjective: 'تطبيق تقنية الرمي في ظروف مسابقة رسمية مع القيام بأدوار التحكيم.', cognitiveObjective: 'معرفة شروط احتساب المحاولة الصحيحة وقراءة القياس بالمتر.', behavioralObjective: 'النزاهة، الدقة في القياس، والمسؤولية الجماعية.', situation: 'مسابقة مصغرة للقسم تتضمن أدوار: رامٍ، مقياس بالشريط، مدون، ومراقب.', criteria: 'دقة قراءة شريط القياس، تطبيق قانون الدائرة بحزم وعدل.' },
        { seanceNumber: 9, phase: 'integration', phaseLabelAr: 'إدماج وتقويم تكويني', titleAr: 'حصة الإدماج والمحاكاة التنافسية (Séance d\'intégration)', titleFr: 'Simulation de concours et remédiation', motorObjective: 'دمج وضعية الانطلاق، الدفع، وزاوية الإطلاق في محاولات مترية متكاملة.', cognitiveObjective: 'تحليل الأخطاء ومقارنة النتائج الحالية بالتقويم التشخيصي.', behavioralObjective: 'الثقة بالنفس، الرغبة في تحطيم الرقم الشخصي، وتقبل النتائج.', situation: 'مسابقة تجريبية بثلاث محاولات لكل تلميذ مع تسجيل أفضل إنجاز.', criteria: 'تكامل مراحل الدفع، تحسن المسافة المقطوعة، احترام القانون.' },
        { seanceNumber: 10, phase: 'summative', phaseLabelAr: 'تقويم تحصيلي إجمالي', titleAr: 'التقويم التحصيلي النهائي لدفع الجلة (Évaluation sommative)', titleFr: 'Évaluation sommative finale en lancer du poids', motorObjective: 'تحقيق أقصى إنجاز متري ممكن في دفع الجلة الرسمية وفق المعايير.', cognitiveObjective: 'الإلمام التام بسلم التنقيط الوزاري وشروط الاختبار.', behavioralObjective: 'الانضباط، الروح الرياضية، والالتزام بمعايير السلامة.', situation: 'إجراء المحاولات الرسمية لكل تلميذ ورصد النقطة نهائياً (/20).', criteria: 'الإنجاز الرقمي (المسافة)، التقنية الحركية، والسلوك والمواظبة.' }
      ],
      lycee: [
        { seanceNumber: 1, phase: 'diagnostic', phaseLabelAr: 'تقويم تشخيصي', titleAr: 'التقويم التشخيصي للقدرة الانفجارية والمستوى التقني في دفع الجلة', titleFr: 'Évaluation diagnostique : Puissance explosive et niveau technique', motorObjective: 'قياس المسافة المقطوعة أولياً في دفع الجلة بالتقنية المتاحة.', cognitiveObjective: 'معرفة المعايير الوطنية للرمي في السلك التأهيلي.', behavioralObjective: 'الجدية والالتزام بمعايير الأمن والسلامة داخل ميدان الرمي.', situation: 'محاولات رمي أولية مسجلة لتحديد قاعدة بيانات الانطلاق.', criteria: 'المدى المقطوع، سلامة الرمي، احترام قطاع الرمي القانوني.' },
        { seanceNumber: 2, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تثبيت الوضعية الصحيحة للمسك والانطلاق الجانبي المتقدم', titleFr: 'Perfectionnement de la prise et position de force', motorObjective: 'وضع الجلة بدقة تحت الفك مع إحكام عضلات الكتف والرقبة.', cognitiveObjective: 'إدراك القواعد البيوميكانيكية لتجميع الطاقة العضلية في وضعية الاستعداد.', behavioralObjective: 'التركيز العالي والحرص على تطبيق شروط السلامة.', situation: 'تمارين دفع إحصائية مع التركيز على ثقل الجسم وزوايا الجذع.', criteria: 'ثبات تلامس الجلة بالرقبة، توجيه الكوع للخارج بشكل صحيح.' },
        { seanceNumber: 3, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تقنية الانزلاق الخلفي الكامل (Le glissement de dos / O\'Brien)', titleFr: 'Maîtrise complète de la technique du glissement (O\'Brien)', motorObjective: 'أداء الانزلاق الخلفي برشاقة لنقل مركز الثقل من مؤخرة الدائرة لمركزها.', cognitiveObjective: 'فهم ميكانيزم إضافة السرعة الأفقية وتحويلها إلى قوة دفع عمودية.', behavioralObjective: 'الشجاعة والجرأة والانضباط في تكرار الحركات المركبة.', situation: 'تطبيقات متسلسلة لانزلاق بدون جلة ثم بانزلاق تمهيدي خفيف.', criteria: 'مسار انزلاق منخفض ومستقيم، عدم التوقف عند مركز الدائرة، استمرارية الحركة.' },
        { seanceNumber: 4, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التنسيق بين الانزلاق والدفع الانفجاري (Transition glissement-poussée)', titleFr: 'Enchaînement fluide glissement et inversion (Inversion)', motorObjective: 'الربط السلس بين الانزلاق الفوري والدوران الانفجاري للحالج والكتفين.', cognitiveObjective: 'معرفة اللحظة الحاسمة لبدء دفع الجلة بعد انتهاء خطوة الانزلاق.', behavioralObjective: 'التوقيت الدقيق والتركيز الانفجاري.', situation: 'محاولات رمي كاملة باستخدام تقنية الانزلاق (O\'Brien) مع تدقيق الأستاذ.', criteria: 'انعدام التوقف الميت بين الانزلاق والدفع، سرعة ودقة التوجيه.' },
        { seanceNumber: 5, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'تحسين زاوية ومسار الخروج وتطبيق القوة القصوى (Angle et vitesse)', titleFr: 'Optimisation de la vitesse de lâché et de l\'angle', motorObjective: 'تحقيق أقصى سرعة لحظة الإطلاق بزاوية مثلى (42° إلى 45°).', cognitiveObjective: 'استيعاب معادلة المدى (السرعة الابتدائية + زاوية الإطلاق).', behavioralObjective: 'المثابرة والتركيز على الرفع المستمر للمستوى الرقمي.', situation: 'رمي نحو مناطق محددة أو قياس المدى مع تصحيح زوايا الدفع.', criteria: 'امتداد ذراع كامل، توجيه دقيق للأعلى والأمام، ثبات اتجاه الرمي.' },
        { seanceNumber: 6, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التوازن بعد الدفع وعملية عكس القدمين (L\'inversion des appuis)', titleFr: 'Maîtrise de l\'inversion des appuis et équilibration', motorObjective: 'تغيير وضعية القدمين بسرعة بعد الإطلاق لامتصاص الزخم وتفادي الخروج من الدائرة.', cognitiveObjective: 'فهم قانون الدائرة وأهمية عملية عكس الساقين للتحكم في مركز الثقل.', behavioralObjective: 'التحكم الانفعالي والانضباط القانوني الصارم.', situation: 'تطبيقات عملية للرمي مع التركيز المطلق على البقاء داخل الدائرة.', criteria: 'تبديل سريع للرجلين، عدم ملامسة حافة الدائرة الخارجية، ثبات التوازن.' },
        { seanceNumber: 7, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التدريب التنافسي والتحكيم الرسمي في مسابقات الرمي', titleFr: 'Arbitrage officiel et gestion de concours de lancer', motorObjective: 'إدارة مسابقة رسمية لدفع الجلة وفق معايير وقوانين ألعاب القوى.', cognitiveObjective: 'الإلمام التام بقوانين الاتحاد الدولي (IAAF) الخاصة برمي الجلة.', behavioralObjective: 'النزاهة، الدقة المتناهية في القياس بالشريط، والروح القيادية.', situation: 'تنظيم مسابقة صفية كاملة تتوزع فيها مهام التحكيم والقياس والتسجيل.', criteria: 'دقة قراءة القياسات، تطبيق القوانين بحزم وعدل، توثيق دقيق للنتائج.' },
        { seanceNumber: 8, phase: 'learning', phaseLabelAr: 'تعلم وبناء', titleAr: 'التصحيح الفردي ومعالجة الأخطاء التقنية المتقدمة (Correction)', titleFr: 'Correction personnalisée des fautes techniques', motorObjective: 'تصحيح أخطاء انحناء الذراع المبكر أو عدم استقامة الجذع عند الدفع.', cognitiveObjective: 'تحليل الأداء الذاتي واستيعاب الملاحظات التقنية للأستاذ.', behavioralObjective: 'الانفتحاح على النقد البناء والإصرار على التطوير.', situation: 'ورشات تصحيحية فردية لكل تلميذ بناءً على نتائج الحصص السابقة.', criteria: 'تجاوز الخطأ المرصود، تحسن ملحوظ في التوافق الحركي والمدى.' },
        { seanceNumber: 9, phase: 'integration', phaseLabelAr: 'إدماج وتقويم تكويني', titleAr: 'المحاكاة الشاملة لظروف الامتحان الإشهادي لدفع الجلة (Simulation)', titleFr: 'Simulation officielle de l\'épreuve certificative du Bac', motorObjective: 'أداء المحاولات الرسمية الثلاث بكامل الإمكانات وتحت ضغط الاختبار.', cognitiveObjective: 'الإلمام الكامل بشبكة التنقيط الإشهادي الرسمية في ألعاب القوى.', behavioralObjective: 'الثقة بالنفس، الانضباط، والتحكم في التوتر النفسي.', situation: 'إجراء مسابقة تجريبية رسمية بشروط الامتحان الإشهادي الوطني.', criteria: 'تطابق الإنجاز مع سلم التنقيط، تكامل التقنية، الالتزام بالقانون.' },
        { seanceNumber: 10, phase: 'summative', phaseLabelAr: 'تقويم تحصيلي إجمالي', titleAr: 'التقويم التحصيلي والنهائي الإشهادي لدفع الجلة (Évaluation sommative)', titleFr: 'Évaluation sommative finale certifiée en lancer du poids', motorObjective: 'تحقيق أقصى إنجاز متري وتنسيق حركي في المحاولات الإشهادية الرسمية.', cognitiveObjective: 'استيعاب النتائج المحققة وربطها بالمجهود المبذول طيلة الدورة.', behavioralObjective: 'الانضباط التام، الروح الرياضية، والتقدير الإيجابي للجهد الرياضي.', situation: 'إجراء مسابقة الباكالوريا الرسمية ورصد النقط النهائية في جدول مسار (/20).', criteria: 'الإنجاز الرقمي (المسافة المعيارية)، جودة الأداء التقني، والسلوك والمواظبة.' }
      ]
    }
  }
];

export type MiddleSchoolLevel = '1ac' | '2ac' | '3ac' | 'lycee';

export interface LevelInfo {
  key: MiddleSchoolLevel;
  label: string;
  labelAr: string;
  shortLabel: string;
  cycle: 'college' | 'lycee';
}

export const EPS_MIDDLE_SCHOOL_LEVELS: LevelInfo[] = [
  { key: '1ac', label: 'الأولى إعدادي (1AC)', labelAr: 'الأولى إعدادي (1AC)', shortLabel: '1AC', cycle: 'college' },
  { key: '2ac', label: 'الثانية إعدادي (2AC)', labelAr: 'الثانية إعدادي (2AC)', shortLabel: '2AC', cycle: 'college' },
  { key: '3ac', label: 'الثالثة إعدادي (3AC)', labelAr: 'الثالثة إعدادي (3AC)', shortLabel: '3AC', cycle: 'college' },
  { key: 'lycee', label: 'السلك الثانوي التأهيلي', labelAr: 'السلك الثانوي التأهيلي', shortLabel: 'تأهيلي', cycle: 'lycee' }
];

/**
 * Adapt the base 10-session progression specifically for 1AC, 2AC, or 3AC
 */
const adaptProgressionForGrade = (
  baseProgression: PedagogicalSessionGoal[],
  grade: MiddleSchoolLevel,
  sportName: string
): PedagogicalSessionGoal[] => {
  if (grade === 'lycee') {
    return baseProgression;
  }

  return baseProgression.map(s => {
    let title = s.titleAr;
    let motor = s.motorObjective;
    let cog = s.cognitiveObjective;
    let beh = s.behavioralObjective;

    if (grade === '1ac') {
      // 1AC: الاستكشاف والاستئناس والتوافق الأولي
      if (s.phase === 'diagnostic') {
        title = `[1AC] التقويم التشخيصي: استكشاف التوافق الحركي الأولي في ${sportName}`;
        motor = `استكشاف المكتسبات القبلية والقدرة على إنجاز الحركات الأساسية في ${sportName}.`;
        cog = `معرفة قواعد الأمن والسلامة الأساسية والحدود الميدانية للنشاط.`;
      } else if (s.seanceNumber === 2) {
        title = `[1AC] استئناس وضبط وضعيات البداية والتوازن الأساسي في ${sportName}`;
        motor = `اتخاذ وضعية انطلاق صحيحة ومستقرة تلائم البنية الجسدية للتلميذ(ة).`;
      } else if (s.seanceNumber === 3) {
        title = `[1AC] تنظيم تواتر الخطوات والحركات بإيقاع منتظم وبدون تشنج`;
        motor = `الحفاظ على وتيرة حركية متوازنة وتناسق الخطوات أو الضربات.`;
      } else if (s.seanceNumber === 4) {
        title = `[1AC] التنسيق الحركي العام والتحكم في التنفس السليم أثناء النشاط`;
        motor = `التوافق بين حركة الأطراف العلوية والسفلية دون استنزاف سريع للجهد.`;
      } else if (s.seanceNumber === 5) {
        title = `[1AC] تنمية السرعة والتدرج الحركي في مسار مستقيم ومحدد`;
        motor = `بذل مجهود حركي سريع ومتواصل على مسافة محددة بأمان تام.`;
      } else if (s.seanceNumber === 6) {
        title = `[1AC] الحفاظ على الاتجاه ومسار الحركة واحترام مساحة الزملاء`;
        motor = `التحكم في مسار الجسم أو الكرة وتفادي الاصطدامات.`;
      } else if (s.seanceNumber === 7) {
        title = `[1AC] الربط الحركي الأساسي والتعاون الإيجابي مع أفراد الفوج`;
        motor = `إنجاز متتاليات حركية متتابعة بروح الفريق.`;
      } else if (s.seanceNumber === 8) {
        title = `[1AC] ألعاب ومنافسات مصغرة مع احترام القوانين الأولية للعبة`;
        motor = `تطبيق المهارات المكتسبة في وضعية لعب أو سباق بسيط.`;
        beh = `احترام الزملاء والمنافسين وتقبل قرارات التحكيم التربوي.`;
      } else if (s.seanceNumber === 9) {
        title = `[1AC] إدماج وتقويم تكويني ومعالجة التعثرات الفردية`;
        motor = `إعادة تكرار وتصحيح الحركات المتعثرة وتثبيت المكتسبات.`;
      } else if (s.seanceNumber === 10) {
        title = `[1AC] تقويم تحصيلي إجمالي وبناء الثقة في النفس والإنجاز`;
        motor = `تحقيق إنجاز رياضي مشجع ومسجل رسمياً يعكس تطور التلميذ(ة).`;
        cog = `الوعي بالمستوى المحقق ونقاط القوة المكتسبة خلال الدورة.`;
      }
    } else if (grade === '2ac') {
      // 2AC: التطوير والربط والفعالية الحركية والتكتيكية
      if (s.phase === 'diagnostic') {
        title = `[2AC] التقويم التشخيصي: قياس الفعالية الحركية وسرعة رد الفعل في ${sportName}`;
        motor = `قياس المؤشرات البدنية والتقنية والمقارنة بالمكتسبات السابقة.`;
        cog = `فهم معايير الفعالية المهارية وشروط النجاح.`;
      } else if (s.seanceNumber === 2) {
        title = `[2AC] تحسين سرعة الاستجابة والتمركز السليم والانطلاق الفعال`;
        motor = `رد فعل فوري مع الإشارة واستغلال أمثل لمساحة التحرك.`;
      } else if (s.seanceNumber === 3) {
        title = `[2AC] تطوير سعة وتردد الحركات وتناسقها الديناميكي`;
        motor = `الجمع بين سعة الحركة وسرعة التردد الحركي بكفاءة.`;
      } else if (s.seanceNumber === 4) {
        title = `[2AC] الربط الحركي والانتقال السلس والفعال بين المراحل الفنية`;
        motor = `ربط مرحلة البداية بالتسارع أو التمرير بالتسديد بسلاسة.`;
      } else if (s.seanceNumber === 5) {
        title = `[2AC] الرفع من سرعة ودقة الإنجاز تحت الضغط الزمني`;
        motor = `تنفيذ المهارات التقنية بالسرعة القصوى دون فقدان التوازن.`;
      } else if (s.seanceNumber === 6) {
        title = `[2AC] تدبير المجهود البدني ومقاومة التباطؤ قبل الوصول`;
        motor = `الحفاظ على الفعالية المهارية والبدنية حتى نهاية المسافة/الحصة.`;
      } else if (s.seanceNumber === 7) {
        title = `[2AC] الجمع بين السرعة والدقة في الأداء التكتيكي والمهاري`;
        motor = `إنجاز خيارات حركية وتكتيكية صائبة أثناء المواجهة.`;
      } else if (s.seanceNumber === 8) {
        title = `[2AC] وضعيات لعب ومنافسات متقدمة وتحدي الأقران بروح رياضية`;
        motor = `استثمار الخطط والمهارات في مواجهات ثنائية أو جماعية متكافئة.`;
      } else if (s.seanceNumber === 9) {
        title = `[2AC] إدماج المكتسبات والتعديل الذاتي والتكتيكي الموجه`;
        motor = `معالجة الأخطاء الشائعة وتحسين مؤشرات الأداء الفردي والجماعي.`;
      } else if (s.seanceNumber === 10) {
        title = `[2AC] تقويم تحصيلي إجمالي ومقارنة النتائج بالتطور المحقق`;
        motor = `تحقيق أفضل علامة ممكنة في الاختبار النهائي المنظم.`;
      }
    } else if (grade === '3ac') {
      // 3AC: الإتقان والتحكم التام والتحكيم والإعداد للإشهاد
      if (s.phase === 'diagnostic') {
        title = `[3AC] التقويم التشخيصي الشامل وفق معايير الامتحان الموحد لـ ${sportName}`;
        motor = `قياس المستوى التقني والرقمي وفق سلم التنقيط المعتمد رسمياً.`;
        cog = `معرفة تفاصيل شبكة التنقيط (حركي، معرفي، وسلوكي) المعتمدة في الامتحان.`;
      } else if (s.seanceNumber === 2) {
        title = `[3AC] الفعالية القصوى في الانطلاق واستثمار أقصى قوة دفع ديناميكية`;
        motor = `اندفاع انفجاري مثالي وتحويل القوة إلى سرعة أو وثب فعال.`;
      } else if (s.seanceNumber === 3) {
        title = `[3AC] التسارع الأقصى والتنسيق الديناميكي النموذجي المتقن`;
        motor = `بلوغ السرعة القصوى بأقل عدد من الخطوات/الحركات الترددية.`;
      } else if (s.seanceNumber === 4) {
        title = `[3AC] التنسيق الحركي الدقيق واقتصاد الطاقة أثناء بذل الجهد`;
        motor = `أداء حركي انسيابي وتفادي أي حركات زائدة أو عشوائية.`;
      } else if (s.seanceNumber === 5) {
        title = `[3AC] بلوغ الأداء المثالي والمحافظة على السرعة والدقة بثبات`;
        motor = `الحفاظ على أقصى فعالية مهارية ورياضية تحت أقصى شدة.`;
      } else if (s.seanceNumber === 6) {
        title = `[3AC] مقاومة التعب والتركيز الذهني والانضباط تحت ضغط المنافسة`;
        motor = `إنهاء السباق/الحركة بكامل القوة ودون أي تراخ قبل خط النهاية.`;
      } else if (s.seanceNumber === 7) {
        title = `[3AC] النجاعة التكتيكية وتطبيق قواعد التحكيم الرسمي المستقل`;
        motor = `اتخاذ قرارات تكتيكية سريعة وحاسمة في المواقف الصعبة.`;
        cog = `الإلمام الدقيق بقوانين التحكيم وشروط احتساب المحاولات الصحيحة.`;
      } else if (s.seanceNumber === 8) {
        title = `[3AC] محاكاة وضعيات الامتحان الموحد الرسمي والتحكيم الذاتي للأقران`;
        motor = `إنجاز المحاولات في ظروف مشابهة للامتحان النهائي الرسمي.`;
        beh = `التحلي بالصرامة والنزاهة والانضباط التام في التحكيم والملاحظة.`;
      } else if (s.seanceNumber === 9) {
        title = `[3AC] إدماج نهائي واستراتيجيات تحسين الإنجاز الشخصي والرقمي`;
        motor = `تثبيت التفاصيل التقنية الدقيقة قبل الاختبار الإشهادي النهائي.`;
      } else if (s.seanceNumber === 10) {
        title = `[3AC] تقويم تحصيلي إشهادي نهائي معتمد وفق شبكة التنقيط الرسمية (20/20)`;
        motor = `تحقيق الإنجاز الرقمي والتقني المستهدف وفق السلم الوزاري الرسمي.`;
        cog = `القدرة على تقييم الإنجاز الشخصي وتحليل أسباب النجاح.`;
      }
    }

    return {
      ...s,
      titleAr: title,
      motorObjective: motor,
      cognitiveObjective: cog,
      behavioralObjective: beh
    };
  });
};

/**
 * Helper to retrieve the 10 pedagogical sessions according to sport and educational level
 * Specifically differentiates: 1AC (أولى إعدادي), 2AC (ثانية إعدادي), 3AC (ثالثة إعدادي), and Lycée
 */
export const getTenSessionsProgression = (
  sportQuery: string,
  levelKey: string = '1ac'
): { 
  progression: PedagogicalSessionGoal[]; 
  sportMeta: SportProgression;
  detectedLevelKey: MiddleSchoolLevel;
  levelLabelAr: string;
} => {
  const norm = (sportQuery || '').toLowerCase().trim();
  
  // Find matching sport
  let found = MOROCCAN_EPS_SPORTS.find(s => 
    norm.includes(s.sportKey) ||
    norm.includes(s.sportNameAr) ||
    s.sportNameAr.includes(norm) ||
    norm.includes(s.sportNameFr.toLowerCase())
  );

  // Fallbacks by keywords
  if (!found) {
    if (norm.includes('سلة') || norm.includes('basket')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'basketball');
    else if (norm.includes('يد') || norm.includes('hand')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'handball');
    else if (norm.includes('قدم') || norm.includes('football')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'football');
    else if (norm.includes('طائرة') || norm.includes('volley')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'volleyball');
    else if (norm.includes('جلة') || norm.includes('poids') || norm.includes('lancer')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'lancer_poids');
    else if (norm.includes('جمباز') || norm.includes('gym')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'gymnastique');
    else if (norm.includes('وثب') || norm.includes('طولي') || norm.includes('saut')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'saut_longueur');
    else if (norm.includes('سرعة') || norm.includes('جري') || norm.includes('vitesse')) found = MOROCCAN_EPS_SPORTS.find(s => s.sportKey === 'vitesse');
  }

  // Default to Vitesse if still not found
  const targetSport = found || MOROCCAN_EPS_SPORTS[0];

  // Determine granular middle school level: 1ac vs 2ac vs 3ac vs lycee
  const cleanLvl = (levelKey || '').toLowerCase().replace(/\s+/g, '');
  let detectedLevelKey: MiddleSchoolLevel = '1ac';
  let levelLabelAr = 'السنة الأولى إعدادي (1AC)';

  if (cleanLvl.includes('tc') || cleanLvl.includes('1bac') || cleanLvl.includes('2bac') || cleanLvl.includes('تأهيلي') || cleanLvl.includes('ثانوي') || cleanLvl.includes('باك') || cleanLvl.includes('جذع')) {
    detectedLevelKey = 'lycee';
    levelLabelAr = 'السلك الثانوي التأهيلي';
  } else if (cleanLvl.includes('3ac') || cleanLvl.includes('3apic') || cleanLvl.includes('ثالثة') || cleanLvl.includes('3/')) {
    detectedLevelKey = '3ac';
    levelLabelAr = 'السنة الثالثة إعدادي (3AC)';
  } else if (cleanLvl.includes('2ac') || cleanLvl.includes('2apic') || cleanLvl.includes('ثانية') || cleanLvl.includes('2/')) {
    detectedLevelKey = '2ac';
    levelLabelAr = 'السنة الثانية إعدادي (2AC)';
  } else {
    // Default to 1AC (الأولى إعدادي)
    detectedLevelKey = '1ac';
    levelLabelAr = 'السنة الأولى إعدادي (1AC)';
  }

  const baseList = detectedLevelKey === 'lycee' ? targetSport.levels.lycee : targetSport.levels.college;
  const progression = adaptProgressionForGrade(baseList, detectedLevelKey, targetSport.sportNameAr);

  return { progression, sportMeta: targetSport, detectedLevelKey, levelLabelAr };
};

