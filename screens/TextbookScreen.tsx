import React, { useState, useEffect, useMemo } from 'react';
import { TextbookSession, StudentIdentity } from '../types';
import { 
  getTextbookSessions, 
  saveTextbookSession, 
  deleteTextbookSession 
} from '../utils/textbookDb';
import { 
  getAllClasses, 
  getAttendanceSessions,
  ClassStats 
} from '../utils/db';
import { 
  DocumentTextIcon, 
  ClockIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  TrashIcon, 
  PencilSquareIcon,
  PlusIcon,
  InformationCircleIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  UserCircleIcon,
  AcademicCapIcon,
  SparklesIcon,
  TableCellsIcon,
  PrinterIcon
} from '../components/Icons';
import { useLanguage } from '../utils/i18n';
import { 
  exportTextbookToWord, 
  exportOfficialCahierGridToWord, 
  CahierGridRow, 
  OfficialCahierGridExportData 
} from '../utils/wordHelper';
import { 
  saveTeacherProfileToCloud, 
  fetchTeacherProfilesFromCloud 
} from '../utils/firebase';

const SAUT_LONGUEUR_ROWS: CahierGridRow[] = [
  { seanceNumber: 1, title: "Évaluer le niveau initial et prendre des repères de course d'élan", situation: "Situation: Test de performance et prise de marques", classDates: {} },
  { seanceNumber: 2, title: "Stabiliser la course d'élan pour une prise d'appel efficace", situation: "Situation: Le couloir des foulées bondissantes", classDates: {} },
  { seanceNumber: 3, title: "Améliorer l'efficacité de la phase d'appel", situation: "Situation: Ateliers de franchissement d'obstacles bas", classDates: {} },
  { seanceNumber: 4, title: "Travailler la coordination impulsion-envol", situation: "Situation: Sauts en longueur avec surélévation (plinth)", classDates: {} },
  { seanceNumber: 5, title: "Optimiser la trajectoire de vol et l'équilibration", situation: "Situation: Saut dans le sable avec cerceaux de réception", classDates: {} },
  { seanceNumber: 6, title: "Améliorer la réception pour maximiser la distance", situation: "Situation: Parcours de saut avec zone de chute ciblée", classDates: {} },
  { seanceNumber: 7, title: "Associer la vitesse d'élan et la précision de l'appel", situation: "Situation: Le duel du sauteur (progression de vitesse)", classDates: {} },
  { seanceNumber: 8, title: "Gestion de l'effort et concentration en contexte de compétition", situation: "Situation: Compétition par équipe : le record cumulé", classDates: {} },
  { seanceNumber: 9, title: "Régularité de la performance sur plusieurs essais", situation: "Situation: Simulacre de rencontre sportive officielle", classDates: {} },
  { seanceNumber: 10, title: "Évaluation finale et bilan des acquis", situation: "Situation: Passage noté en situation de concours", classDates: {} },
];

const BASKETBALL_ROWS: CahierGridRow[] = [
  { seanceNumber: 1, title: "Évaluation diagnostique et organisation du jeu collectif", situation: "Situation: Matchs réduits 3v3 et prise de repères", classDates: {} },
  { seanceNumber: 2, title: "Maîtriser le drible de progression et la protection de balle", situation: "Situation: Parcours de drible sous pression défensive", classDates: {} },
  { seanceNumber: 3, title: "Améliorer la précision des passes courtes et longues (poitrine/à terre)", situation: "Situation: Conservations de balle à 4v2", classDates: {} },
  { seanceNumber: 4, title: "Développer le tir en course (double pas) côté droit et gauche", situation: "Situation: Ateliers d'accès au panier en vitesse", classDates: {} },
  { seanceNumber: 5, title: "Organiser la contre-attaque rapide après récupération", situation: "Situation: Exercices de supériorité numérique 3v1 puis 3v2", classDates: {} },
  { seanceNumber: 6, title: "Mise en place de la défense individuelle et سرعة Démarquage", situation: "Situation: Dualité attaquant/défenseur sur demi-terrain", classDates: {} },
  { seanceNumber: 7, title: "Occupation rationnelle de l'espace et jeu sans ballon", situation: "Situation: Jeu placé avec zones d'attaque obligatoires", classDates: {} },
  { seanceNumber: 8, title: "Application des règles du jeu et arbitrage autonome", situation: "Situation: Tournoi interne avec rôles d'arbitres et marqueurs", classDates: {} },
  { seanceNumber: 9, title: "Régulation tactique et mise au point des systèmes simples", situation: "Situation: Matchs à thèmes (panier compté double)", classDates: {} },
  { seanceNumber: 10, title: "Évaluation sommative en situation de rencontre officielle", situation: "Situation: Tournoi d'évaluation finale noté", classDates: {} },
];

const HANDBALL_ROWS: CahierGridRow[] = [
  { seanceNumber: 1, title: "Évaluation initiale du niveau technico-tactique", situation: "Situation: Matchs 4v4 et observation des choix de jeu", classDates: {} },
  { seanceNumber: 2, title: "Développer la passe en suspension et la réception en mouvement", situation: "Situation: Circuit de passes en vagues à 3 joueurs", classDates: {} },
  { seanceNumber: 3, title: "Mise en œuvre du tir en extension au-dessus de la défense", situation: "Situation: Tirs aux 6m avec franchissement d'obstacles", classDates: {} },
  { seanceNumber: 4, title: "Organisation de la défense alignée 6-0 ou 5-1", situation: "Situation: Glissements défensifs et entraide sur la zone", classDates: {} },
  { seanceNumber: 5, title: "Création et exploitation des espaces libres (débordement)", situation: "Situation: Attaque placées 3v2 sur secteur central", classDates: {} },
  { seanceNumber: 6, title: "L'enclenchement de la contre-attaque sur ballon récupéré", situation: "Situation: Relance rapide du gardien vers les ailier(e)s", classDates: {} },
  { seanceNumber: 7, title: "Combinaisons tactiques simples (croisé, passe et va)", situation: "Situation: Ateliers de jeu combiné à deux et trois", classDates: {} },
  { seanceNumber: 8, title: "Gestion du score et respect des règles (3 pas, zone)", situation: "Situation: Rencontres arbitrées par les élèves", classDates: {} },
  { seanceNumber: 9, title: "Préparation collective au tournoi final", situation: "Situation: Matchs de cadrage à thèmes stratégiques", classDates: {} },
  { seanceNumber: 10, title: "Évaluation finale des apprentissages et du fair-play", situation: "Situation: Tournoi de bilan noté sur grille", classDates: {} },
];

const COURSE_VITESSE_ROWS: CahierGridRow[] = [
  { seanceNumber: 1, title: "Évaluation diagnostique du temps de réaction et vitesse maximale", situation: "Situation: Chronométrage 50m départ debout/accroupi", classDates: {} },
  { seanceNumber: 2, title: "Optimiser le départ accroupi (starting-blocks)", situation: "Situation: Signal sonore et poussée explosive sur 15m", classDates: {} },
  { seanceNumber: 3, title: "Travailler la fréquence et l'amplitude des foulées", situation: "Situation: Le couloir de lattes graduées à vitesse élevée", classDates: {} },
  { seanceNumber: 4, title: "Améliorer le maintien de la vitesse maximale (mise en action)", situation: "Situation: Courses lancées de 30m avec prise de temps", classDates: {} },
  { seanceNumber: 5, title: "Posture du corps et coordination bras/jambes en sprint", situation: "Situation: Ateliers éducatifs de course et gainage dynamique", classDates: {} },
  { seanceNumber: 6, title: "Coopération et transmission du témoin en relais 4x100m", situation: "Situation: Zone de passage du témoin à grande vitesse", classDates: {} },
  { seanceNumber: 7, title: "Gestion de la fin de course et franchissement de la ligne", situation: "Situation: Duels de sprinteurs sur 60m avec cassé de buste", classDates: {} },
  { seanceNumber: 8, title: "Entraînement en conditions de compétition", situation: "Situation: Séries qualificatives et finales par poules de niveau", classDates: {} },
  { seanceNumber: 9, title: "Régularité du chrono et ajustements individuels", situation: "Situation: Répétition de sprints avec récupération optimale", classDates: {} },
  { seanceNumber: 10, title: "Évaluation sommative finale chronométrée", situation: "Situation: Test noté sur 60m et efficacité du départ", classDates: {} },
];

