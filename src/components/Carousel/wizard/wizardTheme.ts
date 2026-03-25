// Shared wizard accent theme utility
// Used by all wizard step components to apply mode-specific colors

export type WizardAccentTheme = 'purple' | 'red' | 'orange' | 'sky';

export function getAccentTheme(wizardMode: 'simple' | 'advanced' | 'extreme' | 'tweet'): WizardAccentTheme {
  if (wizardMode === 'extreme') return 'orange';
  if (wizardMode === 'advanced') return 'red';
  if (wizardMode === 'tweet') return 'sky';
  return 'purple';
}

// Tailwind class mappings per theme
const themeMap = {
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-500/20',
    bgLighter: 'bg-purple-500/15',
    bgSubtle: 'bg-purple-500/[0.08]',
    bgFaint: 'bg-purple-500/[0.05]',
    border: 'border-purple-500/40',
    borderLight: 'border-purple-500/30',
    borderSubtle: 'border-purple-500/20',
    text: 'text-purple-400',
    textLight: 'text-purple-300',
    textLighter: 'text-purple-200',
    ring: 'ring-purple-500/50',
    ringFull: 'ring-purple-500',
    accent: 'accent-purple-500',
    shadow: 'shadow-[0_0_12px_rgba(139,92,246,0.15)]',
    shadowStrong: 'shadow-[0_0_12px_rgba(139,92,246,0.4)]',
    gradient: 'from-purple-600 to-pink-600',
    gradientHover: 'hover:from-purple-500 hover:to-pink-500',
    spinnerBorder: 'border-purple-500/30',
    spinnerTop: 'border-t-purple-500',
    dotBg: 'bg-purple-500/60',
    dotBgActive: 'bg-purple-400',
    // Inline style values for non-tailwind contexts
    hex: '#8B5CF6',
    rgb: '139,92,246',
    rgbaLight: 'rgba(139,92,246,0.15)',
  },
  red: {
    bg: 'bg-red-500',
    bgLight: 'bg-red-500/20',
    bgLighter: 'bg-red-500/15',
    bgSubtle: 'bg-red-500/[0.08]',
    bgFaint: 'bg-red-500/[0.05]',
    border: 'border-red-500/40',
    borderLight: 'border-red-500/30',
    borderSubtle: 'border-red-500/20',
    text: 'text-red-400',
    textLight: 'text-red-300',
    textLighter: 'text-red-200',
    ring: 'ring-red-500/50',
    ringFull: 'ring-red-500',
    accent: 'accent-red-500',
    shadow: 'shadow-[0_0_12px_rgba(220,38,38,0.15)]',
    shadowStrong: 'shadow-[0_0_12px_rgba(220,38,38,0.4)]',
    gradient: 'from-red-600 to-rose-600',
    gradientHover: 'hover:from-red-500 hover:to-rose-500',
    spinnerBorder: 'border-red-500/30',
    spinnerTop: 'border-t-red-500',
    dotBg: 'bg-red-500/60',
    dotBgActive: 'bg-red-400',
    hex: '#DC2626',
    rgb: '220,38,38',
    rgbaLight: 'rgba(220,38,38,0.15)',
  },
  orange: {
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-500/20',
    bgLighter: 'bg-orange-500/15',
    bgSubtle: 'bg-orange-500/[0.08]',
    bgFaint: 'bg-orange-500/[0.05]',
    border: 'border-orange-500/40',
    borderLight: 'border-orange-500/30',
    borderSubtle: 'border-orange-500/20',
    text: 'text-orange-400',
    textLight: 'text-orange-300',
    textLighter: 'text-orange-200',
    ring: 'ring-orange-500/50',
    ringFull: 'ring-orange-500',
    accent: 'accent-orange-500',
    shadow: 'shadow-[0_0_12px_rgba(232,77,26,0.15)]',
    shadowStrong: 'shadow-[0_0_12px_rgba(232,77,26,0.4)]',
    gradient: 'from-orange-600 to-amber-600',
    gradientHover: 'hover:from-orange-500 hover:to-amber-500',
    spinnerBorder: 'border-orange-500/30',
    spinnerTop: 'border-t-orange-500',
    dotBg: 'bg-orange-500/60',
    dotBgActive: 'bg-orange-400',
    hex: '#E84D1A',
    rgb: '232,77,26',
    rgbaLight: 'rgba(232,77,26,0.15)',
  },
  sky: {
    bg: 'bg-sky-500',
    bgLight: 'bg-sky-500/20',
    bgLighter: 'bg-sky-500/15',
    bgSubtle: 'bg-sky-500/[0.08]',
    bgFaint: 'bg-sky-500/[0.05]',
    border: 'border-sky-500/40',
    borderLight: 'border-sky-500/30',
    borderSubtle: 'border-sky-500/20',
    text: 'text-sky-400',
    textLight: 'text-sky-300',
    textLighter: 'text-sky-200',
    ring: 'ring-sky-500/50',
    ringFull: 'ring-sky-500',
    accent: 'accent-sky-500',
    shadow: 'shadow-[0_0_12px_rgba(14,165,233,0.15)]',
    shadowStrong: 'shadow-[0_0_12px_rgba(14,165,233,0.4)]',
    gradient: 'from-sky-600 to-cyan-600',
    gradientHover: 'hover:from-sky-500 hover:to-cyan-500',
    spinnerBorder: 'border-sky-500/30',
    spinnerTop: 'border-t-sky-500',
    dotBg: 'bg-sky-500/60',
    dotBgActive: 'bg-sky-400',
    hex: '#0EA5E9',
    rgb: '14,165,233',
    rgbaLight: 'rgba(14,165,233,0.15)',
  },
} as const;

export type ThemeClasses = (typeof themeMap)[WizardAccentTheme];

export function getThemeClasses(theme: WizardAccentTheme): ThemeClasses {
  return themeMap[theme] as ThemeClasses;
}
