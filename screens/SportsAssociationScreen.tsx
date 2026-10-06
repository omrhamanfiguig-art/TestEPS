import React, { useState, useEffect, useMemo } from 'react';
import { 
  BanknotesIcon, 
  DocumentTextIcon, 
  TrophyIcon, 
  PlusIcon, 
  TrashIcon, 
  ArrowDownTrayIcon, 
  CheckCircleIcon, 
  XMarkIcon, 
  UserGroupIcon,
  SparklesIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  PrinterIcon
} from '../components/Icons';
import { 
  AssociationTransaction, 
  AssociationReport, 
  StudentIdentity, 
  ChampionshipRegistration 
} from '../types';
import { 
  getAssociationTransactions, 
  saveAssociationTransactions, 
  getAssociationReports, 
  saveAssociationReports 
} from '../utils/associationDb';
import { getAllClasses, getStudentList, getPhysicalTests, getVmaResults } from '../utils/db';
import { StudentAvatar } from '../components/StudentAvatar';
import { PrintPreviewModal, PrintPreviewColumn } from '../components/PrintPreviewModal';
import { exportParticipantsToExcel, exportTransactionsToExcel } from '../utils/excelHelper';

interface SportsAssociationScreenProps {
  selectedClass: string;
  setSelectedClass: (className: string) => void;
}

