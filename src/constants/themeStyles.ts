import type { ThemeDefinition } from '../components/ThemeAndWallpaperCenter';

// Multi-color Visual Themes Comprehensive Styling Presets (تطبيق كامل للثيم على كافة أجزاء الشات)
export type ThemeId = ThemeDefinition['id'];

export interface ThemeFullStyle {
  headerBg: string;
  headerBorder: string;
  headerAccent: string;
  subHeaderBg: string;
  subHeaderBorder: string;
  subHeaderText?: string;
  bottomBarBg: string;
  bottomBarBorder: string;
  bottomBarText: string;
  inputBarBg?: string;
  inputBarBorder?: string;
  primaryBtn: string;
  appBg: string;
  appText?: string;
  chatBg: string;
  drawerBg: string;
  drawerHeaderBg?: string;
  cardBg: string;
  cardBorder: string;
  accentText: string;
  bubbleTheme: string;
  accentColor?: string;
  bgColorHex?: string;
  fieldBg?: string;
  fieldBorder?: string;
  fieldFocus?: string;
  fieldText?: string;
  fieldPlaceholder?: string;
  recommendedTextColor?: string;
  recommendedNameColor?: string;
}

export const THEME_STYLES: Record<ThemeId, ThemeFullStyle> = {
  // 🪞 ثيم الرصاصي اللؤلؤي الهادئ (ألوان متناسقة ومريحة للعين وحواف جذابة)
  'pearl-gray-calm': {
    headerBg: 'bg-[#e2e8f0]',
    headerBorder: 'border-slate-300 shadow-xs',
    headerAccent: 'text-slate-800 font-extrabold',
    subHeaderBg: 'bg-[#cbd5e1]',
    subHeaderBorder: 'border-slate-300',
    subHeaderText: 'text-slate-800 font-bold',
    bottomBarBg: 'bg-[#e2e8f0]',
    bottomBarBorder: 'border-slate-300',
    bottomBarText: 'text-slate-800 font-bold',
    inputBarBg: 'bg-[#f1f5f9]',
    inputBarBorder: 'border-slate-300 shadow-2xs',
    primaryBtn: 'bg-slate-700 hover:bg-slate-800 text-white font-bold shadow-xs',
    appBg: 'bg-[#f1f5f9]',
    appText: 'text-slate-800 font-bold',
    chatBg: 'bg-[#e8ecf2]',
    drawerBg: 'bg-[#f1f5f9] text-slate-800',
    drawerHeaderBg: 'bg-[#e2e8f0] text-slate-800 border-b border-slate-300',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-300 shadow-2xs',
    accentText: 'text-slate-700 font-black',
    bubbleTheme: 'border-slate-300 text-slate-900 bg-white shadow-2xs font-semibold',
    accentColor: '#475569',
    bgColorHex: '#e8ecf2',
    fieldBg: 'bg-white',
    fieldBorder: 'border-slate-300 shadow-2xs',
    fieldFocus: 'focus:border-slate-600 focus:ring-1 focus:ring-slate-400',
    fieldText: 'text-slate-900 font-bold',
    fieldPlaceholder: 'placeholder-slate-400',
    recommendedTextColor: '#0f172a',
    recommendedNameColor: '#1e293b'
  },
  // 📄 1. الثيم الرسمي الفاتح (خلفيات ناصعة + خطوط سوداء فاحمة عالية التباين)
  'official-pure-light': {
    headerBg: 'bg-white',
    headerBorder: 'border-slate-300 shadow-sm',
    headerAccent: 'text-slate-950 font-extrabold',
    subHeaderBg: 'bg-slate-100',
    subHeaderBorder: 'border-slate-300',
    subHeaderText: 'text-slate-900 font-bold',
    bottomBarBg: 'bg-white',
    bottomBarBorder: 'border-slate-300',
    bottomBarText: 'text-slate-950 font-bold',
    inputBarBg: 'bg-white',
    inputBarBorder: 'border-slate-300 shadow-xs',
    primaryBtn: 'bg-slate-950 hover:bg-slate-800 text-white font-bold shadow-sm',
    appBg: 'bg-slate-100',
    appText: 'text-slate-950 font-bold',
    chatBg: 'bg-[#f8fafc]',
    drawerBg: 'bg-white text-slate-950',
    drawerHeaderBg: 'bg-slate-100 text-slate-950 border-b border-slate-300',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-300 shadow-sm',
    accentText: 'text-slate-950 font-black',
    bubbleTheme: 'border-slate-300 text-slate-950 bg-white shadow-xs font-semibold',
    accentColor: '#000000',
    bgColorHex: '#f8fafc',
    fieldBg: 'bg-white',
    fieldBorder: 'border-slate-300 shadow-xs',
    fieldFocus: 'focus:border-slate-950 focus:ring-1 focus:ring-slate-950',
    fieldText: 'text-slate-950 font-bold',
    fieldPlaceholder: 'placeholder-slate-500',
    recommendedTextColor: '#000000',
    recommendedNameColor: '#000000'
  },
  // 🏢 2. الديواني الرسمي الفاخر (أبيض ملكي + كحلي فخمي رسمي)
  'official-royal-white': {
    headerBg: 'bg-white',
    headerBorder: 'border-slate-300 shadow-md',
    headerAccent: 'text-black font-black',
    subHeaderBg: 'bg-slate-50',
    subHeaderBorder: 'border-slate-200',
    subHeaderText: 'text-slate-900 font-extrabold',
    bottomBarBg: 'bg-white',
    bottomBarBorder: 'border-slate-300',
    bottomBarText: 'text-slate-900 font-bold',
    inputBarBg: 'bg-white',
    inputBarBorder: 'border-slate-300 shadow-sm',
    primaryBtn: 'bg-slate-900 hover:bg-black text-white font-black shadow-md',
    appBg: 'bg-slate-50',
    appText: 'text-slate-950 font-bold',
    chatBg: 'bg-white',
    drawerBg: 'bg-white text-slate-950',
    drawerHeaderBg: 'bg-slate-100 text-black border-b border-slate-300',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-300 shadow-sm',
    accentText: 'text-slate-950 font-black',
    bubbleTheme: 'border-slate-300 text-black bg-slate-50 shadow-xs font-semibold',
    accentColor: '#000000',
    bgColorHex: '#ffffff',
    fieldBg: 'bg-white',
    fieldBorder: 'border-slate-400 shadow-xs',
    fieldFocus: 'focus:border-black focus:ring-2 focus:ring-black/20',
    fieldText: 'text-black font-extrabold',
    fieldPlaceholder: 'placeholder-slate-500',
    recommendedTextColor: '#000000',
    recommendedNameColor: '#000000'
  },
  // ⭐ 1. الذهب الإمبراطوري الخالص 24K
  'royal-pure-gold-24k': {
    headerBg: 'bg-gradient-to-r from-[#211804] via-[#0d0902] to-[#2e2106]',
    headerBorder: 'border-amber-400/90 shadow-[0_2px_12px_rgba(251,191,36,0.15)]',
    headerAccent: 'text-amber-300 font-extrabold',
    subHeaderBg: 'bg-[#151004]',
    subHeaderBorder: 'border-[#4a350b]',
    subHeaderText: 'text-amber-200',
    bottomBarBg: 'bg-[#0d0903]',
    bottomBarBorder: 'border-[#4a350b]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#151004]',
    inputBarBorder: 'border-amber-500/60',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-black font-black shadow-[0_0_18px_rgba(245,158,11,0.5)]',
    appBg: 'bg-[#090804]',
    appText: 'text-[#fef3c7]',
    chatBg: 'bg-[#050402]',
    drawerBg: 'bg-[#110c04]',
    drawerHeaderBg: 'bg-[#221706]',
    cardBg: 'bg-[#1c1305]',
    cardBorder: 'border-amber-500/60',
    accentText: 'text-yellow-300',
    bubbleTheme: 'border-amber-500/60 text-[#fef3c7] bg-[#1a1205]/80 shadow-[0_2px_8px_rgba(245,158,11,0.1)]',
    accentColor: '#fbbf24',
    bgColorHex: '#050402',
    fieldBg: 'bg-[#140e04]',
    fieldBorder: 'border-amber-400/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(251,191,36,0.2)]',
    fieldFocus: 'focus:border-yellow-300 focus:ring-2 focus:ring-amber-400/50',
    fieldText: 'text-[#fef3c7]',
    fieldPlaceholder: 'placeholder-amber-300/60',
    recommendedTextColor: '#fef3c7',
    recommendedNameColor: '#fbbf24'
  },
  // ⭐ 2. ذهب دبي الفاخر ولؤلؤ الخليج
  'dubai-pearl-gold': {
    headerBg: 'bg-gradient-to-r from-[#281d06] via-[#120d03] to-[#362708]',
    headerBorder: 'border-yellow-500/90 shadow-[0_2px_12px_rgba(250,204,21,0.15)]',
    headerAccent: 'text-yellow-300 font-extrabold',
    subHeaderBg: 'bg-[#191204]',
    subHeaderBorder: 'border-[#543b0d]',
    subHeaderText: 'text-yellow-200',
    bottomBarBg: 'bg-[#100b02]',
    bottomBarBorder: 'border-[#543b0d]',
    bottomBarText: 'text-yellow-200',
    inputBarBg: 'bg-[#191204]',
    inputBarBorder: 'border-yellow-500/60',
    primaryBtn: 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 hover:from-yellow-400 hover:to-amber-300 text-black font-black shadow-[0_0_18px_rgba(250,204,21,0.45)]',
    appBg: 'bg-[#120d03]',
    appText: 'text-[#fef9c3]',
    chatBg: 'bg-[#0a0701]',
    drawerBg: 'bg-[#150f04]',
    drawerHeaderBg: 'bg-[#291e07]',
    cardBg: 'bg-[#211706]',
    cardBorder: 'border-yellow-500/60',
    accentText: 'text-yellow-300',
    bubbleTheme: 'border-yellow-500/60 text-[#fef9c3] bg-[#1e1505]/80 shadow-[0_2px_8px_rgba(250,204,21,0.1)]',
    accentColor: '#facc15',
    bgColorHex: '#0a0701',
    fieldBg: 'bg-[#181104]',
    fieldBorder: 'border-yellow-400/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(250,204,21,0.2)]',
    fieldFocus: 'focus:border-yellow-200 focus:ring-2 focus:ring-yellow-300/50',
    fieldText: 'text-[#fef9c3]',
    fieldPlaceholder: 'placeholder-yellow-200/60',
    recommendedTextColor: '#fef9c3',
    recommendedNameColor: '#facc15'
  },
  // ⭐ 3. شمس الفراعنة والذهب الكنعاني
  'pharaonic-sun-gold': {
    headerBg: 'bg-gradient-to-r from-[#291204] via-[#0d0602] to-[#3a1a06]',
    headerBorder: 'border-amber-600/90 shadow-[0_2px_12px_rgba(217,119,6,0.15)]',
    headerAccent: 'text-amber-400 font-extrabold',
    subHeaderBg: 'bg-[#190b03]',
    subHeaderBorder: 'border-[#54240a]',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#0f0702]',
    bottomBarBorder: 'border-[#54240a]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#190b03]',
    inputBarBorder: 'border-amber-600/60',
    primaryBtn: 'bg-gradient-to-r from-amber-600 via-orange-500 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-black font-black shadow-[0_0_18px_rgba(245,158,11,0.45)]',
    appBg: 'bg-[#0d0602]',
    appText: 'text-[#fed7aa]',
    chatBg: 'bg-[#070301]',
    drawerBg: 'bg-[#140902]',
    drawerHeaderBg: 'bg-[#2b1204]',
    cardBg: 'bg-[#200e04]',
    cardBorder: 'border-amber-600/60',
    accentText: 'text-amber-300',
    bubbleTheme: 'border-amber-600/60 text-[#fed7aa] bg-[#1d0d03]/80 shadow-[0_2px_8px_rgba(217,119,6,0.1)]',
    accentColor: '#f59e0b',
    bgColorHex: '#070301',
    fieldBg: 'bg-[#170a03]',
    fieldBorder: 'border-amber-500/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(245,158,11,0.2)]',
    fieldFocus: 'focus:border-amber-300 focus:ring-2 focus:ring-amber-500/50',
    fieldText: 'text-[#fed7aa]',
    fieldPlaceholder: 'placeholder-amber-400/60',
    recommendedTextColor: '#fed7aa',
    recommendedNameColor: '#f59e0b'
  },
  // ⭐ 4. شامبانيا الذهب ومخمل الليل
  'champagne-velvet-gold': {
    headerBg: 'bg-gradient-to-r from-[#1c1a14] via-[#070709] to-[#262319]',
    headerBorder: 'border-yellow-400/85 shadow-[0_2px_12px_rgba(253,224,71,0.15)]',
    headerAccent: 'text-yellow-200 font-extrabold',
    subHeaderBg: 'bg-[#131317]',
    subHeaderBorder: 'border-[#3f3b2d]',
    subHeaderText: 'text-yellow-200',
    bottomBarBg: 'bg-[#0a0a0c]',
    bottomBarBorder: 'border-[#3f3b2d]',
    bottomBarText: 'text-yellow-200',
    inputBarBg: 'bg-[#131317]',
    inputBarBorder: 'border-yellow-400/60',
    primaryBtn: 'bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 hover:from-yellow-300 hover:to-amber-200 text-slate-950 font-black shadow-[0_0_18px_rgba(253,224,71,0.4)]',
    appBg: 'bg-[#070709]',
    appText: 'text-[#fefce8]',
    chatBg: 'bg-[#040405]',
    drawerBg: 'bg-[#0e0e11]',
    drawerHeaderBg: 'bg-[#1e1c15]',
    cardBg: 'bg-[#17161c]',
    cardBorder: 'border-yellow-400/50',
    accentText: 'text-yellow-200',
    bubbleTheme: 'border-yellow-400/50 text-[#fefce8] bg-[#141419]/80 shadow-[0_2px_8px_rgba(253,224,71,0.1)]',
    accentColor: '#fde047',
    bgColorHex: '#040405',
    fieldBg: 'bg-[#121216]',
    fieldBorder: 'border-yellow-300/75 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(253,224,71,0.18)]',
    fieldFocus: 'focus:border-yellow-100 focus:ring-2 focus:ring-yellow-300/50',
    fieldText: 'text-[#fefce8]',
    fieldPlaceholder: 'placeholder-yellow-100/60',
    recommendedTextColor: '#fefce8',
    recommendedNameColor: '#fde047'
  },
  // ⭐ 5. نقوش قصر الحمراء والذهب العتيق
  'alhambra-arabesque-gold': {
    headerBg: 'bg-gradient-to-r from-[#271504] via-[#100802] to-[#361e06]',
    headerBorder: 'border-yellow-600/90 shadow-[0_2px_12px_rgba(202,138,4,0.15)]',
    headerAccent: 'text-yellow-300 font-extrabold',
    subHeaderBg: 'bg-[#180d03]',
    subHeaderBorder: 'border-[#532b0a]',
    subHeaderText: 'text-amber-200',
    bottomBarBg: 'bg-[#0e0702]',
    bottomBarBorder: 'border-[#532b0a]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#180d03]',
    inputBarBorder: 'border-yellow-600/60',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black shadow-[0_0_18px_rgba(234,179,8,0.45)]',
    appBg: 'bg-[#100802]',
    appText: 'text-[#fef3c7]',
    chatBg: 'bg-[#080401]',
    drawerBg: 'bg-[#140b03]',
    drawerHeaderBg: 'bg-[#281505]',
    cardBg: 'bg-[#1e1005]',
    cardBorder: 'border-yellow-600/60',
    accentText: 'text-yellow-300',
    bubbleTheme: 'border-yellow-600/60 text-[#fef3c7] bg-[#1a0e04]/80 shadow-[0_2px_8px_rgba(202,138,4,0.1)]',
    accentColor: '#eab308',
    bgColorHex: '#080401',
    fieldBg: 'bg-[#160c03]',
    fieldBorder: 'border-yellow-500/80 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_0_8px_rgba(234,179,8,0.2)]',
    fieldFocus: 'focus:border-yellow-300 focus:ring-2 focus:ring-yellow-500/50',
    fieldText: 'text-[#fef3c7]',
    fieldPlaceholder: 'placeholder-amber-300/60',
    recommendedTextColor: '#fef3c7',
    recommendedNameColor: '#eab308'
  },
  'andalusian-jasmine-palace': {
    headerBg: 'bg-gradient-to-r from-[#032318] via-[#021810] to-[#043322]',
    headerBorder: 'border-emerald-600/70',
    headerAccent: 'text-emerald-300',
    subHeaderBg: 'bg-[#031d14]',
    subHeaderBorder: 'border-[#064e3b]',
    subHeaderText: 'text-emerald-200',
    bottomBarBg: 'bg-[#02160f]',
    bottomBarBorder: 'border-[#064e3b]',
    bottomBarText: 'text-emerald-200',
    inputBarBg: 'bg-[#031d14]',
    inputBarBorder: 'border-[#064e3b]',
    primaryBtn: 'bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 hover:from-emerald-500 hover:to-amber-400 text-slate-950 font-black',
    appBg: 'bg-[#02140d]',
    appText: 'text-emerald-100',
    chatBg: 'bg-[#010f0a]',
    drawerBg: 'bg-[#021810]',
    drawerHeaderBg: 'bg-[#03291d]',
    cardBg: 'bg-[#032116]',
    cardBorder: 'border-[#059669]/60',
    accentText: 'text-amber-300',
    bubbleTheme: 'border-emerald-600/50 text-emerald-100',
    accentColor: '#10b981',
    bgColorHex: '#010f0a'
  },
  'imperial-obsidian-gold': {
    headerBg: 'bg-gradient-to-r from-[#0d0d0f] via-[#050507] to-[#17140e]',
    headerBorder: 'border-amber-500/80',
    headerAccent: 'text-amber-400',
    subHeaderBg: 'bg-[#0a0a0c]',
    subHeaderBorder: 'border-amber-900/60',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#050507]',
    bottomBarBorder: 'border-amber-900/60',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#0a0a0c]',
    inputBarBorder: 'border-amber-900/60',
    primaryBtn: 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-black font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    appBg: 'bg-[#050506]',
    appText: 'text-amber-100',
    chatBg: 'bg-[#030304]',
    drawerBg: 'bg-[#09090b]',
    drawerHeaderBg: 'bg-[#14120e]',
    cardBg: 'bg-[#0d0d10]',
    cardBorder: 'border-amber-600/50',
    accentText: 'text-yellow-400',
    bubbleTheme: 'border-amber-500/50 text-amber-100',
    accentColor: '#f59e0b',
    bgColorHex: '#030304'
  },
  'persian-lapis-lazuli': {
    headerBg: 'bg-gradient-to-r from-[#091536] via-[#050b1f] to-[#0c1e4a]',
    headerBorder: 'border-blue-600/70',
    headerAccent: 'text-sky-300',
    subHeaderBg: 'bg-[#060e26]',
    subHeaderBorder: 'border-[#1e3a8a]',
    subHeaderText: 'text-sky-200',
    bottomBarBg: 'bg-[#040817]',
    bottomBarBorder: 'border-[#1e3a8a]',
    bottomBarText: 'text-sky-200',
    inputBarBg: 'bg-[#060e26]',
    inputBarBorder: 'border-[#1e3a8a]',
    primaryBtn: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black',
    appBg: 'bg-[#04091a]',
    appText: 'text-blue-100',
    chatBg: 'bg-[#020512]',
    drawerBg: 'bg-[#060e26]',
    drawerHeaderBg: 'bg-[#0a1740]',
    cardBg: 'bg-[#081333]',
    cardBorder: 'border-blue-700/60',
    accentText: 'text-cyan-300',
    bubbleTheme: 'border-blue-600/50 text-blue-100',
    accentColor: '#2563eb',
    bgColorHex: '#020512'
  },
  'royal-oud-ambergris': {
    headerBg: 'bg-gradient-to-r from-[#2a1309] via-[#1a0a04] to-[#36190b]',
    headerBorder: 'border-amber-700/70',
    headerAccent: 'text-amber-400',
    subHeaderBg: 'bg-[#200e06]',
    subHeaderBorder: 'border-[#5e270e]',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#140803]',
    bottomBarBorder: 'border-[#5e270e]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#200e06]',
    inputBarBorder: 'border-[#5e270e]',
    primaryBtn: 'bg-gradient-to-r from-amber-700 via-orange-600 to-yellow-600 hover:from-amber-600 hover:to-orange-500 text-white font-black',
    appBg: 'bg-[#160a04]',
    appText: 'text-amber-100',
    chatBg: 'bg-[#0f0602]',
    drawerBg: 'bg-[#1c0d05]',
    drawerHeaderBg: 'bg-[#2f1408]',
    cardBg: 'bg-[#241107]',
    cardBorder: 'border-amber-800/60',
    accentText: 'text-orange-400',
    bubbleTheme: 'border-amber-700/50 text-amber-100',
    accentColor: '#d97706',
    bgColorHex: '#0f0602'
  },
  'cosmic-aurora-borealis': {
    headerBg: 'bg-gradient-to-r from-[#0d0926] via-[#060414] to-[#0d1d28]',
    headerBorder: 'border-purple-600/60',
    headerAccent: 'text-teal-300',
    subHeaderBg: 'bg-[#09061c]',
    subHeaderBorder: 'border-[#2e1065]',
    subHeaderText: 'text-teal-300',
    bottomBarBg: 'bg-[#050310]',
    bottomBarBorder: 'border-[#2e1065]',
    bottomBarText: 'text-teal-200',
    inputBarBg: 'bg-[#09061c]',
    inputBarBorder: 'border-[#2e1065]',
    primaryBtn: 'bg-gradient-to-r from-teal-500 via-indigo-600 to-fuchsia-600 hover:from-teal-400 hover:to-fuchsia-500 text-white font-black',
    appBg: 'bg-[#060414]',
    appText: 'text-teal-100',
    chatBg: 'bg-[#03020a]',
    drawerBg: 'bg-[#09061c]',
    drawerHeaderBg: 'bg-[#140e38]',
    cardBg: 'bg-[#0d0926]',
    cardBorder: 'border-purple-700/60',
    accentText: 'text-fuchsia-300',
    bubbleTheme: 'border-teal-500/50 text-teal-100',
    accentColor: '#2dd4bf',
    bgColorHex: '#03020a'
  },
  'emerald-gold-palace': {
    headerBg: 'bg-gradient-to-r from-[#032b1d] via-[#021c13] to-[#063c29]',
    headerBorder: 'border-emerald-700/70',
    headerAccent: 'text-emerald-300',
    subHeaderBg: 'bg-[#022117]',
    subHeaderBorder: 'border-[#064e3b]',
    subHeaderText: 'text-emerald-300',
    bottomBarBg: 'bg-[#011a12]',
    bottomBarBorder: 'border-[#064e3b]',
    bottomBarText: 'text-emerald-200',
    inputBarBg: 'bg-[#022117]',
    inputBarBorder: 'border-[#064e3b]',
    primaryBtn: 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black',
    appBg: 'bg-[#021810]',
    appText: 'text-emerald-100',
    chatBg: 'bg-[#01140d]',
    drawerBg: 'bg-[#021b13]',
    drawerHeaderBg: 'bg-[#032e20]',
    cardBg: 'bg-[#03261a]',
    cardBorder: 'border-[#047857]',
    accentText: 'text-amber-300',
    bubbleTheme: 'border-emerald-600/50 text-emerald-100',
    accentColor: '#10b981',
    bgColorHex: '#01140d'
  },
  'midnight-neon-cyber': {
    headerBg: 'bg-gradient-to-r from-[#091124] via-[#050814] to-[#120f2e]',
    headerBorder: 'border-cyan-500/60',
    headerAccent: 'text-cyan-300',
    subHeaderBg: 'bg-[#080d1a]',
    subHeaderBorder: 'border-[#0e3b5e]',
    subHeaderText: 'text-cyan-300',
    bottomBarBg: 'bg-[#050912]',
    bottomBarBorder: 'border-[#0e3b5e]',
    bottomBarText: 'text-cyan-200',
    inputBarBg: 'bg-[#080d1a]',
    inputBarBorder: 'border-[#0e3b5e]',
    primaryBtn: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 hover:from-cyan-400 hover:to-fuchsia-400 text-slate-950 font-black',
    appBg: 'bg-[#040711]',
    appText: 'text-cyan-100',
    chatBg: 'bg-[#03050c]',
    drawerBg: 'bg-[#060a17]',
    drawerHeaderBg: 'bg-[#0b132b]',
    cardBg: 'bg-[#091124]',
    cardBorder: 'border-[#164e63]',
    accentText: 'text-fuchsia-400',
    bubbleTheme: 'border-cyan-500/50 text-cyan-100',
    accentColor: '#06b6d4',
    bgColorHex: '#03050c'
  },
  'royal-crimson-velvet': {
    headerBg: 'bg-gradient-to-r from-[#380415] via-[#22020c] to-[#4c051d]',
    headerBorder: 'border-rose-800/80',
    headerAccent: 'text-rose-300',
    subHeaderBg: 'bg-[#29030e]',
    subHeaderBorder: 'border-[#650824]',
    subHeaderText: 'text-rose-300',
    bottomBarBg: 'bg-[#1e020a]',
    bottomBarBorder: 'border-[#650824]',
    bottomBarText: 'text-rose-200',
    inputBarBg: 'bg-[#29030e]',
    inputBarBorder: 'border-[#650824]',
    primaryBtn: 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-black',
    appBg: 'bg-[#1d020a]',
    appText: 'text-rose-100',
    chatBg: 'bg-[#140106]',
    drawerBg: 'bg-[#22030c]',
    drawerHeaderBg: 'bg-[#3b0417]',
    cardBg: 'bg-[#2f0513]',
    cardBorder: 'border-[#881337]',
    accentText: 'text-amber-300',
    bubbleTheme: 'border-rose-600/50 text-rose-100',
    accentColor: '#e11d48',
    bgColorHex: '#140106'
  },
  'desert-dune-gold': {
    headerBg: 'bg-gradient-to-r from-[#331c0a] via-[#1f1005] to-[#45260e]',
    headerBorder: 'border-amber-700/70',
    headerAccent: 'text-amber-300',
    subHeaderBg: 'bg-[#291607]',
    subHeaderBorder: 'border-[#5e310e]',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#1c0e04]',
    bottomBarBorder: 'border-[#5e310e]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#291607]',
    inputBarBorder: 'border-[#5e310e]',
    primaryBtn: 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-slate-950 font-black',
    appBg: 'bg-[#1d0f04]',
    appText: 'text-amber-100',
    chatBg: 'bg-[#140a02]',
    drawerBg: 'bg-[#221206]',
    drawerHeaderBg: 'bg-[#371e0b]',
    cardBg: 'bg-[#2b1708]',
    cardBorder: 'border-[#78350f]',
    accentText: 'text-yellow-400',
    bubbleTheme: 'border-amber-600/50 text-amber-100',
    accentColor: '#d97706',
    bgColorHex: '#140a02'
  },
  'arctic-sapphire-frost': {
    headerBg: 'bg-gradient-to-r from-[#061e38] via-[#031122] to-[#0a294d]',
    headerBorder: 'border-sky-700/70',
    headerAccent: 'text-sky-300',
    subHeaderBg: 'bg-[#04172c]',
    subHeaderBorder: 'border-[#083e70]',
    subHeaderText: 'text-sky-300',
    bottomBarBg: 'bg-[#021020]',
    bottomBarBorder: 'border-[#083e70]',
    bottomBarText: 'text-sky-200',
    inputBarBg: 'bg-[#04172c]',
    inputBarBorder: 'border-[#083e70]',
    primaryBtn: 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black',
    appBg: 'bg-[#031324]',
    appText: 'text-sky-100',
    chatBg: 'bg-[#020d1a]',
    drawerBg: 'bg-[#041629]',
    drawerHeaderBg: 'bg-[#072442]',
    cardBg: 'bg-[#061d36]',
    cardBorder: 'border-[#0369a1]',
    accentText: 'text-cyan-300',
    bubbleTheme: 'border-sky-500/50 text-sky-100',
    accentColor: '#0284c7',
    bgColorHex: '#020d1a'
  },
  'golden-brown-harmony': {
    headerBg: 'bg-gradient-to-r from-[#2c1a0f] via-[#1f120a] to-[#3a2214]',
    headerBorder: 'border-[#78350f]',
    headerAccent: 'text-amber-400',
    subHeaderBg: 'bg-[#24150c]',
    subHeaderBorder: 'border-[#4a2b16]',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#1c1109]',
    bottomBarBorder: 'border-[#4a2b16]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#24150c]',
    inputBarBorder: 'border-[#4a2b16]',
    primaryBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black',
    appBg: 'bg-[#1a110a]',
    appText: 'text-amber-100',
    chatBg: 'bg-[#140c06]',
    drawerBg: 'bg-[#1c1109]',
    drawerHeaderBg: 'bg-[#2a190d]',
    cardBg: 'bg-[#27180e]',
    cardBorder: 'border-[#593318]',
    accentText: 'text-amber-300',
    bubbleTheme: 'border-amber-600/40 text-amber-100',
    accentColor: '#d97706',
    bgColorHex: '#140c06'
  },
  'dam-ghazal-royal': {
    headerBg: 'bg-gradient-to-r from-[#2f040f] via-[#1d0208] to-[#400614]',
    headerBorder: 'border-[#881337]',
    headerAccent: 'text-rose-400',
    subHeaderBg: 'bg-[#22030a]',
    subHeaderBorder: 'border-[#55081c]',
    subHeaderText: 'text-rose-300',
    bottomBarBg: 'bg-[#1b0207]',
    bottomBarBorder: 'border-[#55081c]',
    bottomBarText: 'text-rose-200',
    inputBarBg: 'bg-[#22030a]',
    inputBarBorder: 'border-[#55081c]',
    primaryBtn: 'bg-rose-700 hover:bg-rose-600 text-white font-black',
    appBg: 'bg-[#1c0309]',
    appText: 'text-rose-100',
    chatBg: 'bg-[#130105]',
    drawerBg: 'bg-[#1e030a]',
    drawerHeaderBg: 'bg-[#2e0410]',
    cardBg: 'bg-[#2e0510]',
    cardBorder: 'border-[#6e0a23]',
    accentText: 'text-rose-300',
    bubbleTheme: 'border-rose-700/50 text-rose-100',
    accentColor: '#9f1239',
    bgColorHex: '#130105'
  },
  'royal-turquoise': {
    headerBg: 'bg-gradient-to-r from-[#03242e] via-[#02171d] to-[#053544]',
    headerBorder: 'border-[#0891b2]',
    headerAccent: 'text-cyan-300',
    subHeaderBg: 'bg-[#042029]',
    subHeaderBorder: 'border-[#08475c]',
    subHeaderText: 'text-cyan-300',
    bottomBarBg: 'bg-[#02171e]',
    bottomBarBorder: 'border-[#08475c]',
    bottomBarText: 'text-cyan-200',
    inputBarBg: 'bg-[#042029]',
    inputBarBorder: 'border-[#08475c]',
    primaryBtn: 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black',
    appBg: 'bg-[#031d27]',
    appText: 'text-cyan-100',
    chatBg: 'bg-[#021218]',
    drawerBg: 'bg-[#031c26]',
    drawerHeaderBg: 'bg-[#062c3b]',
    cardBg: 'bg-[#0a3141]',
    cardBorder: 'border-[#0f546e]',
    accentText: 'text-cyan-200',
    bubbleTheme: 'border-cyan-600/40 text-cyan-100',
    accentColor: '#06b6d4',
    bgColorHex: '#021218'
  },
  'sunset-bronze': {
    headerBg: 'bg-gradient-to-r from-[#2f1406] via-[#1e0c03] to-[#421d0a]',
    headerBorder: 'border-[#c2410c]',
    headerAccent: 'text-orange-400',
    subHeaderBg: 'bg-[#240e04]',
    subHeaderBorder: 'border-[#592209]',
    subHeaderText: 'text-orange-300',
    bottomBarBg: 'bg-[#1a0902]',
    bottomBarBorder: 'border-[#592209]',
    bottomBarText: 'text-orange-200',
    inputBarBg: 'bg-[#240e04]',
    inputBarBorder: 'border-[#592209]',
    primaryBtn: 'bg-orange-600 hover:bg-orange-500 text-slate-950 font-black',
    appBg: 'bg-[#1c0f05]',
    appText: 'text-orange-100',
    chatBg: 'bg-[#110802]',
    drawerBg: 'bg-[#1d0b03]',
    drawerHeaderBg: 'bg-[#2c1306]',
    cardBg: 'bg-[#30190a]',
    cardBorder: 'border-[#692d0b]',
    accentText: 'text-orange-300',
    bubbleTheme: 'border-orange-600/40 text-orange-100',
    accentColor: '#ea580c',
    bgColorHex: '#110802'
  },
  'amethyst-velvet': {
    headerBg: 'bg-gradient-to-r from-[#240738] via-[#150321] to-[#360b54]',
    headerBorder: 'border-[#9333ea]',
    headerAccent: 'text-purple-300',
    subHeaderBg: 'bg-[#1c052c]',
    subHeaderBorder: 'border-[#4f107b]',
    subHeaderText: 'text-purple-300',
    bottomBarBg: 'bg-[#13031f]',
    bottomBarBorder: 'border-[#4f107b]',
    bottomBarText: 'text-purple-200',
    inputBarBg: 'bg-[#1c052c]',
    inputBarBorder: 'border-[#4f107b]',
    primaryBtn: 'bg-purple-700 hover:bg-purple-600 text-white font-black',
    appBg: 'bg-[#160424]',
    appText: 'text-purple-100',
    chatBg: 'bg-[#0e0217]',
    drawerBg: 'bg-[#180427]',
    drawerHeaderBg: 'bg-[#27073f]',
    cardBg: 'bg-[#2b0a45]',
    cardBorder: 'border-[#62169c]',
    accentText: 'text-purple-300',
    bubbleTheme: 'border-purple-600/40 text-purple-100',
    accentColor: '#9333ea',
    bgColorHex: '#0e0217'
  },
  'dark-gold': {
    headerBg: 'bg-gradient-to-r from-[#1c1917] via-[#0f0e0d] to-[#292524]',
    headerBorder: 'border-amber-800/60',
    headerAccent: 'text-amber-400',
    subHeaderBg: 'bg-[#181614]',
    subHeaderBorder: 'border-[#38332e]',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#121110]',
    bottomBarBorder: 'border-[#38332e]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#181614]',
    inputBarBorder: 'border-[#38332e]',
    primaryBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black',
    appBg: 'bg-[#0f0e0d]',
    appText: 'text-amber-100',
    chatBg: 'bg-[#0a0908]',
    drawerBg: 'bg-[#131110]',
    drawerHeaderBg: 'bg-[#201d1a]',
    cardBg: 'bg-[#24211e]',
    cardBorder: 'border-[#4f463d]',
    accentText: 'text-amber-400',
    bubbleTheme: 'border-amber-600/30 text-amber-100',
    accentColor: '#f59e0b',
    bgColorHex: '#0a0908'
  },
  'royal-gold-brown': {
    headerBg: 'bg-gradient-to-r from-[#291a0f] via-[#1a1009] to-[#362214]',
    headerBorder: 'border-amber-700',
    headerAccent: 'text-amber-300',
    subHeaderBg: 'bg-[#22150c]',
    subHeaderBorder: 'border-[#4d301b]',
    subHeaderText: 'text-amber-300',
    bottomBarBg: 'bg-[#170e08]',
    bottomBarBorder: 'border-[#4d301b]',
    bottomBarText: 'text-amber-200',
    inputBarBg: 'bg-[#22150c]',
    inputBarBorder: 'border-[#4d301b]',
    primaryBtn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-black',
    appBg: 'bg-[#18110b]',
    appText: 'text-amber-100',
    chatBg: 'bg-[#110b06]',
    drawerBg: 'bg-[#1a1008]',
    drawerHeaderBg: 'bg-[#2b190c]',
    cardBg: 'bg-[#2a1a0f]',
    cardBorder: 'border-[#5e3b22]',
    accentText: 'text-amber-300',
    bubbleTheme: 'border-amber-600/40 text-amber-100',
    accentColor: '#d97706',
    bgColorHex: '#110b06'
  },
  'dam-ghazal': {
    headerBg: 'bg-gradient-to-r from-[#28050e] via-[#190308] to-[#360713]',
    headerBorder: 'border-rose-800',
    headerAccent: 'text-rose-300',
    subHeaderBg: 'bg-[#1e040a]',
    subHeaderBorder: 'border-[#4c0919]',
    subHeaderText: 'text-rose-300',
    bottomBarBg: 'bg-[#150207]',
    bottomBarBorder: 'border-[#4c0919]',
    bottomBarText: 'text-rose-200',
    inputBarBg: 'bg-[#1e040a]',
    inputBarBorder: 'border-[#4c0919]',
    primaryBtn: 'bg-rose-700 hover:bg-rose-600 text-white font-black',
    appBg: 'bg-[#170409]',
    appText: 'text-rose-100',
    chatBg: 'bg-[#0f0205]',
    drawerBg: 'bg-[#190308]',
    drawerHeaderBg: 'bg-[#2b050f]',
    cardBg: 'bg-[#280710]',
    cardBorder: 'border-[#5e0c20]',
    accentText: 'text-rose-300',
    bubbleTheme: 'border-rose-700/40 text-rose-100',
    accentColor: '#9f1239',
    bgColorHex: '#0f0205'
  },
  'sapphire-night': {
    headerBg: 'bg-gradient-to-r from-[#0a1836] via-[#050e21] to-[#0f2452]',
    headerBorder: 'border-blue-900',
    headerAccent: 'text-blue-300',
    subHeaderBg: 'bg-[#08142c]',
    subHeaderBorder: 'border-[#132e69]',
    subHeaderText: 'text-blue-300',
    bottomBarBg: 'bg-[#040a17]',
    bottomBarBorder: 'border-[#132e69]',
    bottomBarText: 'text-blue-200',
    inputBarBg: 'bg-[#08142c]',
    inputBarBorder: 'border-[#132e69]',
    primaryBtn: 'bg-blue-600 hover:bg-blue-500 text-white font-black',
    appBg: 'bg-[#071124]',
    appText: 'text-blue-100',
    chatBg: 'bg-[#040914]',
    drawerBg: 'bg-[#071021]',
    drawerHeaderBg: 'bg-[#0c1e3f]',
    cardBg: 'bg-[#0e2144]',
    cardBorder: 'border-[#1d4182]',
    accentText: 'text-blue-300',
    bubbleTheme: 'border-blue-600/40 text-blue-100',
    accentColor: '#2563eb',
    bgColorHex: '#040914'
  },
  'emerald-sand': {
    headerBg: 'bg-gradient-to-r from-[#062417] via-[#03170e] to-[#093622]',
    headerBorder: 'border-emerald-900',
    headerAccent: 'text-emerald-300',
    subHeaderBg: 'bg-[#051c12]',
    subHeaderBorder: 'border-[#0c472c]',
    subHeaderText: 'text-emerald-300',
    bottomBarBg: 'bg-[#03120b]',
    bottomBarBorder: 'border-[#0c472c]',
    bottomBarText: 'text-emerald-200',
    inputBarBg: 'bg-[#051c12]',
    inputBarBorder: 'border-[#0c472c]',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black',
    appBg: 'bg-[#061910]',
    appText: 'text-emerald-100',
    chatBg: 'bg-[#030e09]',
    drawerBg: 'bg-[#05160e]',
    drawerHeaderBg: 'bg-[#0c2e1d]',
    cardBg: 'bg-[#0d301f]',
    cardBorder: 'border-[#185c3b]',
    accentText: 'text-emerald-300',
    bubbleTheme: 'border-emerald-600/40 text-emerald-100',
    accentColor: '#059669',
    bgColorHex: '#030e09'
  },
  'violet-twilight': {
    headerBg: 'bg-gradient-to-r from-[#1f0b2c] via-[#12051a] to-[#2c103e]',
    headerBorder: 'border-purple-700',
    headerAccent: 'text-purple-300',
    subHeaderBg: 'bg-[#180822]',
    subHeaderBorder: 'border-[#3f1659]',
    subHeaderText: 'text-purple-300',
    bottomBarBg: 'bg-[#100418]',
    bottomBarBorder: 'border-[#3f1659]',
    bottomBarText: 'text-purple-200',
    inputBarBg: 'bg-[#180822]',
    inputBarBorder: 'border-[#3f1659]',
    primaryBtn: 'bg-purple-600 hover:bg-purple-500 text-white font-black',
    appBg: 'bg-[#14071c]',
    appText: 'text-purple-100',
    chatBg: 'bg-[#0b030f]',
    drawerBg: 'bg-[#13061b]',
    drawerHeaderBg: 'bg-[#220c31]',
    cardBg: 'bg-[#240d33]',
    cardBorder: 'border-[#4e1b6e]',
    accentText: 'text-purple-300',
    bubbleTheme: 'border-purple-600/40 text-purple-100',
    accentColor: '#9333ea',
    bgColorHex: '#0b030f'
  },
  'amber-oasis': {
    headerBg: 'bg-gradient-to-r from-[#29170a] via-[#180d05] to-[#3b210e]',
    headerBorder: 'border-orange-600',
    headerAccent: 'text-orange-400',
    subHeaderBg: 'bg-[#201207]',
    subHeaderBorder: 'border-[#4d2c11]',
    subHeaderText: 'text-orange-300',
    bottomBarBg: 'bg-[#150a04]',
    bottomBarBorder: 'border-[#4d2c11]',
    bottomBarText: 'text-orange-200',
    inputBarBg: 'bg-[#201207]',
    inputBarBorder: 'border-[#4d2c11]',
    primaryBtn: 'bg-orange-600 hover:bg-orange-500 text-slate-950 font-black',
    appBg: 'bg-[#1b0f06]',
    appText: 'text-orange-100',
    chatBg: 'bg-[#100803]',
    drawerBg: 'bg-[#190e06]',
    drawerHeaderBg: 'bg-[#2b170a]',
    cardBg: 'bg-[#2e1a0b]',
    cardBorder: 'border-[#613615]',
    accentText: 'text-orange-300',
    bubbleTheme: 'border-orange-600/40 text-orange-100',
    accentColor: '#f97316',
    bgColorHex: '#100803'
  },
  'ruby-velvet': {
    headerBg: 'bg-gradient-to-r from-[#27040d] via-[#170207] to-[#360613]',
    headerBorder: 'border-rose-700',
    headerAccent: 'text-rose-400',
    subHeaderBg: 'bg-[#1f030a]',
    subHeaderBorder: 'border-[#4d0718]',
    subHeaderText: 'text-rose-300',
    bottomBarBg: 'bg-[#140106]',
    bottomBarBorder: 'border-[#4d0718]',
    bottomBarText: 'text-rose-200',
    inputBarBg: 'bg-[#1f030a]',
    inputBarBorder: 'border-[#4d0718]',
    primaryBtn: 'bg-rose-700 hover:bg-rose-600 text-white font-black',
    appBg: 'bg-[#180309]',
    appText: 'text-rose-100',
    chatBg: 'bg-[#0e0105]',
    drawerBg: 'bg-[#160208]',
    drawerHeaderBg: 'bg-[#29050f]',
    cardBg: 'bg-[#2b0610]',
    cardBorder: 'border-[#5e0c22]',
    accentText: 'text-rose-300',
    bubbleTheme: 'border-rose-700/40 text-rose-100',
    accentColor: '#e11d48',
    bgColorHex: '#0e0105'
  },
  'deep-ocean': {
    headerBg: 'bg-gradient-to-r from-[#031d2e] via-[#02131f] to-[#04283f]',
    headerBorder: 'border-cyan-800',
    headerAccent: 'text-cyan-300',
    subHeaderBg: 'bg-[#031826]',
    subHeaderBorder: 'border-[#063857]',
    subHeaderText: 'text-cyan-300',
    bottomBarBg: 'bg-[#02101a]',
    bottomBarBorder: 'border-[#063857]',
    bottomBarText: 'text-cyan-200',
    inputBarBg: 'bg-[#031826]',
    inputBarBorder: 'border-[#063857]',
    primaryBtn: 'bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black',
    appBg: 'bg-[#031622]',
    appText: 'text-cyan-100',
    chatBg: 'bg-[#020e17]',
    drawerBg: 'bg-[#031521]',
    drawerHeaderBg: 'bg-[#062940]',
    cardBg: 'bg-[#06283d]',
    cardBorder: 'border-[#0d476d]',
    accentText: 'text-cyan-300',
    bubbleTheme: 'border-cyan-500/40 text-cyan-100',
    accentColor: '#06b6d4',
    bgColorHex: '#020e17'
  },
  'emerald-forest': {
    headerBg: 'bg-gradient-to-r from-[#072412] via-[#03170b] to-[#0b3319]',
    headerBorder: 'border-emerald-800',
    headerAccent: 'text-emerald-300',
    subHeaderBg: 'bg-[#051c0e]',
    subHeaderBorder: 'border-[#0a4220]',
    subHeaderText: 'text-emerald-300',
    bottomBarBg: 'bg-[#031209]',
    bottomBarBorder: 'border-[#0a4220]',
    bottomBarText: 'text-emerald-200',
    inputBarBg: 'bg-[#051c0e]',
    inputBarBorder: 'border-[#0a4220]',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black',
    appBg: 'bg-[#05190d]',
    appText: 'text-emerald-100',
    chatBg: 'bg-[#020f08]',
    drawerBg: 'bg-[#05170d]',
    drawerHeaderBg: 'bg-[#0c2f1a]',
    cardBg: 'bg-[#0b2d18]',
    cardBorder: 'border-[#124d29]',
    accentText: 'text-emerald-300',
    bubbleTheme: 'border-emerald-500/40 text-emerald-100',
    accentColor: '#10b981',
    bgColorHex: '#020f08'
  }
};

