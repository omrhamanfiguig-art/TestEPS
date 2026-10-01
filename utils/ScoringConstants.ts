
// Scoring scales for Physical Education (EPS) tests
// Typically used in Moroccan middle schools (Collège)
// These can be adjusted by the teacher.

export interface ScoringScale {
  gender: 'M' | 'F';
  thresholds: {
    value: number; // The performance value (e.g., meters, seconds)
    score: number; // The mark out of 20
  }[];
}

// 30m Speed (Seconds) - Lower is better
export const SPEED_SCALE_30M: ScoringScale[] = [
  {
    gender: 'M',
    thresholds: [
      { value: 4.2, score: 20 },
      { value: 4.5, score: 18 },
      { value: 4.8, score: 16 },
      { value: 5.1, score: 14 },
      { value: 5.4, score: 12 },
      { value: 5.7, score: 10 },
      { value: 6.0, score: 8 },
      { value: 6.5, score: 6 },
    ]
  },
  {
    gender: 'F',
    thresholds: [
      { value: 4.8, score: 20 },
      { value: 5.1, score: 18 },
      { value: 5.4, score: 16 },
      { value: 5.7, score: 14 },
      { value: 6.0, score: 12 },
      { value: 6.3, score: 10 },
      { value: 6.6, score: 8 },
      { value: 7.0, score: 6 },
    ]
  }
];

// Long Jump (Meters) - Higher is better
export const LONG_JUMP_SCALE: ScoringScale[] = [
  {
    gender: 'M',
    thresholds: [
      { value: 4.5, score: 20 },
      { value: 4.2, score: 18 },
      { value: 3.9, score: 16 },
      { value: 3.6, score: 14 },
      { value: 3.3, score: 12 },
      { value: 3.0, score: 10 },
      { value: 2.7, score: 8 },
      { value: 2.4, score: 6 },
    ]
  },
  {
    gender: 'F',
    thresholds: [
      { value: 3.8, score: 20 },
      { value: 3.5, score: 18 },
      { value: 3.2, score: 16 },
      { value: 2.9, score: 14 },
      { value: 2.6, score: 12 },
      { value: 2.3, score: 10 },
      { value: 2.0, score: 8 },
      { value: 1.7, score: 6 },
    ]
  }
];

// Shot Put 3kg/4kg (Meters) - Higher is better
export const SHOT_PUT_SCALE: ScoringScale[] = [
  {
    gender: 'M',
    thresholds: [
      { value: 10.0, score: 20 },
      { value: 9.0, score: 18 },
      { value: 8.0, score: 16 },
      { value: 7.0, score: 14 },
      { value: 6.0, score: 12 },
      { value: 5.0, score: 10 },
      { value: 4.0, score: 8 },
      { value: 3.0, score: 6 },
    ]
  },
  {
    gender: 'F',
    thresholds: [
      { value: 8.0, score: 20 },
      { value: 7.2, score: 18 },
      { value: 6.4, score: 16 },
      { value: 5.6, score: 14 },
      { value: 4.8, score: 12 },
      { value: 4.0, score: 10 },
      { value: 3.2, score: 8 },
      { value: 2.4, score: 6 },
    ]
  }
];

// Endurance 600m/1000m (Seconds) - Lower is better
export const ENDURANCE_SCALE_1000M: ScoringScale[] = [
  {
    gender: 'M',
    thresholds: [
      { value: 180, score: 20 }, // 3:00
      { value: 200, score: 18 }, // 3:20
      { value: 220, score: 16 }, // 3:40
      { value: 240, score: 14 }, // 4:00
      { value: 260, score: 12 }, // 4:20
      { value: 280, score: 10 }, // 4:40
      { value: 300, score: 8 },  // 5:00
      { value: 330, score: 6 },  // 5:30
    ]
  },
  {
    gender: 'F',
    thresholds: [
      { value: 240, score: 20 }, // 4:00
      { value: 260, score: 18 }, // 4:20
      { value: 280, score: 16 }, // 4:40
      { value: 300, score: 14 }, // 5:00
      { value: 320, score: 12 }, // 5:20
      { value: 340, score: 10 }, // 5:40
      { value: 360, score: 8 },  // 6:00
      { value: 400, score: 6 },  // 6:40
    ]
  }
];

// 60m Speed (Seconds)
export const SPEED_SCALE_60M: ScoringScale[] = [
  {
    gender: 'M',
    thresholds: [
      { value: 8.0, score: 20 },
      { value: 8.5, score: 18 },
      { value: 9.0, score: 16 },
      { value: 9.5, score: 14 },
      { value: 10.0, score: 12 },
      { value: 10.5, score: 10 },
      { value: 11.5, score: 8 },
      { value: 12.5, score: 6 },
    ]
  },
  {
    gender: 'F',
    thresholds: [
      { value: 9.0, score: 20 },
      { value: 9.5, score: 18 },
      { value: 10.0, score: 16 },
      { value: 10.5, score: 14 },
      { value: 11.0, score: 12 },
      { value: 11.5, score: 10 },
      { value: 12.5, score: 8 },
      { value: 13.5, score: 6 },
    ]
  }
];