const GYMNASTIQUE_ROWS: CahierGridRow[] = [
  { seanceNumber: 1, title: "Évaluation diagnostique des éléments gymniques de base", situation: "Situation: Parcours de découverte roulements et équilibres", classDates: {} },
  { seanceNumber: 2, title: "Maîtriser la roulade avant et arrière avec alignement", situation: "Situation: Ateliers sur plans inclinés et tapis de réception", classDates: {} },
  { seanceNumber: 3, title: "Travailler l'Appui Tendu Renversé (ATR) et le maintien", situation: "Situation: Éléments contre le mur et parade par partenaire", classDates: {} },
  { seanceNumber: 4, title: "Réaliser la roue (renversement latéral)", situation: "Situation: Couloirs tracés au sol et franchissement d'obstacles", classDates: {} },
  { seanceNumber: 5, title: "Apprendre les éléments de liaison et sauts gymniques", situation: "Situation: Enchaînements de saut extension et demi-tour", classDates: {} },
  { seanceNumber: 6, title: "Création d'un enchaînement individuel de 4 éléments", situation: "Situation: Composition sur grille de niveau A/B/C", classDates: {} },
  { seanceNumber: 7, title: "Mise en valeur de la posture et des réceptions stabilisées", situation: "Situation: Passage à blanc devant juges élèves", classDates: {} },
  { seanceNumber: 8, title: "Harmonie et fluidité du mouvement dans l'espace", situation: "Situation: Répétitions personnalisées avec corrections vidéo", classDates: {} },
  { seanceNumber: 9, title: "Répétition générale de l'enchaînement noté", situation: "Situation: Simulation d'examen avec fiche d'arbitrage", classDates: {} },
  { seanceNumber: 10, title: "Évaluation finale de l'enchaînement gymnique au sol", situation: "Situation: Passage individuel noté devant l'enseignant", classDates: {} },
];

interface TextbookScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

interface TeacherProfile {
  id: string;
  name: string;
  assignedClasses: string[];
  timetable: {
    [day: string]: {
      [slotId: string]: string;
    };
  };
}

const DAYS = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const SLOTS = [
  { id: '1', label: 'الحصة 1 (08:00 - 09:00)', time: '08:00 - 09:00' },
  { id: '2', label: 'الحصة 2 (09:00 - 10:00)', time: '09:00 - 10:00' },
  { id: '3', label: 'الحصة 3 (10:00 - 11:00)', time: '10:00 - 11:00' },
  { id: '4', label: 'الحصة 4 (11:00 - 12:00)', time: '11:00 - 12:00' },
];

const DEFAULT_TEACHERS: TeacherProfile[] = [
  {
    id: 'teacher_1',
    name: 'أحمد السعيدي',
    assignedClasses: [],
    timetable: {
      'الاثنين': { '1': '', '2': '', '3': '', '4': '' },
      'الثلاثاء': { '1': '', '2': '', '3': '', '4': '' },
      'الأربعاء': { '1': '', '2': '', '3': '', '4': '' },
      'الخميس': { '1': '', '2': '', '3': '', '4': '' },
      'الجمعة': { '1': '', '2': '', '3': '', '4': '' },
      'السبت': { '1': '', '2': '', '3': '', '4': '' },
    }
  },
  {
    id: 'teacher_2',
    name: 'فاطمة الزهراء',
    assignedClasses: [],
    timetable: {
      'الاثنين': { '1': '', '2': '', '3': '', '4': '' },
      'الثلاثاء': { '1': '', '2': '', '3': '', '4': '' },
      'الأربعاء': { '1': '', '2': '', '3': '', '4': '' },
      'الخميس': { '1': '', '2': '', '3': '', '4': '' },
      'الجمعة': { '1': '', '2': '', '3': '', '4': '' },
      'السبت': { '1': '', '2': '', '3': '', '4': '' },
    }
  },
  {
    id: 'teacher_3',
    name: 'يوسف العراقي',
    assignedClasses: [],
    timetable: {
      'الاثنين': { '1': '', '2': '', '3': '', '4': '' },
      'الثلاثاء': { '1': '', '2': '', '3': '', '4': '' },
      'الأربعاء': { '1': '', '2': '', '3': '', '4': '' },
      'الخميس': { '1': '', '2': '', '3': '', '4': '' },
      'الجمعة': { '1': '', '2': '', '3': '', '4': '' },
      'السبت': { '1': '', '2': '', '3': '', '4': '' },
    }
  }
];