export const getFontFamilyStyle = (font: string) => {
  switch (font) {
    case 'Noto Naskh Arabic':
      return "'Noto Naskh Arabic', 'Traditional Arabic', serif";
    case 'Cairo':
      return "'Cairo', sans-serif";
    case 'Tajawal':
      return "'Tajawal', sans-serif";
    case 'Almarai':
      return "'Almarai', sans-serif";
    case 'Amiri':
      return "'Amiri', serif";
    case 'Aref Ruqaa':
      return "'Aref Ruqaa', cursive";
    default:
      return "'Noto Naskh Arabic', 'Cairo', sans-serif";
  }
};

// Vintage chat animated style emojis
export const VINTAGE_STICKERS = [
  '🌹', '🦅', '👑', '💎', '🔥', '❤️', '😂', '😍', '👏', '🎉',
  '☕', '✨', '🤍', '🌸', '🇸🇦', '🇾🇪', '🇸🇾', '🇩🇿', '🇪🇬', '🇮🇶',
  '😎', '🥳', '🥺', '😡', '🤝', '💯', '🌙', '⚔️', '🕊️', '🏹'
];

// Rich Message Reactions List
export const AVAILABLE_REACTIONS = ['❤️', '😂', '🦅', '🥳', '🔥', '🌹', '👏', '💎', '☕', '⚔️', '🌙', '💯'];

