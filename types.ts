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
  numeroEleve: string;
  nomEleve?: string;
  sexe?: 'M' | 'F';
  vma?: number;
  vitesse30m?: number;
  sautHorizontal?: number;
  sautVertical?: number;
  lancerMedball?: number;
  souplesseAssis?: number;
  souplesseDebout?: number;
  equilibreStatique?: number;
  poids?: number;
  taille?: number;
  frequenceCardiaque?: number;
  date: string;
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