/**
 * Moroccan & Arab First Name Gender Detection Engine
 * Accurately classifies Moroccan & Arab student names into Male ('M') or Female ('F')
 * Supports Arabic script, French/Latin transliterations, compound names, and spelling variants.
 */

// 1. Explicit Female Names (Arabic & French/Latin variants)
const FEMALE_NAMES = new Set([
  // Arabic Names
  'فاطمة', 'فاطمة الزهراء', 'فاطمة-الزهراء', 'خديجة', 'عائشة', 'مريم', 'زينب', 'أميمة', 'اميمة',
  'سلمى', 'سارة', 'ساره', 'هبة', 'هبة الله', 'هبة-الله', 'آية', 'اية', 'إيمان', 'ايمان', 'إكرام', 'اكرام',
  'إحسان', 'احسان', 'إلهام', 'الهام', 'إبتسام', 'ابتسام', 'إسراء', 'اسراء', 'إيناس', 'ايناس',
  'شيماء', 'شaimae', 'أمينة', 'امينة', 'حفصة', 'هاجر', 'ندى', 'نهيلة', 'كوثر', 'وصال', 'دعاء', 'ملاك',
  'غيثة', 'سناء', 'صفاء', 'رجاء', 'وفاء', 'سعاد', 'حنان', 'لبنى', 'مروة', 'ياسمين', 'ياسمينة',
  'نسرين', 'نورا', 'نوره', 'نادية', 'نجاة', 'نجوى', 'نوال', 'نهاد', 'بسمة', 'بشرى', 'بهية',
  'حليمة', 'حسناء', 'حياة', 'جهان', 'جيهان', 'جنات', 'جميلة', 'جليلة', 'دنيا', 'ذكرى', 'رانية',
  'رحمة', 'رزان', 'رشيدة', 'رقية', 'ريم', 'روان', 'ريهام', 'زهور', 'زهيرة', 'زكية', 'سليمة',
  'سميرة', 'سهام', 'سمية', 'سوسن', 'شادية', 'شريفة', 'شروق', 'صباح', 'ضحى', 'عفاف', 'علياء',
  'عزيزة', 'غزلان', 'فاتن', 'فدوى', 'فردوس', 'فريدة', 'فوزية', 'فطومة', 'كريمة', 'كنزة', 'لطيفة',
  'لمياء', 'ليلى', 'ليلي', 'ماجدة', 'منى', 'منال', 'مهى', 'مها', 'ميساء', 'نبيلة', 'نزهة', 'نعيمة',
  'نوفيسة', 'نفيسة', 'نوران', 'وئام', 'وجدان', 'وداد', 'وسيلة', 'يسرى', 'ياقوت', 'زهرة', 'صابرة',
  'ثريا', 'كلثوم', 'راضية', 'شمس', 'قمر', 'أم كلثوم', 'ام كلثوم', 'أريج', 'اريج', 'تسنيم',
  'ريتاج', 'سندس', 'شهد', 'لينة', 'لينا', 'رنا', 'ريناد', 'جودي', 'سوار', 'دانيا', 'ريماس',
  'سلوى', 'حبيبة', 'سعيدة', 'نجية', 'طاهرة', 'صوفيا', 'سحر', 'أمل', 'امل', 'عواطف',
  'أسية', 'اسية', 'اسيه', 'أسيه', 'راحيل', 'هناء', 'هنا', 'امال', 'آمال', 'شيماء', 'شامة',

  // French/Latin Moroccan & Maghrebi Transliterations
  'fatima', 'fatimazahra', 'fatima-zahra', 'fatima-zohra', 'fatimazohra', 'zahra', 'zohra',
  'khadija', 'khadijah', 'aicha', 'aisha', 'meryem', 'meriem', 'mariam', 'meryam', 'maryam',
  'zineb', 'zaynab', 'zainab', 'oumayma', 'oumaima', 'omaima', 'oumeyma', 'salma', 'selma',
  'sara', 'sarah', 'hiba', 'hyba', 'aya', 'ayah', 'imane', 'iman', 'ikram', 'ikrame',
  'ihsane', 'ihsan', 'ilham', 'ilhame', 'ibtissam', 'ibtisam', 'issra', 'isra', 'israe',
  'inass', 'inas', 'inasse', 'chaimae', 'chayma', 'chaimaa', 'chaima', 'chaymae', 'chaymaa',
  'amina', 'amine', 'hafsa', 'hafsah', 'hajar', 'hadjar', 'nada', 'nouhaila', 'nouhayla',
  'kawtar', 'kaoutar', 'wissal', 'ouissal', 'douaa', 'douae', 'malak', 'ghita', 'ghitae',
  'sanaa', 'sanae', 'safaa', 'safae', 'rajaa', 'rajae', 'wafaa', 'wafae', 'souad', 'hanane',
  'hanan', 'loubna', 'marwa', 'maroua', 'yasmine', 'yasmina', 'nisrine', 'nissrine', 'nesrine',
  'noura', 'nora', 'nadia', 'najat', 'najwa', 'nawal', 'nihad', 'basma', 'bouchra', 'bahia',
  'halima', 'hasna', 'hasnaa', 'hasnae', 'hayat', 'jihane', 'jihan', 'jannat', 'dounia',
  'rania', 'rahma', 'razane', 'rachida', 'roqaya', 'rokaya', 'rime', 'riham', 'zhour',
  'soumaya', 'soumeya', 'sihem', 'siham', 'samira', 'salima', 'zakia', 'chadia', 'charifa',
  'chourouk', 'chourouq', 'sabah', 'doha', 'afaf', 'aziza', 'ghizlane', 'ghizlan', 'faten',
  'fadwa', 'fadoua', 'firdaws', 'firdaous', 'farida', 'fouzia', 'faouzia', 'karima', 'kenza',
  'latifa', 'lamia', 'lamya', 'lamiae', 'lamyae', 'leila', 'layla', 'majda', 'mouna', 'manal',
  'maha', 'mayssa', 'mayssae', 'nabila', 'nezha', 'naima', 'noufissa', 'wiam', 'ouiam',
  'wijdan', 'ouijdane', 'ouijdan', 'widad', 'ouidad', 'yousra', 'youssra', 'zahira', 'keltoum',
  'radia', 'tasnim', 'tasnime', 'tasneem', 'ritaj', 'soundous', 'lina', 'lyna', 'chahd',
  'dania', 'rimas', 'saloua', 'habiba', 'saida', 'soufia', 'sofia', 'amal', 'amale', 'nour',
  'assia', 'assiya', 'asia', 'rahel', 'rahele', 'rahil', 'raheel', 'hanaa', 'hanae', 'hana'
]);