export const FONTS_LIST = [
  { id: 'Noto Naskh Arabic', name: 'خط النسخ العادي (Naskh) - المعتمد والأصيل', family: "'Noto Naskh Arabic', sans-serif" },
  { id: 'Cairo', name: 'خط القاهرة (Cairo) - الأصلي المعتمد', family: "'Cairo', sans-serif" },
  { id: 'Tajawal', name: 'خط تجوال (Tajawal) - حديث وأنيق', family: "'Tajawal', sans-serif" },
  { id: 'Almarai', name: 'خط المراعي (Almarai) - ناعم ومريح', family: "'Almarai', sans-serif" },
  { id: 'Amiri', name: 'خط أميري (Amiri) - كلاسيكي للشعر والأدب', family: "'Amiri', serif" },
  { id: 'Aref Ruqaa', name: 'خط الرقعة (Aref Ruqaa) - أصيل وتراثي', family: "'Aref Ruqaa', cursive" },
];

export interface CustomThemeColors {
  appBg: string;          // خلفية التطبيق العامة
  chatBg: string;         // خلفية ساحة الدردشة
  headerBg: string;       // خلفية الهيدر العلوي
  headerText: string;     // لون خط الهيدر والعناوين
  headerBorder: string;   // لون حدود الهيدر
  subHeaderBg: string;    // خلفية الشريط الفرعي
  subHeaderText: string;  // لون خط الشريط الفرعي
  bottomBarBg: string;    // خلفية الفوتر والشريط السفلي
  bottomBarText: string;  // لون خط الفوتر
  inputBarBg: string;     // خلفية شريط الإدخال
  fieldBg: string;        // خلفية حقول الكتابة
  fieldText: string;      // لون خط حقول الكتابة
  fieldBorder: string;    // لون حدود حقول الكتابة
  bubbleBg: string;       // خلفية فقاعات/خلفيات الرسائل
  bubbleBorder: string;   // لون حدود فقاعات الرسائل
  appText: string;        // لون الخط العام للنصوص
  accentText: string;     // لون الخط المميز (العناوين والشارات)
  primaryBtnBg: string;   // لون خلفية الأزرار الرئيسية
  primaryBtnText: string; // لون نص الأزرار الرئيسية
  drawerBg: string;       // خلفية القوائم الجانبية
  cardBg: string;         // خلفية البطاقات والنوافذ
  cardBorder: string;     // لون حدود البطاقات
}

