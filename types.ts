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
  vitesseDist?: number;
  enduranceDist?: number;
  enduranceTemps?: number;
  scoreVitesse?: number;
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

