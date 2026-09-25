import React, { useState, useEffect } from 'react';
import type { StudentIdentity } from '../types';
import { addStudentToClass, updateStudentInClass, getStudentList } from '../utils/db';
import { useLanguage } from '../utils/i18n';
import { XMarkIcon, SaveIcon, CheckIcon } from './Icons';

interface AddEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  className: string;
  studentToEdit?: StudentIdentity | null;
  onSuccess?: (student: StudentIdentity) => void;
  existingStudentsCount?: number;
}

export const AddEditStudentModal: React.FC<AddEditStudentModalProps> = ({
  isOpen,
  onClose,
  className,
  studentToEdit,
  onSuccess,
  existingStudentsCount = 0
}) => {
  const { language, t } = useLanguage();
  const isEditMode = Boolean(studentToEdit);

  const [nomEleve, setNomEleve] = useState('');
  const [numeroEleve, setNumeroEleve] = useState('');
  const [sexe, setSexe] = useState<'M' | 'F'>('M');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    if (studentToEdit) {
      setNomEleve(studentToEdit.nomEleve || '');
      setNumeroEleve(studentToEdit.numeroEleve || '');
      setSexe(studentToEdit.sexe || 'M');
    } else {
      setNomEleve('');
      // Auto-suggest next sequential number e.g. 1, 2, 3...
      const nextNum = existingStudentsCount > 0 ? String(existingStudentsCount + 1) : '1';
      setNumeroEleve(nextNum);
      setSexe('M');
    }
  }, [isOpen, studentToEdit, existingStudentsCount]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nomEleve.trim();
    const cleanNum = numeroEleve.trim();

    if (!cleanName) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال اسم التلميذ بالكامل.' : 'Veuillez saisir le nom de l’élève.');
      return;
    }

    if (!cleanNum) {
      setErrorMsg(language === 'ar' ? 'يرجى إدخال رقم التلميذ أو رقم مسار.' : 'Veuillez saisir le numéro ou code Massar.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const studentData: StudentIdentity = {
        nomEleve: cleanName,
        numeroEleve: cleanNum,
        sexe
      };

      if (isEditMode && studentToEdit) {
        const res = await updateStudentInClass(className, studentToEdit.numeroEleve, studentData);
        if (!res.success) {
          setErrorMsg(res.error || (language === 'ar' ? 'حدث خطأ أثناء تعديل بيانات التلميذ' : 'Erreur lors de la mise à jour'));
          setLoading(false);
          return;
        }
      } else {
        const res = await addStudentToClass(className, studentData);
        if (!res.success) {
          setErrorMsg(res.error || (language === 'ar' ? 'حدث خطأ أثناء إضافة التلميذ' : 'Erreur lors de l’ajout'));
          setLoading(false);
          return;
        }
      }

      if (onSuccess) {
        onSuccess(studentData);
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || (language === 'ar' ? 'تعذر حفظ البيانات.' : 'Échec de l’enregistrement.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-gray-850 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/80 flex items-center justify-between bg-gray-50/70 dark:bg-gray-800/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl text-white ${isEditMode ? 'bg-amber-600' : 'bg-indigo-600'}`}>
              <span className="text-base font-black">{isEditMode ? '✏️' : '➕'}</span>
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                {isEditMode 
                  ? (language === 'ar' ? 'تعديل بيانات التلميذ' : 'Modifier l’élève')
                  : (language === 'ar' ? 'إضافة تلميذ جديد للائحة' : 'Ajouter un élève')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                {language === 'ar' ? `القسم: ${className}` : `Classe : ${className}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-750 transition"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-bold animate-shake">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* Student Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              {language === 'ar' ? 'الاسم الكامل للتلميذ(ة)' : 'Nom complet de l’élève'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={nomEleve}
              onChange={(e) => setNomEleve(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: محمد بنعلي' : 'Ex: Mohammed Benali'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Student Number / Massar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                {language === 'ar' ? 'رقم التلميذ أو رقم مسار' : 'N° Élève ou Code Massar'} <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-gray-400 font-medium">
                {language === 'ar' ? 'رقم ترتيبي أو رمز مسار' : 'N° d’ordre ou code'}
              </span>
            </div>
            <input
              type="text"
              required
              value={numeroEleve}
              onChange={(e) => setNumeroEleve(e.target.value)}
              placeholder={language === 'ar' ? 'مثال: 12 أو K1340982' : 'Ex: 12 ou K1340982'}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Gender selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
              {language === 'ar' ? 'الجنس' : 'Genre'} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSexe('M')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 ${
                  sexe === 'M'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>👦</span>
                <span>{language === 'ar' ? 'ذكر (Garçon)' : 'Masculin (M)'}</span>
                {sexe === 'M' && <CheckIcon />}
              </button>

              <button
                type="button"
                onClick={() => setSexe('F')}
                className={`py-2.5 px-3 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 ${
                  sexe === 'F'
                    ? 'bg-pink-600 text-white border-pink-600 shadow-sm shadow-pink-500/20'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <span>👧</span>
                <span>{language === 'ar' ? 'أنثى (Fille)' : 'Féminin (F)'}</span>
                {sexe === 'F' && <CheckIcon />}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100 dark:border-gray-700/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md flex items-center gap-2 transition ${
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              } disabled:opacity-50`}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <SaveIcon />
              )}
              <span>
                {isEditMode
                  ? (language === 'ar' ? 'حفظ التعديلات' : 'Enregistrer')
                  : (language === 'ar' ? 'إضافة التلميذ' : 'Ajouter')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
