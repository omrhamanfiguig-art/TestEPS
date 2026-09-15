
import type { LucLegerLevel } from './types';

// Table officielle Luc Léger (Test Navette 20m - Éducation Physique et Sportive)
// Palier 1 = 8.0 km/h, avec +0.5 km/h à chaque palier de 1 minute.
// La VMA enregistrée est exactement égale à la vitesse du palier atteint.
const RAW_DATA: { palier: number; vitesse: number; vma: number; vo2max?: number }[] = [
  { palier: 1,  vitesse: 8.0,  vma: 8.0,  vo2max: 26.2 },
  { palier: 2,  vitesse: 8.5,  vma: 8.5,  vo2max: 29.2 },
  { palier: 3,  vitesse: 9.0,  vma: 9.0,  vo2max: 32.1 },
  { palier: 4,  vitesse: 9.5,  vma: 9.5,  vo2max: 35.0 },
  { palier: 5,  vitesse: 10.0, vma: 10.0, vo2max: 37.9 },
  { palier: 6,  vitesse: 10.5, vma: 10.5, vo2max: 40.8 },
  { palier: 7,  vitesse: 11.0, vma: 11.0, vo2max: 43.7 },
  { palier: 8,  vitesse: 11.5, vma: 11.5, vo2max: 46.6 },
  { palier: 9,  vitesse: 12.0, vma: 12.0, vo2max: 49.6 },
  { palier: 10, vitesse: 12.5, vma: 12.5, vo2max: 52.5 },
  { palier: 11, vitesse: 13.0, vma: 13.0, vo2max: 55.4 },
  { palier: 12, vitesse: 13.5, vma: 13.5, vo2max: 58.3 },
  { palier: 13, vitesse: 14.0, vma: 14.0, vo2max: 61.2 },
  { palier: 14, vitesse: 14.5, vma: 14.5, vo2max: 64.1 },
  { palier: 15, vitesse: 15.0, vma: 15.0, vo2max: 67.1 },
  { palier: 16, vitesse: 15.5, vma: 15.5, vo2max: 70.0 },
  { palier: 17, vitesse: 16.0, vma: 16.0, vo2max: 72.9 },
  { palier: 18, vitesse: 16.5, vma: 16.5, vo2max: 75.8 },
  { palier: 19, vitesse: 17.0, vma: 17.0, vo2max: 78.7 },
  { palier: 20, vitesse: 17.5, vma: 17.5, vo2max: 81.6 },
  { palier: 21, vitesse: 18.0, vma: 18.0, vo2max: 84.5 },
];

export interface ShuttleSegment {
  startTime: number;
  endTime: number;
  duration: number;
  shuttleIndex: number;
  vitesse: number;
  palier: number;
}

export const LUC_LEGER_DATA: LucLegerLevel[] = RAW_DATA.map((level) => ({
  ...level,
  dureePalier: 60,
  distanceNavette: 20,
  // Temps pour une navette (s) = distance / (vitesse en m/s)
  // vitesse en m/s = vitesse en km/h * 1000 / 3600
  tempsNavette: 20 / (level.vitesse * 1000 / 3600),
}));

export const SHUTTLE_TIMELINE: ShuttleSegment[] = (() => {
  const segments: ShuttleSegment[] = [];
  let currentTime = 0;
  let index = 0;

  while (currentTime < 1800) {
    const levelIndex = Math.min(Math.floor(currentTime / 60), LUC_LEGER_DATA.length - 1);
    const level = LUC_LEGER_DATA[levelIndex];
    const duration = level.tempsNavette;
    const endTime = currentTime + duration;

    segments.push({
      startTime: currentTime,
      endTime,
      duration,
      shuttleIndex: index,
      vitesse: level.vitesse,
      palier: level.palier,
    });

    currentTime = endTime;
    index++;
  }

  return segments;
})();