// 80m Speed (Seconds)
export const SPEED_SCALE_80M: ScoringScale[] = [
  {
    gender: 'M',
    thresholds: [
      { value: 10.5, score: 20 },
      { value: 11.2, score: 18 },
      { value: 12.0, score: 16 },
      { value: 12.8, score: 14 },
      { value: 13.5, score: 12 },
      { value: 14.5, score: 10 },
      { value: 15.5, score: 8 },
      { value: 16.5, score: 6 },
    ]
  },
  {
    gender: 'F',
    thresholds: [
      { value: 12.0, score: 20 },
      { value: 12.8, score: 18 },
      { value: 13.5, score: 16 },
      { value: 14.2, score: 14 },
      { value: 15.0, score: 12 },
      { value: 16.0, score: 10 },
      { value: 17.5, score: 8 },
      { value: 19.0, score: 6 },
    ]
  }
];

export const calculateScore = (value: number, scale: ScoringScale[], gender: 'M' | 'F' = 'M', lowerIsBetter: boolean = true): number => {
  const genderScale = scale.find(s => s.gender === gender) || scale[0];
  const sorted = [...genderScale.thresholds].sort((a, b) => lowerIsBetter ? a.value - b.value : b.value - a.value);
  
  if (lowerIsBetter) {
    if (value <= sorted[0].value) return sorted[0].score;
    if (value >= sorted[sorted.length - 1].value) return sorted[sorted.length - 1].score;
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (value >= sorted[i].value && value <= sorted[i+1].value) {
        // Linear interpolation or closest? Let's do linear for smoothness
        const ratio = (value - sorted[i].value) / (sorted[i+1].value - sorted[i].value);
        return parseFloat((sorted[i].score - ratio * (sorted[i].score - sorted[i+1].score)).toFixed(1));
      }
    }
  } else {
    if (value >= sorted[0].value) return sorted[0].score;
    if (value <= sorted[sorted.length - 1].value) return sorted[sorted.length - 1].score;
    
    for (let i = 0; i < sorted.length - 1; i++) {
      if (value <= sorted[i].value && value >= sorted[i+1].value) {
        const ratio = (sorted[i].value - value) / (sorted[i].value - sorted[i+1].value);
        return parseFloat((sorted[i].score - ratio * (sorted[i].score - sorted[i+1].score)).toFixed(1));
      }
    }
  }
  
  return 0;
};

/**
 * Format total seconds into MM:SS format (e.g. 195s -> "03:15" or "3:15")
 */
export const formatSecondsToMinSec = (totalSeconds?: number, padMinutes = false): string => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds <= 0) {
    return '';
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  const minStr = padMinutes ? String(mins).padStart(2, '0') : String(mins);
  const secStr = String(secs).padStart(2, '0');
  return `${minStr}:${secStr}`;
};

/**
 * Format total seconds into Arabic label format (e.g. 195s -> "3د 15ث")
 */
export const formatMinSecWithLabel = (totalSeconds?: number): string => {
  if (totalSeconds === undefined || totalSeconds === null || isNaN(totalSeconds) || totalSeconds <= 0) {
    return '-';
  }
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.round(totalSeconds % 60);
  if (mins === 0) return `${secs}ث`;
  if (secs === 0) return `${mins}د`;
  return `${mins}د ${secs}ث`;
};

/**
 * Parse an input string like "3:15", "03:15", "3.15", "3د 15ث", "3 15", or pure seconds "195" into total seconds.
 */
