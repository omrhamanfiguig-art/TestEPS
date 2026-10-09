import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStudentList, 
  getPhysicalTests, 
  savePhysicalTests, 
  getAllClasses, 
  ClassStats,
  getAttendanceSessions
} from '../utils/db';
import { getPedagogicalReports } from '../utils/reportsDb';
import type { StudentIdentity, PhysicalTests, SportActivityEvaluation } from '../types';
import { 
    UserGroupIcon, 
    SparklesIcon, 
    ArrowDownTrayIcon, 
    ChevronDownIcon, 
    XMarkIcon, 
    MagnifyingGlassIcon, 
    CheckCircleIcon, 
    TableCellsIcon, 
    InformationCircleIcon, 
    ArrowPathIcon, 
    PlusIcon, 
    TrashIcon, 
    BoltIcon 
} from '../components/Icons';
import { StudentAvatar } from '../components/StudentAvatar';
import { QuickEvaluationModal } from '../components/QuickEvaluationModal';
import { 
  getGradingDistribution,
  GradingDistribution
} from '../utils/ScoringConstants';
import { useLanguage } from '../utils/i18n';
import { useSportsList, SportType } from '../utils/SportsConstants';
import {
  getGymLevelConfig,
  GYM_EXIGENCES_FAMILY_OPTIONS,
  calculateGymDifficultiesWithDetails
} from '../utils/gymnasticsHelper';

export const getStudentSportEvaluation = (
  test: PhysicalTests | undefined, 
  sportId: string,
  defaultSportId: string = 'football'
): SportActivityEvaluation | undefined => {
  if (!test) return undefined;

  // 1. Direct check in sportActivities by sportId
  if (test.sportActivities && test.sportActivities[sportId]) {
    return test.sportActivities[sportId];
  }

  // 2. Legacy fallback: ONLY if sportActivities is completely empty/undefined,
  // and the legacy sportCollectifName explicitly matches this sport or if sportId === 'football' (default sport)
  if (!test.sportActivities && (test.sportColTechIndiv !== undefined || test.sportColCollectif !== undefined || test.sportCollectifScore !== undefined)) {
    const legacyName = (test.sportCollectifName || '').toLowerCase();
    const idLower = sportId.toLowerCase();
    const isExplicitMatch = legacyName && (
      legacyName.includes(idLower) ||
      (idLower === 'basketball' && (legacyName.includes('سلة') || legacyName.includes('basket'))) ||
      (idLower === 'football' && (legacyName.includes('قدم') || legacyName.includes('foot'))) ||
      (idLower === 'handball' && (legacyName.includes('يد') || legacyName.includes('hand'))) ||
      (idLower === 'volleyball' && (legacyName.includes('طائرة') || legacyName.includes('volley'))) ||
      (idLower === 'rugby' && (legacyName.includes('ريكبي') || legacyName.includes('rugby')))
    );

    if (isExplicitMatch || (!legacyName && sportId === 'football')) {
      const calcMotrice = (test.sportColTechIndiv !== undefined || test.sportColCollectif !== undefined)
        ? Number(((test.sportColTechIndiv || 0) + (test.sportColCollectif || 0)).toFixed(2))
        : test.noteMotrice;
      return {
        sportId,
        sportName: test.sportCollectifName || 'الرياضة الجماعية',
        techIndiv: test.sportColTechIndiv,
        collectif: test.sportColCollectif,
        motrice: calcMotrice,
        comportement: test.sportColComportement ?? test.noteComportement,
        cognitive: test.sportColCognitive ?? test.noteCognitive,
        totalScore: test.sportCollectifScore,
        observation: test.sportCollectifNote
      };
    }
  }

  return undefined;
};

interface TeamGamesScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

