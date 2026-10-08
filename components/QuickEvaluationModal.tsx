import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { StudentIdentity, PhysicalTests } from '../types';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  SparklesIcon, 
  BoltIcon,
  InformationCircleIcon,
  UserGroupIcon
} from './Icons';
import { StudentAvatar } from './StudentAvatar';
import { getGradingDistribution } from '../utils/ScoringConstants';
import { getAttendanceSessions } from '../utils/db';
import { getPedagogicalReports } from '../utils/reportsDb';

export const AVAILABLE_TEAM_SPORTS = [
  { id: 'football', nameAr: 'كرة القدم', icon: '⚽' },
  { id: 'basketball', nameAr: 'كرة السلة', icon: '🏀' },
  { id: 'handball', nameAr: 'كرة اليد', icon: '🤾' },
  { id: 'volleyball', nameAr: 'الكرة الطائرة', icon: '🏐' },
  { id: 'rugby', nameAr: 'الريكبي', icon: '🏉' }
];

export const ATHLETICS_DISCIPLINES = [
  { id: 'speed', nameAr: 'سرعة 30م', fullNameAr: 'سباق السرعة (30 متر)', icon: '⚡' },
  { id: 'speed-60', nameAr: 'سرعة 60م', fullNameAr: 'سباق السرعة (60 متر)', icon: '⚡' },
  { id: 'speed-80', nameAr: 'سرعة 80م', fullNameAr: 'سباق السرعة (80 متر)', icon: '⚡' },
  { id: 'speed-100', nameAr: 'سرعة 100م', fullNameAr: 'سباق السرعة (100 متر)', icon: '⚡' },
  { id: 'endurance', nameAr: 'التحمل / VMA', fullNameAr: 'سباق التحمل / VMA', icon: '🏃' },
  { id: 'long-jump', nameAr: 'الوثب الطولي', fullNameAr: 'الوثب الطولي', icon: '🦘' },
  { id: 'shot-put', nameAr: 'دفع الجلة', fullNameAr: 'دفع الجلة', icon: '🏋️' }
];

export interface QuickEvaluationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClass: string;
  studentNumber?: string;
  currentStudentNumber?: string;
  allStudents?: StudentIdentity[];
  students?: StudentIdentity[];
  physicalTests?: PhysicalTests[];
  onSelectStudent: (numeroEleve: string) => void;
  onSaveStudentScores?: (updatedTest: PhysicalTests) => Promise<void> | void;
  onSaveScores?: (updatedTest: PhysicalTests) => Promise<void> | void;
  initialMode?: 'team_games' | 'gymnastics' | 'athletics' | 'global';
  currentSportId?: string;
  currentSportName?: string;
}

type DistributionStrategy = 'balanced' | 'motor_focus' | 'behavior_first' | 'auto_behavior_based';