export interface CustomThemePreset {
  id: string;
  name: string;
  colors: CustomThemeColors;
  createdBy?: string;
  createdAt: number;
}

export const DEFAULT_CUSTOM_THEME_COLORS: CustomThemeColors = {
  appBg: '#0f172a',
  chatBg: '#f8fafc',
  headerBg: '#1e1b18',
  headerText: '#fbbf24',
  headerBorder: '#d97706',
  subHeaderBg: '#292524',
  subHeaderText: '#fde68a',
  bottomBarBg: '#1e1b18',
  bottomBarText: '#fef3c7',
  inputBarBg: '#1e1b18',
  fieldBg: '#ffffff',
  fieldText: '#000000',
  fieldBorder: '#cbd5e1',
  bubbleBg: '#ffffff',
  bubbleBorder: '#e2e8f0',
  appText: '#f8fafc',
  accentText: '#f59e0b',
  primaryBtnBg: '#d97706',
  primaryBtnText: '#000000',
  drawerBg: '#141210',
  cardBg: '#1c1917',
  cardBorder: '#44403c'
};

export function buildThemeFullStyleFromCustom(c: CustomThemeColors): ThemeFullStyle {
  return {
    headerBg: 'ct-header-bg',
    headerBorder: 'ct-header-border shadow-md',
    headerAccent: 'ct-header-text font-extrabold',
    subHeaderBg: 'ct-subheader-bg',
    subHeaderBorder: 'ct-header-border',
    subHeaderText: 'ct-subheader-text font-bold',
    bottomBarBg: 'ct-bottom-bg',
    bottomBarBorder: 'ct-header-border',
    bottomBarText: 'ct-bottom-text font-bold',
    inputBarBg: 'ct-input-bg',
    inputBarBorder: 'ct-header-border',
    primaryBtn: 'ct-primary-btn hover:opacity-90 font-black shadow-md',
    appBg: 'ct-app-bg',
    appText: 'ct-app-text',
    chatBg: 'ct-chat-bg',
    drawerBg: 'ct-drawer-bg ct-app-text',
    drawerHeaderBg: 'ct-header-bg ct-header-text border-b ct-header-border',
    cardBg: 'ct-card-bg',
    cardBorder: 'ct-card-border shadow-sm',
    accentText: 'ct-accent-text font-bold',
    bubbleTheme: 'ct-bubble shadow-xs',
    accentColor: c.primaryBtnBg,
    bgColorHex: c.chatBg,
    fieldBg: 'ct-field-bg',
    fieldBorder: 'ct-field-border',
    fieldFocus: 'focus:ring-2',
    fieldText: 'ct-field-text font-semibold',
    fieldPlaceholder: 'placeholder-slate-400',
    recommendedTextColor: '#000000',
    recommendedNameColor: '#000000'
  };
}

