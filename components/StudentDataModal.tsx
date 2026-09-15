import React, { useState, useEffect } from 'react';
import type { StudentIdentity, PhysicalTests } from '../types';
import { getCompleteStudentData, saveCompleteStudentData } from '../utils/db';
import { useLanguage } from '../utils/i18n';
import { 
  XMarkIcon, 
  SaveIcon, 
  CheckIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  RulerIcon, 
  ScaleIcon, 
  HeartIcon, 
  PencilSquareIcon 
} from './Icons';

interface StudentDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  studentNumber: string;
  allStudents?: StudentIdentity[];
  onSelectStudent?: (numeroEleve: string) => void;
  onDataSaved?: () => void;
  defaultTab?: 'biometrics' | 'vma' | 'physical';
}

export const StudentDataModal: React.FC<StudentDataModalProps> = ({
  isOpen,
  onClose,
  className,
  studentNumber,
  allStudents = [],
  onSelectStudent,
  onDataSaved,
  defaultTab = 'biometrics',
}) => {
  const { language, t } = useLanguage();

  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'biometrics' | 'vma' | 'physical'>(defaultTab);
  const [showIdentityEdit, setShowIdentityEdit] = useState<boolean>(false);

  // Identity state
  const [nomEleve, setNomEleve] = useState<string>('');
  const [currentNumeroEleve, setCurrentNumeroEleve] = useState<string>('');
  const [sexe, setSexe] = useState<'M' | 'F'>('M');

  // Physical and Biometric fields
  const [formData, setFormData] = useState<{
    taille?: string;
    poids?: string;
    frequenceCardiaque?: string;
    vma?: string;
    vitesse30m?: string;
    sautHorizontal?: string;
    sautVertical?: string;
    lancerMedball?: string;
    souplesseAssis?: string;
    souplesseDebout?: string;
    equilibreStatique?: string;
  }>({});

  // Current index in allStudents list
  const currentIndex = allStudents.findIndex(s => s.numeroEleve === studentNumber);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allStudents.length - 1;

  // Load student data when studentNumber or className changes
  useEffect(() => {
    if (!isOpen || !studentNumber || !className) return;

    setActiveTab(defaultTab);
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      setSaveSuccess(false);
      try {
        const data = await getCompleteStudentData(className, studentNumber);
        if (!isMounted) return;

        if (data && data.student) {
          setNomEleve(data.student.nomEleve || '');
          setCurrentNumeroEleve(data.student.numeroEleve || studentNumber);
          setSexe(data.student.sexe || 'M');
        } else {
          // Fallback from allStudents
          const found = allStudents.find(s => s.numeroEleve === studentNumber);
          if (found) {
            setNomEleve(found.nomEleve);
            setCurrentNumeroEleve(found.numeroEleve);
            setSexe(found.sexe || 'M');
          }
        }

        const p = data?.physicalTest;
        const v = data?.vmaResult;

        setFormData({
          taille: p?.taille !== undefined ? String(p.taille) : '',
          poids: p?.poids !== undefined ? String(p.poids) : '',
          frequenceCardiaque: p?.frequenceCardiaque !== undefined ? String(p.frequenceCardiaque) : '',
          vma: v?.vma !== undefined ? String(v.vma) : p?.vma !== undefined ? String(p.vma) : '',
          vitesse30m: p?.vitesse30m !== undefined ? String(p.vitesse30m) : '',
          sautHorizontal: p?.sautHorizontal !== undefined ? String(p.sautHorizontal) : '',
          sautVertical: p?.sautVertical !== undefined ? String(p.sautVertical) : '',
          lancerMedball: p?.lancerMedball !== undefined ? String(p.lancerMedball) : '',
          souplesseAssis: p?.souplesseAssis !== undefined ? String(p.souplesseAssis) : '',
          souplesseDebout: p?.souplesseDebout !== undefined ? String(p.souplesseDebout) : '',
          equilibreStatique: p?.equilibreStatique !== undefined ? String(p.equilibreStatique) : '',
        });
      } catch (err) {
        console.error('Failed to load student data for modal', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isOpen, studentNumber, className]);

  if (!isOpen) return null;

  // Handle Field change
  const handleFieldChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  };

  // BMI Calculation
  const numTaille = parseFloat(formData.taille || '');
  const numPoids = parseFloat(formData.poids || '');
  let calculatedBmi: number | null = null;
  let bmiCategory: { label: string; color: string } | null = null;

  if (numTaille > 50 && numPoids > 10) {
    const heightM = numTaille / 100;
    calculatedBmi = parseFloat((numPoids / (heightM * heightM)).toFixed(1));
    if (calculatedBmi < 18.5) {
      bmiCategory = { 
        label: language === 'ar' ? 'نحافة / نقص في الوزن' : 'Insuffisance pondérale', 
        color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' 
      };
    } else if (calculatedBmi <= 24.9) {
      bmiCategory = { 
        label: language === 'ar' ? 'وزن طبيعي ومتناسق' : 'Poids normal', 
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
      };
    } else if (calculatedBmi <= 29.9) {
      bmiCategory = { 
        label: language === 'ar' ? 'زيادة في الوزن' : 'Surpoids', 
        color: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' 
      };
    } else {
      bmiCategory = { 
        label: language === 'ar' ? 'سمنة' : 'Obésité', 
        color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
      };
    }
  }

  // Parse numeric value or undefined
  const parseNum = (val?: string): number | undefined => {
    if (!val || val.trim() === '') return undefined;
    const n = parseFloat(val);
    return isNaN(n) ? undefined : n;
  };

  // Save changes
  const handleSave = async (andNext: boolean = false) => {
    try {
      const studentIdentity: StudentIdentity = {
        nomEleve: nomEleve.trim() || `تلميذ ${studentNumber}`,
        numeroEleve: currentNumeroEleve.trim() || studentNumber,
        sexe,
      };

      const physicalUpdates: Partial<PhysicalTests> = {
        taille: parseNum(formData.taille),
        poids: parseNum(formData.poids),
        frequenceCardiaque: parseNum(formData.frequenceCardiaque),
        vitesse30m: parseNum(formData.vitesse30m),
        sautHorizontal: parseNum(formData.sautHorizontal),
        sautVertical: parseNum(formData.sautVertical),
        lancerMedball: parseNum(formData.lancerMedball),
        souplesseAssis: parseNum(formData.souplesseAssis),
        souplesseDebout: parseNum(formData.souplesseDebout),
        equilibreStatique: parseNum(formData.equilibreStatique),
      };

      const vmaNum = parseNum(formData.vma);

      await saveCompleteStudentData(
        className,
        studentNumber,
        studentIdentity,
        physicalUpdates,
        vmaNum
      );

      setSaveSuccess(true);
      if (onDataSaved) onDataSaved();

      if (andNext && hasNext && onSelectStudent) {
        const nextStudent = allStudents[currentIndex + 1];
        onSelectStudent(nextStudent.numeroEleve);
      } else {
        setTimeout(() => {
          setSaveSuccess(false);
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving student data', err);
    }
  };

  const handlePrev = () => {
    if (hasPrev && onSelectStudent) {
      onSelectStudent(allStudents[currentIndex - 1].numeroEleve);
    }
  };

  const handleNext = () => {
    if (hasNext && onSelectStudent) {
      onSelectStudent(allStudents[currentIndex + 1].numeroEleve);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 w-full max-w-3xl flex flex-col h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-hidden transition-all">
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between bg-gray-50/50 dark:bg-gray-900/40 gap-2.5 shrink-0">
          {/* Top navigation & close row for Mobile */}
          <div className="flex sm:hidden items-center justify-between w-full pb-2 border-b border-gray-100 dark:border-gray-800/60">
            {allStudents.length > 1 && (
              <div className="flex items-center bg-gray-150 dark:bg-gray-850 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={language === 'ar' ? handleNext : handlePrev}
                  disabled={language === 'ar' ? !hasNext : !hasPrev}
                  className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-750 disabled:opacity-30 disabled:pointer-events-none transition"
                  title={language === 'ar' ? 'التالي' : 'Précédent'}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-black font-mono text-gray-500 dark:text-gray-400 px-2.5 select-none">
                  {currentIndex + 1} / {allStudents.length}
                </span>
                <button
                  type="button"
                  onClick={language === 'ar' ? handlePrev : handleNext}
                  disabled={language === 'ar' ? !hasPrev : !hasNext}
                  className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-750 disabled:opacity-30 disabled:pointer-events-none transition"
                  title={language === 'ar' ? 'السابق' : 'Suivant'}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shadow-xs shrink-0 ${
              sexe === 'F' 
                ? 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300' 
                : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
            }`}>
              {sexe === 'F' ? 'F' : 'M'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h3 className="text-base sm:text-lg md:text-xl font-black text-gray-900 dark:text-white truncate leading-tight">
                  {nomEleve || `تلميذ ${studentNumber}`}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIdentityEdit(!showIdentityEdit)}
                  className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-1 shrink-0"
                  title={language === 'ar' ? 'تعديل هوية التلميذ (الاسم، الرقم)' : 'Modifier l’identité'}
                >
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-none">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold truncate max-w-[120px]">
                  {currentNumeroEleve}
                </span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400 truncate">
                  {className}
                </span>
                <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
                {allStudents.length > 0 && (
                  <span className="hidden sm:inline text-gray-400 font-medium">
                    {currentIndex + 1} / {allStudents.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Controls & Close for Desktop/Tablet */}
          <div className="hidden sm:flex items-center gap-1.5">
            {allStudents.length > 1 && (
              <div className="flex items-center bg-gray-200/70 dark:bg-gray-700/70 rounded-xl p-0.5 me-2">
                <button
                  type="button"
                  onClick={language === 'ar' ? handleNext : handlePrev}
                  disabled={language === 'ar' ? !hasNext : !hasPrev}
                  className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 disabled:opacity-30 disabled:pointer-events-none transition"
                  title={language === 'ar' ? 'التالي' : 'Précédent'}
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={language === 'ar' ? handlePrev : handleNext}
                  disabled={language === 'ar' ? !hasPrev : !hasNext}
                  className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600 disabled:opacity-30 disabled:pointer-events-none transition"
                  title={language === 'ar' ? 'السابق' : 'Suivant'}
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-xl transition"
            >
              <XMarkIcon />
            </button>
          </div>
        </div>

        {/* Identity Edit Panel (Collapsible) */}
        {showIdentityEdit && (
          <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40 transition shrink-0">
            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-2">
              {language === 'ar' ? 'تعديل البيانات التعريفية للتلميذ' : 'Modification des données de base'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'ar' ? 'الاسم الكامل' : 'Nom complet'}
                </label>
                <input
                  type="text"
                  value={nomEleve}
                  onChange={(e) => { setNomEleve(e.target.value); setSaveSuccess(false); }}
                  className="w-full text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-650 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'ar' ? 'رقم التلميذ (مسار)' : 'N° Élève (Massar)'}
                </label>
                <input
                  type="text"
                  value={currentNumeroEleve}
                  onChange={(e) => { setCurrentNumeroEleve(e.target.value); setSaveSuccess(false); }}
                  className="w-full text-xs font-mono font-bold px-3 py-2 rounded-lg border border-gray-300 dark:bg-gray-800 dark:border-gray-650 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  {language === 'ar' ? 'الجنس' : 'Sexe'}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setSexe('M'); setSaveSuccess(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      sexe === 'M'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {language === 'ar' ? 'ذكر' : 'Masculin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSexe('F'); setSaveSuccess(false); }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      sexe === 'F'
                        ? 'bg-pink-600 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {language === 'ar' ? 'أنثى' : 'Féminin'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Tabs */}
        <div className="flex items-center px-4 pt-3 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 gap-2 sm:gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('biometrics')}
            className={`pb-2.5 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'biometrics'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-250'
            }`}
          >
            <ScaleIcon />
            <span>{language === 'ar' ? 'القياسات البيومترية و IMC' : 'Biométrie & IMC'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vma')}
            className={`pb-2.5 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'vma'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-255'
            }`}
          >
            <span>⚡</span>
            <span>{language === 'ar' ? 'السرعة الهوائية VMA' : 'Endurance & VMA'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('physical')}
            className={`pb-2.5 text-xs sm:text-sm font-black border-b-2 whitespace-nowrap transition flex items-center gap-1.5 shrink-0 ${
              activeTab === 'physical'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-255'
            }`}
          >
            <span>🏃</span>
            <span>{language === 'ar' ? 'الاختبارات البدنية' : 'Tests Physiques'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
              <p className="text-xs text-gray-500">{language === 'ar' ? 'جاري تحميل البيانات...' : 'Chargement...'}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* TAB 1: Biometrics & IMC */}
              {activeTab === 'biometrics' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Taille */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <RulerIcon />
                          <span>{language === 'ar' ? 'الطول' : 'Taille'}</span>
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">cm</span>
                      </div>
                      <input
                        type="number"
                        step="1"
                        min="80"
                        max="230"
                        placeholder=""
                        value={formData.taille || ''}
                        onChange={(e) => handleFieldChange('taille', e.target.value)}
                        className="w-full text-lg font-black text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Poids */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <ScaleIcon />
                          <span>{language === 'ar' ? 'الوزن' : 'Poids'}</span>
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">kg</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        min="20"
                        max="180"
                        placeholder=""
                        value={formData.poids || ''}
                        onChange={(e) => handleFieldChange('poids', e.target.value)}
                        className="w-full text-lg font-black text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>

                    {/* Fréquence cardiaque */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                          <HeartIcon />
                          <span>{language === 'ar' ? 'النبض بالراحة' : 'Pouls repos'}</span>
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">bpm</span>
                      </div>
                      <input
                        type="number"
                        step="1"
                        min="40"
                        max="200"
                        placeholder=""
                        value={formData.frequenceCardiaque || ''}
                        onChange={(e) => handleFieldChange('frequenceCardiaque', e.target.value)}
                        className="w-full text-lg font-black text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* IMC Real-time Display Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-center sm:text-start">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                        IMC
                      </div>
                      <div>
                        <div className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                          {language === 'ar' ? 'مؤشر كتلة الجسم (IMC / BMI)' : 'Indice de Masse Corporelle'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {calculatedBmi 
                            ? (language === 'ar' ? 'يتم احتسابه تلقائياً بناءً على الطول والوزن المدخلين' : 'Calculé automatiquement') 
                            : (language === 'ar' ? 'أدخل الطول والوزن لاحتساب المؤشر' : 'Saisissez la taille et le poids')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-indigo-600 dark:text-indigo-300 font-mono">
                        {calculatedBmi ?? '--.-'}
                      </span>
                      {bmiCategory && (
                        <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${bmiCategory.color}`}>
                          {bmiCategory.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: VMA & Endurance */}
              {activeTab === 'vma' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-5 rounded-2xl border border-amber-200 dark:border-amber-800/60">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <h4 className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <span>⚡</span>
                          <span>{language === 'ar' ? 'السرعة القصوى الهوائية VMA' : 'Vitesse Maximale Aérobie (VMA)'}</span>
                        </h4>
                        <p className="text-xs text-amber-700/80 dark:text-amber-300/70 mt-0.5">
                          {language === 'ar' 
                            ? 'السرعة المرجعية لتحديد مجموعات التحمل وتوزيع مسافات الجري وتتبع اللياقة' 
                            : 'Vitesse de référence pour les groupes d’endurance et l’évaluation'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                          km/h (كم/س)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="25"
                        placeholder=""
                        value={formData.vma || ''}
                        onChange={(e) => handleFieldChange('vma', e.target.value)}
                        className="w-48 text-2xl font-black text-center px-4 py-3 rounded-2xl border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm font-mono"
                      />

                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <div>
                          {parseNum(formData.vma) ? (
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <CheckIcon />
                              <span>{language === 'ar' ? 'قيمة VMA مسجلة' : 'VMA enregistrée'}</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">
                              {language === 'ar' ? 'لم يتم تحديد قيمة VMA لهذا التلميذ بعد' : 'Non renseigné'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {language === 'ar' ? 'يمكن تعديلها مباشرة هنا أو استيرادها تلقائياً من اختبار Luc Léger.' : 'Peut être saisie ici ou obtenue via le test Luc Léger.'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Functional Physical Tests */}
              {activeTab === 'physical' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Vitesse 30m */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? '30 م سرعة' : 'Course 30m vitesse'}
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">sec (ث)</span>
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        placeholder=""
                        value={formData.vitesse30m || ''}
                        onChange={(e) => handleFieldChange('vitesse30m', e.target.value)}
                        className="w-full text-base font-bold text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    {/* Saut Horizontal */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? 'القفز الأفقي من الثبات' : 'Saut horizontal sans élan'}
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">cm (سم)</span>
                      </div>
                      <input
                        type="number"
                        step="1"
                        placeholder=""
                        value={formData.sautHorizontal || ''}
                        onChange={(e) => handleFieldChange('sautHorizontal', e.target.value)}
                        className="w-full text-base font-bold text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    {/* Saut Vertical */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? 'القفز العمودي (Détente)' : 'Détente verticale (Saut)'}
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">cm (سم)</span>
                      </div>
                      <input
                        type="number"
                        step="1"
                        placeholder=""
                        value={formData.sautVertical || ''}
                        onChange={(e) => handleFieldChange('sautVertical', e.target.value)}
                        className="w-full text-base font-bold text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    {/* Lancer Médecine-ball */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? 'رمي الكرة الطبية' : 'Lancer médecine-ball'}
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">m (متر)</span>
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        placeholder=""
                        value={formData.lancerMedball || ''}
                        onChange={(e) => handleFieldChange('lancerMedball', e.target.value)}
                        className="w-full text-base font-bold text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    {/* Souplesse Assis */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? 'المرونة في وضع الجلوس' : 'Souplesse (assis)'}
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">cm (سم)</span>
                      </div>
                      <input
                        type="number"
                        step="0.5"
                        placeholder=""
                        value={formData.souplesseAssis || ''}
                        onChange={(e) => handleFieldChange('souplesseAssis', e.target.value)}
                        className="w-full text-base font-bold text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>

                    {/* Equilibre Statique */}
                    <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {language === 'ar' ? 'التوازن الثابت (Flamant Rose)' : 'Équilibre statique'}
                        </label>
                        <span className="text-[10px] font-bold text-gray-400">sec (ث)</span>
                      </div>
                      <input
                        type="number"
                        step="1"
                        placeholder=""
                        value={formData.equilibreStatique || ''}
                        onChange={(e) => handleFieldChange('equilibreStatique', e.target.value)}
                        className="w-full text-base font-bold text-center px-3 py-2 rounded-xl border border-gray-300 dark:bg-gray-800 dark:border-gray-600 focus:ring-1 focus:ring-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-4 py-3 sm:px-5 sm:py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-bold animate-in fade-in">
                <CheckIcon />
                <span>{language === 'ar' ? 'تم الحفظ بنجاح!' : 'Enregistré avec succès !'}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {t.cancel}
            </button>

            {hasNext && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md transition"
              >
                <span>{language === 'ar' ? 'حفظ والتالي ⏭️' : 'Enregistrer & Suivant'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSave(false)}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <SaveIcon />
              <span>{language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
