
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PrivacyPolicy = () => {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
          <p className="text-gray-600">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="prose prose-lg max-w-none">
          <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Informações que Coletamos</h2>
              <p className="text-gray-700 mb-4">
                A Ellosuit coleta informações que você nos fornece diretamente, como quando você cria uma conta, 
                usa nossos serviços ou entra em contato conosco. Isso pode incluir:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Nome, endereço de e-mail e informações de contato</li>
                <li>Informações da empresa e dados profissionais</li>
                <li>Dados de uso dos nossos serviços de e-mail e calendário</li>
                <li>Preferências e configurações da conta</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Como Usamos suas Informações</h2>
              <p className="text-gray-700 mb-4">
                Utilizamos suas informações para:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Fornecer e melhorar nossos serviços</li>
                <li>Processar transações e gerenciar sua conta</li>
                <li>Enviar comunicações importantes sobre o serviço</li>
                <li>Personalizar sua experiência</li>
                <li>Garantir a segurança e prevenir fraudes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Compartilhamento de Informações</h2>
              <p className="text-gray-700 mb-4">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros, exceto:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Com seu consentimento explícito</li>
                <li>Para cumprir obrigações legais</li>
                <li>Com prestadores de serviços que nos ajudam a operar a plataforma</li>
                <li>Em caso de fusão, aquisição ou venda de ativos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Segurança dos Dados</h2>
              <p className="text-gray-700 mb-4">
                Implementamos medidas de segurança técnicas e organizacionais apropriadas para proteger 
                suas informações pessoais contra acesso não autorizado, alteração, divulgação ou destruição.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Seus Direitos</h2>
              <p className="text-gray-700 mb-4">
                De acordo com a LGPD, você tem o direito de:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou inexatos</li>
                <li>Solicitar a exclusão de dados desnecessários</li>
                <li>Revogar seu consentimento</li>
                <li>Solicitar a portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookies</h2>
              <p className="text-gray-700 mb-4">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o uso 
                do site e personalizar conteúdo. Você pode gerenciar suas preferências de cookies nas 
                configurações do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Contato</h2>
              <p className="text-gray-700">
                Se você tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus 
                dados pessoais, entre em contato conosco através do e-mail: privacy@ellosuit.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