export function parseHexFromStyle(str?: string, fallback: string = '#ffffff'): string {
  if (!str) return fallback;
  const hexMatch = str.match(/#([0-9a-fA-F]{3,8})/);
  if (hexMatch) {
    let h = hexMatch[1];
    if (h.length === 3 || h.length === 4) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length >= 6) {
      return `#${h.slice(0, 6).toLowerCase()}`;
    }
  }

  const s = str.toLowerCase();
  if (s.includes('white')) return '#ffffff';
  if (s.includes('black')) return '#000000';
  if (s.includes('slate-950')) return '#020617';
  if (s.includes('slate-900')) return '#0f172a';
  if (s.includes('slate-800')) return '#1e293b';
  if (s.includes('slate-700')) return '#334155';
  if (s.includes('slate-600')) return '#475569';
  if (s.includes('slate-500')) return '#64748b';
  if (s.includes('slate-400')) return '#94a3b8';
  if (s.includes('slate-300')) return '#cbd5e1';
  if (s.includes('slate-200')) return '#e2e8f0';
  if (s.includes('slate-100')) return '#f1f5f9';
  if (s.includes('slate-50')) return '#f8fafc';
  if (s.includes('amber-500')) return '#f59e0b';
  if (s.includes('amber-400')) return '#fbbf24';
  if (s.includes('amber-300')) return '#fcd34d';
  if (s.includes('amber-200')) return '#fde68a';
  if (s.includes('amber-100')) return '#fef3c7';
  if (s.includes('amber-50')) return '#fffbeb';
  if (s.includes('yellow-500')) return '#eab308';
  if (s.includes('yellow-400')) return '#facc15';
  if (s.includes('yellow-300')) return '#fde047';
  if (s.includes('emerald-600')) return '#059669';
  if (s.includes('emerald-500')) return '#10b981';
  if (s.includes('emerald-400')) return '#34d399';
  if (s.includes('indigo-600')) return '#4f46e5';
  if (s.includes('indigo-500')) return '#6366f1';
  if (s.includes('indigo-400')) return '#818cf8';
  if (s.includes('rose-600')) return '#e11d48';
  if (s.includes('rose-500')) return '#f43f5e';
  if (s.includes('rose-400')) return '#fb7185';
  if (s.includes('purple-600')) return '#9333ea';
  if (s.includes('purple-500')) return '#a855f7';
  if (s.includes('sky-600')) return '#0284c7';
  if (s.includes('sky-500')) return '#0ea5e9';

  return fallback;
}

