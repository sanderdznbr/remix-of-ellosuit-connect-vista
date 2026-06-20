import React from 'react';
import { motion } from 'framer-motion';
import { Tag, Rocket, Briefcase, Lightbulb, Camera, Quote, TrendingUp, Heart } from 'lucide-react';

export interface Template {
  icon: React.ElementType;
  label: string;
  prompt: string;
  color: string;
}

export const TEMPLATES: Template[] = [
  {
    icon: Tag,
    label: 'Black Friday',
    prompt: 'Crie um post anunciando minha promoção de Black Friday com desconto especial. Destaque urgência e o valor da oferta.',
    color: '#F97316',
  },
  {
    icon: Rocket,
    label: 'Lançamento',
    prompt: 'Crie um post anunciando o lançamento do meu novo produto/serviço. Foque em benefícios e curiosidade.',
    color: '#A78BFA',
  },
  {
    icon: Briefcase,
    label: 'Vaga aberta',
    prompt: 'Crie um post anunciando uma vaga aberta na minha empresa. Inclua os principais requisitos e o que oferecemos.',
    color: '#60A5FA',
  },
  {
    icon: Lightbulb,
    label: 'Dica do dia',
    prompt: 'Crie um post com uma dica prática e rápida sobre o meu nicho que gere salvamento e compartilhamento.',
    color: '#FBBF24',
  },
  {
    icon: Camera,
    label: 'Antes & depois',
    prompt: 'Crie um post de antes e depois mostrando uma transformação do meu trabalho/produto.',
    color: '#34D399',
  },
  {
    icon: Quote,
    label: 'Depoimento',
    prompt: 'Crie um post destacando um depoimento de cliente satisfeito com meu produto/serviço.',
    color: '#F472B6',
  },
  {
    icon: TrendingUp,
    label: 'Dados & insights',
    prompt: 'Crie um post compartilhando um dado/estatística surpreendente do meu nicho com um insight prático.',
    color: '#22D3EE',
  },
  {
    icon: Heart,
    label: 'Bastidores',
    prompt: 'Crie um post mostrando os bastidores do meu trabalho — algo humano que aproxime a audiência.',
    color: '#FB7185',
  },
];

interface Props {
  onSelect: (prompt: string) => void;
}

const QuickTemplates: React.FC<Props> = ({ onSelect }) => {
  return (
    <motion.div
      className="w-full max-w-xl mt-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.4 }}
    >
      <p className="text-[10px] uppercase tracking-widest text-white/25 mb-2.5 text-center font-medium">
        Ou comece com um template
      </p>
      <div className="grid grid-cols-4 gap-1.5">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.label}
              onClick={() => onSelect(t.prompt)}
              className="group flex flex-col items-center justify-center gap-1.5 px-2 py-3 rounded-xl transition-all cursor-pointer backdrop-blur-sm"
              style={{
                backgroundColor: 'rgba(20, 20, 28, 0.45)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${t.color}14`;
                e.currentTarget.style.borderColor = `${t.color}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(20, 20, 28, 0.45)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
              }}
            >
              <Icon className="w-4 h-4 transition-colors" style={{ color: t.color }} />
              <span className="text-[10px] font-medium text-white/60 group-hover:text-white/90 leading-tight text-center">
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default QuickTemplates;