export const TeamGamesScreen: React.FC<TeamGamesScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { t, language } = useLanguage();
  const { sports, addSport, deleteSport } = useSportsList();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [physicalTests, setPhysicalTests] = useState<PhysicalTests[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Evaluation Sub-space state: 'team_games' or 'gymnastics'
  const [activeTab, setActiveTab] = useState<'team_games' | 'gymnastics'>('team_games');

  // Add Sport modal/state
  const [isAddSportOpen, setIsAddSportOpen] = useState(false);
  const [newSportAr, setNewSportAr] = useState('');
  const [newSportIcon, setNewSportIcon] = useState('🏅');

  // Default sport
  const [currentSport, setCurrentSport] = useState(sports[0]?.id || 'football');

  // Interactive Calculator Modals/States
  const [activeCalculatorStudent, setActiveCalculatorStudent] = useState<string | null>(null);

  // Quick Evaluation Modal State
  const [isQuickEvalOpen, setIsQuickEvalOpen] = useState(false);
  const [quickEvalStudentNumber, setQuickEvalStudentNumber] = useState<string | null>(null);

  // Gymnastics Difficulty Details Popover State
  const [expandedDiffDetailsStudent, setExpandedDiffDetailsStudent] = useState<string | null>(null);

  const handleOpenQuickEval = (studentNum?: string) => {
    const target = studentNum || (filteredStudents.length > 0 ? filteredStudents[0].numeroEleve : null);
    if (target) {
      setQuickEvalStudentNumber(target);
      setIsQuickEvalOpen(true);
    } else {
      showToast('لا يوجد تلاميذ في هذا القسم لتقويمهم', 'error');
    }
  };

  const handleSaveStudentScoresFromModal = async (updatedTest: PhysicalTests) => {
    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === updatedTest.numeroEleve);
      let updatedList: PhysicalTests[];
      if (existing) {
        updatedList = prev.map(t => t.numeroEleve === updatedTest.numeroEleve ? updatedTest : t);
      } else {
        updatedList = [...prev, updatedTest];
      }
      savePhysicalTests(selectedClass, updatedList).catch(err => {
        console.error('Save failed:', err);
      });
      return updatedList;
    });
    showToast(`تم حفظ نقط التلميذ (${updatedTest.nomEleve || updatedTest.numeroEleve}) بنجاح! ✅`);
  };

  // Grading distribution (Middle school standard: 1AC => 14/3/3, 2AC => 13/4/3, 3AC => 12/5/3)
  const gradingDist = useMemo(() => getGradingDistribution(selectedClass), [selectedClass]);

  // Moroccan specific Team Games limits
  const teamGamesMotriceMax = gradingDist.motrice; // 14, 13, or 12
  const teamGamesIndivTechMax = 6;
  const teamPlayMax = teamGamesMotriceMax - teamGamesIndivTechMax; // e.g. 14-6 = 8, 13-6 = 7, 12-6 = 6

  // Determine Class Level Label for headers
  const classLevelLabel = useMemo(() => {
    const name = String(selectedClass || '').toUpperCase();
    if (name.includes('1APIC') || name.includes('1AC') || name.includes('6ème') || name.startsWith('1/')) return 'الأولى إعدادي (1AC)';
    if (name.includes('2APIC') || name.includes('2AC') || name.includes('5ème') || name.startsWith('2/')) return 'الثانية إعدادي (2AC)';
    if (name.includes('3APIC') || name.includes('3AC') || name.includes('4ème') || name.includes('3ème') || name.startsWith('3/')) return 'الثالثة إعدادي (3AC)';
    return 'الثالثة إعدادي (3AC) [افتراضي]';
  }, [selectedClass]);

  // Gymnastics level configuration (coeffs for A, B, C and recommended composition)
  const gymLevelCfg = useMemo(() => getGymLevelConfig(selectedClass), [selectedClass]);

  // Auto-save logic (triggers 2 seconds after user stops typing/editing)
  useEffect(() => {
    if (physicalTests.length === 0 || isLoading) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await savePhysicalTests(selectedClass, physicalTests);
      } catch (err) {
        console.error('Auto-save failed', err);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [physicalTests, selectedClass, isLoading]);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      loadClassData(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const cls = await getAllClasses();
    setClassList(cls);
    if (cls.length > 0 && !selectedClass) {
      setSelectedClass(cls[0].className);
    }
  };

  const loadClassData = async (className: string) => {
    setIsLoading(true);
    try {
      const [stds, tests] = await Promise.all([
        getStudentList(className),
        getPhysicalTests(className)
      ]);
      setStudents(stds);
      setPhysicalTests(tests || []);
    } catch (err) {
      console.error(err);
      setNotification({ message: "خطأ في تحميل بيانات القسم", type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // --- TEAM GAMES SCORING HANDLERS ---
  const handleTeamGamesScoreChange = (
    studentNumber: string, 
    field: 'sportColTechIndiv' | 'sportColCollectif' | 'sportColComportement' | 'sportColCognitive', 
    scoreValue: string
  ) => {
    const val = scoreValue === '' ? undefined : Number(scoreValue);
    
    // Validate boundaries
    let max = 6;
    if (field === 'sportColTechIndiv') max = 6;
    else if (field === 'sportColCollectif') max = teamPlayMax;
    else if (field === 'sportColComportement') max = gradingDist.comportement;
    else if (field === 'sportColCognitive') max = gradingDist.cognitive;

    if (val !== undefined && (val < 0 || val > max)) return;

    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === studentNumber);
      const student = students.find(s => s.numeroEleve === studentNumber);
      const currentSportName = sports.find(s => s.id === currentSport)?.labelAr || 'الرياضة الجماعية';
      
      const baseObj = existing || {
        numeroEleve: studentNumber,
        nomEleve: student?.nomEleve,
        sexe: student?.sexe,
        date: new Date().toISOString()
      };

      const existingSportEval = getStudentSportEvaluation(existing, currentSport) || {
        sportId: currentSport,
        sportName: currentSportName
      };

      // Map field
      const evalKey = field === 'sportColTechIndiv' ? 'techIndiv' :
                      field === 'sportColCollectif' ? 'collectif' :
                      field === 'sportColComportement' ? 'comportement' : 'cognitive';

      const updatedSportEval: SportActivityEvaluation = {
        ...existingSportEval,
        sportId: currentSport,
        sportName: currentSportName,
        [evalKey]: val
      };

      // Compute Total Note Motrice (الحركي) for this sport
      const noteM = (updatedSportEval.techIndiv || 0) + (updatedSportEval.collectif || 0);
      updatedSportEval.motrice = Number(Math.min(teamGamesMotriceMax, noteM).toFixed(2));

      // Compute Final Score /20 for this sport
      const totalS = (updatedSportEval.motrice || 0) + (updatedSportEval.comportement || 0) + (updatedSportEval.cognitive || 0);
      updatedSportEval.totalScore = Number(Math.min(20, totalS).toFixed(2));
      updatedSportEval.date = new Date().toISOString();

      const updatedSportActivities = {
        ...(baseObj.sportActivities || {}),
        [currentSport]: updatedSportEval
      };

      const updatedObj: PhysicalTests = {
        ...baseObj,
        sportActivities: updatedSportActivities,
        sportCollectifName: currentSportName,
        // Only keep legacy fields in sync for football to avoid cross-contamination
        ...(currentSport === 'football' ? {
          sportColTechIndiv: updatedSportEval.techIndiv,
          sportColCollectif: updatedSportEval.collectif,
          sportColComportement: updatedSportEval.comportement,
          sportColCognitive: updatedSportEval.cognitive,
          sportCollectifScore: updatedSportEval.totalScore,
          sportCollectifNote: updatedSportEval.observation,
        } : {}),
        date: new Date().toISOString()
      };

      if (existing) {
        return prev.map(t => t.numeroEleve === studentNumber ? updatedObj : t);
      } else {
        return [...prev, updatedObj];
      }
    });
  };

  const handleTeamGamesNoteChange = (studentNumber: string, note: string) => {
    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === studentNumber);
      const student = students.find(s => s.numeroEleve === studentNumber);
      const currentSportName = sports.find(s => s.id === currentSport)?.labelAr || 'الرياضة الجماعية';

      const baseObj = existing || {
        numeroEleve: studentNumber,
        nomEleve: student?.nomEleve,
        sexe: student?.sexe,
        date: new Date().toISOString()
      };

      const existingSportEval = getStudentSportEvaluation(existing, currentSport) || {
        sportId: currentSport,
        sportName: currentSportName
      };

      const updatedSportEval: SportActivityEvaluation = {
        ...existingSportEval,
        sportId: currentSport,
        sportName: currentSportName,
        observation: note,
        date: new Date().toISOString()
      };

      const updatedSportActivities = {
        ...(baseObj.sportActivities || {}),
        [currentSport]: updatedSportEval
      };

      const updatedObj: PhysicalTests = {
        ...baseObj,
        sportActivities: updatedSportActivities,
        sportCollectifName: currentSportName,
        ...(currentSport === 'football' ? { sportCollectifNote: note } : {})
      };

      if (existing) {
        return prev.map(t => t.numeroEleve === studentNumber ? updatedObj : t);
      } else {
        return [...prev, updatedObj];
      }
    });
  };


  // --- GYMNASTICS SCORING HANDLERS ---
  const handleGymScoreChange = (
    studentNumber: string, 
    field: keyof PhysicalTests, 
    value: any
  ) => {
    setPhysicalTests(prev => {
      const existing = prev.find(t => t.numeroEleve === studentNumber);
      const student = students.find(s => s.numeroEleve === studentNumber);
      
      const baseObj = existing || {
        numeroEleve: studentNumber,
        nomEleve: student?.nomEleve,
        sexe: student?.sexe,
        date: new Date().toISOString(),
      };

      const updatedObj = { ...baseObj, [field]: value === '' ? undefined : value } as PhysicalTests;

      // Deduce Exécution Score if we edited deductive faults
      if (
        field === 'gymExecutionFaultsPetite' || 
        field === 'gymExecutionFaultsMoyenne' || 
        field === 'gymExecutionFaultsGrossiere' || 
        field === 'gymExecutionFaultsChutes'
      ) {
        const petite = updatedObj.gymExecutionFaultsPetite || 0;
        const moyenne = updatedObj.gymExecutionFaultsMoyenne || 0;
        const grossiere = updatedObj.gymExecutionFaultsGrossiere || 0;
        const chutes = updatedObj.gymExecutionFaultsChutes || 0;
        const deduction = (petite * 0.1) + (moyenne * 0.2) + (grossiere * 0.3) + (chutes * 0.5);
        updatedObj.gymScoreExecution = Number(Math.max(0, Math.min(2, 2 - deduction)).toFixed(2));
      }

      // Compute Difficulty score if counts A,B,C are supplied or divided sub-scores modified
      if (field === 'gymDiffCountA' || field === 'gymDiffCountB' || field === 'gymDiffCountC') {
        const countA = updatedObj.gymDiffCountA !== undefined && updatedObj.gymDiffCountA !== null ? Number(updatedObj.gymDiffCountA) : 0;
        const countB = updatedObj.gymDiffCountB !== undefined && updatedObj.gymDiffCountB !== null ? Number(updatedObj.gymDiffCountB) : 0;
        const countC = updatedObj.gymDiffCountC !== undefined && updatedObj.gymDiffCountC !== null ? Number(updatedObj.gymDiffCountC) : 0;

        // Auto-compute divided sub-scores for A, B, and C using level configuration
        updatedObj.gymDiffScoreA = Number((countA * gymLevelCfg.coeffA).toFixed(2));
        updatedObj.gymDiffScoreB = Number((countB * gymLevelCfg.coeffB).toFixed(2));
        updatedObj.gymDiffScoreC = Number((countC * gymLevelCfg.coeffC).toFixed(2));

        const diffCalc = (updatedObj.gymDiffScoreA || 0) + (updatedObj.gymDiffScoreB || 0) + (updatedObj.gymDiffScoreC || 0);
        updatedObj.gymScoreDifficultes = Number(Math.min(6, diffCalc).toFixed(2));
      } else if (field === 'gymDiffScoreA' || field === 'gymDiffScoreB' || field === 'gymDiffScoreC') {
        const diffCalc = (updatedObj.gymDiffScoreA || 0) + (updatedObj.gymDiffScoreB || 0) + (updatedObj.gymDiffScoreC || 0);
        updatedObj.gymScoreDifficultes = Number(Math.min(6, diffCalc).toFixed(2));
      } else if (field === 'gymScoreDifficultes') {
        updatedObj.gymScoreDifficultes = value === '' || value === undefined ? undefined : Number(Math.min(6, Math.max(0, Number(value))).toFixed(2));
      }

      if (field === 'gymScoreExigences') {
        updatedObj.gymScoreExigences = value === '' || value === undefined ? undefined : Number(Math.min(1.5, Math.max(0, Number(value))).toFixed(2));
      }

      // Auto-compute gymNoteMotrice (الحركي) = Difficultes + Exigences + Enchainement + Execution
      const diffS = updatedObj.gymScoreDifficultes || 0;
      const exigS = updatedObj.gymScoreExigences || 0;
      const enchS = updatedObj.gymScoreEnchainement || 0;
      const execS = updatedObj.gymScoreExecution !== undefined ? updatedObj.gymScoreExecution : 2.0;

      const calculatedMotrice = diffS + exigS + enchS + execS;
      updatedObj.gymNoteMotrice = Number(Math.min(teamGamesMotriceMax, calculatedMotrice).toFixed(2));

      // Gym behavior and cognitive defaults if empty
      const compS = updatedObj.gymNoteComportement || 0;
      const cognS = updatedObj.gymNoteCognitive || 0;

      // Gym total score from 20
      updatedObj.gymScoreTotal = Number(Math.min(20, updatedObj.gymNoteMotrice + compS + cognS).toFixed(2));

      if (existing) {
        return prev.map(t => t.numeroEleve === studentNumber ? updatedObj : t);
      } else {
        return [...prev, updatedObj];
      }
    });
  };

  const handleAutoCalculateBehaviorAll = async () => {
    if (!selectedClass || students.length === 0) return;
    setIsLoading(true);
    try {
        const [attendance, reports] = await Promise.all([
            getAttendanceSessions(selectedClass),
            getPedagogicalReports(selectedClass)
        ]);

        if (attendance.length === 0 && reports.length === 0) {
            showToast("لا توجد حصص غياب أو تقارير سلوكية مسجلة لهذا القسم لحساب النقط تلقائياً.", "error");
            setIsLoading(false);
            return;
        }

        setPhysicalTests(prev => {
          return students.map(s => {
            const existing = prev.find(t => t.numeroEleve === s.numeroEleve) || {
              numeroEleve: s.numeroEleve,
              nomEleve: s.nomEleve,
              sexe: s.sexe,
              date: new Date().toISOString()
            };

            const updated = { ...existing } as PhysicalTests;

            let absences = 0;
            let noKits = 0;
            let lates = 0;

            attendance.forEach(session => {
                const record = session.records.find(r => r.studentNumber === s.numeroEleve);
                if (record) {
                    if (record.status === 'absent') absences++;
                    if (record.status === 'no-kit') noKits++;
                    if (record.status === 'late') lates++;
                }
            });

            const badBehaviorReportsCount = reports.filter(r => r.studentNumber === s.numeroEleve && r.caseType === 'behavior').length;

            const rawScore = gradingDist.comportement - (absences * 1.0 + noKits * 0.5 + lates * 0.25 + badBehaviorReportsCount * 1.0);
            const autoScore = Number(Math.max(0, rawScore).toFixed(2));

            if (activeTab === 'team_games') {
              const currentSportName = sports.find(sp => sp.id === currentSport)?.labelAr || 'الرياضة الجماعية';
              const existingSportEval = getStudentSportEvaluation(existing, currentSport) || {
                sportId: currentSport,
                sportName: currentSportName
              };
              const updatedSportEval: SportActivityEvaluation = {
                ...existingSportEval,
                sportId: currentSport,
                sportName: currentSportName,
                comportement: autoScore
              };
              const noteM = (updatedSportEval.techIndiv || 0) + (updatedSportEval.collectif || 0);
              updatedSportEval.motrice = Number(Math.min(teamGamesMotriceMax, noteM).toFixed(2));
              const total = (updatedSportEval.motrice || 0) + (updatedSportEval.comportement || 0) + (updatedSportEval.cognitive || 0);
              updatedSportEval.totalScore = Number(Math.min(20, total).toFixed(2));
              updatedSportEval.date = new Date().toISOString();

              updated.sportActivities = {
                ...(existing.sportActivities || {}),
                [currentSport]: updatedSportEval
              };
              updated.sportColComportement = autoScore;
              updated.noteComportement = autoScore;
              updated.sportCollectifScore = updatedSportEval.totalScore;
            } else {
              updated.gymNoteComportement = autoScore;

              // Recalculate Gym
              const diffS = updated.gymScoreDifficultes || 0;
              const exigS = updated.gymScoreExigences || 0;
              const enchS = updated.gymScoreEnchainement || 0;
              const execS = updated.gymScoreExecution !== undefined ? updated.gymScoreExecution : 2;
              updated.gymNoteMotrice = Number(Math.min(teamGamesMotriceMax, diffS + exigS + enchS + execS).toFixed(2));
              const total = (updated.gymNoteMotrice || 0) + (updated.gymNoteComportement || 0) + (updated.gymNoteCognitive || 0);
              updated.gymScoreTotal = Number(Math.min(20, total).toFixed(2));
            }

            return updated;
          });
        });

        showToast("تم احتساب ورصد نقط الجانب السلوكي تلقائياً بنجاح! ⚡");
    } catch (err) {
        console.error(err);
        showToast("خطأ أثناء حساب السلوك تلقائياً", "error");
    } finally {
        setIsLoading(false);
    }
  };

  const handleExportExcelAll = () => {
    if (students.length === 0) return;
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
        showToast("لم يتم تحميل مكتبة Excel بعد، يرجى المحاولة بعد قليل", "error");
        return;
    }

    if (activeTab === 'team_games') {
      const activeSportLabel = sports.find(sp => sp.id === currentSport)?.labelAr || 'الرياضة الجماعية';
      const headers = [
        "الرقم", "الاسم والنسب", "الجنس", "النشاط الجماعي",
        "التقنية الفردية (/6)", "اللعب الجماعي (/" + teamPlayMax + ")",
        "الجانب الحركي (/" + teamGamesMotriceMax + ")", "الجانب السلوكي (/" + gradingDist.comportement + ")",
        "الجانب المعرفي (/" + gradingDist.cognitive + ")", "المعدل الإجمالي (/20)", "ملاحظات"
      ];

      const rows = students.map((s, idx) => {
        const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
        const sportEval = getStudentSportEvaluation(test, currentSport);
        return [
          s.numeroEleve,
          s.nomEleve,
          s.sexe === 'F' ? 'أنثى' : 'ذكر',
          sportEval?.sportName || activeSportLabel,
          sportEval?.techIndiv !== undefined ? sportEval.techIndiv : '-',
          sportEval?.collectif !== undefined ? sportEval.collectif : '-',
          sportEval?.motrice !== undefined ? sportEval.motrice : '-',
          sportEval?.comportement !== undefined ? sportEval.comportement : '-',
          sportEval?.cognitive !== undefined ? sportEval.cognitive : '-',
          sportEval?.totalScore !== undefined ? sportEval.totalScore : '-',
          sportEval?.observation || '-'
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, activeSportLabel);
      XLSX.writeFile(wb, `تقويم_${activeSportLabel.replace(/\s+/g, '_')}_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    } else {
      const headers = [
        "الرقم", "الاسم والنسب", "الجنس",
        "صعوبة أ", "صعوبة ب", "صعوبة ج", "مجموع الصعوبة (/6)", "المتطلبات (/1.5)", "الربط والتركيب", "الأداء والتنفيذ (/2)",
        "الجانب الحركي (/" + teamGamesMotriceMax + ")", "الجانب السلوكي (/" + gradingDist.comportement + ")",
        "الجانب المعرفي (/" + gradingDist.cognitive + ")", "المعدل الإجمالي (/20)", "ملاحظات"
      ];

      const rows = students.map((s, idx) => {
        const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
        const scoreDiffA = test?.gymDiffScoreA !== undefined ? test.gymDiffScoreA : (test?.gymDiffCountA ? Number((test.gymDiffCountA * gymLevelCfg.coeffA).toFixed(2)) : '-');
        const scoreDiffB = test?.gymDiffScoreB !== undefined ? test.gymDiffScoreB : (test?.gymDiffCountB ? Number((test.gymDiffCountB * gymLevelCfg.coeffB).toFixed(2)) : '-');
        const scoreDiffC = test?.gymDiffScoreC !== undefined ? test.gymDiffScoreC : (test?.gymDiffCountC ? Number((test.gymDiffCountC * gymLevelCfg.coeffC).toFixed(2)) : '-');

        return [
          s.numeroEleve,
          s.nomEleve,
          s.sexe === 'F' ? 'أنثى' : 'ذكر',
          scoreDiffA,
          scoreDiffB,
          scoreDiffC,
          test?.gymScoreDifficultes !== undefined ? test.gymScoreDifficultes : '-',
          test?.gymScoreExigences !== undefined ? test.gymScoreExigences : '-',
          test?.gymScoreEnchainement !== undefined ? test.gymScoreEnchainement : '-',
          test?.gymScoreExecution !== undefined ? test.gymScoreExecution : '-',
          test?.gymNoteMotrice !== undefined ? test.gymNoteMotrice : '-',
          test?.gymNoteComportement !== undefined ? test.gymNoteComportement : '-',
          test?.gymNoteCognitive !== undefined ? test.gymNoteCognitive : '-',
          test?.gymScoreTotal !== undefined ? test.gymScoreTotal : '-',
          test?.gymNoteObservation || '-'
        ];
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "تقويم الجمباز");
      XLSX.writeFile(wb, `تقويم_الجمباز_${selectedClass.replace(/\s+/g, '_')}.xlsx`);
    }
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setIsLoading(true);
    try {
      await savePhysicalTests(selectedClass, physicalTests);
      showToast(activeTab === 'team_games' ? "تم حفظ نقط الرياضة الجماعية بنجاح! 🏀" : "تم حفظ نقط ومكونات الجمباز بنجاح! 🤸", 'success');
    } catch (err) {
      showToast("خطأ أثناء حفظ البيانات", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyBulkComportementCognitive = (type: 'comportement' | 'cognitive', value: string) => {
    const val = value === '' ? undefined : Number(value);
    const max = type === 'comportement' ? gradingDist.comportement : gradingDist.cognitive;

    if (val !== undefined && (val < 0 || val > max)) {
      showToast(`النقطة القصوى هي ${max}`, 'error');
      return;
    }

    setPhysicalTests(prev => {
      return students.map(s => {
        const existing = prev.find(t => t.numeroEleve === s.numeroEleve) || {
          numeroEleve: s.numeroEleve,
          nomEleve: s.nomEleve,
          sexe: s.sexe,
          date: new Date().toISOString()
        };

        const updated = { ...existing } as PhysicalTests;
        
        if (activeTab === 'team_games') {
          const currentSportName = sports.find(sp => sp.id === currentSport)?.labelAr || 'الرياضة الجماعية';
          const existingSport = getStudentSportEvaluation(existing, currentSport) || {
            sportId: currentSport,
            sportName: currentSportName
          };

          const updatedSport: SportActivityEvaluation = {
            ...existingSport,
            sportId: currentSport,
            sportName: currentSportName,
            ...(type === 'comportement' ? { comportement: val } : { cognitive: val }),
            date: new Date().toISOString()
          };

          // Recalculate
          const noteM = (updatedSport.techIndiv || 0) + (updatedSport.collectif || 0);
          updatedSport.motrice = Number(Math.min(teamGamesMotriceMax, noteM).toFixed(2));
          const total = (updatedSport.motrice || 0) + (updatedSport.comportement || 0) + (updatedSport.cognitive || 0);
          updatedSport.totalScore = Number(Math.min(20, total).toFixed(2));

          updated.sportActivities = {
            ...(updated.sportActivities || {}),
            [currentSport]: updatedSport
          };

          if (currentSport === 'football') {
            if (type === 'comportement') updated.sportColComportement = val;
            else updated.sportColCognitive = val;
            updated.sportCollectifScore = updatedSport.totalScore;
          }
        } else {
          if (type === 'comportement') {
            updated.gymNoteComportement = val;
          } else {
            updated.gymNoteCognitive = val;
          }
          // Recalculate Gym
          const diffS = updated.gymScoreDifficultes || 0;
          const exigS = updated.gymScoreExigences || 0;
          const enchS = updated.gymScoreEnchainement || 0;
          const execS = updated.gymScoreExecution !== undefined ? updated.gymScoreExecution : 2;
          updated.gymNoteMotrice = Number(Math.min(teamGamesMotriceMax, diffS + exigS + enchS + execS).toFixed(2));
          const total = (updated.gymNoteMotrice || 0) + (updated.gymNoteComportement || 0) + (updated.gymNoteCognitive || 0);
          updated.gymScoreTotal = Number(Math.min(20, total).toFixed(2));
        }

        return updated;
      });
    });

    showToast(`تم تعميم نقطة الجانب ${type === 'comportement' ? 'السلوكي' : 'المعرفي'} على الجميع بنجاح! ⚡`);
  };

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.nomEleve.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.numeroEleve.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const activeSportInfo = sports.find(s => s.id === currentSport);

  const handleAddSport = () => {
    if (!newSportAr.trim()) return;
    addSport(newSportAr, newSportAr, newSportIcon);
    setNewSportAr('');
    setIsAddSportOpen(false);
  };

  const handleDeleteSport = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا النشاط الرياضي؟')) {
        deleteSport(id);
        if (currentSport === id) {
            setCurrentSport(sports[0]?.id);
        }
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <UserGroupIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span>فضاء تقويم الألعاب الجماعية والجمباز</span>
              <span className="text-xs bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold px-3 py-1 rounded-full border border-indigo-200">
                {classLevelLabel}
              </span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              منصة رصد نقط ومكونات التقييم الحركي والسلوكي والمعرفي طبقاً للتوجيهات التربوية المغربية
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center md:justify-end gap-2.5 w-full md:w-auto">
          <div className="bg-gray-50 dark:bg-gray-700/60 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-600 flex items-center justify-center gap-2 w-full sm:w-auto">
             <span className="text-xs font-bold text-gray-500 dark:text-gray-400 ps-1.5">القسم:</span>
             <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="bg-white dark:bg-gray-800 border-none font-bold text-xs text-gray-900 dark:text-white rounded-xl px-2.5 py-1.5 focus:ring-0 shadow-xs flex-1 sm:flex-initial cursor-pointer"
             >
                {classList.map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                ))}
             </select>
          </div>

          {isSaving && (
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-100 dark:border-amber-800">
                <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[10px] font-bold">حفظ تلقائي...</span>
             </div>
          )}

          {/* Unified Centered Action Dock on Mobile with Small Icons */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 bg-gray-50/70 dark:bg-gray-900/40 p-1.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-2xs w-full sm:w-auto">
            <button
              onClick={() => handleOpenQuickEval()}
              disabled={isLoading || students.length === 0}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[11px] sm:text-xs font-black rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="فتح نافذة التقويم السريع بالضغط ووضع نقطة كاملة وتوزيعها تلقائياً"
            >
              <BoltIcon className="w-3.5 h-3.5 shrink-0" />
              <span>التقويم السريع</span>
            </button>

            <button
              onClick={handleAutoCalculateBehaviorAll}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] sm:text-xs font-black rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="حساب نقط السلوك تلقائياً من سجل الغياب والتقارير السلوكية"
            >
              <SparklesIcon className="w-3.5 h-3.5 shrink-0" />
              <span>السلوك آلياً</span>
            </button>

            <button
              onClick={handleExportExcelAll}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] sm:text-xs font-black rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="تصدير هذه النقط والتقويم الحالي على شكل ملف Excel"
            >
              <ArrowDownTrayIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Excel</span>
            </button>

            <button
              onClick={handleSave}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] sm:text-xs font-black rounded-xl shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title="حفظ النقط في قاعدة البيانات"
            >
              <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
              <span>حفظ النقط</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs navigation for Collective Games vs Gymnastics - Centered on mobile */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 gap-1.5 sm:gap-2 justify-center sm:justify-start">
        <button
          type="button"
          onClick={() => setActiveTab('team_games')}
          className={`px-3 sm:px-5 py-2 sm:py-3 rounded-t-2xl font-black text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'team_games'
              ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 shadow-xs'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span>🏀</span>
          <span>تقويم الألعاب الجماعية</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gymnastics')}
          className={`px-3 sm:px-5 py-2 sm:py-3 rounded-t-2xl font-black text-[11px] sm:text-xs transition flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'gymnastics'
              ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 border-t-2 border-indigo-600 dark:border-indigo-400 shadow-xs'
              : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          <span>🤸</span>
          <span>تقويم رياضة الجمباز</span>
        </button>
      </div>

      {/* 🏀 TAB 1: TEAM COLLECTIVE GAMES */}
      {activeTab === 'team_games' && (
        <div className="space-y-6">
          {/* Sport Selector Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-xs border border-gray-100 dark:border-gray-700 w-full">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-grow">
              <span className="text-xs font-black text-gray-500 dark:text-gray-400 shrink-0">النشاط الرياضي الجماعي الحالي:</span>
              <div className="relative flex-grow sm:max-w-xs">
                <select
                  value={currentSport}
                  onChange={(e) => setCurrentSport(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-extrabold text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {sports.map(sport => (
                    <option key={sport.id} value={sport.id}>
                      {sport.icon} {language === 'ar' ? sport.labelAr : sport.labelFr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              {currentSport !== 'football' && (
                <button
                  type="button"
                  onClick={(e) => handleDeleteSport(e, currentSport)}
                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-700 transition active:scale-95 cursor-pointer"
                  title="حذف هذا النشاط الرياضي"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsAddSportOpen(true)}
                className="px-3 py-2 rounded-xl text-xs font-black transition bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1.5 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 active:scale-95 cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>إضافة نشاط جديد</span>
              </button>
            </div>
          </div>

          {/* Quick Info & Bulk scoring */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Rubric details card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 space-y-2">
              <h3 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                <span>📑</span>
                <span>توزيع تنقيط الألعاب الجماعية المعتمد (حسب المستوى):</span>
              </h3>
              <div className="text-[11px] text-indigo-900 dark:text-indigo-400 space-y-1.5">
                <p>• الجانب الحركي: <strong>{gradingDist.motrice} نقاط</strong> (مقسمة كالتالي:)</p>
                <ul className="list-disc list-inside ps-2 font-bold space-y-0.5">
                  <li>التقنية الفردية (التحكم والتمرير والارتداد): <strong>{teamGamesIndivTechMax} نقاط</strong></li>
                  <li>اللعب الجماعي (الهجوم والدفاع والانسجام): <strong>{teamPlayMax} نقاط</strong></li>
                </ul>
                <p className="pt-1 border-t border-indigo-100 dark:border-indigo-900/40">• الجانب السلوكي والوجداني: <strong>{gradingDist.comportement} نقاط</strong></p>
                <p>• الجانب المعرفي والقواعد الرياضية: <strong>{gradingDist.cognitive} نقاط</strong></p>
              </div>
            </div>

            {/* Search and general controls */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/80 flex flex-col justify-center space-y-3">
              <label className="block text-xs font-black text-gray-500">البحث باسم التلميذ:</label>
              <div className="relative">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="أدخل اسم التلميذ للبحث السريع..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Quick Bulk Scoring */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/80 flex flex-col justify-center space-y-3">
              <label className="block text-xs font-black text-gray-500">منح نقطة موحدة جماعية لجميع تلاميذ القسم:</label>
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1">
                  <select
                    id="bulk-type-tg"
                    className="w-1/2 p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-bold bg-gray-50 dark:bg-gray-700 cursor-pointer"
                  >
                    <option value="comportement">الجانب السلوكي (/{gradingDist.comportement})</option>
                    <option value="cognitive">الجانب المعرفي (/{gradingDist.cognitive})</option>
                  </select>
                  <input
                    id="bulk-value-tg"
                    type="number"
                    step="0.25"
                    placeholder="النقطة"
                    className="w-1/2 p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-bold bg-gray-50 dark:bg-gray-700 text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const type = (document.getElementById('bulk-type-tg') as HTMLSelectElement).value as any;
                    const value = (document.getElementById('bulk-value-tg') as HTMLInputElement).value;
                    handleApplyBulkComportementCognitive(type, value);
                  }}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black active:scale-95 transition cursor-pointer"
                >
                  تطبيق
                </button>
              </div>
              <p className="text-[10px] text-gray-400">مثالي لإدخال نقط السلوك أو الاختبار المعرفي لجميع التلاميذ دفعة واحدة.</p>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4 min-w-[200px]">التلميذ(ة)</th>
                    <th className="p-4 text-center">التقنية الفردية (/6)</th>
                    <th className="p-4 text-center">اللعب الجماعي (/{teamPlayMax})</th>
                    <th className="p-4 text-center text-indigo-600 dark:text-indigo-400">الحركي (/{gradingDist.motrice})</th>
                    <th className="p-4 text-center">السلوكي (/{gradingDist.comportement})</th>
                    <th className="p-4 text-center">المعرفي (/{gradingDist.cognitive})</th>
                    <th className="p-4 text-center bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-black">المجموع (/20)</th>
                    <th className="p-4 min-w-[150px]">ملاحظات بيداغوجية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-bold">
                  {filteredStudents.map((s, idx) => {
                    const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
                    const sportEval = getStudentSportEvaluation(test, currentSport);
                    const tech = sportEval?.techIndiv;
                    const colScore = sportEval?.collectif;
                    const behave = sportEval?.comportement;
                    const cogn = sportEval?.cognitive;
                    const motriceSum = sportEval?.motrice;
                    const finalS = sportEval?.totalScore;
                    const obs = sportEval?.observation || '';

                    return (
                      <tr key={s.numeroEleve} className="hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-colors">
                        <td className="p-4 text-center text-gray-400 font-black">{idx + 1}</td>
                        <td 
                          className="p-4 cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors group"
                          onClick={() => handleOpenQuickEval(s.numeroEleve)}
                          title="اضغط لفتح نافذة التقويم السريع ووضع نقطة كاملة"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="sm" />
                              <div>
                                <div className="font-extrabold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                  <span>{s.nomEleve}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono font-normal">{s.numeroEleve}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickEval(s.numeroEleve);
                              }}
                              className="px-2 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition active:scale-95 text-[10px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="تقويم سريع"
                            >
                              <BoltIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>تقويم ⚡</span>
                            </button>
                          </div>
                        </td>
                        
                        {/* Technique Individuelle /6 */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max="6"
                            value={tech === undefined ? '' : tech}
                            onChange={(e) => handleTeamGamesScoreChange(s.numeroEleve, 'sportColTechIndiv', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* اللعب الجماعي */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={teamPlayMax}
                            value={colScore === undefined ? '' : colScore}
                            onChange={(e) => handleTeamGamesScoreChange(s.numeroEleve, 'sportColCollectif', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* Motrice sum */}
                        <td className="p-4 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                          {motriceSum === undefined ? '--' : motriceSum}
                        </td>

                        {/* Comportement */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={gradingDist.comportement}
                            value={behave === undefined ? '' : behave}
                            onChange={(e) => handleTeamGamesScoreChange(s.numeroEleve, 'sportColComportement', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* Cognitive */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={gradingDist.cognitive}
                            value={cogn === undefined ? '' : cogn}
                            onChange={(e) => handleTeamGamesScoreChange(s.numeroEleve, 'sportColCognitive', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* Total Note /20 */}
                        <td className="p-4 text-center bg-indigo-50 dark:bg-indigo-950/30 text-sm font-black text-indigo-700 dark:text-indigo-400">
                          {finalS === undefined ? '--' : finalS}
                        </td>

                        {/* Notes */}
                        <td className="p-4">
                          <input 
                            type="text"
                            value={obs}
                            onChange={(e) => handleTeamGamesNoteChange(s.numeroEleve, e.target.value)}
                            placeholder="ملاحظات الألعاب الجماعية..."
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-1 focus:ring-indigo-500 font-bold"
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={10} className="p-12 text-center text-gray-400">
                        <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="font-bold">لا يوجد تلاميذ يطابقون البحث في هذا القسم</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 🤸 TAB 2: GYMNASTIQUE (الجمباز) */}
      {activeTab === 'gymnastics' && (
        <div className="space-y-6">
          {/* Quick Info & Bulk scoring for Gym */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gym Rubric details card (from uploaded image) */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/10 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 space-y-2 text-right" dir="rtl">
              <h3 className="font-extrabold text-xs text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                <span>🤸</span>
                <span>شبكة تقويم الجمباز حسب التوجيهات الرسمية المغربية:</span>
              </h3>
              <div className="text-[11px] text-indigo-900 dark:text-indigo-400 space-y-1.5">
                <p>• الجانب الحركي (معارف مسطرية): <strong>{gradingDist.motrice} نقاط إجمالاً</strong> مقسمة كالتالي:</p>
                <ul className="list-disc list-inside ps-2 font-bold space-y-0.5">
                  <li>الصعوبة مقسمة (Difficulté): <strong>6 نقاط</strong> (أ: ×{gymLevelCfg.coeffA}ن | ب: ×{gymLevelCfg.coeffB}ن | ج: ×{gymLevelCfg.coeffC}ن) — {gymLevelCfg.standardFormula}</li>
                  <li>المتطلبات الخاصة (Exigences): <strong>1.5 نقطة</strong> (0.5 لكل عائلة حركية: 3 عائلات = 1.5 | عائلتان = 1 | عائلة = 0.5 | 0 عائلات = 0)</li>
                  <li>جودة الربط والتركيب (Enchaînement): <strong>{teamGamesMotriceMax === 14 ? '4.5' : teamGamesMotriceMax === 13 ? '3.5' : '2.5'} نقاط</strong></li>
                  <li>الأداء والتنفيذ (Exécution): <strong>2 نقطة</strong> (تُخصم منها أخطاء التنفيذ والربط)</li>
                </ul>
                <div className="pt-1.5 border-t border-indigo-100 dark:border-indigo-900/40">
                  <p>⚖️ <strong>خصومات الأداء:</strong> طفيف: `-0.1` | متوسط: `-0.2` | جسيم: `-0.3` | سقطة: `-0.5`</p>
                </div>
              </div>
            </div>

            {/* Search filter for Gym */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/80 flex flex-col justify-center space-y-3">
              <label className="block text-xs font-black text-gray-500">البحث باسم التلميذ في الجمباز:</label>
              <div className="relative">
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="أدخل اسم التلميذ للبحث السريع..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {/* Bulk Action for Gym */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700/80 flex flex-col justify-center space-y-3">
              <label className="block text-xs font-black text-gray-500">منح نقطة موحدة جماعية في الجمباز:</label>
              <div className="flex gap-2">
                <div className="flex-1 flex gap-1">
                  <select
                    id="bulk-type-gym"
                    className="w-1/2 p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-bold bg-gray-50 dark:bg-gray-700 cursor-pointer"
                  >
                    <option value="comportement">الجانب السلوكي (/{gradingDist.comportement})</option>
                    <option value="cognitive">الجانب المعرفي (/{gradingDist.cognitive})</option>
                  </select>
                  <input
                    id="bulk-value-gym"
                    type="number"
                    step="0.25"
                    placeholder="النقطة"
                    className="w-1/2 p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-xs font-bold bg-gray-50 dark:bg-gray-700 text-center"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const type = (document.getElementById('bulk-type-gym') as HTMLSelectElement).value as any;
                    const value = (document.getElementById('bulk-value-gym') as HTMLInputElement).value;
                    handleApplyBulkComportementCognitive(type, value);
                  }}
                  className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black active:scale-95 transition cursor-pointer"
                >
                  تطبيق
                </button>
              </div>
              <p className="text-[10px] text-gray-400">إدخال النقط السلوكية والمعرفية في الجمباز لجميع التلاميذ دفعة واحدة.</p>
            </div>
          </div>

          {/* Gymnastics Scoring Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4 min-w-[200px]">التلميذ(ة)</th>
                    <th className="p-4 text-center min-w-[290px]">
                      <div className="flex flex-col items-center">
                        <span className="text-indigo-700 dark:text-indigo-300 font-black">الصعوبة مقسمة (أ، ب، ج) (/6 ن)</span>
                        <span className="text-[9px] font-normal text-gray-500 dark:text-gray-400">{gymLevelCfg.standardFormula}</span>
                      </div>
                    </th>
                    <th className="p-4 text-center min-w-[160px]">
                      <div className="flex flex-col items-center">
                        <span className="text-indigo-700 dark:text-indigo-300 font-black">المتطلبات (/1.5 ن)</span>
                        <span className="text-[9px] font-normal text-gray-500 dark:text-gray-400">(0.5 لكل عائلة حركية)</span>
                      </div>
                    </th>
                    <th className="p-4 text-center">الربط والتركيب (/{teamGamesMotriceMax === 14 ? '4.5' : teamGamesMotriceMax === 13 ? '3.5' : '2.5'} ن)</th>
                    <th className="p-4 text-center">الأداء والتنفيذ (/2 ن)<br/><span className="text-[9px] font-normal text-gray-400">(خصومات الفاولات)</span></th>
                    <th className="p-4 text-center text-indigo-600 dark:text-indigo-400">الحركي (/{gradingDist.motrice} ن)</th>
                    <th className="p-4 text-center">السلوكي (/{gradingDist.comportement} ن)</th>
                    <th className="p-4 text-center">المعرفي (/{gradingDist.cognitive} ن)</th>
                    <th className="p-4 text-center bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 font-black">المجموع (/20)</th>
                    <th className="p-4 min-w-[150px]">ملاحظات الجمباز</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60 font-bold">
                  {filteredStudents.map((s, idx) => {
                    const test = physicalTests.find(t => t.numeroEleve === s.numeroEleve);
                    const diffA = test?.gymDiffCountA ?? 0;
                    const diffB = test?.gymDiffCountB ?? 0;
                    const diffC = test?.gymDiffCountC ?? 0;
                    
                    const scoreDiffA = test?.gymDiffScoreA !== undefined ? test.gymDiffScoreA : Number((diffA * gymLevelCfg.coeffA).toFixed(2));
                    const scoreDiffB = test?.gymDiffScoreB !== undefined ? test.gymDiffScoreB : Number((diffB * gymLevelCfg.coeffB).toFixed(2));
                    const scoreDiffC = test?.gymDiffScoreC !== undefined ? test.gymDiffScoreC : Number((diffC * gymLevelCfg.coeffC).toFixed(2));
                    const scoreDiff = test?.gymScoreDifficultes !== undefined ? test.gymScoreDifficultes : Number(Math.min(6, scoreDiffA + scoreDiffB + scoreDiffC).toFixed(2));
                    const scoreExig = test?.gymScoreExigences;
                    const scoreEnch = test?.gymScoreEnchainement;
                    const scoreExec = test?.gymScoreExecution;
                    
                    const behave = test?.gymNoteComportement;
                    const cogn = test?.gymNoteCognitive;
                    const motriceSum = test?.gymNoteMotrice;
                    const totalS = test?.gymScoreTotal;
                    const obs = test?.gymNoteObservation || '';

                    const isStudentCalcActive = activeCalculatorStudent === s.numeroEleve;

                    return (
                      <tr key={s.numeroEleve} className="hover:bg-indigo-50/10 dark:hover:bg-indigo-950/10 transition-colors">
                        <td className="p-4 text-center text-gray-400 font-black">{idx + 1}</td>
                        <td 
                          className="p-4 cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors group"
                          onClick={() => handleOpenQuickEval(s.numeroEleve)}
                          title="اضغط لفتح نافذة التقويم السريع ووضع نقطة كاملة للجمباز"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <StudentAvatar photoUrl={s.photoUrl} nomEleve={s.nomEleve} sexe={s.sexe} size="sm" />
                              <div>
                                <div className="font-extrabold text-gray-900 dark:text-white text-sm group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                  <span>{s.nomEleve}</span>
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono font-normal">{s.numeroEleve}</div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenQuickEval(s.numeroEleve);
                              }}
                              className="px-2 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition active:scale-95 text-[10px] font-black flex items-center gap-1 shadow-2xs cursor-pointer"
                              title="تقويم سريع"
                            >
                              <BoltIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>تقويم ⚡</span>
                            </button>
                          </div>
                        </td>

                        {/* Difficultes /6 (Divided A, B, C scores & counts with full details) */}
                        <td className="p-3">
                          <div className="flex flex-col items-center gap-1.5 min-w-[270px]">
                            {/* 3 Divided Parts: A, B, C */}
                            <div className="grid grid-cols-3 gap-1 w-full text-[10px]">
                              {/* Part A */}
                              <div className="bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-1.5 flex flex-col items-center text-center">
                                <div className="flex items-center justify-between w-full font-black text-blue-900 dark:text-blue-300 mb-0.5">
                                  <span>أ (A)</span>
                                  <span className="text-[9px] text-blue-600 dark:text-blue-400">×{gymLevelCfg.coeffA}ن</span>
                                </div>
                                <div className="flex items-center gap-1 w-full justify-center">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="10"
                                    value={test?.gymDiffCountA === undefined || test.gymDiffCountA === null ? '' : test.gymDiffCountA} 
                                    onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymDiffCountA', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    title="عدد عناصر صعوبة أ"
                                    className="w-8 text-center p-0.5 text-[11px] border rounded-lg border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-800 font-bold"
                                  />
                                  <span className="text-gray-400 font-black">=</span>
                                  <input 
                                    type="number" 
                                    step="0.25"
                                    min="0" 
                                    max="6"
                                    value={scoreDiffA === undefined ? '' : scoreDiffA} 
                                    onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymDiffScoreA', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    title="نقطة صعوبة أ المقسمة"
                                    className="w-10 text-center p-0.5 text-[11px] border rounded-lg border-blue-400 bg-blue-100/70 dark:bg-blue-900/60 font-black text-blue-800 dark:text-blue-200"
                                  />
                                </div>
                                <span className="text-[8px] text-gray-500 font-bold mt-0.5">نقطة أ</span>
                              </div>

                              {/* Part B */}
                              <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-1.5 flex flex-col items-center text-center">
                                <div className="flex items-center justify-between w-full font-black text-purple-900 dark:text-purple-300 mb-0.5">
                                  <span>ب (B)</span>
                                  <span className="text-[9px] text-purple-600 dark:text-purple-400">×{gymLevelCfg.coeffB}ن</span>
                                </div>
                                <div className="flex items-center gap-1 w-full justify-center">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="10"
                                    value={test?.gymDiffCountB === undefined || test.gymDiffCountB === null ? '' : test.gymDiffCountB} 
                                    onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymDiffCountB', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    title="عدد عناصر صعوبة ب"
                                    className="w-8 text-center p-0.5 text-[11px] border rounded-lg border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 font-bold"
                                  />
                                  <span className="text-gray-400 font-black">=</span>
                                  <input 
                                    type="number" 
                                    step="0.25"
                                    min="0" 
                                    max="6"
                                    value={scoreDiffB === undefined ? '' : scoreDiffB} 
                                    onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymDiffScoreB', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    title="نقطة صعوبة ب المقسمة"
                                    className="w-10 text-center p-0.5 text-[11px] border rounded-lg border-purple-400 bg-purple-100/70 dark:bg-purple-900/60 font-black text-purple-800 dark:text-purple-200"
                                  />
                                </div>
                                <span className="text-[8px] text-gray-500 font-bold mt-0.5">نقطة ب</span>
                              </div>

                              {/* Part C */}
                              <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-1.5 flex flex-col items-center text-center">
                                <div className="flex items-center justify-between w-full font-black text-amber-900 dark:text-amber-300 mb-0.5">
                                  <span>ج (C)</span>
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400">×{gymLevelCfg.coeffC}ن</span>
                                </div>
                                <div className="flex items-center gap-1 w-full justify-center">
                                  <input 
                                    type="number" 
                                    min="0" 
                                    max="10"
                                    value={test?.gymDiffCountC === undefined || test.gymDiffCountC === null ? '' : test.gymDiffCountC} 
                                    onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymDiffCountC', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    title="عدد عناصر صعوبة ج"
                                    className="w-8 text-center p-0.5 text-[11px] border rounded-lg border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 font-bold"
                                  />
                                  <span className="text-gray-400 font-black">=</span>
                                  <input 
                                    type="number" 
                                    step="0.25"
                                    min="0" 
                                    max="6"
                                    value={scoreDiffC === undefined ? '' : scoreDiffC} 
                                    onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymDiffScoreC', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="0"
                                    title="نقطة صعوبة ج المقسمة"
                                    className="w-10 text-center p-0.5 text-[11px] border rounded-lg border-amber-400 bg-amber-100/70 dark:bg-amber-900/60 font-black text-amber-800 dark:text-amber-200"
                                  />
                                </div>
                                <span className="text-[8px] text-gray-500 font-bold mt-0.5">نقطة ج</span>
                              </div>
                            </div>

                            {/* Total Difficulty & Details Button */}
                            <div className="flex items-center justify-between w-full gap-1 pt-1 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-black text-gray-500">المجموع:</span>
                                <input 
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max="6"
                                  value={scoreDiff === undefined || scoreDiff === null ? '' : scoreDiff}
                                  onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymScoreDifficultes', e.target.value)}
                                  placeholder="0.0"
                                  title="مجموع نقطة الصعوبة من 6 ن"
                                  className="w-14 text-center py-0.5 rounded-lg border border-indigo-300 bg-indigo-50/50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 font-black text-xs"
                                />
                                <span className="text-[10px] font-black text-gray-400">/6ن</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedDiffDetailsStudent(expandedDiffDetailsStudent === s.numeroEleve ? null : s.numeroEleve)}
                                className="px-2 py-0.5 rounded-lg text-[9px] font-black bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs"
                                title="إظهار تفاصيل احتساب الصعوبة"
                              >
                                <span>🔍</span>
                                <span>التفاصيل</span>
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Exigences Spécifiques /1.5 (families) - Displays ONLY score, e.g. 1.5 or 1 or 0.5 or 0 */}
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center gap-1 min-w-[130px]">
                            {/* Score Display - ONLY the numerical point */}
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                max="1.5"
                                value={scoreExig === undefined || scoreExig === null ? '' : scoreExig}
                                onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymScoreExigences', e.target.value)}
                                placeholder="--"
                                className="w-16 text-center py-1 rounded-xl border-2 border-indigo-200 dark:border-gray-600 bg-white dark:bg-gray-700 font-black text-sm text-indigo-700 dark:text-indigo-300 shadow-2xs"
                                title="نقطة المتطلبات فقط"
                              />
                              <span className="text-[10px] font-black text-gray-400">/1.5</span>
                            </div>

                            {/* Quick Family Selectors: clicking sets and shows ONLY the point */}
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleGymScoreChange(s.numeroEleve, 'gymScoreExigences', 1.5)}
                                className={`w-8 py-1 rounded-lg text-xs font-black transition cursor-pointer active:scale-95 text-center ${
                                  scoreExig === 1.5
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-400'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800'
                                }`}
                                title="3 عائلات حركية فأكثر: يمنح نقطة 1.5"
                              >
                                1.5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGymScoreChange(s.numeroEleve, 'gymScoreExigences', 1.0)}
                                className={`w-8 py-1 rounded-lg text-xs font-black transition cursor-pointer active:scale-95 text-center ${
                                  scoreExig === 1.0
                                    ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400'
                                    : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 border border-blue-200 dark:border-blue-800'
                                }`}
                                title="عائلتان حركيتان: يمنح نقطة 1.0"
                              >
                                1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGymScoreChange(s.numeroEleve, 'gymScoreExigences', 0.5)}
                                className={`w-8 py-1 rounded-lg text-xs font-black transition cursor-pointer active:scale-95 text-center ${
                                  scoreExig === 0.5
                                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400'
                                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800'
                                }`}
                                title="عائلة واحدة: يمنح نقطة 0.5"
                              >
                                0.5
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGymScoreChange(s.numeroEleve, 'gymScoreExigences', 0.0)}
                                className={`w-8 py-1 rounded-lg text-xs font-black transition cursor-pointer active:scale-95 text-center ${
                                  scoreExig === 0.0
                                    ? 'bg-gray-700 text-white shadow-xs ring-2 ring-gray-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 border border-gray-200 dark:border-gray-600'
                                }`}
                                title="0 عائلات: يمنح نقطة 0"
                              >
                                0
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Enchainement /4.5 or 3.5 or 2.5 */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={teamGamesMotriceMax === 14 ? 4.5 : teamGamesMotriceMax === 13 ? 3.5 : 2.5}
                            value={scoreEnch === undefined ? '' : scoreEnch}
                            onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymScoreEnchainement', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* Execution /2 (with interactive fault counts) */}
                        <td className="p-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setActiveCalculatorStudent(isStudentCalcActive ? null : s.numeroEleve)}
                              className="px-2 py-0.5 rounded text-[10px] font-black border border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 hover:bg-amber-100 flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              <span>🧮</span>
                              <span>حساب الأخطاء</span>
                            </button>

                            {/* Collapsible Deduction Panel */}
                            {isStudentCalcActive && (
                              <div className="absolute z-10 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl space-y-2 text-right mt-8" dir="rtl">
                                <h4 className="text-[11px] font-black border-b pb-1 text-amber-600">حاسبة أخطاء الأداء (الجمباز):</h4>
                                <div className="space-y-1.5 text-[10px]">
                                  <div className="flex items-center justify-between gap-4">
                                    <span>خطأ طفيف (-0.1):</span>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={test?.gymExecutionFaultsPetite || 0}
                                      onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymExecutionFaultsPetite', Number(e.target.value))}
                                      className="w-10 text-center border rounded border-gray-300 dark:border-gray-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span>خطأ متوسط (-0.2):</span>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={test?.gymExecutionFaultsMoyenne || 0}
                                      onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymExecutionFaultsMoyenne', Number(e.target.value))}
                                      className="w-10 text-center border rounded border-gray-300 dark:border-gray-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span>خطأ جسيم (-0.3):</span>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={test?.gymExecutionFaultsGrossiere || 0}
                                      onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymExecutionFaultsGrossiere', Number(e.target.value))}
                                      className="w-10 text-center border rounded border-gray-300 dark:border-gray-600"
                                    />
                                  </div>
                                  <div className="flex items-center justify-between gap-4">
                                    <span>سقوط (-0.5):</span>
                                    <input 
                                      type="number" 
                                      min="0"
                                      value={test?.gymExecutionFaultsChutes || 0}
                                      onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymExecutionFaultsChutes', Number(e.target.value))}
                                      className="w-10 text-center border rounded border-gray-300 dark:border-gray-600"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setActiveCalculatorStudent(null)}
                                  className="w-full py-1 mt-1 bg-amber-500 text-white rounded text-[10px] font-black"
                                >
                                  إغلاق الحاسبة
                                </button>
                              </div>
                            )}

                            <input 
                              type="number"
                              step="0.1"
                              min="0"
                              max="2"
                              value={scoreExec === undefined ? '' : scoreExec}
                              onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymScoreExecution', e.target.value)}
                              placeholder="--"
                              className="w-16 mx-auto block text-center py-0.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-extrabold"
                            />
                          </div>
                        </td>

                        {/* Calculated Gym Note Motrice (الحركي) */}
                        <td className="p-4 text-center text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/10">
                          {motriceSum === undefined ? '--' : motriceSum}
                        </td>

                        {/* Comportement */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={gradingDist.comportement}
                            value={behave === undefined ? '' : behave}
                            onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymNoteComportement', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* Cognitive */}
                        <td className="p-4 text-center">
                          <input 
                            type="number"
                            step="0.25"
                            min="0"
                            max={gradingDist.cognitive}
                            value={cogn === undefined ? '' : cogn}
                            onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymNoteCognitive', e.target.value)}
                            placeholder="--"
                            className="w-16 mx-auto block text-center py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-black"
                          />
                        </td>

                        {/* Final score out of 20 */}
                        <td className="p-4 text-center bg-indigo-50 dark:bg-indigo-950/30 text-sm font-black text-indigo-700 dark:text-indigo-400">
                          {totalS === undefined ? '--' : totalS}
                        </td>

                        {/* Observation */}
                        <td className="p-4">
                          <input 
                            type="text"
                            value={obs}
                            onChange={(e) => handleGymScoreChange(s.numeroEleve, 'gymNoteObservation', e.target.value)}
                            placeholder="ملاحظات الجمباز..."
                            className="w-full px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-1 focus:ring-indigo-500 font-bold"
                          />
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan={11} className="p-12 text-center text-gray-400">
                        <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="font-bold">لا يوجد تلاميذ يطابقون البحث في هذا القسم</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Gymnastics Difficulty Details Dialog */}
      {expandedDiffDetailsStudent && (() => {
        const detStudent = students.find(s => s.numeroEleve === expandedDiffDetailsStudent);
        const detTest = physicalTests.find(t => t.numeroEleve === expandedDiffDetailsStudent);
        const cntA = detTest?.gymDiffCountA ?? 0;
        const cntB = detTest?.gymDiffCountB ?? 0;
        const cntC = detTest?.gymDiffCountC ?? 0;
        const scA = detTest?.gymDiffScoreA !== undefined ? detTest.gymDiffScoreA : Number((cntA * gymLevelCfg.coeffA).toFixed(2));
        const scB = detTest?.gymDiffScoreB !== undefined ? detTest.gymDiffScoreB : Number((cntB * gymLevelCfg.coeffB).toFixed(2));
        const scC = detTest?.gymDiffScoreC !== undefined ? detTest.gymDiffScoreC : Number((cntC * gymLevelCfg.coeffC).toFixed(2));
        const totalD = detTest?.gymScoreDifficultes !== undefined ? detTest.gymScoreDifficultes : Number(Math.min(6, scA + scB + scC).toFixed(2));

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" dir="rtl">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5">
              <div className="flex items-center justify-between border-b pb-3 border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-xl">
                    🤸
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-gray-900 dark:text-white">
                      تفاصيل احتساب نقطة الصعوبة (Difficulté)
                    </h3>
                    <p className="text-[11px] text-gray-400 font-bold">
                      {detStudent?.nomEleve} ({detStudent?.numeroEleve}) • {gymLevelCfg.levelLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedDiffDetailsStudent(null)}
                  className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Level Guideline Notice */}
              <div className="bg-indigo-50/60 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-300 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5">
                  <span>📐</span>
                  <span>معيار التوجيهات التربوية الرسمية لهذا المستوى:</span>
                </div>
                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                  {gymLevelCfg.standardFormula}
                </p>
              </div>

              {/* Detailed Breakdown for A, B, and C */}
              <div className="space-y-3">
                {/* Element A */}
                <div className="bg-blue-50/70 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-xs text-blue-900 dark:text-blue-300">
                      عناصر صعوبة أ (Éléments A)
                    </div>
                    <div className="text-[11px] text-blue-700 dark:text-blue-400 font-bold">
                      قيمة العنصر الواحد: <strong>{gymLevelCfg.coeffA} نقطة</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffCountA', Math.max(0, cntA - 1))}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-blue-200 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-xs">{cntA}</span>
                      <button
                        type="button"
                        onClick={() => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffCountA', cntA + 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-blue-200 text-blue-700 dark:text-blue-300 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-gray-400 font-bold">× {gymLevelCfg.coeffA} =</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="6"
                      value={scA}
                      onChange={(e) => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffScoreA', Number(e.target.value))}
                      className="w-14 text-center py-1 rounded-xl bg-white dark:bg-gray-700 border border-blue-300 font-black text-xs text-blue-900 dark:text-blue-200 shadow-2xs"
                      title="تعديل نقطة أ يدوياً"
                    />
                    <span className="text-xs font-black text-blue-900 dark:text-blue-300">ن</span>
                  </div>
                </div>

                {/* Element B */}
                <div className="bg-purple-50/70 dark:bg-purple-950/30 p-3.5 rounded-2xl border border-purple-200 dark:border-purple-900/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-xs text-purple-900 dark:text-purple-300">
                      عناصر صعوبة ب (Éléments B)
                    </div>
                    <div className="text-[11px] text-purple-700 dark:text-purple-400 font-bold">
                      قيمة العنصر الواحد: <strong>{gymLevelCfg.coeffB} نقطة</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffCountB', Math.max(0, cntB - 1))}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-purple-200 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-xs">{cntB}</span>
                      <button
                        type="button"
                        onClick={() => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffCountB', cntB + 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-purple-200 text-purple-700 dark:text-purple-300 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-gray-400 font-bold">× {gymLevelCfg.coeffB} =</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="6"
                      value={scB}
                      onChange={(e) => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffScoreB', Number(e.target.value))}
                      className="w-14 text-center py-1 rounded-xl bg-white dark:bg-gray-700 border border-purple-300 font-black text-xs text-purple-900 dark:text-purple-200 shadow-2xs"
                      title="تعديل نقطة ب يدوياً"
                    />
                    <span className="text-xs font-black text-purple-900 dark:text-purple-300">ن</span>
                  </div>
                </div>

                {/* Element C */}
                <div className="bg-amber-50/70 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-xs text-amber-900 dark:text-amber-300">
                      عناصر صعوبة ج (Éléments C)
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                      قيمة العنصر الواحد: <strong>{gymLevelCfg.coeffC} نقطة</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffCountC', Math.max(0, cntC - 1))}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-amber-200 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        -
                      </button>
                      <span className="w-8 text-center font-black text-xs">{cntC}</span>
                      <button
                        type="button"
                        onClick={() => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffCountC', cntC + 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-gray-700 border border-amber-200 text-amber-700 dark:text-amber-300 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95"
                      >
                        +
                      </button>
                    </div>
                    <span className="text-gray-400 font-bold">× {gymLevelCfg.coeffC} =</span>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      max="6"
                      value={scC}
                      onChange={(e) => handleGymScoreChange(expandedDiffDetailsStudent, 'gymDiffScoreC', Number(e.target.value))}
                      className="w-14 text-center py-1 rounded-xl bg-white dark:bg-gray-700 border border-amber-300 font-black text-xs text-amber-900 dark:text-amber-200 shadow-2xs"
                      title="تعديل نقطة ج يدوياً"
                    />
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300">ن</span>
                  </div>
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 rounded-2xl text-white flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs font-bold opacity-90">مجموع نقطة الصعوبة الإجمالي:</div>
                  <div className="text-[10px] font-mono opacity-80 mt-0.5">
                    ({scA}ن أ + {scB}ن ب + {scC}ن ج)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black font-mono">
                    {totalD} <span className="text-sm font-bold">/ 6.0</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setExpandedDiffDetailsStudent(null)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition active:scale-95 cursor-pointer shadow-md"
                >
                  حفظ وإغلاق
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Quick Evaluation Modal */}
      {isQuickEvalOpen && quickEvalStudentNumber && (
        <QuickEvaluationModal
          isOpen={isQuickEvalOpen}
          onClose={() => setIsQuickEvalOpen(false)}
          selectedClass={selectedClass}
          studentNumber={quickEvalStudentNumber}
          allStudents={filteredStudents.length > 0 ? filteredStudents : students}
          physicalTests={physicalTests}
          onSelectStudent={(num) => setQuickEvalStudentNumber(num)}
          onSaveStudentScores={handleSaveStudentScoresFromModal}
          initialMode={activeTab === 'team_games' ? 'team_games' : 'gymnastics'}
          currentSportId={currentSport}
          currentSportName={activeSportInfo?.labelAr || 'الألعاب الجماعية'}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 right-6 p-4 rounded-2xl shadow-2xl border text-sm font-bold flex items-center gap-3 animate-slide-up z-50 ${
            notification.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-rose-600 text-white border-rose-500'
        }`}>
            {notification.type === 'success' ? <CheckCircleIcon className="w-5 h-5" /> : <XMarkIcon className="w-5 h-5" />}
            <span>{notification.message}</span>
        </div>
      )}
    </div>
  );
};