export function getBuiltInThemeColors(themeId: string): CustomThemeColors {
  const t = THEME_STYLES[themeId];
  if (!t) return { ...DEFAULT_CUSTOM_THEME_COLORS };

  const appBg = parseHexFromStyle(t.appBg, t.bgColorHex || '#0f172a');
  const chatBg = parseHexFromStyle(t.chatBg, t.bgColorHex || '#f8fafc');
  const headerBg = parseHexFromStyle(t.headerBg, '#1e1b18');
  const headerBorder = parseHexFromStyle(t.headerBorder, t.accentColor || '#d97706');
  const headerText = parseHexFromStyle(t.headerAccent, t.accentColor || '#fbbf24');
  const subHeaderBg = parseHexFromStyle(t.subHeaderBg, '#292524');
  const subHeaderText = parseHexFromStyle(t.subHeaderText, '#fde68a');
  const bottomBarBg = parseHexFromStyle(t.bottomBarBg, headerBg);
  const bottomBarText = parseHexFromStyle(t.bottomBarText, subHeaderText);
  const inputBarBg = parseHexFromStyle(t.inputBarBg || t.bottomBarBg, headerBg);
  const fieldBg = parseHexFromStyle(t.fieldBg, '#ffffff');
  const fieldText = parseHexFromStyle(t.fieldText, '#000000');
  const fieldBorder = parseHexFromStyle(t.fieldBorder, '#cbd5e1');
  const bubbleBg = parseHexFromStyle(t.bubbleTheme, '#ffffff');
  const bubbleBorder = parseHexFromStyle(t.bubbleTheme, fieldBorder);
  const appText = parseHexFromStyle(t.appText, t.recommendedTextColor || '#f8fafc');
  const accentText = parseHexFromStyle(t.accentText, t.accentColor || '#f59e0b');
  const primaryBtnBg = parseHexFromStyle(t.primaryBtn, t.accentColor || '#d97706');
  const primaryBtnText = t.primaryBtn?.includes('text-white') ? '#ffffff' : (t.primaryBtn?.includes('text-slate-950') || t.primaryBtn?.includes('text-black')) ? '#000000' : '#ffffff';
  const drawerBg = parseHexFromStyle(t.drawerBg, appBg);
  const cardBg = parseHexFromStyle(t.cardBg, '#1c1917');
  const cardBorder = parseHexFromStyle(t.cardBorder, '#44403c');

  return {
    appBg,
    chatBg,
    headerBg,
    headerText,
    headerBorder,
    subHeaderBg,
    subHeaderText,
    bottomBarBg,
    bottomBarText,
    inputBarBg,
    fieldBg,
    fieldText,
    fieldBorder,
    bubbleBg,
    bubbleBorder,
    appText,
    accentText,
    primaryBtnBg,
    primaryBtnText,
    drawerBg,
    cardBg,
    cardBorder
  };
}