export const QuickEvaluationModal: React.FC<QuickEvaluationModalProps> = ({
  isOpen,
  onClose,
  selectedClass,
  studentNumber,
  currentStudentNumber,
  allStudents,
  students,
  physicalTests,
  onSelectStudent,
  onSaveStudentScores,
  onSaveScores,
  initialMode = 'team_games',
  currentSportId,
  currentSportName = 'الرياضة الجماعية'
}) => {
  const effectiveStudents = useMemo(() => allStudents || students || [], [allStudents, students]);
  const effectiveStudentNumber = studentNumber || currentStudentNumber || (effectiveStudents[0]?.numeroEleve ?? '');
  const effectiveTests = useMemo(() => physicalTests || [], [physicalTests]);
  const saveHandler = onSaveStudentScores || onSaveScores;

  const [activeSportId, setActiveSportId] = useState<string>(currentSportId || 'football');
  const [athleticsDiscipline, setAthleticsDiscipline] = useState<'speed' | 'endurance' | 'long-jump' | 'shot-put'>('speed');
  const [athleticsScore, setAthleticsScore] = useState<number | undefined>(undefined);

  const [evaluationMode, setEvaluationMode] = useState<'team_games' | 'gymnastics' | 'athletics' | 'global'>(initialMode);
  
  // Quick Full score input state
  const [fullScoreInput, setFullScoreInput] = useState<string>('');
  const [distributionStrategy, setDistributionStrategy] = useState<DistributionStrategy>('balanced');
  
  // Specific criteria values for current student
  // 1. Team Games
  const [techIndiv, setTechIndiv] = useState<number | undefined>(undefined);
  const [collectif, setCollectif] = useState<number | undefined>(undefined);
  const [tgComportement, setTgComportement] = useState<number | undefined>(undefined);
  const [tgCognitive, setTgCognitive] = useState<number | undefined>(undefined);
  const [tgObservation, setTgObservation] = useState<string>('');

  // 2. Gymnastics
  const [gymDiff, setGymDiff] = useState<number | undefined>(undefined);
  const [gymExig, setGymExig] = useState<number | undefined>(undefined);
  const [gymEnch, setGymEnch] = useState<number | undefined>(undefined);
  const [gymExec, setGymExec] = useState<number | undefined>(undefined);
  const [gymComportement, setGymComportement] = useState<number | undefined>(undefined);
  const [gymCognitive, setGymCognitive] = useState<number | undefined>(undefined);
  const [gymObservation, setGymObservation] = useState<string>('');

  // 3. Global
  const [globalMotrice, setGlobalMotrice] = useState<number | undefined>(undefined);
  const [globalComportement, setGlobalComportement] = useState<number | undefined>(undefined);
  const [globalCognitive, setGlobalCognitive] = useState<number | undefined>(undefined);

  // Auto behavior calculation feedback
  const [autoBehaviorLoading, setAutoBehaviorLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Sync mode if initialMode changes
  useEffect(() => {
    if (initialMode) {
      setEvaluationMode(initialMode);
    }
  }, [initialMode]);

  useEffect(() => {
    if (currentSportId) {
      setActiveSportId(currentSportId);
    }
  }, [currentSportId]);

  // Current student identity & index
  const currentIndex = useMemo(() => {
    if (!effectiveStudents || effectiveStudents.length === 0) return -1;
    return effectiveStudents.findIndex(s => s.numeroEleve === effectiveStudentNumber);
  }, [effectiveStudents, effectiveStudentNumber]);

  const currentStudent = useMemo(() => {
    if (!effectiveStudents || effectiveStudents.length === 0) {
      return { numeroEleve: effectiveStudentNumber || '', nomEleve: 'تلميذ' };
    }
    return effectiveStudents.find(s => s.numeroEleve === effectiveStudentNumber) || effectiveStudents[0];
  }, [effectiveStudents, effectiveStudentNumber]);

  // Grading distribution limits
  const gradingDist = useMemo(() => getGradingDistribution(selectedClass), [selectedClass]);
  const motriceMax = gradingDist.motrice; // 14 (1AC), 13 (2AC), 12 (3AC)
  const comportementMax = gradingDist.comportement; // 3, 4, 5
  const cognitiveMax = gradingDist.cognitive; // 3
  const techIndivMax = 6;
  const teamPlayMax = motriceMax - techIndivMax; // 8, 7, or 6
  const gymEnchMax = motriceMax === 14 ? 4.5 : motriceMax === 13 ? 3.5 : 2.5;

  // Load existing data for this student whenever effectiveStudentNumber or effectiveTests changes
  useEffect(() => {
    if (!effectiveStudentNumber) return;
    const test = effectiveTests.find(t => t.numeroEleve === effectiveStudentNumber);
    if (test) {
      // 1. Team games - check specific sport first
      const specificSportEval = test.sportActivities?.[activeSportId];
      if (specificSportEval) {
        setTechIndiv(specificSportEval.techIndiv);
        setCollectif(specificSportEval.collectif);
        setTgComportement(specificSportEval.comportement);
        setTgCognitive(specificSportEval.cognitive);
        setTgObservation(specificSportEval.observation || '');
      } else if (
        !test.sportActivities &&
        (test.sportCollectifName?.toLowerCase().includes(activeSportId.toLowerCase()) || 
         (activeSportId === 'football' && (!test.sportCollectifName || test.sportCollectifName.includes('قدم'))))
      ) {
        setTechIndiv(test.sportColTechIndiv);
        setCollectif(test.sportColCollectif);
        setTgComportement(test.sportColComportement ?? test.noteComportement);
        setTgCognitive(test.sportColCognitive ?? test.noteCognitive);
        setTgObservation(test.sportCollectifNote || '');
      } else {
        // Specific sport is NOT evaluated yet! Leave completely clean and independent
        setTechIndiv(undefined);
        setCollectif(undefined);
        setTgComportement(undefined);
        setTgCognitive(undefined);
        setTgObservation('');
      }

      // 2. Gymnastics
      setGymDiff(test.gymScoreDifficultes);
      setGymExig(test.gymScoreExigences);
      setGymEnch(test.gymScoreEnchainement);
      setGymExec(test.gymScoreExecution);
      setGymComportement(test.gymNoteComportement);
      setGymCognitive(test.gymNoteCognitive);
      setGymObservation(test.gymNoteObservation || '');

      // 3. Athletics - completely isolated per discipline / race distance
      const athScore = 
        athleticsDiscipline === 'speed' ? (test.scoreVitesse30m !== undefined ? test.scoreVitesse30m : test.scoreVitesse) :
        athleticsDiscipline === 'speed-60' ? test.scoreVitesse60m :
        athleticsDiscipline === 'speed-80' ? test.scoreVitesse80m :
        athleticsDiscipline === 'speed-100' ? test.scoreVitesse100m :
        athleticsDiscipline === 'endurance' ? test.scoreEndurance :
        athleticsDiscipline === 'long-jump' ? test.scoreSautLong :
        test.scoreLancerPoids;
      setAthleticsScore(athScore);

      // 4. Global
      setGlobalMotrice(test.noteMotrice);
      setGlobalComportement(test.noteComportement);
      setGlobalCognitive(test.noteCognitive);

      // Pre-fill full score input strictly for CURRENT evaluationMode
      if (evaluationMode === 'team_games') {
        const activeSportTotal = specificSportEval?.totalScore ?? (
          (!test.sportActivities && (activeSportId === 'football' || test.sportCollectifName?.toLowerCase().includes(activeSportId.toLowerCase()))) ? test.sportCollectifScore : undefined
        );
        setFullScoreInput(activeSportTotal !== undefined ? activeSportTotal.toString() : '');
      } else if (evaluationMode === 'gymnastics') {
        setFullScoreInput(test.gymScoreTotal !== undefined ? test.gymScoreTotal.toString() : '');
      } else if (evaluationMode === 'athletics') {
        setFullScoreInput(athScore !== undefined ? athScore.toString() : '');
      } else if (evaluationMode === 'global') {
        if (test.noteMotrice !== undefined || test.noteComportement !== undefined || test.noteCognitive !== undefined) {
          const sum = (test.noteMotrice || 0) + (test.noteComportement || 0) + (test.noteCognitive || 0);
          setFullScoreInput(sum > 0 ? sum.toFixed(2) : '');
        } else {
          setFullScoreInput('');
        }
      }
    } else {
      // Reset
      setTechIndiv(undefined);
      setCollectif(undefined);
      setTgComportement(undefined);
      setTgCognitive(undefined);
      setTgObservation('');
      setGymDiff(undefined);
      setGymExig(undefined);
      setGymEnch(undefined);
      setGymExec(undefined);
      setGymComportement(undefined);
      setGymCognitive(undefined);
      setGymObservation('');
      setAthleticsScore(undefined);
      setGlobalMotrice(undefined);
      setGlobalComportement(undefined);
      setGlobalCognitive(undefined);
      setFullScoreInput('');
    }
    setFeedbackMsg(null);
  }, [effectiveStudentNumber, effectiveTests, evaluationMode, activeSportId, athleticsDiscipline]);

  // Computed total score in real-time
  const computedTotal = useMemo(() => {
    if (evaluationMode === 'team_games') {
      const m = (techIndiv || 0) + (collectif || 0);
      const sum = m + (tgComportement || 0) + (tgCognitive || 0);
      return Number(Math.min(20, sum).toFixed(2));
    }
    if (evaluationMode === 'gymnastics') {
      const m = (gymDiff || 0) + (gymExig || 0) + (gymEnch || 0) + (gymExec || 0);
      const sum = m + (gymComportement || 0) + (gymCognitive || 0);
      return Number(Math.min(20, sum).toFixed(2));
    }
    if (evaluationMode === 'athletics') {
      return Number(Math.min(20, athleticsScore || 0).toFixed(2));
    }
    // global
    const sum = (globalMotrice || 0) + (globalComportement || 0) + (globalCognitive || 0);
    return Number(Math.min(20, sum).toFixed(2));
  }, [
    evaluationMode, 
    techIndiv, collectif, tgComportement, tgCognitive,
    gymDiff, gymExig, gymEnch, gymExec, gymComportement, gymCognitive,
    athleticsScore,
    globalMotrice, globalComportement, globalCognitive
  ]);

  // Qualitative appreciation
  const appreciation = useMemo(() => {
    if (computedTotal >= 16) return { label: 'ممتاز (Excellent)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' };
    if (computedTotal >= 14) return { label: 'جيد جداً (Très Bien)', color: 'text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300' };
    if (computedTotal >= 12) return { label: 'حسن / جيد (Bien)', color: 'text-indigo-700 bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300' };
    if (computedTotal >= 10) return { label: 'متوسط (Moyen)', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' };
    if (computedTotal > 0) return { label: 'دون المتوسط (Insuffisant)', color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' };
    return { label: 'غير مقوّم بعد', color: 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400' };
  }, [computedTotal]);

  // Automatic Behavior Score Calculation for this single student
  const handleAutoCalculateBehaviorForCurrentStudent = async () => {
    if (!selectedClass || !currentStudent) return;
    setAutoBehaviorLoading(true);
    try {
      const [attendance, reports] = await Promise.all([
        getAttendanceSessions(selectedClass),
        getPedagogicalReports(selectedClass)
      ]);

      let absences = 0;
      let noKits = 0;
      let lates = 0;

      attendance.forEach(session => {
        const record = session.records.find(r => r.studentNumber === currentStudent.numeroEleve);
        if (record) {
          if (record.status === 'absent') absences++;
          if (record.status === 'no-kit') noKits++;
          if (record.status === 'late') lates++;
        }
      });

      const badBehaviorReportsCount = reports.filter(r => r.studentNumber === currentStudent.numeroEleve && r.caseType === 'behavior').length;
      const rawScore = comportementMax - (absences * 1.0 + noKits * 0.5 + lates * 0.25 + badBehaviorReportsCount * 1.0);
      const autoScore = Number(Math.max(0, Math.min(comportementMax, rawScore)).toFixed(2));

      setTgComportement(autoScore);
      setGymComportement(autoScore);
      setGlobalComportement(autoScore);

      setFeedbackMsg({
        text: `تم استنتاج نقطة السلوك (${autoScore} / ${comportementMax}) بناءً على ${attendance.length} حصة (غياب: ${absences}، بذلة: ${noKits}، تأخر: ${lates}).`,
        type: 'success'
      });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'تعذر حساب نقطة السلوك آلياً.', type: 'error' });
    } finally {
      setAutoBehaviorLoading(false);
    }
  };

  // Auto-distribute full score into criteria
  const distributeFullScore = useCallback((scoreVal: number, strategy: DistributionStrategy = distributionStrategy) => {
    if (isNaN(scoreVal) || scoreVal < 0) return;
    const boundedScore = Math.min(20, Math.max(0, scoreVal));

    if (evaluationMode === 'team_games') {
      // Team games distribution
      if (strategy === 'behavior_first') {
        // Full behavior & cognitive first, remainder goes to motrice
        const comp = comportementMax;
        const cogn = Math.min(cognitiveMax, Math.max(1, boundedScore * 0.15));
        const remMotrice = Math.max(0, Math.min(motriceMax, boundedScore - (comp + cogn)));
        
        const tIndiv = Number(Math.min(6, remMotrice * (6 / motriceMax)).toFixed(2));
        const cPlay = Number(Math.min(teamPlayMax, remMotrice - tIndiv).toFixed(2));
        
        setTechIndiv(tIndiv);
        setCollectif(cPlay);
        setTgComportement(comp);
        setTgCognitive(Number(cogn.toFixed(2)));
      } else if (strategy === 'motor_focus') {
        // High priority to individual & collective technique
        const targetMotrice = Math.min(motriceMax, boundedScore * (motriceMax / 20) * 1.1);
        const rem = Math.max(0, boundedScore - targetMotrice);
        const comp = Math.min(comportementMax, rem * (comportementMax / (comportementMax + cognitiveMax)));
        const cogn = Math.min(cognitiveMax, rem - comp);

        const tIndiv = Number(Math.min(6, targetMotrice * 0.5).toFixed(2));
        const cPlay = Number(Math.min(teamPlayMax, targetMotrice - tIndiv).toFixed(2));

        setTechIndiv(tIndiv);
        setCollectif(cPlay);
        setTgComportement(Number(comp.toFixed(2)));
        setTgCognitive(Number(cogn.toFixed(2)));
      } else {
        // Balanced official proportional distribution (70/15/15 or 65/20/15 or 60/25/15)
        const ratio = boundedScore / 20;
        const targetMotrice = ratio * motriceMax;
        const comp = Number(Math.min(comportementMax, ratio * comportementMax).toFixed(2));
        const cogn = Number(Math.min(cognitiveMax, ratio * cognitiveMax).toFixed(2));

        // Motrice split: 6 for tech indiv, teamPlayMax for team play
        const tIndivRaw = targetMotrice * (6 / motriceMax);
        const tIndiv = Number(Math.min(6, Math.round(tIndivRaw * 4) / 4).toFixed(2)); // round to 0.25
        const cPlayRaw = targetMotrice - tIndiv;
        const cPlay = Number(Math.min(teamPlayMax, Math.round(cPlayRaw * 4) / 4).toFixed(2));

        // Adjust rounding delta to match boundedScore exactly
        const currentSum = tIndiv + cPlay + comp + cogn;
        const diff = Number((boundedScore - currentSum).toFixed(2));
        let adjustedCollectif = cPlay;
        if (Math.abs(diff) <= 1.0) {
          adjustedCollectif = Number(Math.min(teamPlayMax, Math.max(0, cPlay + diff)).toFixed(2));
        }

        setTechIndiv(tIndiv);
        setCollectif(adjustedCollectif);
        setTgComportement(comp);
        setTgCognitive(cogn);
      }
    } else if (evaluationMode === 'gymnastics') {
      // Gymnastics distribution
      const ratio = boundedScore / 20;
      const targetMotrice = ratio * motriceMax;
      const comp = Number(Math.min(comportementMax, ratio * comportementMax).toFixed(2));
      const cogn = Number(Math.min(cognitiveMax, ratio * cognitiveMax).toFixed(2));

      // Divide target motrice proportionally among Gym criteria:
      // Diff /6, Exig /1.5, Ench /gymEnchMax, Exec /2
      const totalGymComponents = 6 + 1.5 + gymEnchMax + 2; // e.g. 14, 13, or 12
      const diffVal = Number(Math.min(6, (6 / totalGymComponents) * targetMotrice).toFixed(2));
      const exigVal = Number(Math.min(1.5, (1.5 / totalGymComponents) * targetMotrice).toFixed(2));
      const enchVal = Number(Math.min(gymEnchMax, (gymEnchMax / totalGymComponents) * targetMotrice).toFixed(2));
      const execVal = Number(Math.min(2, (2 / totalGymComponents) * targetMotrice).toFixed(2));

      setGymDiff(diffVal);
      setGymExig(exigVal);
      setGymEnch(enchVal);
      setGymExec(execVal);
      setGymComportement(comp);
      setGymCognitive(cogn);
    } else if (evaluationMode === 'athletics') {
      // Athletics direct score
      setAthleticsScore(boundedScore);
    } else {
      // Global mode distribution
      const ratio = boundedScore / 20;
      const motrice = Number(Math.min(motriceMax, ratio * motriceMax).toFixed(2));
      const comp = Number(Math.min(comportementMax, ratio * comportementMax).toFixed(2));
      const cogn = Number(Math.min(cognitiveMax, ratio * cognitiveMax).toFixed(2));

      setGlobalMotrice(motrice);
      setGlobalComportement(comp);
      setGlobalCognitive(cogn);
    }

    setFeedbackMsg({
      text: `تم توزيع النقطة (${boundedScore}/20) على معايير النشاط المختار بنجاح! ⚡`,
      type: 'success'
    });
  }, [
    evaluationMode, 
    distributionStrategy, 
    motriceMax, 
    comportementMax, 
    cognitiveMax, 
    teamPlayMax, 
    gymEnchMax
  ]);

  // When full score input changes, user can trigger distribution
  const handleFullScoreChange = (valStr: string) => {
    setFullScoreInput(valStr);
    const num = parseFloat(valStr);
    if (!isNaN(num)) {
      distributeFullScore(num);
    }
  };

  // Save current student scores
  const handleSaveCurrent = async (shouldNavigateNext: boolean = false) => {
    if (!currentStudent) return;

    const existingTest = effectiveTests.find(t => t.numeroEleve === currentStudent.numeroEleve);
    const activeSportObj = AVAILABLE_TEAM_SPORTS.find(s => s.id === activeSportId);
    const activeSportLabel = activeSportObj?.nameAr || currentSportName || 'الألعاب الجماعية';

    // Compute updated fields based on active evaluation mode
    const motriceFinal = evaluationMode === 'team_games' 
      ? Number(Math.min(motriceMax, (techIndiv || 0) + (collectif || 0)).toFixed(2))
      : evaluationMode === 'gymnastics'
      ? Number(Math.min(motriceMax, (gymDiff || 0) + (gymExig || 0) + (gymEnch || 0) + (gymExec || 0)).toFixed(2))
      : globalMotrice;

    const totalCalculated = evaluationMode === 'athletics'
      ? (athleticsScore || 0)
      : evaluationMode === 'team_games'
      ? Number(Math.min(20, (motriceFinal || 0) + (tgComportement || 0) + (tgCognitive || 0)).toFixed(2))
      : evaluationMode === 'gymnastics'
      ? Number(Math.min(20, (motriceFinal || 0) + (gymComportement || 0) + (gymCognitive || 0)).toFixed(2))
      : Number(Math.min(20, (motriceFinal || 0) + (globalComportement || 0) + (globalCognitive || 0)).toFixed(2));

    const updatedSportActivities = {
      ...(existingTest?.sportActivities || {}),
      ...(evaluationMode === 'team_games' ? {
        [activeSportId]: {
          sportId: activeSportId,
          sportName: activeSportLabel,
          techIndiv,
          collectif,
          motrice: motriceFinal,
          comportement: tgComportement,
          cognitive: tgCognitive,
          totalScore: totalCalculated,
          observation: tgObservation,
          date: new Date().toISOString()
        }
      } : {})
    };

    const updatedObj: PhysicalTests = {
      ...(existingTest || {
        numeroEleve: currentStudent.numeroEleve,
        nomEleve: currentStudent.nomEleve,
        sexe: currentStudent.sexe,
        date: new Date().toISOString()
      }),
      sportActivities: updatedSportActivities,

      // Global scores ONLY updated when explicitly in 'global' mode
      ...(evaluationMode === 'global' ? {
        noteMotrice: globalMotrice,
        noteComportement: globalComportement,
        noteCognitive: globalCognitive
      } : {}),

      // Team games legacy fields ONLY updated if football
      ...(evaluationMode === 'team_games' && activeSportId === 'football' ? {
        sportColTechIndiv: techIndiv,
        sportColCollectif: collectif,
        sportColComportement: tgComportement,
        sportColCognitive: tgCognitive,
        sportCollectifScore: totalCalculated,
        sportCollectifNote: tgObservation,
        sportCollectifName: activeSportLabel
      } : {}),

      // Gymnastics scores ONLY updated when explicitly in 'gymnastics' mode
      ...(evaluationMode === 'gymnastics' ? {
        gymScoreDifficultes: gymDiff,
        gymScoreExigences: gymExig,
        gymScoreEnchainement: gymEnch,
        gymScoreExecution: gymExec,
        gymNoteMotrice: motriceFinal,
        gymNoteComportement: gymComportement,
        gymNoteCognitive: gymCognitive,
        gymScoreTotal: totalCalculated,
        gymNoteObservation: gymObservation
      } : {}),

      // Athletics scores ONLY updated when explicitly in 'athletics' mode
      ...(evaluationMode === 'athletics' ? {
        ...(athleticsDiscipline === 'speed' ? { scoreVitesse30m: athleticsScore, scoreVitesse: athleticsScore } : {}),
        ...(athleticsDiscipline === 'speed-60' ? { scoreVitesse60m: athleticsScore } : {}),
        ...(athleticsDiscipline === 'speed-80' ? { scoreVitesse80m: athleticsScore } : {}),
        ...(athleticsDiscipline === 'speed-100' ? { scoreVitesse100m: athleticsScore } : {}),
        ...(athleticsDiscipline === 'endurance' ? { scoreEndurance: athleticsScore } : {}),
        ...(athleticsDiscipline === 'long-jump' ? { scoreSautLong: athleticsScore } : {}),
        ...(athleticsDiscipline === 'shot-put' ? { scoreLancerPoids: athleticsScore } : {})
      } : {}),

      date: new Date().toISOString()
    };

    if (saveHandler) {
      await saveHandler(updatedObj);
    }

    if (shouldNavigateNext) {
      handleNextStudent();
    } else {
      setFeedbackMsg({ text: `تم حفظ نقط التلميذ (${currentStudent.nomEleve}) بنجاح! ✅`, type: 'success' });
    }
  };

  // Navigation handlers
  const handlePrevStudent = () => {
    if (currentIndex > 0 && effectiveStudents[currentIndex - 1]) {
      onSelectStudent(effectiveStudents[currentIndex - 1].numeroEleve);
    }
  };

  const handleNextStudent = () => {
    if (currentIndex < effectiveStudents.length - 1 && effectiveStudents[currentIndex + 1]) {
      onSelectStudent(effectiveStudents[currentIndex + 1].numeroEleve);
    } else {
      setFeedbackMsg({ text: 'تم الوصول إلى آخر تلميذ في لائحة القسم! 🎉', type: 'info' });
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowRight' && (e.ctrlKey || e.altKey)) {
        handlePrevStudent();
      } else if (e.key === 'ArrowLeft' && (e.ctrlKey || e.altKey)) {
        handleNextStudent();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, effectiveStudents]);

  if (!isOpen || !currentStudent) return null;

  const quickScorePills = [10, 12, 13, 14, 15, 16, 17, 18, 19, 20];

  const quickObservations = [
    'مستوى تقني وتكتيكي ممتاز 🌟',
    'مشاركة جماعية فعالة وروح رياضية 🤝',
    'تحكم جيد بالكرة وضعف في التمركز الدفاعي ⚽',
    'مستوى متوسط يحتاج تطوير التمرير السريع 📈',
    'مواظبة ممتازة وسلوك مثالي 👏',
    'غياب متكرر وبذلة غير مكتملة ⚠️'
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      dir="rtl"
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Student Identity & Carousel Controls */}
        <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50/70 via-white to-indigo-50/40 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <StudentAvatar 
              photoUrl={currentStudent.photoUrl} 
              nomEleve={currentStudent.nomEleve} 
              sexe={currentStudent.sexe} 
              size="lg" 
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base md:text-lg font-black text-gray-900 dark:text-white">
                  {currentStudent.nomEleve}
                </h2>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {currentStudent.sexe === 'F' ? 'أنثى' : 'ذكر'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-mono">
                  {currentStudent.numeroEleve}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                <span>القسم: <strong className="text-gray-900 dark:text-white">{selectedClass}</strong></span>
                <span>•</span>
                <span>نافذة التقويم السريع الفردي</span>
              </p>
            </div>
          </div>

          {/* Quick Student Carousel Navigation */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 bg-white dark:bg-gray-700 px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-600 shadow-2xs">
              <span className="text-xs font-bold text-gray-400">التلميذ:</span>
              <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">
                {currentIndex + 1} / {effectiveStudents.length}
              </span>
            </div>

            <button
              type="button"
              onClick={handlePrevStudent}
              disabled={currentIndex <= 0}
              className="p-2 rounded-2xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="التلميذ السابق (Ctrl + Right)"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            <button
              type="button"
              onClick={handleNextStudent}
              disabled={currentIndex >= effectiveStudents.length - 1}
              className="p-2 rounded-2xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:pointer-events-none transition cursor-pointer"
              title="التلميذ التالي (Ctrl + Left)"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-2xl border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
              title="إغلاق"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-Header: Mode Selector Tabs */}
        <div className="px-5 py-2.5 bg-gray-50/80 dark:bg-gray-900/40 border-b border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-black">
            <button
              type="button"
              onClick={() => setEvaluationMode('team_games')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                evaluationMode === 'team_games' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>🏀</span>
              <span>الألعاب الجماعية</span>
            </button>
            <button
              type="button"
              onClick={() => setEvaluationMode('gymnastics')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                evaluationMode === 'gymnastics' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>🤸</span>
              <span>الجمباز</span>
            </button>
            <button
              type="button"
              onClick={() => setEvaluationMode('athletics')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                evaluationMode === 'athletics' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>🏃</span>
              <span>ألعاب القوى</span>
            </button>
            <button
              type="button"
              onClick={() => setEvaluationMode('global')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
                evaluationMode === 'global' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>📑</span>
              <span>المحضر الإجمالي</span>
            </button>
          </div>

          {/* Sub-selector for Team Games sport */}
          {evaluationMode === 'team_games' && (
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">الرياضة:</span>
              <div className="flex items-center gap-1">
                {AVAILABLE_TEAM_SPORTS.map(sp => (
                  <button
                    key={sp.id}
                    type="button"
                    onClick={() => setActiveSportId(sp.id)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      activeSportId === sp.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-100'
                    }`}
                  >
                    <span>{sp.icon}</span>
                    <span>{sp.nameAr}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sub-selector for Athletics discipline */}
          {evaluationMode === 'athletics' && (
            <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-2xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300">المسابقة:</span>
              <div className="flex items-center gap-1">
                {ATHLETICS_DISCIPLINES.map(ath => (
                  <button
                    key={ath.id}
                    type="button"
                    onClick={() => setAthleticsDiscipline(ath.id as any)}
                    className={`px-2 py-0.5 rounded-lg text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                      athleticsDiscipline === ath.id
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-100'
                    }`}
                  >
                    <span>{ath.icon}</span>
                    <span>{ath.nameAr}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 text-[11px] font-black">
              🔒 تنقيط مستقل للنشاط
            </span>
            <span className="font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-lg border border-indigo-200">
              حركي: {motriceMax} ن | سلوكي: {comportementMax} ن | معرفي: {cognitiveMax} ن
            </span>
          </div>
        </div>

        {/* Modal Body: Scrollable Content */}
        <div className="p-4 md:p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar">

          {/* ⚡ PART 1: QUICK FULL SCORE INPUT & AUTO-DISTRIBUTION */}
          <div className="bg-gradient-to-br from-indigo-50/70 via-purple-50/40 to-blue-50/30 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-gray-800 p-4 md:p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/30">
                  <BoltIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-gray-900 dark:text-white">
                    وضع نقطة كاملة والتوزيع التلقائي على المعايير:
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    أدخل النقطة الإجمالية من 20 لتوزيعها وتقسيمها آلياً حسب جزئيات التنقيط المعتمدة.
                  </p>
                </div>
              </div>

              {/* Strategy selector */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 p-1 rounded-xl border border-indigo-200 dark:border-gray-600 text-[11px] font-bold">
                <span className="text-gray-400 ps-1.5">نمط التوزيع:</span>
                <select
                  value={distributionStrategy}
                  onChange={(e) => {
                    const st = e.target.value as DistributionStrategy;
                    setDistributionStrategy(st);
                    const n = parseFloat(fullScoreInput);
                    if (!isNaN(n)) distributeFullScore(n, st);
                  }}
                  className="bg-transparent border-none text-xs font-black text-indigo-700 dark:text-indigo-300 focus:ring-0 cursor-pointer"
                >
                  <option value="balanced">توزيع رسمي متوازن (وفق المستوى)</option>
                  <option value="motor_focus">تركيز على الأداء الحركي والتقني</option>
                  <option value="behavior_first">سلوك ومعارف كاملة + المتبقي حركي</option>
                </select>
              </div>
            </div>

            {/* Score input and pill presets */}
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 shrink-0">
                  النقطة الإجمالية:
                </label>
                <div className="relative w-32">
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="20"
                    placeholder="مثلاً 15"
                    value={fullScoreInput}
                    onChange={(e) => handleFullScoreChange(e.target.value)}
                    className="w-full text-center py-2 px-3 text-lg font-black bg-white dark:bg-gray-800 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 shadow-inner focus:outline-none focus:border-indigo-500"
                  />
                  <span className="absolute left-2.5 top-3 text-[10px] font-black text-gray-400">/20</span>
                </div>
              </div>

              {/* Quick score pills */}
              <div className="flex flex-wrap items-center gap-1.5 flex-grow">
                <span className="text-[11px] font-bold text-gray-400 shrink-0">نقط سريعة:</span>
                {quickScorePills.map(score => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => {
                      setFullScoreInput(score.toString());
                      distributeFullScore(score);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      Number(fullScoreInput) === score
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 scale-105'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Feedback banner */}
          {feedbackMsg && (
            <div className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 transition animate-slide-up ${
              feedbackMsg.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300' 
                : feedbackMsg.type === 'error'
                ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-300'
                : 'bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300'
            }`}>
              <CheckCircleIcon className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* 📊 PART 2: DETAILED CRITERIA BREAKDOWN ACCORDING TO SELECTED MODE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-xs text-gray-900 dark:text-white flex items-center gap-2">
                <span>🎯</span>
                <span>جزئيات التنقيط والمعايير المطلوبة (قابلة للتعديل الفردي الدقيق):</span>
              </h4>

              {/* Auto Behavior calculation shortcut button */}
              <button
                type="button"
                onClick={handleAutoCalculateBehaviorForCurrentStudent}
                disabled={autoBehaviorLoading}
                className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800 transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                title="حساب نقطة سلوك هذا التلميذ تلقائياً من سجل الغياب والحضور والتقارير"
              >
                <SparklesIcon className="w-3.5 h-3.5 text-amber-600" />
                <span>{autoBehaviorLoading ? 'جارِ الحساب...' : 'جلب نقطة السلوك آلياً من الغياب'}</span>
              </button>
            </div>

            {/* --- TEAM GAMES MODE CRITERIA --- */}
            {evaluationMode === 'team_games' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Technique Individuelle */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">1. التقنية الفردية:</span>
                      <p className="text-[10px] text-gray-400">التحكم بالكرة، التمرير، التنطيط والتصويب</p>
                    </div>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200">
                      / 6 ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTechIndiv(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="6"
                      value={techIndiv === undefined ? '' : techIndiv}
                      onChange={(e) => setTechIndiv(e.target.value === '' ? undefined : Math.min(6, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setTechIndiv(prev => Math.min(6, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Jeu Collectif */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">2. اللعب الجماعي:</span>
                      <p className="text-[10px] text-gray-400">التمركز، خطط الهجوم والدفاع، الانسجام</p>
                    </div>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg border border-indigo-200">
                      / {teamPlayMax} ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setCollectif(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={teamPlayMax}
                      value={collectif === undefined ? '' : collectif}
                      onChange={(e) => setCollectif(e.target.value === '' ? undefined : Math.min(teamPlayMax, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setCollectif(prev => Math.min(teamPlayMax, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Motor Total preview card */}
                <div className="md:col-span-2 bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-indigo-900 dark:text-indigo-300">
                      إجمالي الجانب الحركي (التقنية + اللعب الجماعي):
                    </span>
                    <span className="text-[11px] text-gray-400">
                      (الحد الأقصى للمستوى: {motriceMax} ن)
                    </span>
                  </div>
                  <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    {Number(((techIndiv || 0) + (collectif || 0)).toFixed(2))} / {motriceMax}
                  </span>
                </div>

                {/* 3. Comportement */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">3. الجانب السلوكي والوجداني:</span>
                      <p className="text-[10px] text-gray-400">الانضباط، الروح الرياضية، الحضور والبذلة</p>
                    </div>
                    <span className="text-xs font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg border border-amber-200">
                      / {comportementMax} ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTgComportement(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={comportementMax}
                      value={tgComportement === undefined ? '' : tgComportement}
                      onChange={(e) => setTgComportement(e.target.value === '' ? undefined : Math.min(comportementMax, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setTgComportement(prev => Math.min(comportementMax, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 4. Cognitive */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">4. الجانب المعرفي والقواعد:</span>
                      <p className="text-[10px] text-gray-400">قواعد اللعبة، أدوار التحكيم والتنظيم</p>
                    </div>
                    <span className="text-xs font-black bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg border border-purple-200">
                      / {cognitiveMax} ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTgCognitive(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={cognitiveMax}
                      value={tgCognitive === undefined ? '' : tgCognitive}
                      onChange={(e) => setTgCognitive(e.target.value === '' ? undefined : Math.min(cognitiveMax, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setTgCognitive(prev => Math.min(cognitiveMax, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- GYMNASTICS MODE CRITERIA --- */}
            {evaluationMode === 'gymnastics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* 1. Diff /6 */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white">الصعوبة (Difficulté):</span>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg">/ 6 ن</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max="6"
                    value={gymDiff === undefined ? '' : gymDiff}
                    onChange={(e) => setGymDiff(e.target.value === '' ? undefined : Math.min(6, Math.max(0, Number(e.target.value))))}
                    placeholder="النقطة"
                    className="w-full text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                </div>

                {/* 2. Exigences /1.5 */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white">المتطلبات (Exigences):</span>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg">/ 1.5 ن</span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="1.5"
                    value={gymExig === undefined ? '' : gymExig}
                    onChange={(e) => setGymExig(e.target.value === '' ? undefined : Math.min(1.5, Math.max(0, Number(e.target.value))))}
                    placeholder="النقطة"
                    className="w-full text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                </div>

                {/* 3. Enchaînement */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white">الربط والتركيب:</span>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg">/ {gymEnchMax} ن</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={gymEnchMax}
                    value={gymEnch === undefined ? '' : gymEnch}
                    onChange={(e) => setGymEnch(e.target.value === '' ? undefined : Math.min(gymEnchMax, Math.max(0, Number(e.target.value))))}
                    placeholder="النقطة"
                    className="w-full text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                </div>

                {/* 4. Execution /2 */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white">الأداء والتنفيذ:</span>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg">/ 2 ن</span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={gymExec === undefined ? '' : gymExec}
                    onChange={(e) => setGymExec(e.target.value === '' ? undefined : Math.min(2, Math.max(0, Number(e.target.value))))}
                    placeholder="النقطة"
                    className="w-full text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                </div>

                {/* 5. Gym Comportement */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white">السلوكي (الجمباز):</span>
                    <span className="text-xs font-black bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg">/ {comportementMax} ن</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={comportementMax}
                    value={gymComportement === undefined ? '' : gymComportement}
                    onChange={(e) => setGymComportement(e.target.value === '' ? undefined : Math.min(comportementMax, Math.max(0, Number(e.target.value))))}
                    placeholder="النقطة"
                    className="w-full text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                </div>

                {/* 6. Gym Cognitive */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-gray-900 dark:text-white">المعرفي (الجمباز):</span>
                    <span className="text-xs font-black bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg">/ {cognitiveMax} ن</span>
                  </div>
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    max={cognitiveMax}
                    value={gymCognitive === undefined ? '' : gymCognitive}
                    onChange={(e) => setGymCognitive(e.target.value === '' ? undefined : Math.min(cognitiveMax, Math.max(0, Number(e.target.value))))}
                    placeholder="النقطة"
                    className="w-full text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                  />
                </div>
              </div>
            )}

            {/* --- GLOBAL MODE CRITERIA --- */}
            {evaluationMode === 'global' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Motrice */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">الجانب الحركي (Performance):</span>
                      <p className="text-[10px] text-gray-400">إنجاز أنشطة ألعاب القوى والرياضات الجماعية</p>
                    </div>
                    <span className="text-xs font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-lg">
                      / {motriceMax} ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setGlobalMotrice(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={motriceMax}
                      value={globalMotrice === undefined ? '' : globalMotrice}
                      onChange={(e) => setGlobalMotrice(e.target.value === '' ? undefined : Math.min(motriceMax, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setGlobalMotrice(prev => Math.min(motriceMax, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 2. Comportement */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">الجانب السلوكي (Comportement):</span>
                      <p className="text-[10px] text-gray-400">الانضباط، المواظبة، البذلة، السلوك</p>
                    </div>
                    <span className="text-xs font-black bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-lg">
                      / {comportementMax} ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setGlobalComportement(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={comportementMax}
                      value={globalComportement === undefined ? '' : globalComportement}
                      onChange={(e) => setGlobalComportement(e.target.value === '' ? undefined : Math.min(comportementMax, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setGlobalComportement(prev => Math.min(comportementMax, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* 3. Cognitive */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white">الجانب المعرفي (Cognitif):</span>
                      <p className="text-[10px] text-gray-400">المعارف الرياضية وقواعد الأنشطة الممارسة</p>
                    </div>
                    <span className="text-xs font-black bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-lg">
                      / {cognitiveMax} ن
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setGlobalCognitive(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max={cognitiveMax}
                      value={globalCognitive === undefined ? '' : globalCognitive}
                      onChange={(e) => setGlobalCognitive(e.target.value === '' ? undefined : Math.min(cognitiveMax, Math.max(0, Number(e.target.value))))}
                      placeholder="--"
                      className="flex-grow text-center py-1.5 font-black text-sm bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setGlobalCognitive(prev => Math.min(cognitiveMax, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* --- ATHLETICS MODE CRITERIA --- */}
            {evaluationMode === 'athletics' && (
              <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-700/80 pb-3">
                  <div>
                    <h4 className="font-black text-sm text-gray-900 dark:text-white flex items-center gap-2">
                      <span>{ATHLETICS_DISCIPLINES.find(a => a.id === athleticsDiscipline)?.icon}</span>
                      <span>نقطة مسابقة: {ATHLETICS_DISCIPLINES.find(a => a.id === athleticsDiscipline)?.fullNameAr || ATHLETICS_DISCIPLINES.find(a => a.id === athleticsDiscipline)?.nameAr}</span>
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      يتم حفظ نقطة هذه المسابقة بشكل مستقل تماماً من 20 ن.
                    </p>
                  </div>
                  <span className="text-sm font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-xl border border-indigo-200">
                    النقطة الممنوحة: {athleticsScore !== undefined ? athleticsScore : '--'} / 20
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                  <span className="text-xs font-black text-gray-700 dark:text-gray-300">أدخل النقطة من 20:</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAthleticsScore(prev => Math.max(0, Number(((prev || 0) - 0.25).toFixed(2))))}
                      className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="20"
                      value={athleticsScore === undefined ? '' : athleticsScore}
                      onChange={(e) => setAthleticsScore(e.target.value === '' ? undefined : Math.min(20, Math.max(0, Number(e.target.value))))}
                      placeholder="النقطة /20"
                      className="w-28 text-center py-2 font-black text-base bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    />
                    <button
                      type="button"
                      onClick={() => setAthleticsScore(prev => Math.min(20, Number(((prev || 0) + 0.25).toFixed(2))))}
                      className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white font-black text-sm flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* Preset quick scores for athletics */}
                  <div className="flex items-center gap-1.5 flex-wrap ms-auto">
                    {[10, 12, 14, 15, 16, 18, 20].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAthleticsScore(val)}
                        className="px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer"
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 🌟 PART 3: REAL-TIME FINAL SCORE BAR & PEDAGOGICAL APPRECIATION */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-3xl border border-gray-200 dark:border-gray-600 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="w-full sm:w-auto">
              <span className="text-xs font-black text-gray-500 dark:text-gray-400 block mb-1">
                المجموع النهائي المحسوب تلقائياً من الجزئيات:
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {computedTotal.toFixed(2)}
                </span>
                <span className="text-sm font-black text-gray-400">/ 20</span>
                <span className={`text-xs font-black px-3 py-1 rounded-full border ${appreciation.color} ms-2`}>
                  {appreciation.label}
                </span>
              </div>
            </div>

            {/* Visual progress meter */}
            <div className="w-full sm:max-w-xs space-y-1">
              <div className="flex justify-between text-[10px] font-bold text-gray-400">
                <span>0</span>
                <span>10</span>
                <span>20</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    computedTotal >= 14 ? 'bg-emerald-500' : computedTotal >= 10 ? 'bg-indigo-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, (computedTotal / 20) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* 💬 PART 4: PEDAGOGICAL OBSERVATION & QUICK COMMENTS */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <span>📝</span>
              <span>الملاحظة والتقييم البيداغوجي (اختياري):</span>
            </label>
            <input
              type="text"
              value={evaluationMode === 'gymnastics' ? gymObservation : tgObservation}
              onChange={(e) => {
                if (evaluationMode === 'gymnastics') setGymObservation(e.target.value);
                else setTgObservation(e.target.value);
              }}
              placeholder="اكتب ملاحظة بيداغوجية أو اختر من العبارات الجاهزة أدناه..."
              className="w-full px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Quick chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickObservations.map((obs, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (evaluationMode === 'gymnastics') setGymObservation(obs);
                    else setTgObservation(obs);
                  }}
                  className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-gray-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-indigo-950/40 text-gray-600 border border-transparent hover:border-indigo-200 transition active:scale-95 cursor-pointer"
                >
                  {obs}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="p-4 md:p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-gray-400 font-bold hidden sm:block">
            <span>💡 نصيحة: استخدم </span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[10px] font-mono font-bold">
              حفظ والتالي
            </kbd>
            <span> للتقويم السلس والمتتابع لتلاميذ القسم كاملاً.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-xs font-black hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
            >
              إلغاء / إغلاق
            </button>

            <button
              type="button"
              onClick={() => handleSaveCurrent(false)}
              className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg shadow-indigo-600/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>حفظ النقط</span>
            </button>

            <button
              type="button"
              onClick={() => handleSaveCurrent(true)}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-600/20 transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <BoltIcon className="w-4 h-4" />
              <span>حفظ والانتقال للتالي ◀</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
