import { AssociationTransaction, AssociationReport, ChampionshipRegistration } from '../types';

const TRANSACTIONS_KEY = 'eps_association_transactions_v1';
const REPORTS_KEY = 'eps_association_reports_v1';

export const getAssociationTransactions = (): AssociationTransaction[] => {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    return raw ? JSON.parse(raw) : [
      { 
        id: 't_1', 
        type: 'revenue', 
        category: 'انخراطات التلاميذ', 
        amount: 3500, 
        date: new Date().toISOString().split('T')[0], 
        description: 'انخراطات تلامذة المؤسسة بالجمعية الرياضية المدرسية', 
        receiptNumber: '001/2026', 
        createdAt: new Date().toISOString() 
      },
      { 
        id: 't_2', 
        type: 'revenue', 
        category: 'دعم المؤسسة والشاركات', 
        amount: 5000, 
        date: new Date().toISOString().split('T')[0], 
        description: 'دعم مالية لدعم البطولة المدرسية المحلية', 
        receiptNumber: '002/2026', 
        createdAt: new Date().toISOString() 
      },
      { 
        id: 't_3', 
        type: 'expense', 
        category: 'شراء معدات رياضية', 
        amount: 2400, 
        date: new Date().toISOString().split('T')[0], 
        description: 'اقتناء كرات قدم وسلة وأقماع تدريب', 
        receiptNumber: 'F-102', 
        createdAt: new Date().toISOString() 
      },
      { 
        id: 't_4', 
        type: 'expense', 
        category: 'مصاريف التنقل والبطولات', 
        amount: 1200, 
        date: new Date().toISOString().split('T')[0], 
        description: 'مصاريف تنقل وفطور الفريق الرياضي للبطولة الإقليمية', 
        receiptNumber: 'F-103', 
        createdAt: new Date().toISOString() 
      }
    ];
  } catch {
    return [];
  }
};

export const saveAssociationTransactions = (list: AssociationTransaction[]) => {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('dbUpdated'));
  } catch (e) {}
};

export const getAssociationReports = (): AssociationReport[] => {
  try {
    const raw = localStorage.getItem(REPORTS_KEY);
    return raw ? JSON.parse(raw) : [
      {
        id: 'rep_1',
        title: 'التقرير الأدبي للجمعية الرياضية المدرسية (الموسم الحالي)',
        type: 'moral',
        content: 'الحمد لله وحده، والصلاة والسلام على من لا نبي بعده.\nفي إطار تفعيل أجرأة برنامجه السنوي، نظّم فرع الجمعية الرياضية المدرسية بالمؤسسة عدة أنشطة رياضية تربوية طيلة الموسم الدراسي، همت الإقصائيات المحلية، البطولات الإقليمية، وتأطير المواهب الرياضية الناشئة في ألعاب القوى والرياضات الجماعية.\nوقد تميز هذا الموسم بانخراط واسع للتلاميذ والتلميذات وحقق نتائج مشرفة تعكس دينامية التربية البدنية والرياضية بالمؤسسة.',
        period: 'الموسم الدراسي 2025/2026',
        createdAt: new Date().toISOString()
      },
      {
        id: 'rep_2',
        title: 'التقرير المالي للجمعية الرياضية المدرسية',
        type: 'financial',
        content: 'يسر المكتب المسير للجمعية الرياضية المدرسية أن يقدم بين أيديكم التقرير المالي المفصل:\n1. المداخيل الإجمالية: تمت تعبئتهعبر واجبات انخراط التلاميذ ومساهمات الشركاء ودعم الأنشطة.\n2. المصاريف الإجمالية: صُرفت في اقتناء التجهيزات الرياضية، تمويل التنقلات والمشاركات في البطولات الإقليمية والجهوية.\n3. الرصيد الصافي: تم تحقيق توازن مالي إيجابي يضمن استمرارية الأنشطة الرياضية.',
        period: 'الموسم الدراسي 2025/2026',
        createdAt: new Date().toISOString()
      }
    ];
  } catch {
    return [];
  }
};

export const saveAssociationReports = (list: AssociationReport[]) => {
  try {
    localStorage.setItem(REPORTS_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('dbUpdated'));
  } catch (e) {}
};