export const SportsAssociationScreen: React.FC<SportsAssociationScreenProps> = ({
  selectedClass,
  setSelectedClass
}) => {
  // Active Tab: 'finance' | 'reports' | 'championships'
  const [activeTab, setActiveTab] = useState<'finance' | 'reports' | 'championships'>('finance');

  // Print Preview Modal State
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [printPreviewConfig, setPrintPreviewConfig] = useState<{
    title: string;
    subtitle?: string;
    columns: PrintPreviewColumn[];
    data: Array<Record<string, any>>;
    reportText?: string;
    reportImageUrl?: string;
    onExportExcel?: () => void;
  }>({
    title: '',
    columns: [],
    data: []
  });

  // Classes & Students data
  const [classList, setClassList] = useState<{ className: string }[]>([]);
  const [allStudents, setAllStudents] = useState<(StudentIdentity & { className: string; vma?: number; speed30?: number; jump?: number })[]>([]);
  
  // Finance State
  const [transactions, setTransactions] = useState<AssociationTransaction[]>([]);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<AssociationTransaction | null>(null);
  const [txType, setTxType] = useState<'revenue' | 'expense'>('revenue');
  const [txCategory, setTxCategory] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txDescription, setTxDescription] = useState('');
  const [txReceipt, setTxReceipt] = useState('');

  const revenueCategories = [
    'اشتراكات التلاميذ',
    'دعم المؤسسة والشركاء',
    'مساهمات جمعية الآباء',
    'مداخيل الأنشطة الرياضية',
    'أخرى'
  ];

  const expenseCategories = [
    'النقل',
    'التغذية',
    'اقتناء الأدوات المدرسية والرياضية',
    'أدوات المكتب',
    'مشاركات البطولات',
    'مصاريف تنظيمية',
    'أخرى'
  ];

  // Reports State
  const [reports, setReports] = useState<AssociationReport[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<AssociationReport | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [reportType, setReportType] = useState<'moral' | 'financial'>('moral');
  const [reportContent, setReportContent] = useState('');
  const [reportPeriod, setReportPeriod] = useState('الموسم الدراسي 2025/2026');
  const [reportImageUrl, setReportImageUrl] = useState<string | undefined>(undefined);
  const [isGeneratingAiReport, setIsGeneratingAiReport] = useState(false);
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'transaction' | 'report' | 'championship'; id: string; title: string } | null>(null);

  // Championships & Selection State
  const [selectedChampionship, setSelectedChampionship] = useState<string>('cross_country');
  const [championshipsList, setChampionshipsList] = useState<ChampionshipRegistration[]>([]);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [selectorSportFilter, setSelectorSportFilter] = useState<'vma' | 'speed' | 'jump'>('vma');

  // Notification toast
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setTransactions(getAssociationTransactions());
    setReports(getAssociationReports());
    
    const classes = await getAllClasses();
    setClassList(classes);

    // Load all students and their test results for smart selection
    const studentListAgg: (StudentIdentity & { className: string; vma?: number; speed30?: number; jump?: number })[] = [];
    for (const c of classes) {
      const stds = await getStudentList(c.className);
      const vmaData = await getVmaResults(c.className);
      const physData = await getPhysicalTests(c.className);

      stds.forEach(s => {
        const vmaRec = vmaData.find(v => v.numeroEleve === s.numeroEleve);
        const physRec = physData.find(p => p.numeroEleve === s.numeroEleve);

        studentListAgg.push({
          ...s,
          className: c.className,
          vma: vmaRec?.vma || 0,
          speed30: physRec?.vitesse30m || physRec?.vitesse60m || 0,
          jump: physRec?.sautLong || physRec?.sautHorizontal || 0
        });
      });
    }
    setAllStudents(studentListAgg);

    // Load saved championship registrations
    try {
      const savedChamps = localStorage.getItem('eps_association_champions_v1');
      if (savedChamps) {
        setChampionshipsList(JSON.parse(savedChamps));
      } else {
        // Default sample delegation
        setChampionshipsList([
          {
            id: 'cc_1',
            className: classes[0]?.className || '2APIC-1',
            numeroEleve: 'M123456',
            nomEleve: 'أيوب المنصوري',
            sexe: 'M',
            championshipType: 'cross_country',
            sportCollectifRole: 'عداء مسافات نصف طويلة',
            createdAt: new Date().toISOString()
          }
        ]);
      }
    } catch {}
  };

  // Financial summary
  const financialSummary = useMemo(() => {
    let totalRevenues = 0;
    let totalExpenses = 0;
    transactions.forEach(t => {
      if (t.type === 'revenue') totalRevenues += t.amount;
      else totalExpenses += t.amount;
    });
    return {
      totalRevenues,
      totalExpenses,
      balance: totalRevenues - totalExpenses
    };
  }, [transactions]);

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCategory || !txAmount) return;

    let updated: AssociationTransaction[];
    if (editingTransaction) {
      updated = transactions.map(t => t.id === editingTransaction.id ? {
        ...t,
        type: txType,
        category: txCategory.trim(),
        amount: Number(txAmount) || 0,
        date: txDate,
        description: txDescription.trim(),
        receiptNumber: txReceipt.trim() || undefined
      } : t);
      setNotification({ message: 'تم تعديل المعاملة المالية بنجاح.', type: 'success' });
    } else {
      const newTx: AssociationTransaction = {
        id: `tx_${Date.now()}`,
        type: txType,
        category: txCategory.trim(),
        amount: Number(txAmount) || 0,
        date: txDate,
        description: txDescription.trim(),
        receiptNumber: txReceipt.trim() || undefined,
        createdAt: new Date().toISOString()
      };
      updated = [newTx, ...transactions];
      setNotification({ message: 'تمت إضافة المعاملة المالية بنجاح.', type: 'success' });
    }

    setTransactions(updated);
    saveAssociationTransactions(updated);
    setIsTxModalOpen(false);
    setEditingTransaction(null);
    setTxCategory('');
    setTxAmount('');
    setTxDescription('');
    setTxReceipt('');
  };

  const handleDeleteTransaction = (tx: AssociationTransaction) => {
    setDeleteConfirmTarget({
      type: 'transaction',
      id: tx.id,
      title: `${tx.category} (${tx.amount} د.م)`
    });
  };

  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportTitle || !reportContent) return;

    let updated: AssociationReport[];
    if (editingReport) {
      updated = reports.map(r => r.id === editingReport.id ? {
        ...r,
        title: reportTitle.trim(),
        type: reportType,
        content: reportContent.trim(),
        period: reportPeriod.trim(),
        imageUrl: reportImageUrl
      } : r);
      setNotification({ message: 'تم تعديل التقرير بنجاح.', type: 'success' });
    } else {
      const newRep: AssociationReport = {
        id: `rep_${Date.now()}`,
        title: reportTitle.trim(),
        type: reportType,
        content: reportContent.trim(),
        period: reportPeriod.trim(),
        imageUrl: reportImageUrl,
        createdAt: new Date().toISOString()
      };
      updated = [newRep, ...reports];
      setNotification({ message: 'تم حفظ التقرير بنجاح.', type: 'success' });
    }

    setReports(updated);
    saveAssociationReports(updated);
    setIsReportModalOpen(false);
    setEditingReport(null);
    setReportTitle('');
    setReportContent('');
    setReportImageUrl(undefined);
  };

  const handleGenerateAiReport = async () => {
    setIsGeneratingAiReport(true);
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          title: reportTitle || (reportType === 'moral' ? 'التقرير الأدبي للجمعية الرياضية المدرسية' : 'التقرير المالي للجمعية الرياضية المدرسية'),
          period: reportPeriod,
          context: reportContent,
          financialData: reportType === 'financial' ? {
            totalRevenues: financialSummary.totalRevenues,
            totalExpenses: financialSummary.totalExpenses,
            balance: financialSummary.balance,
            transactionCount: transactions.length
          } : undefined
        })
      });

      const data = await res.json();
      if (data.success && data.text) {
        setReportContent(data.text);
        if (!reportTitle) {
          setReportTitle(reportType === 'moral' ? 'التقرير الأدبي السنوي للجمعية الرياضية المدرسية' : 'التقرير المالي والحسابي للجمعية الرياضية المدرسية');
        }
        setNotification({ message: 'تم إنشاء التقرير بالذكاء الاصطناعي بنجاح! ✨', type: 'success' });
      } else {
        throw new Error(data.error || 'فشل التوليد');
      }
    } catch (err: any) {
      setNotification({ message: `خطأ في توليد التقرير: ${err?.message || 'يرجى المحاولة لاحقاً'}`, type: 'error' });
    } finally {
      setIsGeneratingAiReport(false);
    }
  };

  const handleDeleteReport = (rep: AssociationReport) => {
    setDeleteConfirmTarget({
      type: 'report',
      id: rep.id,
      title: rep.title
    });
  };

  const executeConfirmedDelete = () => {
    if (!deleteConfirmTarget) return;
    if (deleteConfirmTarget.type === 'transaction') {
      const updated = transactions.filter(t => t.id !== deleteConfirmTarget.id);
      setTransactions(updated);
      saveAssociationTransactions(updated);
      setNotification({ message: 'تم حذف المعاملة المالية بنجاح.', type: 'success' });
    } else if (deleteConfirmTarget.type === 'report') {
      const updated = reports.filter(r => r.id !== deleteConfirmTarget.id);
      setReports(updated);
      saveAssociationReports(updated);
      setNotification({ message: 'تم حذف التقرير بنجاح.', type: 'success' });
    } else if (deleteConfirmTarget.type === 'championship') {
      const updated = championshipsList.filter(c => c.id !== deleteConfirmTarget.id);
      setChampionshipsList(updated);
      try {
        localStorage.setItem('eps_association_champions_v1', JSON.stringify(updated));
      } catch {}
      setNotification({ message: 'تم إزالة التلميذ من لائحة المشاركين.', type: 'success' });
    }
    setDeleteConfirmTarget(null);
  };

  // Helper title for championships
  const getChampionshipTitle = (type: string) => {
    switch (type) {
      case 'cross_country': return 'بطولة العدو الريفي المدرسي (Cross Country)';
      case 'athletics': return 'البطولة الإقليمية لألعاب القوى (مضمار وميدان)';
      case 'football': return 'دوري كرة القدم المصغرة والرياضات الجماعية';
      default: return 'البطولة والنشاط الرياضي المدرسي';
    }
  };

  // Handlers for Export & Print Preview
  const handleOpenChampionshipPrintPreview = () => {
    const currentDelegation = championshipsList.filter(c => c.championshipType === selectedChampionship);
    const champTitle = getChampionshipTitle(selectedChampionship);

    setPrintPreviewConfig({
      title: `لائحة التلاميذ المشاركين في ${champTitle}`,
      subtitle: `الجمعية الرياضية المدرسية • الموسم الدراسي 2025/2026`,
      columns: [
        { key: 'numeroEleve', label: 'رقم مسار', width: '18%' },
        { key: 'nomEleve', label: 'الاسم الكامل', width: '30%' },
        { key: 'sexeLabel', label: 'الجنس', width: '12%', align: 'center' },
        { key: 'className', label: 'القسم', width: '15%' },
        { key: 'sportCollectifRole', label: 'التخصص / الفئة / الدور', width: '25%' }
      ],
      data: currentDelegation.map(d => ({
        ...d,
        sexeLabel: d.sexe === 'M' ? 'ذكر' : d.sexe === 'F' ? 'أنثى' : d.sexe || ''
      })),
      onExportExcel: () => {
        exportParticipantsToExcel(currentDelegation, `لائحة_المشاركين_${champTitle}`);
      }
    });
    setIsPrintPreviewOpen(true);
  };

  const handleExportChampionshipExcel = () => {
    const currentDelegation = championshipsList.filter(c => c.championshipType === selectedChampionship);
    const champTitle = getChampionshipTitle(selectedChampionship);
    exportParticipantsToExcel(currentDelegation, `لائحة_المشاركين_${champTitle}`);
    setNotification({ message: 'تم تصدير لائحة المشاركين إلى ملف Excel بنجاح 📊', type: 'success' });
  };

  const handleOpenFinancePrintPreview = () => {
    setPrintPreviewConfig({
      title: 'التقرير المالي وسجل الحسابات - الجمعية الرياضية المدرسية',
      subtitle: `الموسم الدراسي 2025/2026 • المداخيل: ${financialSummary.totalRevenues} د.م | المصاريف: ${financialSummary.totalExpenses} د.م | الرصيد المتبقي: ${financialSummary.balance} د.م`,
      columns: [
        { key: 'date', label: 'التاريخ', width: '12%' },
        { key: 'typeLabel', label: 'النوع', width: '12%' },
        { key: 'category', label: 'البند / التصنيف', width: '22%' },
        { key: 'receiptNumber', label: 'رقم الوصل', width: '12%' },
        { key: 'amountFormatted', label: 'المبلغ (درهم)', width: '15%', align: 'center' },
        { key: 'description', label: 'البيان والتفاصيل' }
      ],
      data: transactions.map(t => ({
        ...t,
        typeLabel: t.type === 'revenue' ? 'مدخول' : 'مصروف',
        amountFormatted: `${t.type === 'revenue' ? '+' : '-'}${t.amount} د.م`
      })),
      onExportExcel: () => {
        exportTransactionsToExcel(transactions, 'التقرير_المالي_للجمعية_الرياضية');
      }
    });
    setIsPrintPreviewOpen(true);
  };

  const handleOpenReportPrintPreview = (rep: AssociationReport) => {
    setPrintPreviewConfig({
      title: rep.title,
      subtitle: `الجمعية الرياضية المدرسية • ${rep.period}`,
      columns: [],
      data: [],
      reportText: rep.content,
      reportImageUrl: rep.imageUrl
    });
    setIsPrintPreviewOpen(true);
  };

  // Smart Selection sorted by test results
  const sortedStudentsForSelection = useMemo(() => {
    return [...allStudents].sort((a, b) => {
      if (selectorSportFilter === 'vma') {
        return (b.vma || 0) - (a.vma || 0); // Descending VMA
      } else if (selectorSportFilter === 'speed') {
        // Lower time for 30m sprint is better (or higher speed)
        return (a.speed30 || 99) - (b.speed30 || 99);
      } else {
        return (b.jump || 0) - (a.jump || 0); // Higher long jump is better
      }
    });
  }, [allStudents, selectorSportFilter]);

  const handleAddStudentToChampionship = (student: StudentIdentity & { className: string }) => {
    const existing = championshipsList.find(c => c.numeroEleve === student.numeroEleve && c.championshipType === selectedChampionship);
    if (existing) {
      setNotification({ message: `التلميذ(ة) «${student.nomEleve}» مسجل مسبقاً في هذه البطولة.`, type: 'error' });
      return;
    }

    const reg: ChampionshipRegistration = {
      id: `champ_${selectedChampionship}_${student.numeroEleve}_${Date.now()}`,
      className: student.className,
      numeroEleve: student.numeroEleve,
      nomEleve: student.nomEleve,
      sexe: student.sexe,
      championshipType: selectedChampionship as any,
      sportCollectifRole: selectorSportFilter === 'vma' ? 'عداء مسافات نصف طويلة' : selectorSportFilter === 'speed' ? 'عداء سرعة (Sprint)' : 'ألعاب الميدان والوثب',
      createdAt: new Date().toISOString()
    };

    const updated = [reg, ...championshipsList];
    setChampionshipsList(updated);
    try {
      localStorage.setItem('eps_association_champions_v1', JSON.stringify(updated));
    } catch {}

    setNotification({ message: `تمت إضافة «${student.nomEleve}» لوفد المشاركين بنجاح! 🏆`, type: 'success' });
  };

  const handleRemoveFromChampionship = (reg: ChampionshipRegistration) => {
    setDeleteConfirmTarget({
      type: 'championship',
      id: reg.id,
      title: reg.nomEleve
    });
  };

  // Export Report to Word
  const handleExportReportWord = (rep: AssociationReport) => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${rep.title}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; text-align: right; padding: 30px; color: #111; line-height: 1.6; font-size: 12pt; }
          h1 { text-align: center; color: #1e3a8a; font-size: 20pt; border-bottom: 3px double #1e3a8a; padding-bottom: 10px; margin-bottom: 15px; }
          .meta { text-align: center; color: #555; font-size: 11pt; margin-bottom: 30px; }
          .content { white-space: pre-wrap; margin-bottom: 25px; font-size: 12pt; }
          .img-box { text-align: center; margin: 25px 0; }
          .img-box img { max-width: 420px; max-height: 300px; border-radius: 8px; border: 1px solid #cbd5e1; }
          .signatures { width: 100%; margin-top: 50px; border-collapse: collapse; }
          .signatures td { width: 50%; text-align: center; font-weight: bold; font-size: 11pt; }
        </style>
      </head>
      <body>
        <div style="font-weight: bold; font-size: 11pt; color: #333; margin-bottom: 10px;">
          المملكة المغربية<br/>وزارة التربية الوطنية والتعليم الأولي والرياضة<br/>الجمعية الرياضية المدرسية
        </div>
        <h1>${rep.title}</h1>
        <div class="meta">الفترة: ${rep.period} • تاريخ التصدير: ${new Date().toLocaleDateString('ar-MA')}</div>
        <div class="content">${rep.content}</div>
        ${rep.imageUrl ? `<div class="img-box"><img src="${rep.imageUrl}" /></div>` : ''}
        <table class="signatures">
          <tr>
            <td>توقيع رئيس الجمعية الرياضية:<br/><br/><br/>...................................</td>
            <td>تأشيرة مدير المؤسسة:<br/><br/><br/>...................................</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF', html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${rep.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`);
    document.body.appendChild(link);
    link.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
    setNotification({ message: 'تم تصدير التقرير بصيغة Word بنجاح! 📄', type: 'success' });
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl shadow-md text-sm font-bold flex items-center justify-between transition-all ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
        }`}>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="p-1 hover:opacity-80 cursor-pointer">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-indigo-950 rounded-3xl shadow-xl p-6 md:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-emerald-300">
              <BanknotesIcon className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">فضاء الجمعية الرياضية المدرسية</h1>
              <p className="text-xs text-emerald-200 mt-0.5">
                تدبير الجانب المالي، التقارير المالية والأدبية، وانتقاء المشاركين في البطولات حسب الروائز
              </p>
            </div>
          </div>
        </div>

        {/* Financial Quick Stats Badges */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-center">
            <div className="text-[10px] text-emerald-300 font-bold">المداخيل الإجمالية</div>
            <div className="text-base font-black text-white font-mono">{financialSummary.totalRevenues} درهم</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-center">
            <div className="text-[10px] text-rose-300 font-bold">المصاريف الإجمالية</div>
            <div className="text-base font-black text-white font-mono">{financialSummary.totalExpenses} درهم</div>
          </div>
          <div className="bg-emerald-500/20 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-emerald-400/30 text-center">
            <div className="text-[10px] text-emerald-200 font-bold">الرصيد المالي الصافي</div>
            <div className="text-base font-black text-emerald-300 font-mono">{financialSummary.balance} درهم</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-700">
        <button
          type="button"
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'finance'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <BanknotesIcon className="w-4 h-4" />
          <span>المداخيل والمصاريف المالية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <DocumentTextIcon className="w-4 h-4" />
          <span>التقارير المالية والأدبية</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('championships')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'championships'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <TrophyIcon className="w-4 h-4" />
          <span>الأنشطة والبطولات وانتقاء المشاركين</span>
        </button>
      </div>

      {/* TAB 1: FINANCE (Revenues & Expenses) */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 gap-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  سجل العمليات المالية (المداخيل والمصاريف)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  تتبع انخراطات التلاميذ، الدعم، والمصاريف الخاصة بالأنشطة الرياضية
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleOpenFinancePrintPreview}
                  className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="معاينة وطباعة التقرير المالي"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>معاينة قبل الطباعة / PDF 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportTransactionsToExcel(transactions, 'التقرير_المالي_للجمعية_الرياضية')}
                  className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="تصدير السجل المالي إلى ملف Excel"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>تصدير Excel 📊</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setTxType('revenue');
                    setTxCategory(revenueCategories[0]);
                    setTxAmount('');
                    setTxDescription('');
                    setTxReceipt('');
                    setIsTxModalOpen(true);
                  }}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>إضافة معاملة مالية جديد</span>
                </button>
              </div>
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <BanknotesIcon className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="font-bold">لا توجد عمليات مالية مسجلة بعد.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-100 dark:border-gray-700">
                    <tr>
                      <th className="p-3">نوع العملية</th>
                      <th className="p-3">التصنيف / البند</th>
                      <th className="p-3">البيان / الوصف</th>
                      <th className="p-3">رقم الوصل</th>
                      <th className="p-3">التاريخ</th>
                      <th className="p-3 text-center">المبلغ (درهم)</th>
                      <th className="p-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 font-medium">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                            tx.type === 'revenue' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {tx.type === 'revenue' ? '📈 مدخول' : '📉 مصروف'}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-gray-900 dark:text-white">{tx.category}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300">{tx.description || '-'}</td>
                        <td className="p-3 font-mono text-gray-500">{tx.receiptNumber || '-'}</td>
                        <td className="p-3 font-mono text-gray-500">{tx.date}</td>
                        <td className={`p-3 text-center font-mono font-black text-sm ${
                          tx.type === 'revenue' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {tx.type === 'revenue' ? '+' : '-'}{tx.amount} د.م
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingTransaction(tx);
                                setTxType(tx.type);
                                setTxCategory(tx.category);
                                setTxAmount(String(tx.amount));
                                setTxDate(tx.date);
                                setTxDescription(tx.description);
                                setTxReceipt(tx.receiptNumber || '');
                                setIsTxModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition cursor-pointer"
                              title="تعديل المعاملة"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTransaction(tx)}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                              title="حذف المعاملة"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REPORTS (Financial & Administrative Reports) */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 gap-3">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white">
                  التقارير الأدبية والمالية للجمعية الرياضية
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  إعداد وتحرير التقارير السنوية وتصديرها بصيغة Word منسقة للطباعة
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingReport(null);
                  setReportTitle('');
                  setReportContent('');
                  setIsReportModalOpen(true);
                }}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <PlusIcon className="w-4 h-4" />
                <span>إضافة تقرير جديد</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((rep) => (
                <div key={rep.id} className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                        rep.type === 'moral' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {rep.type === 'moral' ? '📜 تقرير أدبي' : '💰 تقرير مالي'}
                      </span>
                      <span className="text-xs font-mono text-gray-400">{rep.period}</span>
                    </div>
                    <h4 className="font-black text-sm text-gray-900 dark:text-white">{rep.title}</h4>
                    {rep.imageUrl && (
                      <div className="w-full h-32 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 my-2">
                        <img src={rep.imageUrl} alt={rep.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap line-clamp-3">
                      {rep.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReportPrintPreview(rep)}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="معاينة وطباعة التقرير"
                      >
                        <PrinterIcon className="w-4 h-4" />
                        <span>معاينة قبل الطباعة / PDF 🖨️</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleExportReportWord(rep)}
                        className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span>Word (.doc)</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingReport(rep);
                          setReportTitle(rep.title);
                          setReportType(rep.type);
                          setReportContent(rep.content);
                          setReportPeriod(rep.period);
                          setReportImageUrl(rep.imageUrl);
                          setIsReportModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                        title="تعديل"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReport(rep)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="حذف"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CHAMPIONSHIPS & SMART STUDENT SELECTION FROM TESTS */}
      {activeTab === 'championships' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <TrophyIcon className="w-5 h-5 text-amber-500" />
                  <span>المشاركات في البطولات المدرسية وانتقاء المواهب عبر الروائز</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  اختر البطولة واعتمد على نتائج الروائز البدنية (VMA، السرعة، والوثب) لاختيار أفضل العناصر للوفد المشارك
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={selectedChampionship}
                  onChange={(e) => setSelectedChampionship(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold text-xs text-gray-900 dark:text-white cursor-pointer"
                >
                  <option value="cross_country">بطولة العدو الريفي المدرسي (Cross Country)</option>
                  <option value="athletics">البطولة الإقليمية لألعاب القوى (مضمار وميدان)</option>
                  <option value="football">دوري كرة القدم المصغرة / كرة السلة</option>
                </select>

                <button
                  type="button"
                  onClick={handleOpenChampionshipPrintPreview}
                  className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="معاينة وطباعة لائحة المشاركين"
                >
                  <PrinterIcon className="w-4 h-4" />
                  <span>معاينة قبل الطباعة / PDF 🖨️</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportChampionshipExcel}
                  className="py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="تصدير اللائحة إلى Excel"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  <span>تصدير Excel 📊</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSelectorOpen(true)}
                  className="py-2 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/25 transition cursor-pointer"
                >
                  <SparklesIcon className="w-4 h-4" />
                  <span>⚡ انتقاء من الروائز</span>
                </button>
              </div>
            </div>

            {/* Official Delegation Roster */}
            <div>
              <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 mb-3">
                لائحة الوفد المشارك الرسمية ({championshipsList.filter(c => c.championshipType === selectedChampionship).length} تلميذ وتلميذة)
              </h4>

              {championshipsList.filter(c => c.championshipType === selectedChampionship).length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-750/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-gray-400">
                  <UserGroupIcon className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                  <p className="font-bold">لا يوجد أي تلميذ مضاف لهذه البطولة بعد.</p>
                  <p className="text-xs text-gray-400 mt-1">اضغط على زر «انتقاء المشاركين من نتائج الروائز» لاختيار النخبة الرياضية.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {championshipsList.filter(c => c.championshipType === selectedChampionship).map((reg) => (
                    <div key={reg.id} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <StudentAvatar nomEleve={reg.nomEleve} sexe={reg.sexe} size="md" />
                        <div>
                          <div className="font-black text-gray-900 dark:text-white text-sm">{reg.nomEleve}</div>
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">القسم: {reg.className}</div>
                          <div className="text-[10px] text-gray-400 font-mono mt-0.5">مسار: {reg.numeroEleve} • {reg.sportCollectifRole || 'عداء'}</div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFromChampionship(reg)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                        title="إزالة من الوفد"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {isTxModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSaveTransaction} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                {editingTransaction ? 'تعديل المعاملة المالية' : 'إضافة معاملة مالية جديدة'}
              </h3>
              <button type="button" onClick={() => setIsTxModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">نوع المعاملة:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('revenue')}
                    className={`py-2 rounded-xl font-bold transition ${txType === 'revenue' ? 'bg-emerald-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700'}`}
                  >
                    📈 مدخول (Revenue)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('expense')}
                    className={`py-2 rounded-xl font-bold transition ${txType === 'expense' ? 'bg-rose-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-700'}`}
                  >
                    📉 مصروف (Expense)
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">التصنيف أو البند:</label>
                <select
                  value={
                    txType === 'revenue'
                      ? (revenueCategories.includes(txCategory) ? txCategory : 'أخرى')
                      : (expenseCategories.includes(txCategory) ? txCategory : 'أخرى')
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'أخرى') {
                      setTxCategory(val);
                    } else {
                      setTxCategory('');
                    }
                  }}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold mb-2"
                >
                  {(txType === 'revenue' ? revenueCategories : expenseCategories).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                {(!revenueCategories.includes(txCategory) && !expenseCategories.includes(txCategory) || txCategory === '' || txCategory === 'أخرى') && (
                  <input
                    type="text"
                    required
                    value={txCategory === 'أخرى' ? '' : txCategory}
                    onChange={(e) => setTxCategory(e.target.value)}
                    placeholder="اكتب التصنيف المخصص هنا..."
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">المبلغ (درهم):</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="150"
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">التاريخ:</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">رقم الوصل (اختياري):</label>
                <input
                  type="text"
                  value={txReceipt}
                  onChange={(e) => setTxReceipt(e.target.value)}
                  placeholder="001/2026"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">البيان أو التفاصيل:</label>
                <textarea
                  rows={2}
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="تفاصيل إضافية حول العملية المالية..."
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button type="button" onClick={() => setIsTxModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black">حفظ المعاملة</button>
            </div>
          </form>
        </div>
      )}

      {/* REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <form onSubmit={handleSaveReport} className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700 text-right">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-black text-base text-gray-900 dark:text-white">
                {editingReport ? 'تعديل التقرير' : 'تحرير تقرير أدبي أو مالي'}
              </h3>
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">نوع التقرير:</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold cursor-pointer"
                  >
                    <option value="moral">📜 تقرير أدبي</option>
                    <option value="financial">💰 تقرير مالي</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">الموسم / الفترة:</label>
                  <input
                    type="text"
                    required
                    value={reportPeriod}
                    onChange={(e) => setReportPeriod(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">عنوان التقرير:</label>
                <input
                  type="text"
                  required
                  value={reportTitle}
                  onChange={(e) => setReportTitle(e.target.value)}
                  placeholder="مثال: التقرير الأدبي للجمعية الرياضية المدرسية"
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 font-bold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-gray-600 dark:text-gray-400">مضمون التقرير:</label>
                  <button
                    type="button"
                    onClick={handleGenerateAiReport}
                    disabled={isGeneratingAiReport}
                    className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-[11px] font-black flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <SparklesIcon className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>{isGeneratingAiReport ? 'جاري الصياغة بالذكاء الاصطناعي...' : 'صياغة ذكية بالذكاء الاصطناعي ✨'}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  required
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="اكتب تفاصيل التقرير هنا أو اضغط على زر 'صياغة ذكية بالذكاء الاصطناعي' لتوليده تلقائياً..."
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-3 font-medium leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-600 dark:text-gray-400 mb-1">صورة مرتبطة بالنشاط أو التقرير (اختياري):</label>
                <div className="flex items-center gap-3">
                  {reportImageUrl && (
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                      <img src={reportImageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setReportImageUrl(undefined)}
                        className="absolute top-0.5 right-0.5 bg-rose-600 text-white rounded-full p-0.5 text-[9px]"
                        title="إزالة الصورة"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvt) => {
                          setReportImageUrl(uploadEvt.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="px-4 py-2 border rounded-xl font-bold">إلغاء</button>
              <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-black">حفظ التقرير</button>
            </div>
          </form>
        </div>
      )}

      {/* SMART SELECTION MODAL FROM TESTS */}
      {isSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full p-6 space-y-5 border border-amber-200 dark:border-amber-900/60 text-right max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                  <SparklesIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    انتقاء النخبة الرياضية حسب نتائج الروائز
                  </h3>
                  <p className="text-xs text-gray-500">
                    ترتيب تلقائي للتلاميذ حسب نتائج السرعة، VMA، أو الوثب لاختيار الأبطال
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSelectorOpen(false)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Filter by Test Type */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-750 rounded-2xl border border-gray-200 dark:border-gray-700">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">ترتيب التلاميذ حسب:</span>
              <button
                type="button"
                onClick={() => setSelectorSportFilter('vma')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectorSportFilter === 'vma' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                🏃 السرعة الهوائية (VMA)
              </button>
              <button
                type="button"
                onClick={() => setSelectorSportFilter('speed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectorSportFilter === 'speed' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                ⚡ سباق السرعة (30م)
              </button>
              <button
                type="button"
                onClick={() => setSelectorSportFilter('jump')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectorSportFilter === 'jump' ? 'bg-amber-500 text-white shadow-xs' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
              >
                🦘 الوثب الطولي
              </button>
            </div>

            {/* Students List Ranked */}
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {sortedStudentsForSelection.length === 0 ? (
                <div className="text-center py-10 text-gray-400 font-bold text-xs">
                  لا توجد نتائج اختبارات مسجلة بعد. يرجى إدخال نتائج الروائز في شاشة التقويم البدني أولاً.
                </div>
              ) : (
                sortedStudentsForSelection.map((s, idx) => (
                  <div key={`${s.numeroEleve}_${idx}`} className="p-3 bg-gray-50 dark:bg-gray-750/60 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-black text-gray-400 w-6 text-center">#{idx + 1}</span>
                      <StudentAvatar nomEleve={s.nomEleve} sexe={s.sexe} size="sm" />
                      <div>
                        <div className="font-black text-gray-900 dark:text-white">{s.nomEleve}</div>
                        <div className="text-[10px] text-gray-400 font-mono">قسم: {s.className} • مسار: {s.numeroEleve}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-left font-mono">
                        {selectorSportFilter === 'vma' && <span className="font-black text-emerald-600">{s.vma ? `${s.vma} كم/س` : 'غير مسجل'}</span>}
                        {selectorSportFilter === 'speed' && <span className="font-black text-indigo-600">{s.speed30 ? `${s.speed30} ثانية` : 'غير مسجل'}</span>}
                        {selectorSportFilter === 'jump' && <span className="font-black text-amber-600">{s.jump ? `${s.jump} سم` : 'غير مسجل'}</span>}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddStudentToChampionship(s)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        + إضافة للوفد
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-700">
              <button type="button" onClick={() => setIsSelectorOpen(false)} className="px-5 py-2 bg-gray-800 text-white rounded-xl text-xs font-bold cursor-pointer">
                إنهاء وإغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-rose-200 dark:border-rose-900/60 text-right">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center flex-shrink-0 text-xl font-black">
                ⚠️
              </div>
              <div>
                <h3 className="font-black text-base text-gray-900 dark:text-white">
                  تأكيد الحذف
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  هل أنت متأكد من رغبتك في حذف: <span className="font-bold text-gray-800 dark:text-gray-200">«{deleteConfirmTarget.title}»</span>؟ لا يمكن التراجع عن هذا الإجراء.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setDeleteConfirmTarget(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeConfirmedDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                نعم، تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      <PrintPreviewModal
        isOpen={isPrintPreviewOpen}
        onClose={() => setIsPrintPreviewOpen(false)}
        title={printPreviewConfig.title}
        subtitle={printPreviewConfig.subtitle}
        columns={printPreviewConfig.columns}
        data={printPreviewConfig.data}
        reportText={printPreviewConfig.reportText}
        reportImageUrl={printPreviewConfig.reportImageUrl}
        onExportExcel={printPreviewConfig.onExportExcel}
      />
    </div>
  );
};
