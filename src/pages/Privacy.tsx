import { LegalDocument, type LegalSection } from '@/components/LegalDocument';

const sections: LegalSection[] = [
  {
    title: '1. Dados que coletamos',
    content: (
      <>
        <p>Coletamos somente os dados necessários para fornecer, proteger e melhorar o ellocontent:</p>
        <ul>
          <li><strong>Conta e contato:</strong> nome, e-mail, empresa e, quando fornecido, telefone.</li>
          <li><strong>Perfil:</strong> nome de usuário, biografia, site, Instagram, avatar e imagem de capa.</li>
          <li><strong>Conteúdo:</strong> prompts, textos, imagens, vídeos, áudios, arquivos, logos, referências de marca e materiais gerados ou enviados por você.</li>
          <li><strong>Assinatura:</strong> plano, créditos, histórico e estado da assinatura. Dados completos de cartão são processados pelo provedor de pagamento e não são armazenados pelo ellocontent.</li>
          <li><strong>Uso e segurança:</strong> registros de acesso, endereço IP, navegador, aparelho, ações no produto e informações técnicas necessárias para prevenir abuso e diagnosticar falhas.</li>
          <li><strong>Suporte:</strong> mensagens e arquivos enviados em solicitações de atendimento.</li>
        </ul>
      </>
    ),
  },
  {
    title: '2. Como usamos os dados',
    content: (
      <ul>
        <li>Criar e administrar sua conta.</li>
        <li>Gerar, editar, armazenar, exportar e publicar conteúdos solicitados por você.</li>
        <li>Aplicar identidade visual, fotos e referências fornecidas por você.</li>
        <li>Gerenciar créditos, assinatura e recursos disponíveis.</li>
        <li>Oferecer suporte, segurança, prevenção a fraude e melhoria do produto.</li>
        <li>Enviar comunicações operacionais e, somente quando autorizado, mensagens promocionais.</li>
      </ul>
    ),
  },
  {
    title: '3. Inteligência artificial e fornecedores',
    content: (
      <p>
        Para executar as funções solicitadas, o ellocontent pode enviar prompts, imagens, áudios e outros materiais a fornecedores de infraestrutura, armazenamento, inteligência artificial, busca de referências, publicação social, e-mail e atendimento. Esses fornecedores recebem apenas os dados necessários à prestação do serviço e estão sujeitos aos próprios termos e compromissos de segurança.
      </p>
    ),
  },
  {
    title: '4. Compartilhamento e transferências',
    content: (
      <>
        <p>Não vendemos seus dados pessoais. Podemos compartilhá-los:</p>
        <ul>
          <li>Com operadores que hospedam, processam ou protegem a plataforma.</li>
          <li>Com integrações escolhidas por você, como Instagram/Meta.</li>
          <li>Para cumprir obrigação legal, ordem válida ou proteger direitos e segurança.</li>
          <li>Em reorganização societária, respeitando esta política e a legislação aplicável.</li>
        </ul>
        <p>Alguns fornecedores podem processar dados fora do Brasil com salvaguardas contratuais e técnicas adequadas.</p>
      </>
    ),
  },
  {
    title: '5. Conteúdo público e comunidade',
    content: (
      <p>
        Projetos são privados por padrão. Se você escolher publicar um perfil, post, comentário ou estilo na comunidade, o conteúdo selecionado e as informações públicas do perfil poderão ser vistos por outras pessoas. Você é responsável por possuir os direitos sobre o material enviado e pode remover publicações usando os controles disponíveis.
      </p>
    ),
  },
  {
    title: '6. Retenção, segurança e exclusão',
    content: (
      <>
        <p>Mantemos os dados enquanto sua conta estiver ativa ou pelo período necessário para prestar o serviço, cumprir obrigações legais, resolver disputas e prevenir fraude. Aplicamos controles técnicos e organizacionais proporcionais ao risco, mas nenhum sistema é totalmente imune a incidentes.</p>
        <p>Você pode excluir definitivamente sua conta no aplicativo em <strong>Configurações → Conta → Excluir conta</strong>. A exclusão remove a conta e os dados associados, ressalvadas retenções legalmente obrigatórias, registros antifraude e cópias temporárias de segurança.</p>
      </>
    ),
  },
  {
    title: '7. Seus direitos',
    content: (
      <p>
        Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, portabilidade quando aplicável, informação sobre compartilhamento, oposição, revogação de consentimento e eliminação de dados tratados com base no consentimento. Podemos solicitar confirmação de identidade antes de atender ao pedido.
      </p>
    ),
  },
  {
    title: '8. Crianças e adolescentes',
    content: (
      <p>
        O ellocontent é destinado a profissionais e empresas e não é direcionado a crianças. Se você acreditar que dados de uma criança foram fornecidos indevidamente, entre em contato para que possamos avaliar e remover as informações.
      </p>
    ),
  },
  {
    title: '9. Contato e atualizações',
    content: (
      <>
        <p>Podemos atualizar esta política para refletir mudanças no produto ou na legislação. A data da versão mais recente será informada nesta página.</p>
        <p>Solicitações de privacidade: <a href="mailto:privacy@ellosuit.com">privacy@ellosuit.com</a></p>
      </>
    ),
  },
];

export default function Privacy() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      introduction="Esta política explica como o ellocontent trata dados pessoais e conteúdos enviados ou gerados durante o uso da plataforma e do aplicativo para iOS."
      sections={sections}
    />
  );
}