export const TextbookScreen: React.FC<TextbookScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  const { language } = useLanguage();
  const [classList, setClassList] = useState<ClassStats[]>([]);
  const [sessions, setSessions] = useState<TextbookSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Tab State: sessions feed vs timetable setup vs official landscape grid
  const [activeTab, setActiveTab] = useState<'sessions' | 'timetable' | 'grid_landscape'>('sessions');

  // State for Official Landscape Grid (Matching official Moroccan Inspectors Cahier de texte sheet)
  const [gridEtablissement, setGridEtablissement] = useState('collège oued za');
  const [gridProfesseur, setGridProfesseur] = useState('Omar HAMANI');
  const [gridAps, setGridAps] = useState('Saut longueur (3ème Année Collégiale)');
  const [gridCompetence, setGridCompetence] = useState('Envie d\'appliquer les acquis dans différentes situations.');
  const [gridSelectedLevel, setGridSelectedLevel] = useState<string>('3APIC');
  const [gridColsPerPage, setGridColsPerPage] = useState<number>(4);
  const [gridClasses, setGridClasses] = useState<string[]>([
    '3APIC 1', '3APIC 2', '3APIC 3', '3APIC 4', '3APIC 5', '3APIC 6', '3APIC 7', '3APIC 8'
  ]);
  const [gridRows, setGridRows] = useState<CahierGridRow[]>(SAUT_LONGUEUR_ROWS);

  // Compute multi-sheet chunking for landscape pages (e.g. 8 classes = 2 sheets of 4 classes)
  const gridSheets = useMemo(() => {
    const cols = gridColsPerPage && gridColsPerPage > 0 ? gridColsPerPage : 4;
    const chunks: string[][] = [];
    const sourceClasses = gridClasses.length > 0 ? gridClasses : ['القسم 1'];
    for (let i = 0; i < sourceClasses.length; i += cols) {
      chunks.push(sourceClasses.slice(i, i + cols));
    }
    return chunks;
  }, [gridClasses, gridColsPerPage]);

  // Teachers State
  const [teachers, setTeachers] = useState<TeacherProfile[]>(DEFAULT_TEACHERS);
  const [activeTeacherId, setActiveTeacherId] = useState<string>('teacher_1');
  
  // Local active teacher state for inputs
  const [editingTeacherName, setEditingTeacherName] = useState('');
  const [editingAssignedClasses, setEditingAssignedClasses] = useState<string[]>([]);
  const [editingTimetable, setEditingTimetable] = useState<any>({});

  // Form State for Textbook Logs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [formSessionNumber, setFormSessionNumber] = useState('الحصة 1');
  const [formGoal, setFormGoal] = useState('');
  const [formClassName, setFormClassName] = useState(selectedClass || '');
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formTimeSlot, setFormTimeSlot] = useState('08:30 - 10:30');

  // Filter state
  const [classFilter, setClassFilter] = useState<'all' | 'my' | string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Word Export Settings (Mise en Page) State
  const [isWordSettingsModalOpen, setIsWordSettingsModalOpen] = useState(false);
  const [wordFontFamily, setWordFontFamily] = useState("'Segoe UI', Tahoma, Arial, sans-serif");
  const [wordFontSize, setWordFontSize] = useState("11pt");
  const [wordMargins, setWordMargins] = useState("1.2cm");
  const [wordClassFilter, setWordClassFilter] = useState("all");
  const [wordLevelFilter, setWordLevelFilter] = useState("all");

  // Active Teacher Profile Helper
  const activeTeacher = useMemo(() => {
    return teachers.find(t => t.id === activeTeacherId) || teachers[0];
  }, [teachers, activeTeacherId]);

  useEffect(() => {
    loadClasses();
    loadSessions();
    loadTeacherProfiles();
    
    // Load last active teacher ID
    const savedActiveId = localStorage.getItem('eps_active_teacher_id');
    if (savedActiveId) {
      setActiveTeacherId(savedActiveId);
    }
  }, []);

  // Sync edits when active teacher switches
  useEffect(() => {
    if (activeTeacher) {
      setEditingTeacherName(activeTeacher.name);
      setEditingAssignedClasses(activeTeacher.assignedClasses || []);
      setEditingTimetable(JSON.parse(JSON.stringify(activeTeacher.timetable || {})));
      if (activeTeacher.name) setGridProfesseur(activeTeacher.name);
      if (activeTeacher.assignedClasses && activeTeacher.assignedClasses.length > 0) {
        setGridClasses(activeTeacher.assignedClasses.slice(0, 4));
      }
    }
  }, [activeTeacherId, teachers]);

  const handleApplyPreset = (presetName: 'saut' | 'basketball' | 'handball' | 'vitesse' | 'gymnastique') => {
    if (presetName === 'saut') {
      setGridAps('Saut longueur (3ème Année Collégiale)');
      setGridCompetence('Envie d\'appliquer les acquis dans différentes situations.');
      setGridRows(JSON.parse(JSON.stringify(SAUT_LONGUEUR_ROWS)));
    } else if (presetName === 'basketball') {
      setGridAps('Basketball (الرياضات الجماعية)');
      setGridCompetence('Rechercher le gain du match par la maîtrise des fondamentaux technico-tactiques.');
      setGridRows(JSON.parse(JSON.stringify(BASKETBALL_ROWS)));
    } else if (presetName === 'handball') {
      setGridAps('Handball (الرياضات الجماعية)');
      setGridCompetence('Accéder à la cible adverse par une circulation rapide du ballon et un démarquage efficace.');
      setGridRows(JSON.parse(JSON.stringify(HANDBALL_ROWS)));
    } else if (presetName === 'vitesse') {
      setGridAps('Course de vitesse 60m (السرعة)');
      setGridCompetence('Développer la vitesse maximale aérobie et le temps de réaction au départ.');
      setGridRows(JSON.parse(JSON.stringify(COURSE_VITESSE_ROWS)));
    } else if (presetName === 'gymnastique') {
      setGridAps('Gymnastique au sol (الجمباز)');
      setGridCompetence('Composer et exécuter un enchaînement individuel fluide avec maîtrise corporelle.');
      setGridRows(JSON.parse(JSON.stringify(GYMNASTIQUE_ROWS)));
    }
    setNotification({ message: 'تم تطبيق تتابع الحصص والأهداف البيداغوجية للنشاط بنجاح! ✨', type: 'success' });
  };

  const handleClearGridDates = () => {
    const updatedRows = gridRows.map(row => ({
      ...row,
      classDates: {}
    }));
    setGridRows(updatedRows);
    setNotification({ message: 'تم تفريغ جميع خانات التواريخ والتوقيت لتكون جاهزة للكتابة اليدوية أو الطباعة! 🧹', type: 'success' });
  };

  const handleFillBlankPlaceholders = () => {
    const updatedRows = gridRows.map(row => {
      const nextDates: Record<string, string> = {};
      gridClasses.forEach(cName => {
        if (cName) {
          nextDates[cName] = row.classDates[cName] || '___/___  ___h___';
        }
      });
      return { ...row, classDates: nextDates };
    });
    setGridRows(updatedRows);
    setNotification({ message: 'تم وضع أسطر للتاريخ والتوقيت في الخانات الفارغة! ✏️', type: 'success' });
  };

  const handleSetGridClassesCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(16, count));
    let nextClasses = [...gridClasses];
    if (nextClasses.length < safeCount) {
      const remainingClasses = classList.map(c => c.className).filter(cn => !nextClasses.includes(cn));
      while (nextClasses.length < safeCount) {
        nextClasses.push(remainingClasses.shift() || `القسم ${nextClasses.length + 1}`);
      }
    } else if (nextClasses.length > safeCount) {
      nextClasses = nextClasses.slice(0, safeCount);
    }
    setGridClasses(nextClasses);
    setNotification({ message: `تم ضبط عدد أرقام الأقسام بالشبكة على ${safeCount} أقسام! 📐`, type: 'success' });
  };

  const handleAutoFillGridDates = async () => {
    setIsLoading(true);
    try {
      const updatedRows = JSON.parse(JSON.stringify(gridRows)) as CahierGridRow[];
      
      for (const cName of gridClasses) {
        if (!cName) continue;
        const attSessions = await getAttendanceSessions(cName);
        
        updatedRows.forEach(row => {
          if (!row.classDates) row.classDates = {};
          
          const targetNumStr = `${row.seanceNumber}`;
          const targetNumAr = `الحصة ${row.seanceNumber}`;

          const matchTb = sessions.find(s => 
            s.className === cName && 
            (s.sessionNumber === targetNumAr || s.sessionNumber === targetNumStr || (s.sessionNumber && s.sessionNumber.includes(targetNumStr)))
          );
          
          const matchAtt = attSessions.find(a => 
            a.className === cName && 
            (a.sessionNumber === targetNumAr || a.sessionNumber === targetNumStr || (a.sessionNumber && a.sessionNumber.includes(targetNumStr)))
          );

          if (matchTb) {
            const shortDate = matchTb.date ? matchTb.date.slice(5) : '';
            const slot = matchTb.timeSlot ? matchTb.timeSlot.split('-')[0].trim() : '';
            row.classDates[cName] = `${shortDate} ${slot}`.trim();
          } else if (matchAtt) {
            const shortDate = matchAtt.date ? matchAtt.date.slice(5) : '';
            const slot = matchAtt.timeSlot ? matchAtt.timeSlot.split('-')[0].trim() : '';
            row.classDates[cName] = `${shortDate} ${slot}`.trim();
          }
        });
      }

      setGridRows(updatedRows);
      setNotification({ message: 'تم تعبئة تواريخ الحصص المسجلة للأقسام المحددة تلقائياً! ⚡', type: 'success' });
    } catch (e) {
      console.warn('Auto fill grid notice:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelChange = (levelKey: string) => {
    setGridSelectedLevel(levelKey);
    if (levelKey === '3APIC') {
      const match = classList.filter(c => c.className.startsWith('3') || c.className.includes('3APIC')).map(c => c.className);
      setGridClasses(match.length > 0 ? match : ['3APIC 1', '3APIC 2', '3APIC 3', '3APIC 4', '3APIC 5', '3APIC 6', '3APIC 7', '3APIC 8']);
    } else if (levelKey === '2APIC') {
      const match = classList.filter(c => c.className.startsWith('2') || c.className.includes('2APIC')).map(c => c.className);
      setGridClasses(match.length > 0 ? match : ['2APIC 1', '2APIC 2', '2APIC 3', '2APIC 4']);
    } else if (levelKey === '1APIC') {
      const match = classList.filter(c => c.className.startsWith('1') || c.className.includes('1APIC')).map(c => c.className);
      setGridClasses(match.length > 0 ? match : ['1APIC 1', '1APIC 2', '1APIC 3', '1APIC 4']);
    } else if (levelKey === '1_2APIC') {
      const match = classList.filter(c => 
        c.className.startsWith('1') || c.className.includes('1APIC') || c.className.startsWith('2') || c.className.includes('2APIC')
      ).map(c => c.className);
      setGridClasses(match.length > 0 ? match : ['1APIC 1', '1APIC 2', '2APIC 1', '2APIC 2']);
    } else if (levelKey === 'TC') {
      const match = classList.filter(c => c.className.toUpperCase().includes('TC') || c.className.includes('جذع')).map(c => c.className);
      setGridClasses(match.length > 0 ? match : ['TCS 1', 'TCS 2', 'TCL 1', 'TCL 2']);
    } else if (levelKey === 'BAC') {
      const match = classList.filter(c => c.className.includes('BAC') || c.className.includes('باك')).map(c => c.className);
      setGridClasses(match.length > 0 ? match : ['1BAC 1', '1BAC 2', '2BAC 1', '2BAC 2']);
    } else {
      const allNames = classList.map(c => c.className);
      setGridClasses(allNames.length > 0 ? allNames : ['3APIC 1', '3APIC 2', '3APIC 3', '3APIC 4', '3APIC 5', '3APIC 6', '3APIC 7', '3APIC 8']);
    }
    setNotification({ message: `تم تصفية الأقسام حسب مستوى ${levelKey === 'all' ? 'جميع المستويات' : (levelKey === '1_2APIC' ? 'الأولى والثانية إعدادي' : levelKey)}! 🏫`, type: 'success' });
  };

  const handleExportGridWord = () => {
    const data: OfficialCahierGridExportData = {
      etablissement: gridEtablissement,
      professeur: gridProfesseur,
      aps: gridAps,
      competence: gridCompetence,
      classes: gridClasses,
      rows: gridRows,
      colsPerPage: gridColsPerPage,
      levelTitle: gridSelectedLevel !== 'all' ? `المستوى: ${gridSelectedLevel}` : ''
    };

    const ok = exportOfficialCahierGridToWord(data);
    if (ok) {
      setNotification({ message: `تم تصدير دفتر النصوص (${gridSheets.length} أوراق / ${gridClasses.length} أقسام) بصيغة Word Landscape بنجاح! 📄`, type: 'success' });
    } else {
      setNotification({ message: 'حدث خطأ أثناء التصدير.', type: 'error' });
    }
  };

  useEffect(() => {
    if (selectedClass && !formClassName) {
      setFormClassName(selectedClass);
    }
  }, [selectedClass]);

  const loadClasses = async () => {
    const list = await getAllClasses();
    setClassList(list);
    if (list.length > 0 && !selectedClass) {
      setSelectedClass(list[0].className);
      setFormClassName(list[0].className);
    }
  };

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getTextbookSessions();
      setSessions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTeacherProfiles = async () => {
    try {
      const cloudProfiles = await fetchTeacherProfilesFromCloud();
      if (cloudProfiles && cloudProfiles.length > 0) {
        const merged = DEFAULT_TEACHERS.map(def => {
          const cloud = cloudProfiles.find(p => p.id === def.id);
          return cloud ? { ...def, ...cloud } : def;
        });
        setTeachers(merged);
        localStorage.setItem('eps_teachers_profiles', JSON.stringify(merged));
        return;
      }
    } catch (e) {
      console.warn('Failed to load teacher profiles from cloud, loading cached:', e);
    }

    try {
      const cached = localStorage.getItem('eps_teachers_profiles');
      if (cached) {
        setTeachers(JSON.parse(cached));
      }
    } catch {}
  };

  const handleSaveTeacherSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacherName.trim()) {
      setNotification({ message: 'المرجو إدخال اسم الأستاذ أولاً.', type: 'error' });
      return;
    }

    const updatedProfiles = teachers.map(t => {
      if (t.id === activeTeacherId) {
        return {
          ...t,
          name: editingTeacherName.trim(),
          assignedClasses: editingAssignedClasses,
          timetable: editingTimetable
        };
      }
      return t;
    });

    setTeachers(updatedProfiles);
    localStorage.setItem('eps_teachers_profiles', JSON.stringify(updatedProfiles));

    // Upload to Firestore
    try {
      setNotification({ message: 'جاري مزامنة بيانات وجدول الأستاذ مع السحابة...', type: 'success' });
      const res = await saveTeacherProfileToCloud(activeTeacherId, {
        name: editingTeacherName.trim(),
        assignedClasses: editingAssignedClasses,
        timetable: editingTimetable
      });

      if (res.success) {
        setNotification({ message: `تم حفظ وإعداد بيانات الأستاذ "${editingTeacherName.trim()}" وجدوله بنجاح!`, type: 'success' });
      } else {
        setNotification({ message: 'تم الحفظ محلياً بنجاح. ستتم المزامنة لاحقاً عند الاتصال بالشبكة.', type: 'success' });
      }
    } catch (err) {
      setNotification({ message: 'تم الحفظ محلياً بنجاح، وحدث خطأ مؤقت أثناء المزامنة السحابية.', type: 'success' });
    }
  };

  const handleActiveTeacherChange = (id: string) => {
    setActiveTeacherId(id);
    localStorage.setItem('eps_active_teacher_id', id);
  };

  const handleClassCheckboxChange = (clsName: string, isChecked: boolean) => {
    if (isChecked) {
      setEditingAssignedClasses(prev => [...prev, clsName]);
    } else {
      setEditingAssignedClasses(prev => prev.filter(c => c !== clsName));
      // Remove this class from timetable if unassigned
      const updatedTimetable = { ...editingTimetable };
      DAYS.forEach(day => {
        if (updatedTimetable[day]) {
          Object.keys(updatedTimetable[day]).forEach(slotId => {
            if (updatedTimetable[day][slotId] === clsName) {
              updatedTimetable[day][slotId] = '';
            }
          });
        }
      });
      setEditingTimetable(updatedTimetable);
    }
  };

  const handleTimetableCellChange = (day: string, slotId: string, value: string) => {
    setEditingTimetable((prev: any) => ({
      ...prev,
      [day]: {
        ...(prev[day] || { '1': '', '2': '', '3': '', '4': '' }),
        [slotId]: value
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGoal.trim() || !formSessionNumber.trim() || !formClassName) {
      setNotification({ message: 'المرجو ملء جميع الحقول المطلوبة.', type: 'error' });
      return;
    }

    const sessionObj: TextbookSession = {
      id: editingSessionId || `tb_${Date.now()}`,
      sessionNumber: formSessionNumber.trim(),
      goal: formGoal.trim(),
      className: formClassName,
      date: formDate,
      timeSlot: formTimeSlot.trim(),
      createdAt: editingSessionId ? (sessions.find(s => s.id === editingSessionId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Store which teacher logged this session for audit
    (sessionObj as any).loggedByTeacherId = activeTeacherId;
    (sessionObj as any).loggedByTeacherName = activeTeacher.name;

    try {
      await saveTextbookSession(sessionObj);
      setNotification({ 
        message: editingSessionId ? 'تم تعديل الحصة الرياضية في دفتر النصوص بنجاح!' : 'تم إضافة الحصة الرياضية لدفتر النصوص ومزامنتها بنجاح!', 
        type: 'success' 
      });
      setIsFormOpen(false);
      setEditingSessionId(null);
      setFormGoal('');
      loadSessions();
    } catch (err) {
      setNotification({ message: 'حدث خطأ أثناء الحفظ.', type: 'error' });
    }
  };

  const handleEdit = (session: TextbookSession) => {
    setEditingSessionId(session.id);
    setFormSessionNumber(session.sessionNumber);
    setFormGoal(session.goal);
    setFormClassName(session.className);
    setFormDate(session.date);
    setFormTimeSlot(session.timeSlot);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الحصة من دفتر النصوص؟')) {
      try {
        await deleteTextbookSession(id);
        setNotification({ message: 'تم حذف الحصة من دفتر النصوص بنجاح.', type: 'success' });
        loadSessions();
      } catch (err) {
        setNotification({ message: 'حدث خطأ أثناء الحذف.', type: 'error' });
      }
    }
  };

  // Filter textbook logs
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      // Teacher filter: my assigned classes vs all
      let matchClass = true;
      if (classFilter === 'my') {
        matchClass = (activeTeacher.assignedClasses || []).includes(s.className);
      } else if (classFilter !== 'all') {
        matchClass = s.className === classFilter;
      }

      const matchQuery = !searchQuery || 
        s.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.goal.toLowerCase().includes(searchQuery.toLowerCase()) || 
        s.className.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s as any).loggedByTeacherName?.toLowerCase().includes(searchQuery.toLowerCase());
        
      return matchClass && matchQuery;
    });
  }, [sessions, classFilter, searchQuery, activeTeacher]);

  const handleExportExcel = () => {
    if (filteredSessions.length === 0) {
      setNotification({ message: "لا توجد حصص مسجلة لتصديرها حالياً في دفتر النصوص.", type: 'error' });
      return;
    }

    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      setNotification({ message: "لم يتم تحميل مكتبة Excel بنجاح.", type: 'error' });
      return;
    }

    const headers = [
      "الحصة / رقم الحصة", 
      "الهدف البيداغوجي / المحتوى", 
      "القسم", 
      "التاريخ", 
      "التوقيت / الحيز الزمني",
      "الأستاذ المؤطر",
      "تاريخ الإضافة"
    ];

    const rows = filteredSessions.map(s => [
      s.sessionNumber,
      s.goal,
      s.className,
      s.date,
      s.timeSlot,
      (s as any).loggedByTeacherName || activeTeacher?.name || "أستاذ التربية البدنية",
      new Date(s.createdAt).toLocaleDateString('ar-MA')
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "دفتر النصوص");
    XLSX.writeFile(wb, `دفتر_النصوص_الرياضي_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    setNotification({ message: "تم تصدير دفتر النصوص بصيغة Excel بنجاح! 📊", type: 'success' });
  };

  const handleExportWord = () => {
    if (sessions.length === 0) {
      setNotification({ message: "لا توجد حصص مسجلة في دفتر النصوص لتصديرها حالياً.", type: 'error' });
      return;
    }
    setWordClassFilter(classFilter !== 'my' ? classFilter : 'all');
    setIsWordSettingsModalOpen(true);
  };

  const handleExecuteWordExport = () => {
    const teacherName = activeTeacher?.name || "أستاذ التربية البدنية والرياضية";
    const classNameLabel = wordClassFilter !== 'all' ? wordClassFilter : (wordLevelFilter !== 'all' ? wordLevelFilter : (selectedClass || "جميع الأقسام الحضورية"));

    const success = exportTextbookToWord(sessions, teacherName, classNameLabel, {
      fontFamily: wordFontFamily,
      fontSize: wordFontSize,
      margins: wordMargins,
      classFilter: wordClassFilter,
      levelFilter: wordLevelFilter
    });

    if (success) {
      setNotification({ message: "تم تصدير دفتر النصوص الرياضي بصيغة Word بنجاح وفق إعدادات الصفحة المحددة! 📄", type: 'success' });
      setIsWordSettingsModalOpen(false);
    } else {
      setNotification({ message: "لا توجد حصص مطابقة لنطاق الاستخراج المحدد.", type: 'error' });
    }
  };

  // Helper to get Arabic weekday name from date
  const getArabicDayName = (dateStr: string): string => {
    if (!dateStr) return '';
    const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const date = new Date(dateStr);
    return days[date.getDay()];
  };

  const formDateDayName = getArabicDayName(formDate);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`p-4 rounded-2xl shadow-md text-sm font-bold flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <InformationCircleIcon className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Header and Teacher Switcher */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
            <DocumentTextIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">
              دفتر النصوص الرياضي
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              إدارة صيرورة حصص التربية البدنية، تخصيص الأقسام، وجداول حصص الأساتذة المتزامنة
            </p>
          </div>
        </div>

        {/* Active Teacher Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 w-full lg:w-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-xs font-black text-indigo-600 dark:text-indigo-400 px-1">
            <UserCircleIcon className="w-4 h-4" />
            <span>الأستاذ الحالي:</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
            {teachers.map((t) => (
              <button
                key={t.id}
                onClick={() => handleActiveTeacherChange(t.id)}
                className={`px-3 py-1.5 rounded-xl text-center text-xs font-black transition whitespace-nowrap active:scale-95 ${
                  activeTeacherId === t.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                    : 'bg-white hover:bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {t.name || `أستاذ ${t.id === 'teacher_1' ? '1' : t.id === 'teacher_2' ? '2' : '3'}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Control */}
      <div className="flex border-b border-gray-100 dark:border-gray-700 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('sessions')}
          className={`pb-3 px-4 font-black text-xs transition relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'sessions'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>سجل دفتر النصوص اليومي</span>
        </button>

        <button
          onClick={() => setActiveTab('grid_landscape')}
          className={`pb-3 px-4 font-black text-xs transition relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'grid_landscape'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
          }`}
        >
          <TableCellsIcon className="w-4 h-4 text-emerald-600" />
          <span>النموذج الرسمي (شبكة 4 أقسام - Paysage)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-800">رسمي ✨</span>
        </button>

        <button
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 px-4 font-black text-xs transition relative flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'timetable'
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
          }`}
        >
          <CalendarDaysIcon className="w-4 h-4" />
          <span>استعمال الزمن والتخصيص</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/40">مهم</span>
        </button>
      </div>

      {/* TAB 1: SESSIONS Logs View */}
      {activeTab === 'sessions' && (
        <>
          {/* Main Action Buttons Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-indigo-50/40 dark:bg-gray-800 p-4 rounded-3xl border border-indigo-50/60 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                أنت تعمل حالياً بملف: <strong>{activeTeacher.name}</strong> ({activeTeacher.assignedClasses.length} أقسام مخصصة)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  setEditingSessionId(null);
                  setFormSessionNumber(`الحصة ${sessions.length + 1}`);
                  setFormGoal('');
                  // Default to first assigned class of active teacher if possible
                  if (activeTeacher.assignedClasses.length > 0) {
                    setFormClassName(activeTeacher.assignedClasses[0]);
                  } else if (selectedClass) {
                    setFormClassName(selectedClass);
                  }
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <PlusIcon className="w-4 h-4" />
                <span>تسجيل حصة جديدة</span>
              </button>

              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>تصدير دفتر النصوص Excel</span>
              </button>

              <button
                onClick={handleExportWord}
                className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-black rounded-2xl shadow-lg shadow-blue-700/10 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>تصدير دفتر النصوص Word</span>
              </button>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الحصص البيداغوجية والأساتذة..."
                className="w-full pl-4 pr-9 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs focus:ring-2 focus:ring-indigo-500 outline-none text-right"
              />
              <DocumentTextIcon className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">فلترة الأقسام:</span>
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 font-bold text-xs text-gray-900 dark:text-white rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">جميع أقسام المؤسسة</option>
                  <option value="my">أقسام الأستاذ الحالي فقط</option>
                  {classList.map(c => (
                    <option key={c.className} value={c.className}>{c.className}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Textbook Entry Form (Modal) */}
          {isFormOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {editingSessionId ? 'تعديل حصة دفتر النصوص' : 'تسجيل صيرورة حصة رياضية جديدة'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Session Designation */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">رقم الحصة:</label>
                    <select 
                      value={formSessionNumber}
                      onChange={(e) => setFormSessionNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm cursor-pointer"
                      required
                    >
                      {Array.from({ length: 10 }, (_, i) => `الحصة ${i + 1}`).map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>

                  {/* Class Select */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">القسم المستهدف:</label>
                    <select 
                      value={formClassName}
                      onChange={(e) => setFormClassName(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm cursor-pointer"
                      required
                    >
                      <option value="" disabled>اختر القسم</option>
                      {classList.map(c => (
                        <option key={c.className} value={c.className}>{c.className}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                      <CalendarDaysIcon className="w-3.5 h-3.5" />
                      <span>التاريخ:</span>
                    </label>
                    <input 
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                      required
                    />
                  </div>

                  {/* Time slot */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1">
                      <ClockIcon className="w-3.5 h-3.5" />
                      <span>الحيز الزمني / التوقيت:</span>
                    </label>
                    <input 
                      type="text"
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value)}
                      placeholder="مثال: 08:30 - 10:30"
                      className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm"
                      required
                    />
                  </div>

                  {/* Quick-fill helper from active teacher's Timetable */}
                  {formDateDayName && formDateDayName !== 'الأحد' && (
                    <div className="col-span-1 sm:col-span-2 p-3 bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/40 text-xs">
                      <div className="font-bold text-indigo-700 dark:text-indigo-300 mb-1.5 flex items-center gap-1">
                        <span>💡 الملء التلقائي من جدول يوم {formDateDayName} لـ ({activeTeacher.name}):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {SLOTS.map(slot => {
                          const classInSlot = activeTeacher.timetable?.[formDateDayName]?.[slot.id] || '';
                          return (
                            <button
                              key={slot.id}
                              type="button"
                              onClick={() => {
                                if (classInSlot) {
                                  setFormClassName(classInSlot);
                                  setFormTimeSlot(slot.time);
                                }
                              }}
                              disabled={!classInSlot}
                              className={`p-2 rounded-xl text-center border font-bold transition text-[11px] ${
                                classInSlot 
                                  ? 'bg-white hover:bg-indigo-100 border-indigo-200 text-indigo-700 dark:bg-gray-800 dark:border-indigo-800 dark:text-indigo-300 cursor-pointer' 
                                  : 'bg-gray-50 border-gray-100 text-gray-400 dark:bg-gray-700/50 dark:border-gray-700 select-none'
                              }`}
                            >
                              <div>حصة {slot.id}</div>
                              <div className="text-[10px] font-normal truncate mt-0.5">{classInSlot || 'فارغ'}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Goal / Description */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">الهدف البيداغوجي / محتوى الدرس:</label>
                  <textarea 
                    value={formGoal}
                    onChange={(e) => setFormGoal(e.target.value)}
                    placeholder="أدخل الأهداف البيداغوجية والمهارات المبرمجة في هذه الحصة..."
                    rows={4}
                    className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-right"
                    required
                  />
                </div>

                {/* Form actions */}
                <div className="flex gap-2 pt-2">
                  <button 
                    type="submit"
                    className="flex-1 bg-indigo-600 text-white font-black py-2.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 cursor-pointer text-xs"
                  >
                    {editingSessionId ? 'تعديل الحصة' : 'تسجيل في الدفتر'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 font-black py-2.5 rounded-xl hover:bg-gray-200 cursor-pointer text-xs"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Main Sessions Feed */}
          <div className="space-y-4">
            {filteredSessions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSessions.map(session => (
                  <div key={session.id} className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-700/80 hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div className="absolute top-0 right-0 h-1.5 w-full bg-indigo-600"></div>

                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-xl">
                            {session.sessionNumber}
                          </span>
                          <span className="text-xs font-bold text-gray-400">
                            القسم: <strong className="text-gray-900 dark:text-white">{session.className}</strong>
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-md">
                            👤 {(session as any).loggedByTeacherName || "أستاذ المادة"}
                          </span>
                        </div>

                        <div className="text-xs font-bold text-gray-400 flex items-center gap-4 pt-2">
                          <span className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{session.date}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{session.timeSlot}</span>
                          </span>
                        </div>
                      </div>

                      {/* Actions (Edit / Delete) */}
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(session)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition"
                          title="تعديل الحصة"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(session.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                          title="حذف الحصة"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Pedagoical Goal */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/80">
                      <span className="text-[11px] font-black text-gray-400 block mb-1">الهدف البيداغوجي ومحتوى الدرس:</span>
                      <p className="text-xs text-gray-700 dark:text-gray-200 font-bold leading-relaxed whitespace-pre-line text-right">
                        {session.goal}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-700">
                <InformationCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-black text-gray-500">لا توجد أي حصص مبرمجة في دفتر النصوص لخيارات الفلترة الحالية</h3>
                <p className="text-xs text-gray-400 mt-1">اضغط على زر «تسجيل حصة جديدة» لإدخال وتوثيق أول حصة في دفتر النصوص.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: TIMETABLE SETUP View */}
      {activeTab === 'timetable' && (
        <form onSubmit={handleSaveTeacherSetup} className="space-y-6">
          {/* Section 1: Teacher Setup Information */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-black text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
              <AcademicCapIcon className="w-5 h-5 text-indigo-600" />
              <span>بيانات تعريف الأستاذ ومجموعة الأقسام المخصصة له</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-500">اسم الأستاذ الكامل:</label>
                <input
                  type="text"
                  value={editingTeacherName}
                  onChange={(e) => setEditingTeacherName(e.target.value)}
                  placeholder="أدخل اسم الأستاذ الكامل..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs"
                  required
                />
                <p className="text-[10px] text-gray-400">سيتم ربطه بجميع سجلات دفتر النصوص وحصص استعمال الزمن التي ينشئها.</p>
              </div>

              {/* Class Allocation Checkboxes */}
              <div className="md:col-span-2 space-y-2">
                <label className="block text-xs font-black text-gray-500">تخصيص الأقسام المسندة لهذا الأستاذ (مجموعة الأقسام):</label>
                {classList.length === 0 ? (
                  <div className="text-xs text-amber-600 font-bold p-3 bg-amber-50 rounded-xl">المرجو أولاً التوجه لشاشة «لائحة الأقسام» وإدخال الأقسام الدراسية بالمؤسسة.</div>
                ) : (
                  <div className="flex flex-wrap gap-2.5 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {classList.map(cls => {
                      const isChecked = editingAssignedClasses.includes(cls.className);
                      return (
                        <label 
                          key={cls.className}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition select-none ${
                            isChecked
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300 font-black'
                              : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleClassCheckboxChange(cls.className, e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span>{cls.className}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-gray-400">سيتمكن الأستاذ من جدولة الأقسام المحددة هنا فقط في استعمال زمنه الصباحي لتجنب التداخل.</p>
              </div>
            </div>
          </div>

          {/* Section 2: Timetable Grid Setup */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                <span>إعداد استعمال الزمن الصباحي الخاص بالأستاذ (الاثنين إلى السبت)</span>
              </h3>
              <span className="text-[11px] font-bold px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40 rounded-xl">
                الصباح فقط (08:00 - 12:00) • 4 حصص في اليوم
              </span>
            </div>

            {/* Desktop Timetable Grid */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full border-collapse border border-gray-100 dark:border-gray-700 text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900/50">
                    <th className="border border-gray-100 dark:border-gray-700 p-3 font-black text-gray-600 dark:text-gray-300 text-center w-40">الحيز الزمني / اليوم</th>
                    {DAYS.map(day => (
                      <th key={day} className="border border-gray-100 dark:border-gray-700 p-3 font-black text-gray-900 dark:text-white text-center">{day}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SLOTS.map(slot => (
                    <tr key={slot.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/10">
                      <td className="border border-gray-100 dark:border-gray-700 p-3 font-black text-indigo-600 dark:text-indigo-400 bg-gray-50/30 dark:bg-gray-900/10 text-center">
                        <div className="font-bold">{slot.id === '1' ? 'الحصة الأولى' : slot.id === '2' ? 'الحصة الثانية' : slot.id === '3' ? 'الحصة الثالثة' : 'الحصة الرابعة'}</div>
                        <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">{slot.time}</div>
                      </td>
                      {DAYS.map(day => {
                        const cellValue = editingTimetable[day]?.[slot.id] || '';
                        return (
                          <td key={day} className="border border-gray-100 dark:border-gray-700 p-2 text-center">
                            <select
                              value={cellValue}
                              onChange={(e) => handleTimetableCellChange(day, slot.id, e.target.value)}
                              className={`w-full p-2.5 rounded-xl text-xs font-black border text-center cursor-pointer transition ${
                                cellValue
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/30 dark:border-indigo-900/60 dark:text-indigo-300 font-black shadow-xs'
                                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400'
                              }`}
                            >
                              <option value="">-- فارغ --</option>
                              {editingAssignedClasses.map(clsName => (
                                <option key={clsName} value={clsName}>{clsName}</option>
                              ))}
                            </select>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile/Tablet List-based Timetable Configurator */}
            <div className="block lg:hidden space-y-4">
              <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 text-xs rounded-2xl leading-relaxed">
                💡 في الهواتف، نعرض لك استعمال الزمن مقسماً حسب الأيام لسهولة التحرير والإدخال بشكل واضح وسريع.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {DAYS.map(day => (
                  <div key={day} className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-700 rounded-2xl space-y-3">
                    <h4 className="font-black text-xs text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center justify-between">
                      <span>{day}</span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">الحصص الصباحية</span>
                    </h4>

                    <div className="space-y-2">
                      {SLOTS.map(slot => {
                        const cellValue = editingTimetable[day]?.[slot.id] || '';
                        return (
                          <div key={slot.id} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/60 shadow-xs">
                            <span className="font-bold text-gray-600 dark:text-gray-400 truncate">حصة {slot.id} ({slot.time}):</span>
                            <select
                              value={cellValue}
                              onChange={(e) => handleTimetableCellChange(day, slot.id, e.target.value)}
                              className={`p-1.5 rounded-lg text-xs font-black border text-center cursor-pointer transition ${
                                cellValue
                                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-900'
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400'
                              }`}
                            >
                              <option value="">-- فارغ --</option>
                              {editingAssignedClasses.map(clsName => (
                                <option key={clsName} value={clsName}>{clsName}</option>
                              ))}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

      {/* Timetable Submit bar */}
            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-indigo-600/20 flex items-center gap-2 active:scale-95 cursor-pointer w-full sm:w-auto justify-center"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>حفظ ومزامنة جدول الأستاذ والتخصيص</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: OFFICIAL LANDSCAPE GRID VIEW (Matching Moroccan Inspectors Official Model) */}
      {activeTab === 'grid_landscape' && (
        <div className="space-y-6" dir="rtl">
          {/* Level Filter & Sheet Capacity Bar */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 text-white p-5 rounded-3xl shadow-lg space-y-4">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <span>📊</span>
                  <span>تخصيص دفتر النصوص حسب المستوى والأقسام (A4 Landscape)</span>
                </h2>
                <p className="text-xs text-indigo-200 mt-1">
                  توزيع استخراج دفتر النصوص حسب المستوى الدراسي (الثالثة إعدادي، الثانية، الأولى...) مع تقسيم تلقائي للأوراق بـ 4 أقسام لكل ورقة
                </p>
              </div>

              {/* Capacities & Columns Configuration */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Sheet Capacity Selector */}
                <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10">
                  <span className="text-xs font-bold text-indigo-100">سعة الورقة الواحدة:</span>
                  <div className="flex items-center gap-1">
                    {[2, 3, 4, 5, 6, 8].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGridColsPerPage(num)}
                        className={`px-2 py-0.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          gridColsPerPage === num
                            ? 'bg-white text-indigo-950 shadow-md scale-105'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Total Classes Selector */}
                <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10">
                  <span className="text-xs font-bold text-indigo-100 font-sans">إجمالي الأقسام:</span>
                  <div className="flex items-center gap-1">
                    {[3, 4, 8, 12].map(num => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSetGridClassesCount(num)}
                        className={`px-2 py-0.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          gridClasses.length === num
                            ? 'bg-amber-400 text-slate-950 shadow-md scale-105'
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={gridClasses.length}
                      onChange={(e) => handleSetGridClassesCount(Number(e.target.value))}
                      className="w-10 text-center bg-white/25 text-white border border-white/20 rounded-xl py-0.5 px-0.5 font-bold text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Level Selector Tabs */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-indigo-200">
                اختيار المستوى الدراسي المطلوبة طباعته أو تصديره:
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: '3APIC', label: '🎓 السنة الثالثة إعدادي (3APIC)' },
                  { id: '2APIC', label: '📘 السنة الثانية إعدادي (2APIC)' },
                  { id: '1APIC', label: '📗 السنة الأولى إعدادي (1APIC)' },
                  { id: '1_2APIC', label: '📗 الأولى والثانية إعدادي (1AC + 2AC)' },
                  { id: 'TC', label: '🏛️ الجذوع المشتركة (TC)' },
                  { id: 'BAC', label: '🎒 الأولى / الثانية باكالوريا' },
                  { id: 'all', label: '🏫 جميع المستويات (عرض الكل)' }
                ].map(lvl => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => handleLevelChange(lvl.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                      gridSelectedLevel === lvl.id
                        ? 'bg-amber-400 text-slate-950 shadow-lg scale-105'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Controls & Options Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5 text-right">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
              <div>
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-xl">
                  المستوى الحالي: {gridSelectedLevel === 'all' ? 'جميع المستويات' : gridSelectedLevel} • عدد الأقسام الإجمالي: {gridClasses.length} • عدد الأوراق المستخرجة: {gridSheets.length}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleAutoFillGridDates}
                  disabled={isLoading}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="تعبئة تواريخ وحصص الأقسام تلقائياً من غيابات ودروس الأقسام المسجلة"
                >
                  <span>⚡</span>
                  <span>تعبئة التواريخ تلقائياً</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearGridDates}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="تفريغ كافة خانات التواريخ بياضاً للكتابة اليدوية بعد الطباعة"
                >
                  <span>🧹</span>
                  <span>تفريغ الخانات (مسح)</span>
                </button>

                <button
                  type="button"
                  onClick={handleFillBlankPlaceholders}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="وضع أسطر منقطة للتاريخ والتوقيت في الخانات الفارغة"
                >
                  <span>✏️</span>
                  <span>أسطر للتنقيط</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportGridWord}
                  className="px-3.5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="تصدير المستند المنسق بصيغة Word (A4 Landscape / Paysage)"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span>تصدير Word ({gridSheets.length} أوراق)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:text-gray-900 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                  title="طباعة جميع الأوراق العرضية مباشرة"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>طباعة ({gridSheets.length} أوراق)</span>
                </button>
              </div>
            </div>

            {/* Presets Bar */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 shrink-0">
                <span>🎯</span>
                <span>تطبيق أهداف وحصص النشاط (Presets):</span>
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleApplyPreset('saut')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  🏃 Saut en longueur
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('basketball')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  🏀 Basketball
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('handball')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  🤾 Handball
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('vitesse')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  ⚡ Sprint / Course vitesse
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset('gymnastique')}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
                >
                  🤸 Gymnastique au sol
                </button>
              </div>
            </div>

            {/* Header Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-bold">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">Établissement (المؤسسة):</label>
                <input
                  type="text"
                  value={gridEtablissement}
                  onChange={(e) => setGridEtablissement(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                  placeholder="Collège Oued Za..."
                />
              </div>

              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1">Professeur (الأستاذ):</label>
                <input
                  type="text"
                  value={gridProfesseur}
                  onChange={(e) => setGridProfesseur(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                  placeholder="Omar HAMANI..."
                />
              </div>

              <div className="lg:col-span-2">
                <label className="block text-gray-600 dark:text-gray-400 mb-1">APS / النشاط والمستوى الدراسي:</label>
                <input
                  type="text"
                  value={gridAps}
                  onChange={(e) => setGridAps(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                  placeholder="Saut longueur (3ème Année Collégiale)..."
                />
              </div>

              <div className="lg:col-span-4">
                <label className="block text-gray-600 dark:text-gray-400 mb-1">Compétence (الكفاية المستهدفة):</label>
                <input
                  type="text"
                  value={gridCompetence}
                  onChange={(e) => setGridCompetence(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                  placeholder="Envie d'appliquer les acquis dans différentes situations..."
                />
              </div>
            </div>

            {/* Selecting Classes for Grid Columns */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="block text-xs font-black text-gray-700 dark:text-gray-300">
                  قائمة الأقسام المحددة في هذا المستوى ({gridClasses.length} أقسام):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGridClasses(prev => [...prev, `قسم ${prev.length + 1}`]);
                      setNotification({ message: 'تم إضافة قسم جديد إلى القائمة! ➕', type: 'success' });
                    }}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 cursor-pointer"
                  >
                    + إضافة قسم آخر
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {gridClasses.map((cName, colIdx) => (
                  <div key={colIdx} className="bg-gray-50 dark:bg-gray-700/60 p-2 rounded-xl border border-gray-200 dark:border-gray-600 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-indigo-600 shrink-0">قسم {colIdx + 1}:</span>
                    <input
                      type="text"
                      value={cName || ''}
                      onChange={(e) => {
                        const newVal = e.target.value;
                        setGridClasses(prev => {
                          const next = [...prev];
                          next[colIdx] = newVal;
                          return next;
                        });
                      }}
                      placeholder="اسم القسم..."
                      className="w-full text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1 text-black dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setGridClasses(prev => prev.filter((_, idx) => idx !== colIdx));
                      }}
                      className="text-rose-500 hover:text-rose-700 font-bold px-1 text-xs"
                      title="حذف هذا القسم"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Printable Official Sheet View (Renders Multiple Pages cleanly if e.g. 8 classes = 2 pages) */}
          <div className="space-y-8" dir="ltr">
            <style>{`
              @media print {
                @page {
                  size: A4 landscape;
                  margin: 0.6cm;
                }
                body * {
                  visibility: hidden;
                }
                .cahier-official-grid-print, .cahier-official-grid-print * {
                  visibility: visible;
                }
                .cahier-official-grid-print {
                  position: relative !important;
                  width: 100% !important;
                  margin: 0 0 20px 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: white !important;
                  color: black !important;
                  page-break-after: always;
                  break-after: page;
                }
                .no-print-input {
                  border: none !important;
                  background: transparent !important;
                  padding: 0 !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}</style>

            {gridSheets.map((sheetClasses, sheetIdx) => (
              <div key={sheetIdx} className="cahier-official-grid-print bg-white text-black p-5 sm:p-8 rounded-2xl border-2 border-black shadow-xl overflow-x-auto">
                {/* Multi-Page Indicator Badge */}
                <div className="mb-3 pb-2 border-b border-gray-200 flex items-center justify-between font-bold text-xs no-print text-indigo-900" dir="rtl">
                  <span className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-xl text-xs font-black">
                    📄 الورقة رقم {sheetIdx + 1} من أصل {gridSheets.length} ({sheetClasses.length} أقسام)
                  </span>
                  <span className="text-xs text-gray-600">
                    الأقسام المضمنة في هذه الورقة: <strong className="text-indigo-700 font-mono">{sheetClasses.join(' • ')}</strong>
                  </span>
                </div>

                {/* 1. Header Box */}
                <table className="w-full border-collapse border-2 border-black text-xs font-sans mb-3 text-black">
                  <tbody>
                    <tr className="border-b border-black">
                      <td className="p-2 border-e border-black font-bold w-3/5">
                        <span>Établissement: </span>
                        <span className="font-normal">{gridEtablissement}</span>
                        {gridSelectedLevel !== 'all' && <span className="ms-2 font-bold text-indigo-900">({gridSelectedLevel})</span>}
                      </td>
                      <td className="p-2 font-bold w-2/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span>Professeur: </span>
                            <span className="font-normal">{gridProfesseur}</span>
                          </div>
                          {gridSheets.length > 1 && (
                            <span className="text-[10px] font-black border border-black px-1.5 py-0.5 rounded">
                              Page {sheetIdx + 1}/{gridSheets.length}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td colSpan={2} className="p-2 font-bold">
                        <span>APS: </span>
                        <span className="font-normal">{gridAps}</span>
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="p-2 font-bold">
                        <span>Compétence: </span>
                        <span className="font-normal">{gridCompetence}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 2. Main 10-Séance Grid */}
                <table className="w-full border-collapse border-2 border-black text-xs font-sans mb-3 text-black">
                  <thead>
                    <tr className="bg-gray-100 border-b-2 border-black text-[11px] font-black uppercase text-center">
                      <th className="p-2 border-e border-black w-12 text-center">SÉANCE</th>
                      <th className="p-2 border-e border-black text-center min-w-[240px] w-2/5">
                        OBJECTIF / SITUATION D'APPRENTISSAGE
                      </th>
                      {sheetClasses.map((cName, idx) => (
                        <th key={idx} className="p-2 border-e border-black text-center font-bold">
                          {cName || `Classe ${idx + 1}`}
                        </th>
                      ))}
                      <th className="p-2 text-center w-28">OBSERVATION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    {gridRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-black text-xs">
                        {/* Séance Number */}
                        <td className="p-2 border-e border-black text-center font-black text-base">
                          {row.seanceNumber}
                        </td>

                        {/* Objectif / Situation */}
                        <td className="p-2 border-e border-black leading-tight">
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGridRows(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], title: val };
                                return next;
                              });
                            }}
                            className="w-full font-bold text-xs bg-transparent border-none focus:bg-amber-50 focus:ring-1 focus:ring-indigo-500 rounded p-0.5 no-print-input text-black"
                          />
                          <input
                            type="text"
                            value={row.situation || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGridRows(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], situation: val };
                                return next;
                              });
                            }}
                            className="w-full text-[11px] italic text-gray-700 bg-transparent border-none focus:bg-amber-50 focus:ring-1 focus:ring-indigo-500 rounded p-0.5 mt-0.5 no-print-input"
                            placeholder="Situation..."
                          />
                        </td>

                        {/* Class Date Cells */}
                        {sheetClasses.map((cName, cIdx) => (
                          <td key={cIdx} className="p-1.5 border-e border-black text-center font-bold text-xs align-middle">
                            <input
                              type="text"
                              value={row.classDates[cName] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setGridRows(prev => {
                                  const next = [...prev];
                                  const nextDates = { ...next[idx].classDates, [cName]: val };
                                  next[idx] = { ...next[idx], classDates: nextDates };
                                  return next;
                                });
                              }}
                              placeholder="التاريخ/التوقيت"
                              className="w-full text-center font-mono font-bold text-xs bg-transparent border-none focus:bg-amber-50 focus:ring-1 focus:ring-indigo-500 rounded p-0.5 no-print-input text-black"
                            />
                          </td>
                        ))}

                        {/* Observation */}
                        <td className="p-1.5 text-center text-xs align-middle">
                          <input
                            type="text"
                            value={row.observation || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGridRows(prev => {
                                const next = [...prev];
                                next[idx] = { ...next[idx], observation: val };
                                return next;
                              });
                            }}
                            className="w-full text-center text-xs bg-transparent border-none focus:bg-amber-50 focus:ring-1 focus:ring-indigo-500 rounded p-0.5 no-print-input text-black"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* 3. Footer Legend */}
                <div className="pt-2 border-t-2 border-black text-[11px] font-bold text-black flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="underline font-black">Légende:</span>
                  <span><strong>Ti:</strong> Terrain impraticable</span>
                  <span><strong>F:</strong> Formation</span>
                  <span><strong>C:</strong> Compétition</span>
                  <span><strong>V:</strong> Vacances</span>
                  <span><strong>G:</strong> Grève</span>
                  <span><strong>Abs:</strong> Absence</span>
                  <span><strong>M:</strong> Maladie</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Word Export Settings & Mise en Page Modal */}
      {isWordSettingsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-5 border border-indigo-150 dark:border-indigo-900/60 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                  <DocumentTextIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    إعدادات تخطيط وتصدير دفتر النصوص (Mise en Page)
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    تخصيص نوع وحجم الخط، الهوامش، ونطاق الاستخراج حسب القسم أو المستوى
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsWordSettingsModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Font Family */}
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                  نوع الخط (Font Family):
                </label>
                <select
                  value={wordFontFamily}
                  onChange={(e) => setWordFontFamily(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs cursor-pointer"
                >
                  <option value="'Segoe UI', Tahoma, Arial, sans-serif">Segoe UI (حديث ومهني)</option>
                  <option value="'Traditional Arabic', Times New Roman, serif">Traditional Arabic (تقليدي رسمي)</option>
                  <option value="Arial, sans-serif">Arial (عادي وواضح)</option>
                  <option value="'Times New Roman', Times, serif">Times New Roman (أجنبي رسمي)</option>
                </select>
              </div>

              {/* Font Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    حجم الخط (Font Size):
                  </label>
                  <select
                    value={wordFontSize}
                    onChange={(e) => setWordFontSize(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs cursor-pointer"
                  >
                    <option value="10pt">صغير (10pt)</option>
                    <option value="11pt">متوسط قياسي (11pt)</option>
                    <option value="12pt">كبير (12pt)</option>
                    <option value="14pt">كبير جداً (14pt)</option>
                  </select>
                </div>

                {/* Margins / Mise en Page */}
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    هوامش الصفحة (Mise en Page):
                  </label>
                  <select
                    value={wordMargins}
                    onChange={(e) => setWordMargins(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs cursor-pointer"
                  >
                    <option value="0.8cm">هوامش ضيقة / مكثفة (0.8 سم)</option>
                    <option value="1.2cm">هوامش عادية / متوازنة (1.2 سم)</option>
                    <option value="2.0cm">هوامش واسعة للطباعة (2.0 سم)</option>
                  </select>
                </div>
              </div>

              {/* Extraction Scope: By Class or Level */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    استخراج حسب القسم:
                  </label>
                  <select
                    value={wordClassFilter}
                    onChange={(e) => {
                      setWordClassFilter(e.target.value);
                      if (e.target.value !== 'all') setWordLevelFilter('all');
                    }}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs cursor-pointer"
                  >
                    <option value="all">📁 جميع الأقسام (بدون استثناء)</option>
                    {classList.map(c => (
                      <option key={c.className} value={c.className}>قسم {c.className}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">
                    استخراج حسب المستوى الدراسي:
                  </label>
                  <select
                    value={wordLevelFilter}
                    onChange={(e) => {
                      setWordLevelFilter(e.target.value);
                      if (e.target.value !== 'all') setWordClassFilter('all');
                    }}
                    className="w-full p-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 font-bold text-xs cursor-pointer"
                  >
                    <option value="all">🏫 جميع المستويات</option>
                    <option value="1APIC">الأولى إعدادي (1APIC)</option>
                    <option value="2APIC">الثانية إعدادي (2APIC)</option>
                    <option value="1_2APIC">الأولى والثانية إعدادي (1AC + 2AC)</option>
                    <option value="3APIC">الثالثة إعدادي (3APIC)</option>
                    <option value="1BAC">الأولى باكالوريا (1BAC)</option>
                    <option value="2BAC">الثانية باكالوريا (2BAC)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setIsWordSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={handleExecuteWordExport}
                className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>بدء تصدير المستند (Word .doc)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
