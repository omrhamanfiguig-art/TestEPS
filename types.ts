// Fix: Define all shared types for the application.
export type TestState = 'idle' | 'running' | 'finished';

export interface LucLegerLevel {
  palier: number;
  vitesse: number;
  vma: number;
  dureePalier: number;
  distanceNavette: number;
  tempsNavette: number;
}

export interface StudentIdentity {
  numeroEleve: string;
  nomEleve: string;
  sexe?: 'M' | 'F';
  photoUrl?: string; // base64 or URL
  orderIndex?: number;
  codeMassar?: string;
  dateNaissance?: string;
}

export interface StudentResult {
  id: number;
  numeroEleve: string;
  nomEleve?: string;
  sexe?: 'M' | 'F';
  palierAtteint: number;
  vitesseMoyenne: number;
  vma: number;
  distanceParcourue?: number;
  date: string;
}

export interface AffinityGroup {
  name: string; // e.g., "Groupe 1"
  students: StudentResult[];
  vmaMoyenne: number;
  ecartType: number; // Écart-type (الانحراف المعياري)
  vmaRange: string; // e.g., "14.8 - 16.3"
  coefficientVariation?: number; // CV% (معامل التغير)
}

export interface PhysicalTests {
  id?: number;
  className?: string;
  numeroEleve: string;
  nomEleve?: string;
  sexe?: 'M' | 'F';
  photoUrl?: string;
  vma?: number;
  vitesse30m?: number;
  vitesse60m?: number;
  vitesse80m?: number;
  vitesse100m?: number;
  vitesseRelay?: number;
  sautHorizontal?: number;
  sautVertical?: number;
  lancerMedball?: number;
  lancerPoids?: number;
  sautLong?: number;
  sautLongAttempts?: number[];
  lancerPoidsAttempts?: number[];
  sautHorizontalAttempts?: number[];
  lancerMedballAttempts?: number[];
  vitesseDist?: number;
  enduranceDist?: number;
  enduranceTemps?: number;
  scoreVitesse?: number; // legacy general or 30m
  scoreVitesse30m?: number; // نقطة سباق 30 م مستقلة
  scoreVitesse60m?: number; // نقطة سباق 60 م مستقلة
  scoreVitesse80m?: number; // نقطة سباق 80 م مستقلة
  scoreVitesse100m?: number; // نقطة سباق 100 م مستقلة
  scoreEndurance?: number;
  scoreRelay?: number;
  scoreSautLong?: number;
  scoreLancerPoids?: number;
  scoreSautHorizontal?: number;
  scoreSautVertical?: number;
  scoreMedball?: number;
  scoreSouplesse?: number;
  scoreEquilibre?: number;
  souplesse?: number;
  souplesseAssis?: number;
  souplesseDebout?: number;
  equilibreStatique?: number;
  poids?: number;
  taille?: number;
  frequenceCardiaque?: number;
  sportCollectifScore?: number;
  sportCollectifName?: string;
  sportCollectifNote?: string;
  noteMotrice?: number;
  noteComportement?: number;
  noteCognitive?: number;

  // Team Games specific detailed grading (Moroccan standards: Individual tech /6 + Collective play)
  sportColTechIndiv?: number; // التقنية الفردية (أقصى 6)
  sportColCollectif?: number; // اللعب الجماعي (المتبقي من الحركي: 1AC=8, 2AC=7, 3AC=6)
  sportColComportement?: number; // الجانب السلوكي للألعاب الجماعية
  sportColCognitive?: number; // الجانب المعرفي للألعاب الجماعية

  // Independent evaluations per specific sport / activity (e.g. basketball, handball, football, etc.)
  sportActivities?: Record<string, SportActivityEvaluation>;

  // Gymnastique (الجمباز) specific scoring fields (Moroccan standards)
  gymDiffCountA?: number; // عدد صعوبات أ المنجزة
  gymDiffCountB?: number; // عدد صعوبات ب المنجزة
  gymDiffCountC?: number; // عدد صعوبات ج المنجزة
  gymScoreDifficultes?: number; // نقطة الصعوبة الإجمالية (أقصى 6 ن)
  gymScoreExigences?: number; // نقطة المتطلبات الخاصة (أقصى 1.5 ن)
  gymScoreEnchainement?: number; // نقطة جودة الربط والتركيب (أقصى 4.5 ن أو 3.5 ن أو 2.5 ن)
  gymScoreExecution?: number; // نقطة الأداء والتنفيذ (أقصى 2 ن)
  gymExecutionFaultsPetite?: number; // أخطاء طفيفة (-0.1 لكل خطأ)
  gymExecutionFaultsMoyenne?: number; // أخطاء متوسطة (-0.2 لكل خطأ)
  gymExecutionFaultsGrossiere?: number; // أخطاء جسيمة (-0.3 لكل خطأ)
  gymExecutionFaultsChutes?: number; // سقطات (-0.5 لكل سقطة)
  gymNoteMotrice?: number; // النقطة الحركية للجمباز (مجموع الصعوبات والتركيب والأداء - أقصى 14 ن أو 13 ن أو 12 ن)
  gymNoteComportement?: number; // النقطة السلوكية للجمباز
  gymNoteCognitive?: number; // النقطة المعرفية للجمباز
  gymScoreTotal?: number; // النقطة الإجمالية لرياضة الجمباز من 20 ن
  gymNoteObservation?: string; // ملاحظات الجمباز الخاصة بكل تلميذ
  date?: string;
}

