import { LegalDocument, type LegalSection } from '@/components/LegalDocument';

const sections: LegalSection[] = [
  {
    title: '1. Aceitação e elegibilidade',
    content: (
      <p>
        Ao criar uma conta ou usar o ellocontent, você concorda com estes Termos e com a Política de Privacidade. Você declara possuir capacidade legal para contratar e, ao usar o serviço em nome de uma empresa, autorização para representá-la.
      </p>
    ),
  },
  {
    title: '2. Conta e segurança',
    content: (
      <p>
        Você deve fornecer informações corretas, manter suas credenciais protegidas e comunicar qualquer uso não autorizado. Cada pessoa deve usar sua própria conta, salvo recursos de equipe disponibilizados pelo plano. Você responde pelas ações realizadas com suas credenciais até a comunicação de um incidente.
      </p>
    ),
  },
  {
    title: '3. Conteúdo e inteligência artificial',
    content: (
      <>
        <p>Você mantém os direitos que possui sobre os materiais enviados e concede ao ellocontent autorização limitada para hospedá-los e processá-los exclusivamente para operar, proteger e melhorar as funções solicitadas.</p>
        <p>Resultados de inteligência artificial podem conter erros, semelhanças não intencionais ou conteúdo inadequado. Você deve revisar textos, imagens, informações, direitos autorais, marcas, autorizações de imagem e conformidade legal antes de publicar ou utilizar comercialmente qualquer resultado.</p>
      </>
    ),
  },
  {
    title: '4. Uso aceitável',
    content: (
      <>
        <p>Você não pode usar o ellocontent para:</p>
        <ul>
          <li>Violar leis, direitos autorais, marcas, privacidade, imagem ou outros direitos.</li>
          <li>Criar fraude, assédio, exploração, discurso de ódio, conteúdo sexual envolvendo menores ou instruções para dano grave.</li>
          <li>Enviar malware, tentar acessar contas de terceiros ou contornar limites e controles de segurança.</li>
          <li>Apresentar conteúdo enganoso como fato sem revisão adequada, inclusive em temas médicos, jurídicos, financeiros ou eleitorais.</li>
          <li>Revender, copiar ou explorar a plataforma de modo não autorizado.</li>
        </ul>
      </>
    ),
  },
  {
    title: '5. Planos, créditos e pagamentos',
    content: (
      <p>
        Planos e créditos seguem as condições mostradas no momento da contratação. Renovações, cancelamentos e reembolsos observam a oferta aceita e a legislação aplicável. Compras e alterações de plano não são oferecidas dentro do aplicativo para iOS; contas com plano contratado por canais autorizados podem utilizar no app os recursos associados.
      </p>
    ),
  },
  {
    title: '6. Comunidade e publicação',
    content: (
      <p>
        Projetos são privados por padrão. Ao publicar conteúdo na comunidade ou em uma integração externa, você confirma possuir as autorizações necessárias. Podemos remover conteúdo, limitar alcance ou suspender contas quando houver denúncia fundamentada, risco, violação destes Termos ou obrigação legal.
      </p>
    ),
  },
  {
    title: '7. Serviços de terceiros',
    content: (
      <p>
        Integrações, modelos de IA, bancos de imagens, redes sociais, serviços de busca e pagamentos podem possuir termos e políticas próprios. A disponibilidade desses serviços pode mudar, e o ellocontent não controla atos ou interrupções de terceiros.
      </p>
    ),
  },
  {
    title: '8. Propriedade intelectual',
    content: (
      <p>
        A plataforma, software, marca, interface, modelos, documentação e conteúdos fornecidos pelo ellocontent são protegidos pela legislação aplicável. Estes Termos concedem apenas uma licença limitada, pessoal, revogável e não exclusiva para usar o serviço conforme o plano e sua finalidade.
      </p>
    ),
  },
  {
    title: '9. Disponibilidade e responsabilidade',
    content: (
      <p>
        Buscamos manter o serviço seguro e disponível, mas podem ocorrer manutenção, falhas, limites técnicos ou mudanças de recursos. Na extensão permitida por lei, o ellocontent não garante que resultados de IA sejam exclusivos, livres de erros ou adequados a uma finalidade específica. Direitos legais obrigatórios do consumidor permanecem preservados.
      </p>
    ),
  },
  {
    title: '10. Suspensão, encerramento e alterações',
    content: (
      <>
        <p>Você pode encerrar a conta pelos controles do aplicativo. Podemos suspender ou encerrar acesso em caso de risco de segurança, fraude, inadimplência, obrigação legal ou violação material destes Termos, respeitando direitos aplicáveis.</p>
        <p>Podemos atualizar estes Termos. Mudanças relevantes serão comunicadas por meios razoáveis, e o uso continuado após a vigência representa aceitação da nova versão quando permitido por lei.</p>
      </>
    ),
  },
  {
    title: '11. Contato',
    content: (
      <p>Dúvidas jurídicas: <a href="mailto:legal@ellosuit.com">legal@ellosuit.com</a></p>
    ),
  },
];

export default function Terms() {
  return (
    <LegalDocument
      title="Termos de Uso"
      introduction="Estes Termos regulam o uso do ellocontent, incluindo geração de conteúdo por inteligência artificial, armazenamento, exportação e integrações."
      sections={sections}
    />
  );
}
