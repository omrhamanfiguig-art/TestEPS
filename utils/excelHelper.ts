import { StudentIdentity, PhysicalTests, StudentResult } from '../types';
import { getPhysicalTests, getStudentList, getVmaResults } from './db';
import { detectGenderFromName } from './genderHelper';

/**
 * Normalizes Arabic text by removing diacritics, normalizing Alef variants, 
 * Taa Marbuta, Alif Maqsura, Tatweel, and trimming excess whitespace.
 */
export const normalizeArabic = (text: any): string => {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove tashkeel/harakat
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // أ, إ, آ, ٱ -> ا
    .replace(/\u0629/g, '\u0647') // ة -> ه
    .replace(/\u0649/g, '\u064A') // ى -> ي
    .replace(/\u0640/g, '') // tatweel
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Metadata keywords and phrases from Massar / School headers that should NEVER be treated as student names.
 */
const FORBIDDEN_STUDENT_NAMES_RAW = [
  'تغيب',
  'التغيب',
  'تغيبات',
  'التغيبات',
  'غياب',
  'الغياب',
  'غيابات',
  'الغيابات',
  'عدد الغيابات',
  'ساعات التغيب',
  'مواظبة',
  'المواظبة',
  'السلوك',
  'سلوك',
  'absent',
  'absence',
  'absences',
  'نقط المراقبة المستمرة',
  'المراقبة المستمرة',
  'مراقبة مستمرة',
  'نقط المراقبة',
  'الفرض الاول',
  'الفرض الثاني',
  'الفرض الثالث',
  'الفرض الرابع',
  'الفرض 1',
  'الفرض 2',
  'الفرض 3',
  'الفرض 4',
  'الفرض',
  'فرض',
  'النقطة',
  'نقطة',
  'نقط',
  'نقطة التلميذ',
  'ملاحظات الاستاذ',
  'ملاحظات الأستاذ',
  'ملاحظات',
  'ملاحظة',
  'اكاديمية',
  'الأكاديمية',
  'الشرق',
  'مديرية',
  'المديرية',
  'اقليمية',
  'الإقليمية',
  'ثانوية',
  'اعدادية',
  'إعدادية',
  'مؤسسة',
  'المؤسسة',
  'المستوى',
  'الدورة الاولى',
  'الدورة الثانية',
  'الدورة',
  'السنة الدراسية',
  'المادة',
  'التربية البدنية',
  'الاستاذ',
  'الأستاذ',
  'المجموع',
  'المعدل',
  'توقيع',
  'الترتيب',
  'الرقم الترتيبي',
  'رمز مسار',
  'رقم مسار',
  'كود مسار',
  'اسم التلميذ',
  'إسم التلميذ',
  'الاسم والنسب',
  'الاسم الكامل',
  'تاريخ الازدياد',
  'تاريخ الإزدياد',
  'النوع',
  'الجنس',
  'total',
  'moyenne',
  'signature',
  'bulletin',
  'releve',
  'note',
  'bareme',
  'ministere',
  'royaume',
  'academie',
  'direction'
];

const FORBIDDEN_STUDENT_NAMES_NORMALIZED = FORBIDDEN_STUDENT_NAMES_RAW.map(kw => normalizeArabic(kw));

export const isForbiddenStudentName = (name: string): boolean => {
  if (!name) return true;
  const norm = normalizeArabic(name);
  if (!norm || norm.length < 2) return true;
  
  // Check if it's a UUID (e.g. c98574ed-67f1-4e60...)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(norm)) return true;
  
  // Check if it's only digits, single characters or punctuation
  if (/^[\d\s\-_.,/\\:;*#~!?+()]+$/.test(norm)) return true;
  if (norm.length <= 1) return true;

  // Direct strict words
  if (
    norm === 'نقطه' || 
    norm === 'النقطه' || 
    norm === 'نقط' || 
    norm === 'فرض' || 
    norm === 'الفرض' || 
    norm === 'ملاحظه' || 
    norm === 'ملاحظات' || 
    norm === 'اسم' || 
    norm === 'الاسم' || 
    norm === 'نسب' || 
    norm === 'النسب' ||
    norm === 'تلميذ' ||
    norm === 'التلميذ' ||
    norm === 'تغيب' ||
    norm === 'التغيب' ||
    norm === 'غياب' ||
    norm === 'الغياب' ||
    norm === 'تغيبات' ||
    norm === 'التغيبات' ||
    norm === 'غيابات' ||
    norm === 'الغيابات' ||
    norm === 'مواظبه' ||
    norm === 'المواظبه' ||
    norm === 'سلوك' ||
    norm === 'السلوك'
  ) {
    return true;
  }

  return FORBIDDEN_STUDENT_NAMES_NORMALIZED.some(kw => norm.includes(kw) || (norm.length >= 3 && kw.includes(norm)));
};

/**
 * Parses an Excel file (from Moutamad/Massar export) and extracts student information.
 * Supports multiple sheets and robustly parses Moroccan Massar formats.
 */
export const parseStudentExcel = (data: ArrayBuffer): { students: StudentIdentity[], className: string }[] => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("La bibliothèque XLSX n'est pas chargée.");
  }

  const workbook = XLSX.read(data, { type: 'array' });
  const resultsMap = new Map<string, StudentIdentity[]>();

  workbook.SheetNames.forEach((sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (!json || json.length === 0) return;

    let defaultClassName = sheetName; // Default to sheet name
    
    // Search for Class Name in top 15 rows
    for (let i = 0; i < Math.min(json.length, 15); i++) {
      const row = json[i];
      if (!row) continue;
      for (let j = 0; j < row.length; j++) {
        const val = String(row[j] || '').trim();
        const normVal = normalizeArabic(val);
        if (normVal.includes('القسم') && !normVal.includes('اسم التلميذ')) {
          const cleaned = val.replace(/القسم\s*[:：]/g, '').trim();
          if (cleaned && cleaned.length > 0 && !cleaned.includes('المستوى') && !cleaned.includes('الأستاذ') && !cleaned.includes('المؤسسة')) {
            defaultClassName = cleaned;
          } else {
            // Check adjacent cells (e.g. j+1, j+2, j+3) in the same row
            for (let offset = 1; offset <= 4; offset++) {
              const candidate = String(row[j + offset] || '').trim();
              if (candidate && candidate.length > 0 && !candidate.includes(':') && !candidate.includes('الأستاذ') && !candidate.includes('المستوى') && !candidate.includes('المؤسسة')) {
                defaultClassName = candidate;
                break;
              }
            }
          }
          break;
        } else if (normVal.includes('classe') && !normVal.includes('eleve')) {
          const cleaned = val.replace(/classe\s*[:：]/gi, '').trim();
          if (cleaned && cleaned.length > 0) {
            defaultClassName = cleaned;
          } else {
            for (let offset = 1; offset <= 4; offset++) {
              const candidate = String(row[j + offset] || '').trim();
              if (candidate && candidate.length > 0 && !candidate.includes(':')) {
                defaultClassName = candidate;
                break;
              }
            }
          }
          break;
        }
      }
      if (defaultClassName !== sheetName) break;
    }

    // Now find the best student header row
    let bestHeaderRowIndex = -1;
    let maxHeaderScore = 0;
    let colMap = {
      idCol: -1,
      massarCol: -1,
      nameCol: -1,
      sexCol: -1,
      classCol: -1,
      dobCol: -1
    };

    for (let r = 0; r < Math.min(json.length, 35); r++) {
      const row = json[r];
      if (!row || row.length === 0) continue;

      let score = 0;
      let idIdx = -1;
      let massarIdx = -1;
      let nameIdx = -1;
      let sexIdx = -1;
      let classIdx = -1;
      let dobIdx = -1;

      for (let c = 0; c < row.length; c++) {
        const cellRaw = String(row[c] || '').trim();
        const cellNorm = normalizeArabic(cellRaw);
        if (!cellNorm) continue;

        // Massar Code / ID
        if (
          cellNorm.includes('رقم التلميذ') || 
          cellNorm.includes('رقم مسار') || 
          cellNorm.includes('رمز مسار') || 
          cellNorm.includes('كود مسار') || 
          cellNorm.includes('code massar') || 
          cellNorm.includes('cne') ||
          cellNorm.includes('matricule')
        ) {
          massarIdx = c;
          score += 5;
        } else if (
          cellNorm.includes('الترتيبي') || 
          cellNorm === 'n°' || 
          cellNorm === 'no' || 
          cellNorm === 'num' || 
          cellNorm === 'numero' || 
          cellNorm === 'id' ||
          cellNorm === 'رقم'
        ) {
          idIdx = c;
          score += 3;
        } 
        
        // Student Name (handles إسم التلميذ, اسم التلميذ, الاسم والنسب, Nom, etc.)
        if (
          cellNorm.includes('اسم التلميذ') || 
          cellNorm.includes('الاسم والنسب') || 
          cellNorm.includes('اسم و نسب') || 
          cellNorm.includes('الاسم الكامل') || 
          cellNorm.includes('اسم الطالب') ||
          cellNorm.includes('nom') || 
          cellNorm.includes('prenom') || 
          cellNorm.includes('eleve') ||
          cellNorm.includes('etudiant')
        ) {
          if (!cellNorm.includes('مؤسسة') && !cellNorm.includes('استاذ') && !cellNorm.includes('مدير') && !cellNorm.includes('مادة')) {
            nameIdx = c;
            score += 5;
          }
        } else if ((cellNorm.includes('اسم') || cellNorm.includes('نسب')) && !cellNorm.includes('مؤسسة') && !cellNorm.includes('استاذ') && !cellNorm.includes('مادة') && !cellNorm.includes('قسم')) {
          nameIdx = c;
          score += 3;
        }

        // Gender
        if (
          cellNorm.includes('النوع') || 
          cellNorm.includes('الجنس') || 
          cellNorm.includes('sexe') || 
          cellNorm.includes('genre') || 
          cellNorm.includes('sex') ||
          cellNorm.includes('gender')
        ) {
          sexIdx = c;
          score += 3;
        }

        // Date of Birth
        if (
          cellNorm.includes('تاريخ الازدياد') ||
          cellNorm.includes('تاريخ الميلاد') ||
          cellNorm.includes('naissance') ||
          cellNorm.includes('dob')
        ) {
          dobIdx = c;
          score += 2;
        }

        // Class
        if ((cellNorm.includes('القسم') || cellNorm.includes('classe') || cellNorm.includes('groupe')) && !cellNorm.includes('اسم')) {
          classIdx = c;
          score += 1;
        }
      }

      // If this row has both an ID/Massar column and a Name column, it's a confirmed table header!
      if ((idIdx !== -1 || massarIdx !== -1) && nameIdx !== -1 && score > maxHeaderScore) {
        maxHeaderScore = score;
        bestHeaderRowIndex = r;
        colMap = {
          idCol: idIdx !== -1 ? idIdx : massarIdx,
          massarCol: massarIdx !== -1 ? massarIdx : idIdx,
          nameCol: nameIdx,
          sexCol: sexIdx,
          classCol: classIdx,
          dobCol: dobIdx
        };
      }
    }

    let startRow = 0;
    if (bestHeaderRowIndex !== -1) {
      startRow = bestHeaderRowIndex + 1;
    } else {
      // Fallback: search for first row that looks like student data (has a Massar code or full name)
      for (let r = 0; r < Math.min(json.length, 25); r++) {
        const row = json[r];
        if (!row) continue;
        const rowStr = row.join(' ');
        if (/[A-Z][0-9]{8,9}/i.test(rowStr) || (row.length >= 2 && !isForbiddenStudentName(String(row[1] || '')))) {
          startRow = r;
          break;
        }
      }
      colMap = {
        idCol: 0,
        massarCol: 0,
        nameCol: 1,
        sexCol: 2,
        classCol: -1,
        dobCol: -1
      };
    }

    let autoCounter = 1;

    for (let i = startRow; i < json.length; i++) {
      const row = json[i];
      if (!row || row.length === 0) continue;

      // Extract raw values
      let id = colMap.idCol !== -1 && row[colMap.idCol] !== undefined ? String(row[colMap.idCol]).trim() : '';
      let massarCode = colMap.massarCol !== -1 && row[colMap.massarCol] !== undefined ? String(row[colMap.massarCol]).trim() : '';
      let name = colMap.nameCol !== -1 && row[colMap.nameCol] !== undefined ? String(row[colMap.nameCol]).trim() : '';
      let sexRaw = colMap.sexCol !== -1 && row[colMap.sexCol] !== undefined ? String(row[colMap.sexCol]).trim() : '';

      // If name is empty, try scanning row for a valid non-empty text string that is not forbidden
      if (!name) {
        for (let c = 0; c < row.length; c++) {
          if (c !== colMap.idCol && c !== colMap.massarCol && c !== colMap.sexCol && c !== colMap.dobCol) {
            const cellVal = String(row[c] || '').trim();
            if (cellVal && cellVal.length >= 3 && isNaN(Number(cellVal)) && !isForbiddenStudentName(cellVal)) {
              name = cellVal;
              break;
            }
          }
        }
      }

      // Check for summary / footer / subheader rows
      if (isForbiddenStudentName(name)) {
        continue;
      }

      const combinedRowText = row.join(' ').toLowerCase();
      if (
        combinedRowText.includes('المجموع') || 
        combinedRowText.includes('total') || 
        combinedRowText.includes('moyenne') || 
        combinedRowText.includes('توقيع') || 
        combinedRowText.includes('signature') ||
        combinedRowText.includes('نقط المراقبة المستمرة')
      ) {
        continue;
      }

      // Ensure we have a valid ID (preferably Massar code like B168041098, or order number)
      let finalId = massarCode || id;
      if (!finalId || isForbiddenStudentName(finalId) || finalId.includes('رقم') || finalId.includes('code') || finalId === 'undefined' || finalId === 'null') {
        // Search the row for a Massar code pattern (e.g. B168041098)
        let foundCode = '';
        for (let c = 0; c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (/^[A-Za-z][0-9]{8,9}$/.test(val)) {
            foundCode = val;
            break;
          }
        }
        finalId = foundCode || String(autoCounter);
      }

      autoCounter++;

      // Determine Gender (Sexe)
      let sexe: 'M' | 'F' | undefined = undefined;
      if (sexRaw) {
        const s = sexRaw.toUpperCase();
        if (['M', 'H', 'GARCON', 'MASCULIN', 'G', 'ذكر', '1'].some(k => s.startsWith(k))) {
          sexe = 'M';
        } else if (['F', 'FILLE', 'FEMININ', 'FEMME', 'أنثى', 'انثى', '2'].some(k => s.startsWith(k))) {
          sexe = 'F';
        }
      }

      // Fallback: Automatic gender detection from Arabic/French name
      if (!sexe && name) {
        sexe = detectGenderFromName(name);
      }

      let rowClass = defaultClassName;
      if (colMap.classCol !== -1 && row[colMap.classCol]) {
        const customClass = String(row[colMap.classCol]).trim();
        if (customClass && customClass.length > 0 && !customClass.includes('القسم') && !isForbiddenStudentName(customClass)) {
          rowClass = customClass;
        }
      }

      const studentObj: StudentIdentity = {
        numeroEleve: finalId,
        nomEleve: name,
        sexe
      };

      if (!resultsMap.has(rowClass)) {
        resultsMap.set(rowClass, []);
      }
      const currentList = resultsMap.get(rowClass)!;
      currentList.push(studentObj);
    }
  });

  const results: { className: string, students: StudentIdentity[] }[] = [];
  resultsMap.forEach((students, className) => {
    if (students.length > 0) {
      results.push({ className, students });
    }
  });

  return results;
};

/**
 * Parses a numeric value safely from Excel cell (handling strings with commas, numbers, etc.)
 */
const parseNumericCell = (val: any): number | undefined => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'number') return isNaN(val) ? undefined : Number(val.toFixed(2));
  const cleanStr = String(val).replace(',', '.').replace(/[^\d.-]/g, '').trim();
  const num = parseFloat(cleanStr);
  return isNaN(num) ? undefined : Number(num.toFixed(2));
};

