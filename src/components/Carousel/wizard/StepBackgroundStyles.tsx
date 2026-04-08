import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface BackgroundStyleOption {
  id: string;
  label: string;
  css: (bg: string, accent: string, text: string) => string;
}

export const BACKGROUND_STYLES: BackgroundStyleOption[] = [
  {
    id: 'solid',
    label: 'Sólido',
    css: (bg) => `background: ${bg};`,
  },
  {
    id: 'gradient-linear',
    label: 'Gradiente Linear',
    css: (bg, accent) => `background: linear-gradient(135deg, ${bg} 0%, ${accent} 100%);`,
  },
  {
    id: 'gradient-radial',
    label: 'Gradiente Radial',
    css: (bg, accent) => `background: radial-gradient(circle at 30% 40%, ${accent}44 0%, ${bg} 70%);`,
  },
  {
    id: 'gradient-mesh',
    label: 'Mesh Gradient',
    css: (bg, accent) =>
      `background: ${bg}; background-image: radial-gradient(at 20% 80%, ${accent}55 0%, transparent 50%), radial-gradient(at 80% 20%, ${accent}33 0%, transparent 50%), radial-gradient(at 50% 50%, ${bg} 0%, transparent 80%);`,
  },
  {
    id: 'dots',
    label: 'Pontos',
    css: (bg, accent) =>
      `background-color: ${bg}; background-image: radial-gradient(${accent}22 1.5px, transparent 1.5px); background-size: 24px 24px;`,
  },
  {
    id: 'grid',
    label: 'Grid',
    css: (bg, accent) =>
      `background-color: ${bg}; background-image: linear-gradient(${accent}15 1px, transparent 1px), linear-gradient(90deg, ${accent}15 1px, transparent 1px); background-size: 40px 40px;`,
  },
  {
    id: 'diagonal-lines',
    label: 'Linhas Diagonais',
    css: (bg, accent) =>
      `background-color: ${bg}; background-image: repeating-linear-gradient(45deg, transparent, transparent 20px, ${accent}12 20px, ${accent}12 21px);`,
  },
  {
    id: 'noise-grain',
    label: 'Granulado',
    css: (bg, accent) =>
      `background: linear-gradient(160deg, ${bg} 0%, ${accent}18 100%); position: relative;`,
  },
  {
    id: 'circles',
    label: 'Círculos',
    css: (bg, accent) =>
      `background-color: ${bg}; background-image: radial-gradient(circle at 20% 30%, ${accent}20 0%, transparent 40%), radial-gradient(circle at 80% 70%, ${accent}15 0%, transparent 35%), radial-gradient(circle at 50% 10%, ${accent}10 0%, transparent 30%);`,
  },
  {
    id: 'aurora',
    label: 'Aurora',
    css: (bg, accent) =>
      `background: ${bg}; background-image: linear-gradient(180deg, ${accent}25 0%, transparent 40%), radial-gradient(ellipse at 70% 80%, ${accent}18 0%, transparent 50%);`,
  },
  {
    id: 'zigzag',
    label: 'Zig-Zag',
    css: (bg, accent) =>
      `background-color: ${bg}; background-image: linear-gradient(135deg, ${accent}15 25%, transparent 25%), linear-gradient(225deg, ${accent}15 25%, transparent 25%), linear-gradient(315deg, ${accent}15 25%, transparent 25%), linear-gradient(45deg, ${accent}15 25%, transparent 25%); background-size: 32px 32px; background-position: 0 0, 0 16px, 16px -8px, -16px 8px;`,
  },
  {
    id: 'spotlight',
    label: 'Spotlight',
    css: (bg, accent) =>
      `background: radial-gradient(ellipse at 50% 0%, ${accent}30 0%, ${bg} 70%);`,
  },
];

interface Props {
  selectedStyle: string;
  setSelectedStyle: (id: string) => void;
  bgColor: string;
  accentColor: string;
  textColor: string;
}

const StepBackgroundStyles: React.FC<Props> = ({
  selectedStyle,
  setSelectedStyle,
  bgColor,
  accentColor,
  textColor,
}) => {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-white font-semibold text-base mb-1">Estilo de Fundo</h3>
        <p className="text-white/50 text-sm">Escolha o padrão visual de fundo para os cards animados</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {BACKGROUND_STYLES.map((style, idx) => {
          const isSelected = selectedStyle === style.id;
          const cssStr = style.css(bgColor, accentColor, textColor);

          return (
            <motion.button
              key={style.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.25 }}
              onClick={() => setSelectedStyle(style.id)}
              className="group relative flex flex-col items-center gap-2 cursor-pointer"
            >
              <div
                className="relative w-full aspect-[4/5] rounded-xl border-2 overflow-hidden transition-all duration-200"
                style={{
                  borderColor: isSelected ? '#8B5CF6' : 'rgba(255,255,255,0.08)',
                  boxShadow: isSelected ? '0 0 20px rgba(139,92,246,0.3)' : 'none',
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{ cssText: cssStr } as any}
                />
                {/* Render using style attribute for the background */}
                <div className="absolute inset-0" dangerouslySetInnerHTML={{
                  __html: `<div style="${cssStr.replace(/"/g, "'")} width:100%;height:100%;position:absolute;inset:0;"></div>`
                }} />

                {/* Mini preview elements */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 pointer-events-none">
                  <div className="w-8 h-1 rounded-full mb-1" style={{ backgroundColor: textColor, opacity: 0.7 }} />
                  <div className="w-12 h-0.5 rounded-full mb-0.5" style={{ backgroundColor: textColor, opacity: 0.3 }} />
                  <div className="w-10 h-0.5 rounded-full" style={{ backgroundColor: textColor, opacity: 0.2 }} />
                </div>

                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#8B5CF6' }}
                  >
                    <Check className="w-3 h-3 text-white" />
                  </motion.div>
                )}
              </div>

              <span className="text-[11px] text-white/60 group-hover:text-white/80 transition-colors leading-tight text-center">
                {style.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default StepBackgroundStyles;