export interface BuiltInThemeMeta {
  id: string;
  name: string;
  category: 'calm' | 'royal' | 'gold' | 'classic' | 'nature';
  previewColors: string[];
}

export const BUILT_IN_THEMES_FOR_EDITING: BuiltInThemeMeta[] = [
  {
    id: 'pearl-gray-calm',
    name: 'الرصاصي اللؤلؤي الهادئ 🪞',
    category: 'calm',
    previewColors: ['#f8fafc', '#e2e8f0', '#94a3b8', '#475569']
  },
  {
    id: 'official-pure-light',
    name: 'الأبيض الرسمي الفاخر 📄',
    category: 'royal',
    previewColors: ['#ffffff', '#f8fafc', '#0f172a', '#334155']
  },
  {
    id: 'official-royal-white',
    name: 'الديواني الملكي الأبيض 🏢',
    category: 'royal',
    previewColors: ['#ffffff', '#f1f5f9', '#020617', '#d97706']
  },
  {
    id: 'royal-pure-gold-24k',
    name: 'الذهب الإمبراطوري 24K ⭐',
    category: 'gold',
    previewColors: ['#211804', '#050402', '#f59e0b', '#fef3c7']
  },
  {
    id: 'dubai-pearl-gold',
    name: 'ذهب لؤلؤة دبي الملكي 👑',
    category: 'gold',
    previewColors: ['#1c1608', '#070502', '#fbbf24', '#fef9c3']
  },
  {
    id: 'pharaonic-sun-gold',
    name: 'شمس الذهب الفرعوني ☀️',
    category: 'gold',
    previewColors: ['#261704', '#0a0601', '#f59e0b', '#fef3c7']
  },
  {
    id: 'champagne-velvet-gold',
    name: 'المخمل والشمبانيا الذهبي 🥂',
    category: 'gold',
    previewColors: ['#201912', '#080604', '#d97706', '#fef3c7']
  },
  {
    id: 'alhambra-arabesque-gold',
    name: 'نقوش قصر الحمراء والذهب 🏰',
    category: 'gold',
    previewColors: ['#271504', '#080401', '#eab308', '#fef3c7']
  },
  {
    id: 'andalusian-jasmine-palace',
    name: 'الياسمين الأندلسي وقصر المورق 🌿',
    category: 'nature',
    previewColors: ['#032318', '#01100b', '#10b981', '#ecfdf5']
  },
  {
    id: 'imperial-obsidian-gold',
    name: 'السبج الأسود والذهب الإمبراطوري 🖤',
    category: 'royal',
    previewColors: ['#141416', '#09090b', '#f59e0b', '#ffffff']
  },
  {
    id: 'persian-lapis-lazuli',
    name: 'لازورد نيسابور وقباب أصفهان 🔷',
    category: 'royal',
    previewColors: ['#0b162c', '#040914', '#38bdf8', '#f0f9ff']
  },
  {
    id: 'royal-oud-ambergris',
    name: 'العود الملكي والعنبر الفاخر 🪵',
    category: 'royal',
    previewColors: ['#22140a', '#0a0502', '#d97706', '#fef3c7']
  },
  {
    id: 'cosmic-aurora-borealis',
    name: 'الشفق القطبي الكوني 🌌',
    category: 'royal',
    previewColors: ['#091426', '#020617', '#818cf8', '#c084fc']
  },
  {
    id: 'emerald-gold-palace',
    name: 'قصر الزمرد والذهب الملكي 💎',
    category: 'nature',
    previewColors: ['#042014', '#010d08', '#10b981', '#f59e0b']
  },
  {
    id: 'midnight-neon-cyber',
    name: 'النيون السيبراني منتصف الليل ⚡',
    category: 'royal',
    previewColors: ['#0a0f1d', '#020617', '#06b6d4', '#f43f5e']
  },
  {
    id: 'royal-crimson-velvet',
    name: 'المخمل القرمزي الملكي 🍷',
    category: 'royal',
    previewColors: ['#260810', '#0f0205', '#e11d48', '#fef2f2']
  },
  {
    id: 'desert-dune-gold',
    name: 'كثبان الصحراء الذهبية 🏜️',
    category: 'gold',
    previewColors: ['#2b1b0b', '#0d0803', '#f59e0b', '#fffbeb']
  },
  {
    id: 'arctic-sapphire-frost',
    name: 'جليد الياقوت القطبي ❄️',
    category: 'royal',
    previewColors: ['#0a192f', '#030b14', '#60a5fa', '#f0f9ff']
  },
  {
    id: 'golden-brown-harmony',
    name: 'البني والذهبي المتناسق 🤎',
    category: 'gold',
    previewColors: ['#1f1610', '#0a0705', '#d97706', '#fef3c7']
  },
  {
    id: 'dam-ghazal-royal',
    name: 'دم الغزال الملكي الفاخر 🩸',
    category: 'royal',
    previewColors: ['#2a0910', '#100205', '#f43f5e', '#ffffff']
  },
  {
    id: 'royal-turquoise',
    name: 'الفيروز الملكي الصافي 💠',
    category: 'royal',
    previewColors: ['#08242a', '#020e11', '#06b6d4', '#ecfeff']
  },
  {
    id: 'sunset-bronze',
    name: 'برونز الغروب الساحر 🌅',
    category: 'royal',
    previewColors: ['#26130b', '#0f0603', '#f97316', '#ffedd5']
  },
  {
    id: 'amethyst-velvet',
    name: 'مخمل الجمشت البنفسجي 🔮',
    category: 'royal',
    previewColors: ['#1b0c26', '#09030f', '#a855f7', '#faf5ff']
  },
  {
    id: 'dark-gold',
    name: 'الذهبي الداكن الكلاسيكي 🪙',
    category: 'gold',
    previewColors: ['#1c160e', '#090704', '#d97706', '#fef3c7']
  },
  {
    id: 'royal-gold-brown',
    name: 'الذهبي البني الملكي 👑',
    category: 'gold',
    previewColors: ['#23170e', '#0c0704', '#d97706', '#fef3c7']
  },
  {
    id: 'dam-ghazal',
    name: 'دم الغزال الكلاسيكي 🍁',
    category: 'classic',
    previewColors: ['#2d0e14', '#120407', '#e11d48', '#fff1f2']
  },
  {
    id: 'sapphire-night',
    name: 'ليالي الياقوت الأزرق 🌌',
    category: 'classic',
    previewColors: ['#0f172a', '#020617', '#3b82f6', '#eff6ff']
  },
  {
    id: 'emerald-sand',
    name: 'رمال الزمرد الخضراء 🌴',
    category: 'nature',
    previewColors: ['#062419', '#02100a', '#10b981', '#ecfdf5']
  },
  {
    id: 'violet-twilight',
    name: 'شفق البنفسج 🌆',
    category: 'classic',
    previewColors: ['#1e102d', '#0b0412', '#8b5cf6', '#f5f3ff']
  },
  {
    id: 'amber-oasis',
    name: 'واحة العنبر الدافئة 🌾',
    category: 'nature',
    previewColors: ['#291a0b', '#100a03', '#f59e0b', '#fffbeb']
  },
  {
    id: 'ruby-velvet',
    name: 'مخمل الياقوت الأحمر 🌹',
    category: 'classic',
    previewColors: ['#28080e', '#0e0204', '#ef4444', '#fef2f2']
  },
  {
    id: 'deep-ocean',
    name: 'أعماق المحيط الفيروزي 🌊',
    category: 'nature',
    previewColors: ['#08202b', '#020d12', '#0284c7', '#f0f9ff']
  },
  {
    id: 'emerald-forest',
    name: 'غابة الزمرد الساحرة 🌲',
    category: 'nature',
    previewColors: ['#052316', '#010f08', '#059669', '#ecfdf5']
  }
];

export function buildThemeDefinitionFromCustom(preset: CustomThemePreset): ThemeDefinition {
  return {
    id: preset.id,
    name: `${preset.name} 🎨`,
    bg: 'bg-slate-900',
    primary: 'border-amber-400 text-amber-200',
    accent: preset.colors.primaryBtnBg,
    colors: [
      preset.colors.headerBg,
      preset.colors.chatBg,
      preset.colors.primaryBtnBg,
      preset.colors.bubbleBg
    ],
    category: 'royal',
    badge: 'قالب مخصص محفوظ ✨',
    fieldDesc: 'قالب ألوان مخصص تم تنسيقه وحفظه من لوحة التحكم',
    recommendedFontColor: '#000000',
    recommendedNameColor: '#000000'
  };
}

/**
 * Standard WCAG 2.0 / 2.1 Relative Luminance Calculation
 * حساب درجة السطوع النسبي للون وفق معايير إمكانية الوصول العالمية (Luminance)
 * @returns قيمة عشرية بين 0.0 (أسود تماماً) و 1.0 (أبيض تماماً)
 */