export interface EnduranceResult {
  numeroEleve: string;
  nomEleve?: string;
  vma: number;
  groupName: string;
  distance: number;
  tempsSecondes: number;
  vitesseMoyenneKmh: number;
  date: string;
}

export interface ArchiveRecord {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  classCount: number;
  studentCount: number;
  data: {
    classes: { className: string; students: StudentIdentity[] }[];
    physicalTests: { className: string; results: PhysicalTests[] }[];
    vmaResults: { className: string; results: StudentResult[] }[];
  };
}

export type AttendanceStatus = 'present' | 'absent' | 'justified' | 'late' | 'no-kit';

export interface AttendanceRecord {
  studentNumber: string;
  status: AttendanceStatus;
  note?: string;
}

export interface AttendanceSession {
  id: string;
  className: string;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "08:00 - 10:00"
  topic?: string;
  sessionGoal?: string; // هدف الحصة (البيداغوجي / التعليمي)
  sessionNumber?: string; // رقم الحصة (مثال: الحصة الأولى، الحصة الثانية، إلخ)
  records: AttendanceRecord[];
  summary: {
    total: number;
    present: number;
    absent: number;
    justified: number;
    late: number;
    noKit: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TextbookSession {
  id: string;
  sessionNumber: string; // الحصة (مثال: الحصة 1)
  goal: string; // هدفها
  className: string; // القسم
  date: string; // التاريخ
  timeSlot: string; // التوقيت
  createdAt: string;
  updatedAt: string;
}

export interface ChampionshipRegistration {
  id: string; // Unique ID (e.g., championshipType_className_numeroEleve)
  className: string;
  numeroEleve: string;
  nomEleve: string;
  sexe: 'M' | 'F';
  dateNaissance?: string; // Date of birth
  championshipType: 'cross_country' | 'athletics' | 'football'; // نوع البطولة
  sportCollectifRole?: string; // e.g. "مدافع", "حارس مرمى", "مهاجم" for football or "100m", "دفع الجلة" for athletics
  note?: string;
  photoUrl?: string;
  createdAt: string;
}

export type ReportCaseType = 
  | 'medical_exemption' // إعفاء طبي
  | 'behavior' // ملاحظة سلوكية / انضباط
  | 'outstanding_talent' // موهبة وتفوق
  | 'injury' // إصابة رياضية
  | 'absence_warning' // إنذار غياب متكرر
  | 'observation' // ملاحظة بيداغوجية عامة
  | 'other'; // أخرى

export interface PedagogicalReport {
  id: string;
  className: string;
  studentNumber: string;
  studentName?: string;
  date: string; // YYYY-MM-DD
  caseType: ReportCaseType;
  title: string;
  details: string;
  actionTaken?: string;
  severity?: 'low' | 'medium' | 'high';
  doctorName?: string; // For medical exemptions
  exemptionStartDate?: string;
  exemptionEndDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssociationTransaction {
  id: string;
  type: 'revenue' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
  receiptNumber?: string;
  createdAt: string;
}

export interface AssociationReport {
  id: string;
  title: string;
  type: 'moral' | 'financial';
  content: string;
  period: string;
  imageUrl?: string;
  createdAt: string;
}

// Independent sport evaluation for team games & specific activities
export interface SportActivityEvaluation {
  sportId: string;
  sportName?: string;
  techIndiv?: number; // التقنية الفردية (أقصى 6)
  collectif?: number; // اللعب الجماعي (المتبقي من الحركي)
  motrice?: number; // مجموع الحركي
  comportement?: number; // الجانب السلوكي
  cognitive?: number; // الجانب المعرفي
  totalScore?: number; // النقطة الإجمالية من 20
  observation?: string; // ملاحظات بيداغوجية
  date?: string;
}

// Massar (مسار) types
export type MassarActivityKey =
  | 'sport_collectif'
  | 'football'
  | 'basketball'
  | 'handball'
  | 'volleyball'
  | 'rugby'
  | 'gymnastique'
  | 'vitesse'
  | 'vitesse_30m'
  | 'vitesse_60m'
  | 'vitesse_80m'
  | 'vitesse_100m'
  | 'endurance'
  | 'saut_long'
  | 'lancer_poids'
  | 'lancer_medball'
  | 'saut_vertical'
  | 'souplesse'
  | 'global_general';

export interface MassarGradeRecord {
  numeroEleve: string;
  codeMassar?: string;
  nomEleve: string;
  sexe?: 'M' | 'F';
  dateNaissance?: string;
  noteDevoir1: number | null; // الفرض 1 (/20)
  noteDevoir2: number | null; // الفرض 2 (/20)
  noteDevoir3: number | null; // الفرض 3 (/20)
  isDispense?: boolean;       // معفى طبياً
  isAbsent?: boolean;         // غائب
  remarque?: string;          // ملاحظات الأستاذ
}

export interface MassarClassConfig {
  className: string;
  activity1: MassarActivityKey;
  activity2: MassarActivityKey;
  activity3: MassarActivityKey;
  activity1CustomLabel?: string;
  activity2CustomLabel?: string;
  activity3CustomLabel?: string;
  semestre: '1' | '2';
  schoolYear: string;
  schoolName?: string;
  direction?: string;
  academie?: string;
  teacherName?: string;
  rounding: 'none' | '0.25' | '0.5' | '1';
}