/**
 * Normalizes sex string to 'M' or 'F'
 */
const parseSexCell = (val: any): 'M' | 'F' | undefined => {
  if (!val) return undefined;
  const s = String(val).trim().toLowerCase();
  if (s.startsWith('m') || s.startsWith('g') || s.includes('ذكر') || s === '1') return 'M';
  if (s.startsWith('f') || s.includes('أنث') || s.includes('انث') || s === '2') return 'F';
  return undefined;
};

export interface ParsedPhysicalTestsData {
  results: PhysicalTests[];
  students: StudentIdentity[];
  className?: string;
  totalParsed: number;
  vmaCount: number;
}

/**
 * Parses an Excel or CSV file containing physical tests, student names, and VMA.
 */
export const parsePhysicalTestsExcel = (data: ArrayBuffer): ParsedPhysicalTestsData => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("لم يتم تحميل مكتبة قراءة ملفات Excel.");
  }

  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  if (!rows || rows.length === 0) {
    throw new Error("الملف فارغ أو لا يحتوي على بيانات.");
  }

  let className = '';
  // Search for class name in first 15 rows
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const row = rows[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      const val = String(row[j] || '').trim();
      if (val.includes('القسم') || val.toLowerCase().includes('classe')) {
        const extracted = val.replace(/القسم\s*:/g, '').replace(/classe\s*:/gi, '').trim();
        if (extracted && extracted.length > 1) {
          className = extracted;
          break;
        } else if (row[j + 1]) {
          className = String(row[j + 1]).trim();
          break;
        }
      }
    }
    if (className) break;
  }

  // Scan rows to find the table header row
  let headerRowIndex = -1;
  let colMap: { [key in keyof PhysicalTests]?: number } = {};

  for (let r = 0; r < Math.min(rows.length, 30); r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let matchedCount = 0;
    const tempMap: { [key in keyof PhysicalTests]?: number } = {};

    for (let c = 0; c < row.length; c++) {
      const cellRaw = String(row[c] || '').trim();
      const cellNorm = normalizeArabic(cellRaw);
      if (!cellNorm) continue;

      // VMA check first
      if (cellNorm.includes('vma') || cellNorm.includes('v.m.a') || cellNorm.includes('القصوى الهوائية')) {
        tempMap.vma = c;
        matchedCount++;
      } else if (
        cellNorm.includes('رقم التلميذ') ||
        cellNorm.includes('رمز مسار') ||
        cellNorm.includes('رقم مسار') ||
        cellNorm.includes('كود مسار') ||
        cellNorm.includes('cne') ||
        cellNorm.includes('matricule') ||
        cellNorm.includes('الترتيبي') ||
        cellNorm === 'n°' ||
        cellNorm === 'no' ||
        cellNorm === 'num' ||
        cellNorm === 'numero' ||
        cellNorm === 'id' ||
        cellNorm === 'رقم'
      ) {
        if (!cellNorm.includes('نبض') && !cellNorm.includes('قلب')) {
          tempMap.numeroEleve = c;
          matchedCount++;
        }
      } else if (
        cellNorm.includes('اسم التلميذ') ||
        cellNorm.includes('الاسم والنسب') ||
        cellNorm.includes('اسم و نسب') ||
        cellNorm.includes('الاسم الكامل') ||
        cellNorm.includes('nom') ||
        cellNorm.includes('prenom') ||
        cellNorm.includes('eleve') ||
        cellNorm.includes('etudiant') ||
        ((cellNorm.includes('اسم') || cellNorm.includes('نسب')) && !cellNorm.includes('مؤسسة') && !cellNorm.includes('استاذ') && !cellNorm.includes('مادة') && !cellNorm.includes('قسم'))
      ) {
        tempMap.nomEleve = c;
        matchedCount++;
      } else if (
        cellNorm.includes('جنس') ||
        cellNorm.includes('نوع') ||
        cellNorm.includes('sexe') ||
        cellNorm.includes('sex') ||
        cellNorm.includes('genre') ||
        cellNorm.includes('gender')
      ) {
        tempMap.sexe = c;
        matchedCount++;
      } else if (cellNorm.includes('30') || cellNorm.includes('سرعة') || cellNorm.includes('vitesse') || cellNorm.includes('sprint')) {
        tempMap.vitesse30m = c;
        matchedCount++;
      } else if (cellNorm.includes('رمي') || cellNorm.includes('كرة') || cellNorm.includes('طبي') || cellNorm.includes('lancer') || cellNorm.includes('medball') || cellNorm.includes('ballon')) {
        tempMap.lancerMedball = c;
        matchedCount++;
      } else if (cellNorm.includes('افقي') || cellNorm.includes('طولي') || cellNorm.includes('horizontal') || cellNorm.includes('longueur') || cellNorm.includes('long jump')) {
        tempMap.sautHorizontal = c;
        matchedCount++;
      } else if (cellNorm.includes('عمودي') || cellNorm.includes('ارتقاء') || cellNorm.includes('سارجنت') || cellNorm.includes('vertical') || cellNorm.includes('sargent') || cellNorm.includes('detente')) {
        tempMap.sautVertical = c;
        matchedCount++;
      } else if (cellNorm.includes('مرونة') || cellNorm.includes('مرونه') || cellNorm.includes('ليونة') || cellNorm.includes('souplesse') || cellNorm.includes('flexib')) {
        if (cellNorm.includes('جلس') || cellNorm.includes('جلوس') || cellNorm.includes('assis')) {
          tempMap.souplesseAssis = c;
        } else if (cellNorm.includes('وقف') || cellNorm.includes('وقوف') || cellNorm.includes('debout')) {
          tempMap.souplesseDebout = c;
        } else {
          if (tempMap.souplesseAssis === undefined) tempMap.souplesseAssis = c;
        }
        matchedCount++;
      } else if (cellNorm.includes('توازن') || cellNorm.includes('ثابت') || cellNorm.includes('equilibre') || cellNorm.includes('balance')) {
        tempMap.equilibreStatique = c;
        matchedCount++;
      } else if ((cellNorm.includes('وزن') || cellNorm.includes('poids') || cellNorm.includes('weight') || cellNorm.includes('masse')) && !cellNorm.includes('جلة') && !cellNorm.includes('lancer') && !cellNorm.includes('رمي')) {
        tempMap.poids = c;
        matchedCount++;
      } else if (cellNorm.includes('طول') || cellNorm.includes('قامة') || cellNorm.includes('قامه') || cellNorm.includes('taille') || cellNorm.includes('height')) {
        tempMap.taille = c;
        matchedCount++;
      } else if (cellNorm.includes('قلب') || cellNorm.includes('نبض') || cellNorm.includes('frequence') || cellNorm.includes('fc') || cellNorm.includes('bpm') || cellNorm.includes('cardiac')) {
        tempMap.frequenceCardiaque = c;
        matchedCount++;
      } else if (cellNorm.includes('تاريخ') || cellNorm.includes('date')) {
        tempMap.date = c;
        matchedCount++;
      }
    }

    // If we matched at least 2 relevant columns, we consider this the header row!
    if (matchedCount >= 2) {
      headerRowIndex = r;
      colMap = tempMap;
      break;
    }
  }

  // Fallback if no header recognized: assume standard positions
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
    colMap = {
      numeroEleve: 0,
      nomEleve: 1,
      sexe: 2,
      vma: 3,
      vitesse30m: 4,
      lancerMedball: 5,
      sautHorizontal: 6,
      sautVertical: 7,
      souplesseAssis: 8,
      poids: 9,
      taille: 10,
      frequenceCardiaque: 11
    };
  }

  const results: PhysicalTests[] = [];
  const students: StudentIdentity[] = [];
  let autoIdCounter = 1;
  let vmaCount = 0;

  for (let r = headerRowIndex + 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.length === 0) continue;

    let idRaw = colMap.numeroEleve !== undefined ? String(row[colMap.numeroEleve] || '').trim() : '';
    const nameRaw = colMap.nomEleve !== undefined ? String(row[colMap.nomEleve] || '').trim() : '';

    // Ignore summary / footer rows or metadata rows
    if (isForbiddenStudentName(nameRaw) || isForbiddenStudentName(idRaw)) {
      continue;
    }

    const rowText = row.join(' ').toLowerCase();
    if (rowText.includes('total') || rowText.includes('المجموع') || rowText.includes('المعدل') || rowText.includes('نقط المراقبة المستمرة')) {
      continue;
    }

    // If both ID and name are empty, check if any test data is present
    let hasAnyData = false;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== '' && row[c] !== undefined && row[c] !== null) {
        hasAnyData = true;
        break;
      }
    }
    if (!hasAnyData) continue;

    if (!idRaw) {
      if (nameRaw) {
        idRaw = String(autoIdCounter);
      } else {
        continue;
      }
    }

    autoIdCounter++;

    const studentName = nameRaw || `تلميذ ${idRaw}`;
    let studentSex = colMap.sexe !== undefined ? parseSexCell(row[colMap.sexe]) : undefined;
    if (!studentSex && studentName) {
      studentSex = detectGenderFromName(studentName);
    }
    const vmaVal = colMap.vma !== undefined ? parseNumericCell(row[colMap.vma]) : undefined;

    if (vmaVal !== undefined) {
      vmaCount++;
    }

    const testItem: PhysicalTests = {
      numeroEleve: idRaw,
      nomEleve: studentName,
      sexe: studentSex,
      vma: vmaVal,
      vitesse30m: colMap.vitesse30m !== undefined ? parseNumericCell(row[colMap.vitesse30m]) : undefined,
      sautHorizontal: colMap.sautHorizontal !== undefined ? parseNumericCell(row[colMap.sautHorizontal]) : undefined,
      sautVertical: colMap.sautVertical !== undefined ? parseNumericCell(row[colMap.sautVertical]) : undefined,
      lancerMedball: colMap.lancerMedball !== undefined ? parseNumericCell(row[colMap.lancerMedball]) : undefined,
      souplesseAssis: colMap.souplesseAssis !== undefined ? parseNumericCell(row[colMap.souplesseAssis]) : undefined,
      souplesseDebout: colMap.souplesseDebout !== undefined ? parseNumericCell(row[colMap.souplesseDebout]) : undefined,
      equilibreStatique: colMap.equilibreStatique !== undefined ? parseNumericCell(row[colMap.equilibreStatique]) : undefined,
      poids: colMap.poids !== undefined ? parseNumericCell(row[colMap.poids]) : undefined,
      taille: colMap.taille !== undefined ? parseNumericCell(row[colMap.taille]) : undefined,
      frequenceCardiaque: colMap.frequenceCardiaque !== undefined ? parseNumericCell(row[colMap.frequenceCardiaque]) : undefined,
      date: colMap.date !== undefined && row[colMap.date] ? String(row[colMap.date]) : new Date().toISOString()
    };

    results.push(testItem);

    students.push({
      numeroEleve: idRaw,
      nomEleve: studentName,
      sexe: studentSex
    });
  }

  return {
    results,
    students,
    className,
    totalParsed: results.length,
    vmaCount
  };
};