// 2. Explicit Male Names (Arabic & French/Latin variants)
const MALE_NAMES = new Set([
  // Arabic Names
  'محمد', 'احمد', 'أحمد', 'يوسف', 'مهدي', 'المهدي', 'ياسين', 'ياسر', 'حمزة', 'أسامة', 'اسامة',
  'عمر', 'علي', 'عثمان', 'أنس', 'انس', 'أيوب', 'ايوب', 'ريان', 'أمين', 'امين', 'إلياس', 'الياس',
  'سعد', 'سفيان', 'رضا', 'رضى', 'طه', 'طارق', 'حميد', 'خالد', 'هشام', 'حسن', 'حسين', 'الحسين',
  'الحسن', 'مصطفى', 'يحيى', 'يحي', 'يونس', 'زكرياء', 'زكريا', 'أشرف', 'اشرف', 'بلال', 'بدر',
  'وليد', 'معاذ', 'مروان', 'نبيل', 'نزار', 'سامي', 'سليمان', 'سعيد', 'صلاح', 'صلاح الدين',
  'عادل', 'عصام', 'عبد الله', 'عبدالله', 'عبد الرحمن', 'عبدالرحمن', 'عبد الرحيم', 'عبدالرحيم',
  'عبد الكريم', 'عبد العزيز', 'عبد المجيد', 'عبد الفتاح', 'عبد اللطيف', 'عبد الصمد', 'عبد الإله',
  'عبد العالي', 'عبد الهادي', 'عبد الحق', 'عبد الواحد', 'عبد السلام', 'عبد الرزاق', 'عبد المالك',
  'عماد', 'كريم', 'فؤاد', 'فيصل', 'فارس', 'فريد', 'كمال', 'محسن', 'منير', 'مراد', 'نور الدين',
  'علاء', 'علاء الدين', 'حسام', 'حاتم', 'حذيفة', 'عكرمة', 'عنترة', 'معاوية', 'طلحة', 'ميسرة',
  'إسماعيل', 'اسماعيل', 'إبراهيم', 'ابراهيم', 'إدريس', 'ادريس', 'آدم', 'ادم', 'جاد', 'زياد',
  'زيد', 'سيف', 'سيف الدين', 'شعيب', 'توفيق', 'عمران', 'غسان', 'فهد', 'قاسم', 'قصي', 'كاظم',
  'لؤي', 'مقداد', 'ناصر', 'نايف', 'نديم', 'نضال', 'هارون', 'هيثم', 'وسيم', 'وديع', 'يعقوب',
  'عمار', 'بشير', 'برهان', 'بشار', 'تيسير', 'ثابت', 'جلال', 'جمال', 'حارث', 'حازم', 'حبيب',
  'بوبكر', 'أبوبكر', 'ابوبكر', 'أبو بكر', 'ابو بكر', 'نصرالدين', 'نصر الدين', 'سعدالدين', 'سعد الدين',
  'المامون', 'مامون', 'مأمون', 'المأمون', 'بوزفور', 'الديب', 'لحريش', 'بحدي', 'الزهري', 'بلعري',

  // French/Latin Moroccan & Maghrebi Transliterations
  'mohamed', 'mohammed', 'mouhamed', 'ahmed', 'youssef', 'yousseff', 'mehdi', 'elmehdi',
  'yassine', 'yassin', 'yassir', 'yasir', 'hamza', 'oussama', 'ousama', 'osama', 'omar',
  'ali', 'othmane', 'othman', 'otmane', 'otman', 'anas', 'anass', 'ayoub', 'aioub', 'rayan',
  'rayane', 'amine', 'ilyas', 'ilyass', 'elias', 'eliass', 'saad', 'soufiane', 'soufian',
  'sofiane', 'sofian', 'reda', 'rida', 'taha', 'tariq', 'tarik', 'hamid', 'khalid', 'hicham',
  'hassan', 'hassane', 'hocine', 'houssine', 'elhassan', 'elhoussine', 'moustapha', 'mustapha',
  'mostafa', 'mostapha', 'yahya', 'yahia', 'younes', 'youness', 'zakaria', 'zakariae', 'zakariya',
  'achraf', 'ashraf', 'bilal', 'belal', 'badr', 'walid', 'oualid', 'mouad', 'moad', 'marouane',
  'marouan', 'marwan', 'nabil', 'nizar', 'sami', 'samir', 'souleymane', 'soulayman', 'said',
  'salah', 'salahdine', 'salaheddine', 'adil', 'issame', 'issam', 'abdellah', 'abdallah',
  'abderrahmane', 'abderrahman', 'abderrahim', 'abdelkrim', 'abdelaziz', 'abdelmajid',
  'abdelfattah', 'abdellatif', 'abdessamad', 'abdelilah', 'abdelali', 'abdelhadi',
  'abdelhak', 'abdelwahed', 'abdessalam', 'abderrazak', 'abdelmalek', 'imad', 'karim',
  'fouad', 'faycal', 'faris', 'farid', 'kamal', 'mohssine', 'mounir', 'mourad', 'noureddine',
  'alae', 'aladdin', 'houssam', 'hatim', 'ismail', 'ismael', 'ibrahim', 'driss', 'idriss',
  'idrissi', 'adam', 'jad', 'ziad', 'zaid', 'saif', 'saifeddine', 'chouaib', 'toufik',
  'taoufik', 'imrane', 'ghassan', 'fahd', 'kacem', 'louay', 'nasser', 'nassim', 'nadim',
  'nidal', 'haroun', 'haitham', 'haytham', 'wassim', 'ouassim', 'wadih', 'ouadih', 'yaakoub',
  'ammar', 'bachir', 'jalal', 'jamal', 'hazim', 'habib', 'ayman', 'aymane', 'aymen',
  'boubker', 'boubaker', 'aboubakr', 'nasreddine', 'nasreddin', 'mamoun', 'elmamoun'
]);