export function calculateColorLuminance(color?: string): number {
  if (!color) return 1.0;
  const raw = color.trim().toLowerCase();

  // Known named color fast mappings
  const knownMap: Record<string, [number, number, number]> = {
    white: [255, 255, 255],
    black: [0, 0, 0],
    transparent: [255, 255, 255],
    'slate-950': [2, 6, 23],
    'slate-900': [15, 23, 42],
    'slate-800': [30, 41, 59],
    'slate-700': [51, 65, 85],
    'slate-600': [71, 85, 105],
    'slate-500': [100, 116, 139],
    'slate-400': [148, 163, 184],
    'slate-300': [203, 213, 225],
    'slate-200': [226, 232, 240],
    'slate-100': [241, 245, 249],
    'slate-50': [248, 250, 252],
    'amber-50': [255, 251, 235],
    'amber-100': [254, 243, 199],
    'amber-200': [253, 230, 138],
    'amber-900': [120, 53, 15],
    'amber-950': [69, 26, 3],
    'rose-50': [255, 241, 242],
    'rose-100': [255, 228, 230]
  };

  let r = 255;
  let g = 255;
  let b = 255;

  // Check if string contains hex code e.g. bg-[#161f33] or #ffffff
  const hexMatch = raw.match(/#([0-9a-f]{3,8})/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16) || 0;
      g = parseInt(hex.slice(2, 4), 16) || 0;
      b = parseInt(hex.slice(4, 6), 16) || 0;
    }
  } else {
    // Check rgb / rgba e.g. rgb(245, 158, 11) or rgba(0, 0, 0, 0.5)
    const rgbMatch = raw.match(/rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)/i);
    if (rgbMatch) {
      r = parseInt(rgbMatch[1], 10) || 0;
      g = parseInt(rgbMatch[2], 10) || 0;
      b = parseInt(rgbMatch[3], 10) || 0;
    } else {
      // Lookup known names or tailwind classes
      const matchedKey = Object.keys(knownMap).find((k) => raw.includes(k));
      if (matchedKey) {
        [r, g, b] = knownMap[matchedKey];
      } else {
        return 0.5; // fallback neutral
      }
    }
  }

  // Convert to sRGB and linearize (WCAG 2.1 formula)
  const sR = r / 255;
  const sG = g / 255;
  const sB = b / 255;
  const rLin = sR <= 0.03928 ? sR / 12.92 : Math.pow((sR + 0.055) / 1.055, 2.4);
  const gLin = sG <= 0.03928 ? sG / 12.92 : Math.pow((sG + 0.055) / 1.055, 2.4);
  const bLin = sB <= 0.03928 ? sB / 12.92 : Math.pow((sB + 0.055) / 1.055, 2.4);

  const lum = 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  return Math.max(0, Math.min(1, Number(lum.toFixed(4))));
}

/**
 * حساب درجة سطوع الثيم بالكامل بناءً على خلفيته الرئيسية أو منطقة المحادثة
 */
export function getThemeLuminance(themeOrId: ThemeFullStyle | string): number {
  if (typeof themeOrId === 'string') {
    const style = THEME_STYLES[themeOrId];
    if (style) {
      return getThemeLuminance(style);
    }
    return calculateColorLuminance(themeOrId);
  }
  const colorStr = themeOrId.bgColorHex || themeOrId.chatBg || themeOrId.appBg || '#ffffff';
  return calculateColorLuminance(colorStr);
}

/**
 * دالة استخراج اللون عالي التباين (أبيض أو أسود) بناءً على سطوع الخلفية
 * - خلفية فاتحة (Luminance > 0.45) => نص أسود (#000000 أو #0f172a)
 * - خلفية داكنة (Luminance <= 0.45) => نص أبيض (#ffffff)
 */
export function getContrastTextColor(backgroundColor: string, threshold = 0.45): '#000000' | '#ffffff' {
  const lum = calculateColorLuminance(backgroundColor);
  return lum > threshold ? '#000000' : '#ffffff';
}

export function isColorDark(color?: string): boolean {
  if (!color) return false;
  return calculateColorLuminance(color) < 0.22;
}

export function isColorLight(color?: string): boolean {
  if (!color) return false;
  return calculateColorLuminance(color) > 0.65;
}

/**
 * استخراج لون خلفية فقاعة الرسالة الفعلي بدقة
 */
export function getBubbleEffectiveBgColor(params: {
  isMe: boolean;
  isNight: boolean;
  bubbleStyle?: string;
  curTheme?: ThemeFullStyle;
  isMentioned?: boolean;
  isAlert?: boolean;
}): string {
  if (params.isAlert) return '#fef3c7'; // تنبيه عاجل
  if (params.isMentioned) return '#ffe4e6'; // إشارة منشن
  if (params.bubbleStyle === 'transparent') {
    return params.isNight ? '#0a0f1d' : (params.curTheme?.bgColorHex || '#f8fafc');
  }
  if (params.bubbleStyle === 'neon') {
    return params.isMe ? '#241a12' : '#161f33';
  }
  if (params.bubbleStyle === 'royal-gold') {
    return params.isMe ? '#2a1a06' : '#1b1712';
  }
  if (params.isNight) {
    return params.isMe ? '#241a12' : '#161f33';
  }
  // الوضع النهاري الافتراضي
  return params.isMe ? '#fef3c7' : '#ffffff';
}

/**
 * ضبط لون نص الرسائل تلقائياً (أبيض أو أسود) بناءً على سطوع فقاعة المحادثة
 * مع ضمان التباين العالي وإمكانية احترام لون الخط المخصص طالما كان متبايناً ومقروءاً
 */
export function getAutoContrastMessageTextColor(params: {
  textColor?: string;
  isMe: boolean;
  isNight: boolean;
  bubbleStyle?: string;
  curTheme?: ThemeFullStyle;
  isMentioned?: boolean;
  isAlert?: boolean;
  forceHighContrast?: boolean;
}): string {
  const bubbleBg = getBubbleEffectiveBgColor(params);
  const bubbleLum = calculateColorLuminance(bubbleBg);
  const isLightSurface = bubbleLum > 0.45;

  // إذا تم تفعيل وضع التباين العالي الإلزامي: إما أبيض ناصع أو أسود فاحم
  if (params.forceHighContrast) {
    return isLightSurface ? '#000000' : '#ffffff';
  }

  // إذا اختار المستخدم لون نص مخصص، نتحقق من تباينه مع خلفية الفقاعة عبر دالة السطوع
  if (params.textColor) {
    const textLum = calculateColorLuminance(params.textColor);
    if (isLightSurface) {
      // خلفية الفقاعة فاتحة: يجب أن يكون النص داكناً
      if (textLum > 0.38) {
        return '#000000'; // اللون فاتح جداً وغير مقروء على خلفية فاتحة => أسود فاحم
      }
      return params.textColor;
    } else {
      // خلفية الفقاعة داكنة: يجب أن يكون النص فاتحاً
      if (textLum < 0.35) {
        return '#ffffff'; // اللون داكن جداً وغير مقروء على خلفية داكنة => أبيض ناصع
      }
      return params.textColor;
    }
  }

  // الوضع التلقائي بدون لون مخصص
  return isLightSurface ? '#000000' : '#ffffff';
}

/**
 * غلاف توافقي لضبط لون نص الرسائل باستخدام دالة السطوع والتباين العالي
 */
export function getSafeMessageTextColor(
  textColor: string | undefined,
  isNight: boolean,
  isTransparentBubble: boolean = false,
  extra?: {
    isMe?: boolean;
    bubbleStyle?: string;
    curTheme?: ThemeFullStyle;
    isMentioned?: boolean;
    isAlert?: boolean;
    forceHighContrast?: boolean;
  }
): string {
  return getAutoContrastMessageTextColor({
    textColor,
    isMe: extra?.isMe ?? false,
    isNight,
    bubbleStyle: extra?.bubbleStyle || (isTransparentBubble ? 'transparent' : undefined),
    curTheme: extra?.curTheme,
    isMentioned: extra?.isMentioned,
    isAlert: extra?.isAlert,
    forceHighContrast: extra?.forceHighContrast
  });
}

export function buildNightModeTheme(base: ThemeFullStyle): ThemeFullStyle {
  return {
    ...base,
    appBg: 'bg-[#070b13]',
    appText: 'text-slate-100 font-bold',
    chatBg: 'bg-[#0a0f1d]',
    headerBg: 'bg-[#111726]',
    headerBorder: 'border-slate-800 shadow-md',
    headerAccent: base.headerAccent?.includes('text-black') || base.headerAccent?.includes('text-slate-950')
      ? 'text-amber-400 font-extrabold'
      : base.headerAccent || 'text-amber-400 font-extrabold',
    subHeaderBg: 'bg-[#0c1220]',
    subHeaderBorder: 'border-slate-800',
    subHeaderText: 'text-slate-200 font-bold',
    bottomBarBg: 'bg-[#111726]',
    bottomBarBorder: 'border-slate-800',
    bottomBarText: 'text-slate-100 font-bold',
    inputBarBg: 'bg-[#111726]',
    inputBarBorder: 'border-slate-800 shadow-md',
    primaryBtn: base.primaryBtn?.includes('bg-white')
      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md'
      : base.primaryBtn || 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md',
    drawerBg: 'bg-[#0a0f1d] text-slate-100',
    drawerHeaderBg: 'bg-[#111726] text-slate-100 border-b border-slate-800',
    cardBg: 'bg-[#111726]',
    cardBorder: 'border-slate-800 shadow-md',
    accentText: 'text-amber-400 font-black',
    bubbleTheme: 'border-slate-800 text-slate-100 bg-[#151f33] shadow-md font-semibold',
    accentColor: base.accentColor || '#f59e0b',
    bgColorHex: '#0a0f1d',
    fieldBg: 'bg-[#162035]',
    fieldBorder: 'border-slate-700 shadow-inner',
    fieldFocus: 'focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50',
    fieldText: 'text-white font-bold',
    fieldPlaceholder: 'placeholder-slate-400',
    recommendedTextColor: '#ffffff',
    recommendedNameColor: '#fbbf24'
  };
}

