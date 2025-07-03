
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft size={16} />
              Voltar ao início
            </Link>
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
          <p className="text-gray-600">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Aceitação dos Termos</h2>
              <p className="text-gray-700 mb-4">
                Ao acessar e usar a plataforma Ellosuit, você concorda em cumprir e estar vinculado a estes 
                Termos de Uso. Se você não concordar com qualquer parte destes termos, não deve usar nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Descrição do Serviço</h2>
              <p className="text-gray-700 mb-4">
                A Ellosuit é uma plataforma de produtividade empresarial que oferece:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Ferramentas de rastreamento e gerenciamento de e-mails</li>
                <li>Sistema de campanhas de e-mail marketing</li>
                <li>Integração com calendários e agendamento de reuniões</li>
                <li>Análises e relatórios de produtividade</li>
                <li>Gerenciamento de contatos e clientes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Conta de Usuário</h2>
              <p className="text-gray-700 mb-4">
                Para usar nossos serviços, você deve:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Fornecer informações precisas e atualizadas durante o registro</li>
                <li>Manter a confidencialidade de sua senha</li>
                <li>Ser responsável por todas as atividades em sua conta</li>
                <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Uso Aceitável</h2>
              <p className="text-gray-700 mb-4">
                Você concorda em não usar nossos serviços para:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Enviar spam ou comunicações não solicitadas</li>
                <li>Violar leis locais, estaduais, nacionais ou internacionais</li>
                <li>Transmitir conteúdo ofensivo, difamatório ou ilegal</li>
                <li>Interferir ou interromper nossos serviços</li>
                <li>Tentar acessar contas de outros usuários sem autorização</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Propriedade Intelectual</h2>
              <p className="text-gray-700 mb-4">
                A Ellosuit e todo o seu conteúdo, recursos e funcionalidades são propriedade da empresa e 
                são protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Planos e Pagamentos</h2>
              <p className="text-gray-700 mb-4">
                Alguns recursos podem exigir uma assinatura paga. Os termos de pagamento incluem:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Pagamentos são processados de forma segura através de provedores terceirizados</li>
                <li>Assinaturas são renovadas automaticamente, salvo cancelamento</li>
                <li>Reembolsos estão sujeitos à nossa política de reembolso</li>
                <li>Preços podem ser alterados com aviso prévio de 30 dias</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Limitação de Responsabilidade</h2>
              <p className="text-gray-700 mb-4">
                Em nenhuma circunstância a Ellosuit será responsável por danos indiretos, incidentais, 
                especiais, consequenciais ou punitivos, incluindo, sem limitação, perda de lucros, dados, 
                uso, boa vontade ou outras perdas intangíveis.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Rescisão</h2>
              <p className="text-gray-700 mb-4">
                Podemos encerrar ou suspender sua conta imediatamente, sem aviso prévio ou responsabilidade, 
                por qualquer motivo, incluindo, sem limitação, se você violar os Termos de Uso.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Alterações nos Termos</h2>
              <p className="text-gray-700 mb-4">
                Reservamos o direito de modificar ou substituir estes Termos a qualquer momento. 
                Se uma revisão for material, tentaremos fornecer pelo menos 30 dias de aviso antes 
                que os novos termos entrem em vigor.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Contato</h2>
              <p className="text-gray-700">
                Se você tiver alguma dúvida sobre estes Termos de Uso, entre em contato conosco em: 
                legal@ellosuit.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