export const parseMinSecToSeconds = (input: string | number | undefined): number | undefined => {
  if (input === undefined || input === null) return undefined;
  if (typeof input === 'number') {
    return input > 0 ? Number(input.toFixed(1)) : undefined;
  }
  const trimmed = String(input).trim();
  if (!trimmed) return undefined;

  // Pattern 1: Colon separator e.g. "3:15" or "03:15"
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    const m = parseInt(parts[0], 10);
    const s = parseFloat(parts[1] || '0');
    if (!isNaN(m) && !isNaN(s)) {
      return m * 60 + s;
    }
  }

  // Pattern 2: Arabic letters e.g. "3د 15ث" or "3د" or "45ث"
  if (trimmed.includes('د') || trimmed.includes('ث') || trimmed.includes('m') || trimmed.includes('s')) {
    const minMatch = trimmed.match(/(\d+)\s*(?:د|m)/i);
    const secMatch = trimmed.match(/(\d+)\s*(?:ث|s)/i);
    const m = minMatch ? parseInt(minMatch[1], 10) : 0;
    const s = secMatch ? parseInt(secMatch[1], 10) : 0;
    if (m > 0 || s > 0) {
      return m * 60 + s;
    }
  }

  // Pattern 3: Dot notation commonly typed by teachers: e.g. "3.25" meaning 3 mins 25 secs
  // If user typed e.g. "3.25", check if parts look like min.sec
  if (/^\d+\.\d{1,2}$/.test(trimmed)) {
    const parts = trimmed.split('.');
    const m = parseInt(parts[0], 10);
    const s = parseInt(parts[1], 10);
    // If the integer part is small (< 30) and decimal part is < 60, it's min.sec
    if (m < 30 && s < 60) {
      return m * 60 + s;
    }
  }

  // Pattern 4: Pure number
  const num = parseFloat(trimmed);
  if (!isNaN(num) && num > 0) {
    return Number(num.toFixed(1));
  }

  return undefined;
};

// Local storage keys for custom baremes
const BAREME_STORAGE_PREFIX = 'eps_bareme_scale_v1_';

export const getCustomScale = (testKey: 'speed' | 'speed-60' | 'speed-80' | 'endurance' | 'long-jump' | 'shot-put'): ScoringScale[] => {
  try {
    const raw = localStorage.getItem(`${BAREME_STORAGE_PREFIX}${testKey}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading custom bareme scale:', e);
  }

  switch (testKey) {
    case 'speed': return SPEED_SCALE_30M;
    case 'speed-60': return SPEED_SCALE_60M;
    case 'speed-80': return SPEED_SCALE_80M;
    case 'endurance': return ENDURANCE_SCALE_1000M;
    case 'long-jump': return LONG_JUMP_SCALE;
    case 'shot-put': return SHOT_PUT_SCALE;
  }
};

export const saveCustomScale = (testKey: 'speed' | 'speed-60' | 'speed-80' | 'endurance' | 'long-jump' | 'shot-put', scale: ScoringScale[]): void => {
  try {
    localStorage.setItem(`${BAREME_STORAGE_PREFIX}${testKey}`, JSON.stringify(scale));
    window.dispatchEvent(new CustomEvent('baremeUpdated', { detail: { testKey } }));
  } catch (e) {
    console.error('Error saving custom bareme scale:', e);
  }
};

export const resetCustomScale = (testKey: 'speed' | 'speed-60' | 'speed-80' | 'endurance' | 'long-jump' | 'shot-put'): void => {
  try {
    localStorage.removeItem(`${BAREME_STORAGE_PREFIX}${testKey}`);
    window.dispatchEvent(new CustomEvent('baremeUpdated', { detail: { testKey } }));
  } catch (e) {
    console.error('Error resetting custom bareme scale:', e);
  }
};

export interface GradingDistribution {
  motrice: number;
  comportement: number;
  cognitive: number;
}

/**
 * Returns the grading distribution based on the academic level.
 * Moroccan Middle School (Collège) standards:
 * - 1st Year (1APIC): Motrice 14, Comportement 3, Cognitive 3
 * - 2nd Year (2APIC): Motrice 13, Comportement 4, Cognitive 3
 * - 3rd Year (3APIC): Motrice 12, Comportement 5, Cognitive 3
 */
export const getGradingDistribution = (className: string): GradingDistribution => {
  const name = String(className || '').toUpperCase();
  
  if (name.includes('1APIC') || name.includes('1AC') || name.includes('6ème') || name.startsWith('1/')) {
    return { motrice: 14, comportement: 3, cognitive: 3 };
  }
  
  if (name.includes('2APIC') || name.includes('2AC') || name.includes('5ème') || name.startsWith('2/')) {
    return { motrice: 13, comportement: 4, cognitive: 3 };
  }
  
  if (name.includes('3APIC') || name.includes('3AC') || name.includes('4ème') || name.includes('3ème') || name.startsWith('3/')) {
    return { motrice: 12, comportement: 5, cognitive: 3 };
  }
  
  // Default fallback (usually 3rd year or average)
  return { motrice: 12, comportement: 5, cognitive: 3 };
};

/**
 * Calculates behavior score based on attendance records.
 * Heuristic based on common Moroccan PE practices:
 * - Start with max behavior points (3, 4, or 5).
 * - Deduct 1.0 for each unjustified absence.
 * - Deduct 0.5 for each "No Kit" session.
 * - Deduct 0.25 for each Late arrival.
 * - Minimum score is 0.
 */
export const calculateBehaviorScore = (
  maxPoints: number,
  absences: number,
  noKits: number,
  lates: number
): number => {
  const score = maxPoints - (absences * 1.0 + noKits * 0.5 + lates * 0.25);
  return Math.max(0, score);
};