// 3. Normalized tokens cleaning helper
function cleanToken(token: string): string {
  return token
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove french accents (é -> e, etc.)
    .replace(/[ـ\s\-_.,;:'"]/g, '')
    .replace(/^el-?|^al-?|^ben-?|^ibn-?|^ait-?|^ou-?|^bou-?|^si-?|^l'|^d'/g, ''); // strip common prefixes
}

function cleanArabicToken(token: string): string {
  return token
    .trim()
    .replace(/[ًٌٍَُِّْ]/g, '') // remove tashkeel
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ة]/g, 'ه') // standardize marbouta
    .replace(/[ى]/g, 'ي')
    .replace(/^(ال|بن|ابن|بنت|ولد|سيدي|مولاي|لالة)/g, ''); // strip common prefixes
}

/**
 * Intelligent Moroccan/Arab Student Name Gender Detector
 * Returns 'M' (Male) or 'F' (Female), or undefined if uncertain.
 */
export function detectGenderFromName(fullName?: string): 'M' | 'F' | undefined {
  if (!fullName || typeof fullName !== 'string') return undefined;

  const raw = fullName.trim();
  if (!raw || raw.length < 2) return undefined;

  // 1. Check direct composite prefixes in Arabic
  if (raw.startsWith('عبد ') || raw.startsWith('عبدال') || raw.startsWith('ابو ') || raw.startsWith('أبو ')) {
    return 'M';
  }
  if (raw.startsWith('ام ') || raw.startsWith('أم ') || raw.startsWith('فاطمة الزهراء') || raw.startsWith('فاطمة-الزهراء')) {
    return 'F';
  }

  // Check direct composite prefixes in French
  const lowerRaw = raw.toLowerCase();
  if (lowerRaw.startsWith('abdel') || lowerRaw.startsWith('abder') || lowerRaw.startsWith('abdu') || lowerRaw.startsWith('abdo')) {
    return 'M';
  }
  if (lowerRaw.startsWith('fatima-zahra') || lowerRaw.startsWith('fatima zahra') || lowerRaw.startsWith('fatimazohra') || lowerRaw.startsWith('fatimazahra')) {
    return 'F';
  }

  // 2. Tokenize by spaces and dashes
  const tokens = raw.split(/[\s\-_/]+/).filter(Boolean);
  if (tokens.length === 0) return undefined;

  // Test full tokens against dictionary first
  for (const token of tokens) {
    const rawLower = token.toLowerCase();
    if (FEMALE_NAMES.has(rawLower) || FEMALE_NAMES.has(token)) {
      return 'F';
    }
    if (MALE_NAMES.has(rawLower) || MALE_NAMES.has(token)) {
      return 'M';
    }
  }

  // Test cleaned tokens
  for (const token of tokens) {
    const cleaned = cleanToken(token);
    const cleanedAr = cleanArabicToken(token);

    // Check Female Dictionary
    if (FEMALE_NAMES.has(cleaned) || FEMALE_NAMES.has(cleanedAr)) {
      return 'F';
    }

    // Check Male Dictionary
    if (MALE_NAMES.has(cleaned) || MALE_NAMES.has(cleanedAr)) {
      return 'M';
    }
  }

  // 3. Morphological heuristics for Arabic names
  for (const token of tokens) {
    const trimmed = token.trim();
    // Names ending in ة / ـة (marbouta) that are not in male list
    if (/[ة]$/.test(trimmed)) {
      // Known male exceptions already checked above (حمزة، أسامة، طلحة، قتيبة، عكرمة، حذيفة)
      return 'F';
    }
    // Names ending in feminine alif maqsoura (ـى / ـاء)
    if (/(ياء|فاء|ماء|راء|ناء|قاء|ثاء|حاء|داء)$/.test(trimmed) && trimmed.length >= 4) {
      return 'F';
    }
  }

  return undefined;
}
