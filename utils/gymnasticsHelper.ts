/**
 * Gymnastics (الجمباز) Evaluation Helpers
 * Based on official Moroccan EPS pedagogical guidelines (التوجيهات التربوية الرسمية المغربية للتربية البدنية والرياضية)
 */

export interface GymLevelConfig {
  levelKey: '1AC' | '2AC' | '3AC';
  levelLabel: string;
  coeffA: number;
  coeffB: number;
  coeffC: number;
  recommendedCountA: number;
  recommendedCountB: number;
  recommendedCountC: number;
  standardFormula: string;
  motriceMax: number;
  enchainementMax: number;
  executionMax: number;
  exigencesMax: number;
  difficultesMax: number;
}

/**
 * Detects level configuration for gymnastics based on class name.
 */
export const getGymLevelConfig = (className: string = ''): GymLevelConfig => {
  const name = String(className || '').toUpperCase();

  if (name.includes('1APIC') || name.includes('1AC') || name.includes('6ÈME') || name.includes('6EME') || name.startsWith('1/')) {
    return {
      levelKey: '1AC',
      levelLabel: 'الأولى إعدادي (1AC)',
      coeffA: 1.0,
      coeffB: 1.5,
      coeffC: 2.0,
      recommendedCountA: 3,
      recommendedCountB: 2,
      recommendedCountC: 0,
      standardFormula: '3A (3×1.0=3.0ن) + 2B (2×1.5=3.0ن) = 6.0ن',
      motriceMax: 14,
      enchainementMax: 4.5,
      executionMax: 2.0,
      exigencesMax: 1.5,
      difficultesMax: 6.0,
    };
  }

  if (name.includes('2APIC') || name.includes('2AC') || name.includes('5ÈME') || name.includes('5EME') || name.startsWith('2/')) {
    return {
      levelKey: '2AC',
      levelLabel: 'الثانية إعدادي (2AC)',
      coeffA: 0.75,
      coeffB: 1.0,
      coeffC: 1.75,
      recommendedCountA: 3,
      recommendedCountB: 2,
      recommendedCountC: 1,
      standardFormula: '3A (3×0.75=2.25ن) + 2B (2×1.0=2.0ن) + 1C (1×1.75=1.75ن) = 6.0ن',
      motriceMax: 13,
      enchainementMax: 3.5,
      executionMax: 2.0,
      exigencesMax: 1.5,
      difficultesMax: 6.0,
    };
  }

  // Default to 3AC (or Qualifiant / Lycée)
  return {
    levelKey: '3AC',
    levelLabel: 'الثالثة إعدادي (3AC)',
    coeffA: 0.5,
    coeffB: 0.75,
    coeffC: 2.0,
    recommendedCountA: 2,
    recommendedCountB: 4,
    recommendedCountC: 1,
    standardFormula: '2A (2×0.5=1.0ن) + 4B (4×0.75=3.0ن) + 1C (1×2.0=2.0ن) = 6.0ن',
    motriceMax: 12,
    enchainementMax: 2.5,
    executionMax: 2.0,
    exigencesMax: 1.5,
    difficultesMax: 6.0,
  };
};

/**
 * Family options for gymnastics requirements (المتطلبات - Exigences spécifiques)
 * Each family adds 0.5 pts up to 1.5 pts max.
 */
export const GYM_EXIGENCES_FAMILY_OPTIONS = [
  { families: 3, score: 1.5, label: '3 عائلات أو أكثر', scoreOnly: '1.5' },
  { families: 2, score: 1.0, label: 'عائلتان (2)', scoreOnly: '1' },
  { families: 1, score: 0.5, label: 'عائلة واحدة (1)', scoreOnly: '0.5' },
  { families: 0, score: 0.0, label: '0 عائلات (غير منجز)', scoreOnly: '0' },
] as const;

/**
 * Calculates difficulty details and divided sub-scores for A, B, and C.
 */
export const calculateGymDifficultiesWithDetails = (params: {
  countA?: number;
  countB?: number;
  countC?: number;
  manualScoreA?: number;
  manualScoreB?: number;
  manualScoreC?: number;
  className?: string;
}) => {
  const config = getGymLevelConfig(params.className);

  const countA = params.countA ?? 0;
  const countB = params.countB ?? 0;
  const countC = params.countC ?? 0;

  // If manual sub-scores provided, use them; otherwise auto-compute from counts * coeffs
  const scoreA = params.manualScoreA !== undefined 
    ? Number(params.manualScoreA)
    : Number((countA * config.coeffA).toFixed(2));

  const scoreB = params.manualScoreB !== undefined 
    ? Number(params.manualScoreB)
    : Number((countB * config.coeffB).toFixed(2));

  const scoreC = params.manualScoreC !== undefined 
    ? Number(params.manualScoreC)
    : Number((countC * config.coeffC).toFixed(2));

  const rawTotal = scoreA + scoreB + scoreC;
  const totalDifficultes = Number(Math.min(6.0, rawTotal).toFixed(2));

  const detailLines = [
    `صعوبة أ: ${countA} عنصر × ${config.coeffA}ن = ${scoreA}ن`,
    `صعوبة ب: ${countB} عنصر × ${config.coeffB}ن = ${scoreB}ن`,
    `صعوبة ج: ${countC} عنصر × ${config.coeffC}ن = ${scoreC}ن`,
    `المجموع: ${totalDifficultes} / 6ن`,
  ];

  return {
    config,
    scoreA,
    scoreB,
    scoreC,
    totalDifficultes,
    detailLines,
    summaryText: `أ: ${scoreA}ن (${countA}×${config.coeffA}) | ب: ${scoreB}ن (${countB}×${config.coeffB}) | ج: ${scoreC}ن (${countC}×${config.coeffC}) = ${totalDifficultes}/6ن`,
  };
};
