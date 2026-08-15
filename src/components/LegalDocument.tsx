import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import ellocontentLogo from '@/assets/ellocontent_logo.png';

export interface LegalSection {
  title: string;
  content: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  introduction: string;
  sections: LegalSection[];
}

export function LegalDocument({ title, introduction, sections }: LegalDocumentProps) {
  return (
    <main
      className="min-h-screen bg-[#09090d] px-5 pb-16 text-white"
      style={{ paddingTop: 'max(24px, env(safe-area-inset-top))' }}
    >
      <div className="mx-auto max-w-3xl">
        <nav className="mb-12 flex items-center justify-between border-b border-white/[0.08] pb-5">
          <Link to="/" aria-label="Voltar para o início">
            <img src={ellocontentLogo} alt="ellocontent" className="h-5" />
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-white/55 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
        </nav>

        <header className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
            ellocontent
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/55">{introduction}</p>
          <p className="mt-4 text-xs text-white/30">Última atualização: 15 de agosto de 2026</p>
        </header>

        <div className="space-y-10">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
              <h2 className="mb-4 text-xl font-semibold text-white">{section.title}</h2>
              <div className="space-y-4 text-sm leading-7 text-white/55 [&_a]:text-purple-300 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-white/80">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-12 border-t border-white/[0.08] pt-6 text-xs text-white/30">
          © 2026 ellocontent. Todos os direitos reservados.
        </footer>
      </div>
    </main>
  );
}
