import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  PrinterIcon, 
  CheckCircleIcon, 
  TrashIcon, 
  PencilSquareIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  SparklesIcon,
  PlusIcon
} from './Icons';
import { StudentIdentity, SchoolAccidentReport } from '../types';
import { 
  getSchoolAccidentReports, 
  saveSchoolAccidentReport, 
  deleteSchoolAccidentReport 
} from '../utils/accidentReportsDb';
import { getAllClasses, getStudentList, ClassStats } from '../utils/db';
import { getTeacherForClass } from '../utils/teacherHelper';
import { MOROCCAN_EPS_SPORTS } from '../utils/pedagogicalObjectivesData';

interface SchoolAccidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassName?: string;
  defaultStudent?: StudentIdentity | null;
}

export const SchoolAccidentModal: React.FC<SchoolAccidentModalProps> = ({
  isOpen,
  onClose,
  defaultClassName = '',
  defaultStudent = null
}) => {
  const [classes, setClasses] = useState<ClassStats[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>(defaultClassName);
  const [students, setStudents] = useState<StudentIdentity[]>([]);
  const [reports, setReports] = useState<SchoolAccidentReport[]>([]);
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'preview'>('create');
  
  // Customization & Header
  const [institution, setInstitution] = useState<string>(() => localStorage.getItem('eps_school_name') || 'الثانوية التأهيلية');
  const [teacherName, setTeacherName] = useState<string>(() => localStorage.getItem('eps_teacher_name') || 'أستاذ التربية البدنية والرياضية');
  const [academicYear, setAcademicYear] = useState<string>(() => {
    const curYear = new Date().getFullYear();
    return `${curYear} / ${curYear + 1}`;
  });

  // Form State
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [selectedStudentNumber, setSelectedStudentNumber] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentDob, setStudentDob] = useState<string>('');
  const [studentGender, setStudentGender] = useState<'M' | 'F'>('M');
  
  const [sportActivity, setSportActivity] = useState<string>('الجري السريع');
  const [customSport, setCustomSport] = useState<string>('');
  const [accidentDate, setAccidentDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [accidentTime, setAccidentTime] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [accidentLocation, setAccidentLocation] = useState<string>('ملعب التربية البدنية');
  const [customLocation, setCustomLocation] = useState<string>('');
  
  const [description, setDescription] = useState<string>('');
  const [injuryNature, setInjuryNature] = useState<string>('التواء (Entorse)');
  const [customInjuryNature, setCustomInjuryNature] = useState<string>('');
  const [injuryLocation, setInjuryLocation] = useState<string>('الكاحل الأيمن');
  const [firstAidMeasures, setFirstAidMeasures] = useState<string>('إيقاف النشاط فوراً، وضع كمادات ثلج، ورباط ضاغط مهدئ.');
  const [evacuationHospital, setEvacuationHospital] = useState<string>('');
  const [parentNotified, setParentNotified] = useState<boolean>(true);
  const [parentNotificationTime, setParentNotificationTime] = useState<string>('');
  const [witnesses, setWitnesses] = useState<string>('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState<string>('MAMDA / التأمين المدرسي الرسمي');

  // Preview / Print Selected Report
  const [activeReportForPreview, setActiveReportForPreview] = useState<SchoolAccidentReport | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (defaultClassName) {
      setSelectedClass(defaultClassName);
    }
  }, [defaultClassName]);

  useEffect(() => {
    if (defaultStudent) {
      applyStudent(defaultStudent);
    }
  }, [defaultStudent]);

  useEffect(() => {
    if (selectedClass) {
      loadStudentsAndReports(selectedClass);
      const teacher = getTeacherForClass(selectedClass);
      if (teacher && teacher !== 'أستاذ التربية البدنية') {
        setTeacherName(teacher);
      }
    }
  }, [selectedClass]);

  const loadInitialData = async () => {
    try {
      const cls = await getAllClasses();
      setClasses(cls);
      const target = defaultClassName || (cls.length > 0 ? cls[0].className : '');
      if (target) {
        setSelectedClass(target);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadStudentsAndReports = async (clsName: string) => {
    if (!clsName) return;
    try {
      const studs = await getStudentList(clsName);
      setStudents(studs || []);
      
      const repList = await getSchoolAccidentReports(clsName);
      setReports(repList || []);

      if (defaultStudent) {
        applyStudent(defaultStudent);
      } else if (studs && studs.length > 0 && !selectedStudentNumber) {
        applyStudent(studs[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const applyStudent = (s: StudentIdentity) => {
    setSelectedStudentNumber(s.numeroEleve);
    setStudentName(s.nomEleve);
    setStudentDob(s.dateNaissance || '');
    setStudentGender(s.sexe === 'F' ? 'F' : 'M');
  };

  const handleStudentSelectChange = (num: string) => {
    setSelectedStudentNumber(num);
    const found = students.find(s => s.numeroEleve === num);
    if (found) {
      applyStudent(found);
    }
  };

  const resetForm = () => {
    setEditingReportId(null);
    if (students.length > 0) {
      applyStudent(students[0]);
    } else {
      setSelectedStudentNumber('');
      setStudentName('');
      setStudentDob('');
    }
    setSportActivity('الجري السريع');
    setCustomSport('');
    setAccidentDate(new Date().toISOString().split('T')[0]);
    const d = new Date();
    setAccidentTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    setAccidentLocation('ملعب التربية البدنية');
    setCustomLocation('');
    setDescription('');
    setInjuryNature('التواء (Entorse)');
    setCustomInjuryNature('');
    setInjuryLocation('الكاحل الأيمن');
    setFirstAidMeasures('إيقاف النشاط فوراً، وضع كمادات ثلج، ورباط ضاغط مهدئ.');
    setEvacuationHospital('');
    setParentNotified(true);
    setParentNotificationTime('');
    setWitnesses('');
  };

  const handleEditReport = (rep: SchoolAccidentReport) => {
    setEditingReportId(rep.id);
    setSelectedClass(rep.className);
    setSelectedStudentNumber(rep.studentNumber);
    setStudentName(rep.studentName);
    setStudentDob(rep.studentDob || '');
    setStudentGender(rep.studentGender || 'M');
    
    setSportActivity(rep.sportActivity);
    setAccidentDate(rep.accidentDate);
    setAccidentTime(rep.accidentTime);
    setAccidentLocation(rep.accidentLocation);
    setDescription(rep.description);
    setInjuryNature(rep.injuryNature);
    setInjuryLocation(rep.injuryLocation || '');
    setFirstAidMeasures(rep.firstAidMeasures);
    setEvacuationHospital(rep.evacuationHospital || '');
    setParentNotified(Boolean(rep.parentNotified));
    setParentNotificationTime(rep.parentNotificationTime || '');
    setWitnesses(rep.witnesses || '');
    setInsurancePolicyNumber(rep.insurancePolicyNumber || 'MAMDA');

    setActiveTab('create');
  };

  const handleDeleteReport = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف تقرير الحادثة المدرسية هذا نهائياً؟')) {
      try {
        await deleteSchoolAccidentReport(id);
        setNotification({ message: 'تم حذف تقرير الحادثة بنجاح.', type: 'success' });
        loadStudentsAndReports(selectedClass);
        if (activeReportForPreview?.id === id) {
          setActiveReportForPreview(null);
          setActiveTab('list');
        }
      } catch (err: any) {
        setNotification({ message: 'خطأ أثناء حذف التقرير', type: 'error' });
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      setNotification({ message: 'يرجى تحديد أو إدخال اسم التلميذ المصاب.', type: 'error' });
      return;
    }
    if (!description.trim()) {
      setNotification({ message: 'يرجى كتابة وصف موجز للحادثة وكيفية وقوعها.', type: 'error' });
      return;
    }

    const finalSport = sportActivity === 'أخرى' && customSport.trim() ? customSport.trim() : sportActivity;
    const finalLocation = accidentLocation === 'أخرى' && customLocation.trim() ? customLocation.trim() : accidentLocation;
    const finalInjury = injuryNature === 'أخرى' && customInjuryNature.trim() ? customInjuryNature.trim() : injuryNature;

    const reportObj: SchoolAccidentReport = {
      id: editingReportId || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      institution,
      teacherName,
      className: selectedClass,
      studentNumber: selectedStudentNumber,
      studentName: studentName.trim(),
      studentGender,
      studentDob,
      sportActivity: finalSport,
      accidentDate,
      accidentTime,
      accidentLocation: finalLocation,
      description: description.trim(),
      injuryNature: finalInjury,
      injuryLocation: injuryLocation.trim(),
      firstAidMeasures: firstAidMeasures.trim(),
      evacuationHospital: evacuationHospital.trim(),
      parentNotified,
      parentNotificationTime: parentNotificationTime.trim(),
      witnesses: witnesses.trim(),
      insurancePolicyNumber: insurancePolicyNumber.trim(),
      status: 'submitted',
      createdAt: editingReportId ? (reports.find(r => r.id === editingReportId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await saveSchoolAccidentReport(reportObj);
      setNotification({ 
        message: editingReportId ? 'تم تعديل تقرير الحادثة المدرسية بنجاح!' : 'تم تسجيل وحفظ تقرير الحادثة المدرسية بنجاح! 🚑', 
        type: 'success' 
      });
      await loadStudentsAndReports(selectedClass);
      setActiveReportForPreview(reportObj);
      setActiveTab('preview');
    } catch (err: any) {
      setNotification({ message: err.message || 'خطأ أثناء حفظ التقرير', type: 'error' });
    }
  };

  /**
   * Generates official Moroccan School Accident Declaration Document (A4 Portrait).
   * Compliant with Ministry of National Education & School Sports Insurance Standards.
   */
  const renderOfficialAccidentReportHtml = (rep: SchoolAccidentReport): string => {
    return `
      <div class="sheet">
        <!-- Official Kingdom Header -->
        <div class="official-header">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="text-align: right; line-height: 1.35; font-size: 9px; width: 32%;">
              <div style="font-weight: 800;">المملكة المغربية</div>
              <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
              <div>المؤسسة التعليمية: <strong>${rep.institution || institution}</strong></div>
              <div>الموسم الدراسي: <strong>${academicYear}</strong></div>
            </div>

            <div style="text-align: center; width: 36%;">
              <div class="title-box">
                تصريح وتقرير حول حادثة مدرسية
              </div>
              <div style="font-size: 8px; font-weight: bold; margin-top: 2px; color: #b91c1c;">
                DÉCLARATION D'ACCIDENT SCOLAIRE ET SPORTIF
              </div>
              <div style="font-size: 8px; color: #4b5563; margin-top: 1px;">
                (خاص بمادة التربية البدنية والرياضية والتأمين المدرسي)
              </div>
            </div>

            <div style="text-align: left; line-height: 1.35; font-size: 9px; width: 32%;">
              <div>الأستاذ(ة) المؤطر(ة): <strong>${rep.teacherName || teacherName}</strong></div>
              <div>القسم: <strong style="background: #e5e7eb; padding: 1px 5px; border-radius: 3px;">${rep.className}</strong></div>
              <div>التاريخ: <strong>${rep.accidentDate}</strong></div>
              <div>رقم المرجع: <span style="font-family: monospace;">${rep.id.slice(-8).toUpperCase()}</span></div>
            </div>
          </div>
        </div>

        <!-- Section 1: Injured Student Identity -->
        <div class="section-box">
          <div class="section-title">
            <span>1. هوية التلميذ(ة) المصاب(ة) (Identité de la victime)</span>
          </div>
          <table class="info-table">
            <tr>
              <td style="width: 20%; font-weight: bold; background: #f9fafb;">الاسم والنسب الكامل:</td>
              <td style="width: 35%; font-weight: 800; font-size: 9.5px; color: #1e3a8a;">${rep.studentName}</td>
              <td style="width: 20%; font-weight: bold; background: #f9fafb;">رقم مسار / الترتيب:</td>
              <td style="width: 25%; font-family: monospace; font-weight: bold;">${rep.studentNumber || '-'}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb;">القسم والفوج:</td>
              <td style="font-weight: bold;">${rep.className}</td>
              <td style="font-weight: bold; background: #f9fafb;">تاريخ الازدياد والجنس:</td>
              <td>${rep.studentDob || '-'} (${rep.studentGender === 'F' ? 'أنثى' : 'ذكر'})</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb;">رقم التأمين المدرسي:</td>
              <td colspan="3" style="font-weight: bold; color: #047857;">${rep.insurancePolicyNumber || 'MAMDA / MCMA — التأمين المدرسي والرياضي'}</td>
            </tr>
          </table>
        </div>

        <!-- Section 2: Circumstances of the Accident -->
        <div class="section-box" style="margin-top: 4px;">
          <div class="section-title" style="background: #fef2f2; color: #991b1b; border-color: #fca5a5;">
            <span>2. ظروف وتفاصيل الحادثة (Circonstances de l'accident)</span>
          </div>
          <table class="info-table">
            <tr>
              <td style="width: 20%; font-weight: bold; background: #f9fafb;">النشاط الرياضي الممارس:</td>
              <td style="width: 35%; font-weight: 800; color: #b45309;">${rep.sportActivity}</td>
              <td style="width: 20%; font-weight: bold; background: #f9fafb;">تاريخ وتوقيت الحادثة:</td>
              <td style="width: 25%; font-weight: bold;">${rep.accidentDate} — على الساعة ${rep.accidentTime}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb;">مكان وقوع الحادثة:</td>
              <td colspan="3" style="font-weight: 700;">${rep.accidentLocation}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb; vertical-align: top;">وصف مفصل للحادثة:</td>
              <td colspan="3" style="line-height: 1.4; padding: 4px; text-align: justify; font-size: 8.5px;">
                ${rep.description}
              </td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb;">الشهود الحاضرون:</td>
              <td colspan="3" style="font-size: 8px;">${rep.witnesses || 'تلاميذ وأستاذ الحصة الرياضية'}</td>
            </tr>
          </table>
        </div>

        <!-- Section 3: Nature of Injury & First Aid Measures -->
        <div class="section-box" style="margin-top: 4px;">
          <div class="section-title" style="background: #fff7ed; color: #9a3412; border-color: #fdba74;">
            <span>3. طبيعة الإصابة والإسعافات والتدابير المتخذة (Nature de la lésion et soins)</span>
          </div>
          <table class="info-table">
            <tr>
              <td style="width: 20%; font-weight: bold; background: #f9fafb;">طبيعة الإصابة:</td>
              <td style="width: 35%; font-weight: 800; color: #b91c1c;">${rep.injuryNature}</td>
              <td style="width: 20%; font-weight: bold; background: #f9fafb;">موضع الإصابة في الجسم:</td>
              <td style="width: 25%; font-weight: bold;">${rep.injuryLocation || '-'}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb;">الإسعافات الأولية الفورية:</td>
              <td colspan="3" style="line-height: 1.35; font-size: 8.5px;">${rep.firstAidMeasures}</td>
            </tr>
            <tr>
              <td style="font-weight: bold; background: #f9fafb;">النقل للمستعجلات / المركز:</td>
              <td style="font-weight: bold; color: #1e3a8a;">${rep.evacuationHospital || 'تمت المعالجة الميدانية / لم يستدع النقل'}</td>
              <td style="font-weight: bold; background: #f9fafb;">إشعار ولي الأمر:</td>
              <td>${rep.parentNotified ? `نعم تم الإشعار ${rep.parentNotificationTime ? `(الساعة ${rep.parentNotificationTime})` : ''}` : 'لم يتم'}</td>
            </tr>
          </table>
        </div>

        <!-- Section 4: Legal & Administrative Note -->
        <div style="margin-top: 5px; padding: 4px 6px; border: 1px dashed #6b7280; border-radius: 4px; background: #f9fafb; font-size: 7.5px; color: #374151; line-height: 1.3;">
          <strong>ملاحظة إدارية:</strong> يحرر هذا التقرير في نسختين رسميتين وفق مقتضيات المذكرات الوزارية المنظمة للحوادث المدرسية وقوانين التأمين الرياضي والمدرسي، وتودع نسخة لدى إدارة المؤسسة لمتابعة ملف التعويض والتطبيب مع شركة التأمين المتعاقدة، وتحفظ نسخة بملف المادة.
        </div>

        <!-- Signatures & Visas -->
        <div class="footer-sig">
          <div style="text-align: right; width: 45%;">
            <div style="font-weight: bold;">توقيع وتأشيرة أستاذ(ة) المادة:</div>
            <div style="font-size: 8px; color: #4b5563; margin-top: 2px;">الأستاذ(ة): ${rep.teacherName || teacherName}</div>
            <div style="height: 35px;"></div>
          </div>
          <div style="text-align: left; width: 45%;">
            <div style="font-weight: bold;">توقيع وخاتم رئيس المؤسسة التعليمية:</div>
            <div style="font-size: 8px; color: #4b5563; margin-top: 2px;">حرر بتاريخ: ${rep.accidentDate}</div>
            <div style="height: 35px;"></div>
          </div>
        </div>
      </div>
    `;
  };

  /**
   * Print accident report via isolated iframe (Strictly A4 Portrait)
   */
  const handlePrintReport = (rep: SchoolAccidentReport) => {
    setIsPrinting(true);
    try {
      const printIframe = document.createElement('iframe');
      printIframe.setAttribute('style', 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;border:none;');
      document.body.appendChild(printIframe);

      const iframeDoc = printIframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        setIsPrinting(false);
        return;
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="utf-8">
          <title>تصريح بحادثة مدرسية - ${rep.studentName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 5mm 6mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              direction: rtl;
            }
            .sheet {
              page-break-after: always;
              break-after: page;
              box-sizing: border-box;
              width: 100%;
              height: 287mm;
              max-height: 287mm;
              padding: 4mm 6mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              overflow: hidden;
            }
            .official-header {
              border-bottom: 2px solid #000;
              padding-bottom: 4px;
              margin-bottom: 4px;
            }
            .title-box {
              border: 2px solid #b91c1c;
              background-color: #fef2f2 !important;
              color: #991b1b;
              font-weight: 900;
              font-size: 12px;
              padding: 2.5px 8px;
              border-radius: 5px;
              display: inline-block;
            }
            .section-box {
              border: 1px solid #1f2937;
              border-radius: 4px;
              overflow: hidden;
            }
            .section-title {
              background: #f3f4f6 !important;
              font-weight: 800;
              font-size: 8.5px;
              padding: 2.5px 6px;
              border-bottom: 1px solid #1f2937;
            }
            .info-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8px;
            }
            .info-table td {
              border: 1px solid #e5e7eb;
              padding: 3px 5px;
              vertical-align: middle;
            }
            .footer-sig {
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1.5px solid #000;
              display: flex;
              justify-content: space-between;
              font-size: 9px;
            }
          </style>
        </head>
        <body>
          ${renderOfficialAccidentReportHtml(rep)}
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(fullHtml);
      iframeDoc.close();

      setTimeout(() => {
        try {
          printIframe.contentWindow?.focus();
          printIframe.contentWindow?.print();
        } catch (err) {
          window.print();
        } finally {
          setIsPrinting(false);
          setTimeout(() => {
            try { document.body.removeChild(printIframe); } catch (e) {}
          }, 30000);
        }
      }, 400);

    } catch (e) {
      setIsPrinting(false);
      window.print();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-850 rounded-t-3xl sm:rounded-3xl w-full max-w-5xl h-[95vh] sm:h-auto sm:max-h-[92vh] flex flex-col shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden text-gray-900 dark:text-gray-100 animate-fadeIn">
        
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-rose-700 via-red-600 to-amber-700 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shadow-xs">
              🚑
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black">
                  تقرير وتصريح حول حادثة مدرسية
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white text-rose-800 shadow-2xs">
                  وثيقة التأمين المدرسي A4 📄
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-rose-100 mt-0.5">
                توثيق الحوادث الرياضية، ظروفها، طبيعة الإصابة والإسعافات والتدابير المتخذة لتسليمها للإدارة والتأمين
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95 cursor-pointer"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-4 pt-2 gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-4 font-black text-xs transition relative flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeTab === 'create'
                ? 'bg-white dark:bg-gray-850 text-rose-600 dark:text-rose-400 border-t-2 border-rose-600 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PlusIcon className="w-4 h-4" />
            <span>{editingReportId ? 'تعديل تقرير الحادثة' : 'تحرير تقرير حادثة جديد'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 px-4 font-black text-xs transition relative flex items-center gap-2 cursor-pointer rounded-t-xl ${
              activeTab === 'list'
                ? 'bg-white dark:bg-gray-850 text-rose-600 dark:text-rose-400 border-t-2 border-rose-600 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <DocumentTextIcon className="w-4 h-4" />
            <span>سجل الحوادث المسجلة بالقسم ({reports.length})</span>
          </button>

          {activeReportForPreview && (
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`pb-2.5 px-4 font-black text-xs transition relative flex items-center gap-2 cursor-pointer rounded-t-xl ${
                activeTab === 'preview'
                  ? 'bg-white dark:bg-gray-850 text-rose-600 dark:text-rose-400 border-t-2 border-rose-600 shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <PrinterIcon className="w-4 h-4 text-emerald-600" />
              <span>معاينة وطباعة الوثيقة الرسمية (A4)</span>
            </button>
          )}
        </div>

        {/* Notification Alert */}
        {notification && (
          <div className={`m-3 p-3 rounded-xl text-xs font-bold flex items-center justify-between ${
            notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
          }`}>
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="p-1 cursor-pointer">
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: CREATE / EDIT FORM */}
          {activeTab === 'create' && (
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Row 1: Class and Injured Student Selection */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>تحديد التلميذ(ة) المصاب(ة) والقسم:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      القسم:
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      {classes.map(c => (
                        <option key={c.className} value={c.className}>
                          {c.className} ({c.studentCount} تلميذ)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      اختيار التلميذ(ة) المصاب(ة):
                    </label>
                    <select
                      value={selectedStudentNumber}
                      onChange={(e) => handleStudentSelectChange(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <option value="">-- اختر التلميذ من اللائحة --</option>
                      {students.map(s => (
                        <option key={s.numeroEleve} value={s.numeroEleve}>
                          {s.nomEleve} ({s.codeMassar || s.numeroEleve})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      الاسم الكامل للتلميذ المصاب:
                    </label>
                    <input
                      type="text"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="اسم ونسب التلميذ..."
                      required
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      رقم مسار:
                    </label>
                    <input
                      type="text"
                      value={selectedStudentNumber}
                      onChange={(e) => setSelectedStudentNumber(e.target.value)}
                      placeholder="رقم مسار..."
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      تاريخ الازدياد:
                    </label>
                    <input
                      type="text"
                      value={studentDob}
                      onChange={(e) => setStudentDob(e.target.value)}
                      placeholder="YYYY-MM-DD"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      الجنس:
                    </label>
                    <select
                      value={studentGender}
                      onChange={(e) => setStudentGender(e.target.value as 'M' | 'F')}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold"
                    >
                      <option value="M">ذكر (Masculin)</option>
                      <option value="F">أنثى (Féminin)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Activity, Time, and Location (Mandatory in user brief) */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>النشاط الرياضي، التوقيت، ومكان وقوع الحادثة:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Activity */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      النشاط الرياضي (Activité):
                    </label>
                    <select
                      value={sportActivity}
                      onChange={(e) => setSportActivity(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      {MOROCCAN_EPS_SPORTS.map(s => (
                        <option key={s.sportKey} value={s.sportNameAr}>{s.sportNameAr}</option>
                      ))}
                      <option value="كرة القدم">كرة القدم</option>
                      <option value="الكرة الطائرة">الكرة الطائرة</option>
                      <option value="الركبي">الركبي (Rugby)</option>
                      <option value="رمي الجلة">رمي الجلة (Poids)</option>
                      <option value="الإحماء والتمديد">الإحماء والتمديد</option>
                      <option value="أخرى">نشاط آخر...</option>
                    </select>
                    {sportActivity === 'أخرى' && (
                      <input
                        type="text"
                        value={customSport}
                        onChange={(e) => setCustomSport(e.target.value)}
                        placeholder="حدد النشاط..."
                        className="w-full mt-1.5 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg px-2 py-1 text-xs"
                      />
                    )}
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      تاريخ الحادثة:
                    </label>
                    <input
                      type="date"
                      value={accidentDate}
                      onChange={(e) => setAccidentDate(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  {/* Time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      توقيت الحادثة (Heure):
                    </label>
                    <input
                      type="time"
                      value={accidentTime}
                      onChange={(e) => setAccidentTime(e.target.value)}
                      required
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold font-mono"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      مكان وقوع الحادثة (Lieu):
                    </label>
                    <select
                      value={accidentLocation}
                      onChange={(e) => setAccidentLocation(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <option value="ملعب التربية البدنية">ملعب التربية البدنية</option>
                      <option value="ملعب كرة السلة">ملعب كرة السلة</option>
                      <option value="ملعب كرة اليد">ملعب كرة اليد</option>
                      <option value="قاعة الجمباز">قاعة الجمباز</option>
                      <option value="حلبة ألعاب القوى">حلبة ألعاب القوى</option>
                      <option value="فضاء الوثب الطولي (حفرة الرمل)">فضاء الوثب الطولي (حفرة الرمل)</option>
                      <option value="المستودعات الرياضية">المستودعات الرياضية</option>
                      <option value="ساحة المؤسسة">ساحة المؤسسة</option>
                      <option value="أخرى">مكان آخر...</option>
                    </select>
                    {accidentLocation === 'أخرى' && (
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="حدد المكان بدقة..."
                        className="w-full mt-1.5 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg px-2 py-1 text-xs"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Row 3: Accident Description (Mandatory in user brief) */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-200">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>وصف دقيق ومفصل للحادثة وكيفية وقوعها:</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    (الظروف، الحركة المنجزة، السقوط أو الاحتكاك)
                  </span>
                </div>

                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="اكتب هنا وصفاً مفصلاً للحادثة، مثلاً: أثناء ممارسة نشاط الجري السريع ومحاولة الانطلاق، فقد التلميذ توازنه إثر التواء مفاجئ في قدمه اليمنى وسقط أرضاً على أرضية الملعب..."
                  rows={4}
                  required
                  className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-3 text-xs font-medium leading-relaxed outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {/* Row 4: Injury, First Aid, and Evacuation */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-2 text-xs font-black text-gray-800 dark:text-gray-200">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px]">4</span>
                  <span>طبيعة الإصابة، الإسعافات الأولية، والتدابير المتخذة:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      طبيعة الإصابة (Nature de la lésion):
                    </label>
                    <select
                      value={injuryNature}
                      onChange={(e) => setInjuryNature(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    >
                      <option value="التواء (Entorse)">التواء (Entorse)</option>
                      <option value="كسر محتمل (Fracture)">كسر محتمل (Fracture)</option>
                      <option value="كدمة ورضوض (Contusion)">كدمة ورضوض (Contusion)</option>
                      <option value="جرح سطحي / عميق (Plaie)">جرح سطحي / عميق (Plaie)</option>
                      <option value="خلع مفصلي (Luxation)">خلع مفصلي (Luxation)</option>
                      <option value="إغماء وفقدان وعي مؤقت">إغماء وفقدان وعي مؤقت</option>
                      <option value="تشنج أو تمزق عضلي">تشنج أو تمزق عضلي</option>
                      <option value="أخرى">إصابة أخرى...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      موضع الإصابة في الجسم:
                    </label>
                    <input
                      type="text"
                      value={injuryLocation}
                      onChange={(e) => setInjuryLocation(e.target.value)}
                      placeholder="مثال: الكاحل الأيمن، الركبة اليسرى، معصم اليد..."
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                      النقل للمستعجلات / المركز الصحي:
                    </label>
                    <input
                      type="text"
                      value={evacuationHospital}
                      onChange={(e) => setEvacuationHospital(e.target.value)}
                      placeholder="اسم المستشفى أو المركز الصحي (إن وجد)..."
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-1">
                    الإسعافات الأولية والتدابير المتخذة ميدانياً:
                  </label>
                  <input
                    type="text"
                    value={firstAidMeasures}
                    onChange={(e) => setFirstAidMeasures(e.target.value)}
                    placeholder="التدابير المتخذة (وضع الثلج، الضمادة، استدعاء الوقاية المدنية 15، إشعار الإدارة...)"
                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="parentCheck"
                      checked={parentNotified}
                      onChange={(e) => setParentNotified(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="parentCheck" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                      تم إشعار ولي الأمر / الأسرة
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      توقيت إشعار الأسرة:
                    </label>
                    <input
                      type="text"
                      value={parentNotificationTime}
                      onChange={(e) => setParentNotificationTime(e.target.value)}
                      placeholder="مثال: 09:45 صباحاً عبر الهاتف"
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 mb-1">
                      الشهود الحاضرون:
                    </label>
                    <input
                      type="text"
                      value={witnesses}
                      onChange={(e) => setWitnesses(e.target.value)}
                      placeholder="أسماء زملاء أو أطر حاضرين..."
                      className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-xs font-bold transition"
                >
                  إعادة تعيين الحقول
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition"
                  >
                    إلغاء
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{editingReportId ? 'حفظ التعديلات' : 'تسجيل التقرير والمعاينة الرسمية'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: REPORTS LIST */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                  سجل الحوادث المدرسية المسجلة بالقسم «{selectedClass}»:
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab('create');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>تسجيل حادثة جديدة</span>
                </button>
              </div>

              {reports.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 text-gray-500 space-y-2">
                  <div className="text-3xl">🛡️</div>
                  <div className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    لا توجد أي حوادث مدرسية مسجلة لهذا القسم حالياً.
                  </div>
                  <p className="text-[11px] text-gray-400">
                    نتمنى السلامة التامة لجميع التلميذات والتلاميذ.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {reports.map((rep) => (
                    <div
                      key={rep.id}
                      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xs border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-rose-300 transition"
                    >
                      <div className="space-y-1 max-w-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                          <span className="font-black text-sm text-gray-900 dark:text-white">
                            {rep.studentName}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {rep.injuryNature}
                          </span>
                          <span className="text-xs font-mono text-gray-400">
                            ({rep.studentNumber || rep.className})
                          </span>
                        </div>

                        <div className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          <strong>النشاط:</strong> {rep.sportActivity} • <strong>المكان:</strong> {rep.accidentLocation} • <strong>الوصف:</strong> {rep.description}
                        </div>

                        <div className="text-[11px] text-gray-400 flex items-center gap-3">
                          <span>📅 {rep.accidentDate} ({rep.accidentTime})</span>
                          <span>🏥 {rep.evacuationHospital || 'علاج ميداني'}</span>
                          <span>👨‍🏫 المؤطر: {rep.teacherName}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveReportForPreview(rep);
                            setActiveTab('preview');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                          title="معاينة الوثيقة الرسمية"
                        >
                          <DocumentTextIcon className="w-4 h-4" />
                          <span>معاينة</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePrintReport(rep)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                          title="طباعة تقرير الحادثة A4"
                        >
                          <PrinterIcon className="w-4 h-4" />
                          <span>طباعة A4</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditReport(rep)}
                          className="p-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition cursor-pointer"
                          title="تعديل التقرير"
                        >
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteReport(rep.id)}
                          className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="حذف التقرير"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PREVIEW & PRINT OFFICIAL DOCUMENT */}
          {activeTab === 'preview' && activeReportForPreview && (
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Action Bar */}
              <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                    معاينة الوثيقة الرسمية للحادثة المدرسية (A4 بورتريه)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    جاهزة للطباعة والتوقيع والتسليم لإدارة المؤسسة ومصلحة التأمين المدرسي
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditReport(activeReportForPreview)}
                    className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold text-xs transition"
                  >
                    تعديل التقرير
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePrintReport(activeReportForPreview)}
                    disabled={isPrinting}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <PrinterIcon className="w-4 h-4" />
                    <span>{isPrinting ? 'جاري التحضير...' : 'طباعة التقرير الرسمي (A4)'}</span>
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet Preview */}
              <div className="bg-white text-gray-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-300 font-sans space-y-4">
                
                {/* Official Header */}
                <div className="border-b-2 border-gray-900 pb-3 flex justify-between items-start text-xs font-bold">
                  <div className="space-y-0.5 text-right w-1/3">
                    <div className="font-extrabold text-[11px]">المملكة المغربية</div>
                    <div>وزارة التربية الوطنية والتعليم الأولي والرياضة</div>
                    <div>المؤسسة: <strong className="underline">{activeReportForPreview.institution || institution}</strong></div>
                    <div>الموسم: <strong>{academicYear}</strong></div>
                  </div>

                  <div className="text-center w-1/3 space-y-1">
                    <div className="inline-block border-2 border-rose-700 bg-rose-50 text-rose-800 font-black px-3 py-1 rounded-md text-xs sm:text-sm">
                      تصريح وتقرير حول حادثة مدرسية
                    </div>
                    <div className="text-[9px] font-bold text-gray-600">
                      DÉCLARATION D'ACCIDENT SCOLAIRE ET SPORTIF
                    </div>
                  </div>

                  <div className="space-y-0.5 text-left w-1/3">
                    <div>الأستاذ(ة): <strong>{activeReportForPreview.teacherName || teacherName}</strong></div>
                    <div>القسم: <strong className="px-2 py-0.5 bg-gray-100 rounded border border-gray-300">{activeReportForPreview.className}</strong></div>
                    <div>التاريخ: <strong>{activeReportForPreview.accidentDate}</strong></div>
                  </div>
                </div>

                {/* Section 1 */}
                <div className="border border-gray-800 rounded-md overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1 font-black text-[11px] border-b border-gray-800">
                    1. هوية التلميذ(ة) المصاب(ة):
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[10px]">الاسم الكامل:</span>
                      <strong className="text-sm text-indigo-900">{activeReportForPreview.studentName}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">رقم مسار:</span>
                      <strong className="font-mono">{activeReportForPreview.studentNumber || '-'}</strong>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">تاريخ الازدياد:</span>
                      <span className="font-mono">{activeReportForPreview.studentDob || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[10px]">الجنس:</span>
                      <span>{activeReportForPreview.studentGender === 'F' ? 'أنثى' : 'ذكر'}</span>
                    </div>
                  </div>
                </div>

                {/* Section 2 */}
                <div className="border border-gray-800 rounded-md overflow-hidden">
                  <div className="bg-rose-50 px-3 py-1 font-black text-[11px] border-b border-gray-800 text-rose-900">
                    2. ظروف ومكان ونشاط الحادثة:
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-gray-500 block text-[10px]">النشاط الرياضي:</span>
                        <strong className="text-amber-800">{activeReportForPreview.sportActivity}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">تاريخ وتوقيت الحادثة:</span>
                        <strong>{activeReportForPreview.accidentDate} — {activeReportForPreview.accidentTime}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">مكان الحادثة:</span>
                        <strong>{activeReportForPreview.accidentLocation}</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200">
                      <span className="text-gray-500 block text-[10px] mb-1 font-bold">وصف مفصل للحادثة:</span>
                      <div className="bg-gray-50 p-2.5 rounded border border-gray-200 text-xs leading-relaxed font-medium">
                        {activeReportForPreview.description}
                      </div>
                    </div>

                    {activeReportForPreview.witnesses && (
                      <div className="text-[11px] text-gray-600">
                        <strong>الشهود الحاضرون:</strong> {activeReportForPreview.witnesses}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3 */}
                <div className="border border-gray-800 rounded-md overflow-hidden">
                  <div className="bg-amber-50 px-3 py-1 font-black text-[11px] border-b border-gray-800 text-amber-900">
                    3. طبيعة الإصابة والإسعافات والتدابير المتخذة:
                  </div>
                  <div className="p-3 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-gray-500 block text-[10px]">طبيعة الإصابة:</span>
                        <strong className="text-rose-700">{activeReportForPreview.injuryNature}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">موضع الإصابة:</span>
                        <strong>{activeReportForPreview.injuryLocation || '-'}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-[10px]">النقل للمستعجلات:</span>
                        <strong>{activeReportForPreview.evacuationHospital || 'علاج ميداني'}</strong>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-gray-500 block text-[10px] font-bold">الإسعافات والتدابير المتخذة:</span>
                      <div className="text-xs leading-relaxed font-medium">
                        {activeReportForPreview.firstAidMeasures}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-[11px]">
                      <span>
                        <strong>إشعار ولي الأمر:</strong> {activeReportForPreview.parentNotified ? `نعم ${activeReportForPreview.parentNotificationTime ? `(الساعة ${activeReportForPreview.parentNotificationTime})` : ''}` : 'لم يتم'}
                      </span>
                      <span>
                        <strong>شركة التأمين:</strong> {activeReportForPreview.insurancePolicyNumber || 'MAMDA التأمين المدرسي'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Official Signatures */}
                <div className="pt-4 border-t-2 border-gray-900 flex justify-between items-start text-xs font-bold px-2">
                  <div className="space-y-6 text-right">
                    <div>توقيع وتأشيرة أستاذ(ة) المادة:</div>
                    <div className="h-6"></div>
                  </div>
                  <div className="space-y-6 text-left">
                    <div>توقيع وخاتم رئيس المؤسسة التعليمية:</div>
                    <div className="h-6"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