/**
 * Generates and downloads an Excel template for Physical Tests + VMA.
 */
export const downloadPhysicalTestsTemplate = (className?: string, existingStudents?: StudentIdentity[]) => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("لم يتم تحميل مكتبة Excel.");
  }

  const headers = [
    "الرقم",
    "الاسم والنسب",
    "الجنس (M/F)",
    "السرعة القصوى الهوائية (كم/س)",
    "30 م سرعة (ث)",
    "القفز الأفقي (سم)",
    "القفز العمودي سارجنت (سم)",
    "رمي الكرة الطبية 3كلغ (متر)",
    "المرونة جلوس (سم)",
    "المرونة وقوف (سم)",
    "التوازن الثابت (ث)"
  ];

  let rows: any[][] = [headers];

  if (existingStudents && existingStudents.length > 0) {
    existingStudents.forEach(s => {
      rows.push([
        s.numeroEleve,
        s.nomEleve,
        s.sexe || '',
        '', '', '', '', '', '', '', ''
      ]);
    });
  } else {
    // Add sample placeholder rows
    rows.push([
      "1", "محمد العلمي", "M", "14.5", "4.8", "185", "35", "6.5", "12", "14", "25"
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 10 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الاختبارات البدنية");
  const fileName = `نموذج_الاختبارات_البدنية_${className ? className.replace(/\s+/g, '_') : 'EPS'}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Generates and downloads an Excel template for Students List (Massar / Class format).
 */
export const downloadStudentsTemplate = (className?: string) => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("لم يتم تحميل مكتبة Excel.");
  }

  const rows: any[][] = [
    ["رقم التلميذ", "الاسم والنسب", "الجنس (M/F)", "القسم"],
    ["1", "أحمد المنصوري", "M", className || "3ème 1"],
    ["2", "مريم الناصري", "F", className || "3ème 1"],
    ["3", "ياسين التازي", "M", className || "3ème 1"],
    ["4", "سناء العمراني", "F", className || "3ème 1"]
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "لائحة التلاميذ");
  const fileName = `نموذج_لائحة_التلاميذ_${className ? className.replace(/\s+/g, '_') : 'EPS'}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export full Physical Tests results for a specific class directly to Excel.
 */
export const exportClassPhysicalTestsToExcel = async (className: string): Promise<{ success: boolean; count: number; error?: string }> => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("لم يتم تحميل مكتبة Excel.");
  }

  const [students, tests, vmaList] = await Promise.all([
    getStudentList(className),
    getPhysicalTests(className),
    getVmaResults(className)
  ]);

  if (students.length === 0 && tests.length === 0) {
    return { success: false, count: 0, error: "لا توجد بيانات مسجلة لهذا القسم." };
  }

  const testMap = new Map<string, PhysicalTests>();
  tests.forEach(t => testMap.set(t.numeroEleve, t));

  const vmaMap = new Map<string, StudentResult>();
  vmaList.forEach(v => vmaMap.set(v.numeroEleve, v));

  // Build target list from either student roster or recorded tests
  const studentRows = students.length > 0 ? students : tests.map(t => ({
    numeroEleve: t.numeroEleve,
    nomEleve: t.nomEleve || '',
    sexe: t.sexe
  }));

  const headers = [
    "الرقم",
    "الاسم والنسب",
    "الجنس",
    "القسم",
    "VMA (كم/س)",
    "30 م سرعة (ث)",
    "القفز الأفقي (م)",
    "القفز العمودي (سم)",
    "رمي الكرة الطبية (م)",
    "المرونة - جلوس (سم)",
    "المرونة - وقوف (سم)",
    "التوازن الثابت (ث)",
    "التاريخ"
  ];

  const rows: any[][] = [headers];

  studentRows.forEach((s, idx) => {
    const p = testMap.get(s.numeroEleve);
    const v = vmaMap.get(s.numeroEleve);
    const finalVma = p?.vma ?? v?.vma ?? '';

    rows.push([
      s.numeroEleve || String(idx + 1),
      s.nomEleve || '',
      s.sexe || '',
      className,
      finalVma !== '' ? Number(finalVma) : '',
      p?.vitesse30m ?? '',
      p?.sautHorizontal ?? '',
      p?.sautVertical ?? '',
      p?.lancerMedball ?? '',
      p?.souplesseAssis ?? '',
      p?.souplesseDebout ?? '',
      p?.equilibreStatique ?? '',
      p?.date ? new Date(p.date).toLocaleDateString() : ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 8 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "الاختبارات البدنية");
  const fileName = `نتائج_الاختبارات_البدنية_${className.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return { success: true, count: studentRows.length };
};

/**
 * Export biometric measurements and BMI calculations for a specific class directly to Excel.
 */
export const exportClassMeasurementsToExcel = async (className: string): Promise<{ success: boolean; count: number; error?: string }> => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("لم يتم تحميل مكتبة Excel.");
  }

  const [students, tests] = await Promise.all([
    getStudentList(className),
    getPhysicalTests(className)
  ]);

  if (students.length === 0 && tests.length === 0) {
    return { success: false, count: 0, error: "لا توجد قياسات مسجلة لهذا القسم." };
  }

  const testMap = new Map<string, PhysicalTests>();
  tests.forEach(t => testMap.set(t.numeroEleve, t));

  const targetList = students.length > 0 ? students : tests.map(t => ({
    numeroEleve: t.numeroEleve,
    nomEleve: t.nomEleve || '',
    sexe: t.sexe
  }));

  const headers = [
    "الرقم",
    "الاسم والنسب",
    "الجنس",
    "القسم",
    "الطول (سم)",
    "الوزن (كغ)",
    "مؤشر كتلة الجسم (IMC)",
    "التصنيف الصحي للوزن",
    "النبض القلبي (bpm)",
    "التاريخ"
  ];

  const rows: any[][] = [headers];

  targetList.forEach((s, idx) => {
    const item = testMap.get(s.numeroEleve);
    const weight = item?.poids;
    const height = item?.taille;

    let bmi: number | null = null;
    let bmiCategory = '-';

    if (weight && height && weight > 0 && height > 0) {
      const hM = height / 100;
      bmi = Number((weight / (hM * hM)).toFixed(1));
      if (bmi < 18.5) bmiCategory = "نحافة (Sous-poids)";
      else if (bmi < 25) bmiCategory = "وزن طبيعي (Poids normal)";
      else if (bmi < 30) bmiCategory = "زيادة في الوزن (Surpoids)";
      else bmiCategory = "سمنة (Obésité)";
    }

    rows.push([
      s.numeroEleve || String(idx + 1),
      s.nomEleve || '',
      s.sexe || '',
      className,
      height ?? '',
      weight ?? '',
      bmi !== null ? bmi : '',
      bmiCategory,
      item?.frequenceCardiaque ?? '',
      item?.date ? new Date(item.date).toLocaleDateString() : ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 8 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 20 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "القياسات البيومترية و IMC");
  const fileName = `القياسات_البيومترية_${className.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return { success: true, count: targetList.length };
};

/**
 * Export Luc Léger VMA test results for a specific class directly to Excel.
 */
export const exportClassVmaResultsToExcel = async (className: string): Promise<{ success: boolean; count: number; error?: string }> => {
  const XLSX = (window as any).XLSX;
  if (!XLSX) {
    throw new Error("لم يتم تحميل مكتبة Excel.");
  }

  const results = await getVmaResults(className);
  if (results.length === 0) {
    return { success: false, count: 0, error: "لا توجد نتائج VMA مسجلة لهذا القسم." };
  }

  const headers = [
    "الرقم",
    "الاسم والنسب",
    "الجنس",
    "القسم",
    "المستوى المحقق (Palier)",
    "المسافة المقطوعة (متر)",
    "VMA (كم/س)",
    "تاريخ الاختبار"
  ];

  const rows: any[][] = [headers];

  results.forEach(r => {
    rows.push([
      r.numeroEleve,
      r.nomEleve || '',
      r.sexe || '',
      className,
      r.palierAtteint,
      r.distanceParcourue !== undefined ? r.distanceParcourue : '',
      r.vma,
      r.date ? new Date(r.date).toLocaleDateString() : ''
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 26 },
    { wch: 8 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "نتائج VMA Luc Léger");
  const fileName = `نتائج_VMA_${className.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);

  return { success: true, count: results.length };
};

