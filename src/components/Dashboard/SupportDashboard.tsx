import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HelpCircle, Search, Book, MessageCircle, Mail, ChevronRight, ExternalLink, Phone, FileQuestion } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const SupportDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const faqs = [
    {
      id: '1',
      question: 'Como faço para rastrear meus documentos?',
      answer: 'Vá até "Rastreamento de Documento", faça upload do seu PDF e compartilhe o link gerado. Você poderá ver estatísticas de visualização em tempo real.',
    },
    {
      id: '2',
      question: 'Como criar links rastreáveis?',
      answer: 'Na seção "Rastreamento de Links", cole a URL que deseja rastrear e clique em "Criar Link". Um link encurtado será gerado com análises de cliques.',
    },
    {
      id: '3',
      question: 'Posso exportar meus dados?',
      answer: 'Sim! Na seção de Relatórios, você pode gerar e baixar relatórios em PDF ou Excel com todos os seus dados de rastreamento.',
    },
    {
      id: '4',
      question: 'Como funcionam as reuniões online?',
      answer: 'Use a seção "Reuniões" para criar salas de videoconferência. Compartilhe o código da sala com participantes e faça reuniões com áudio, vídeo e chat.',
    },
    {
      id: '5',
      question: 'Como gerenciar meus clientes?',
      answer: 'A seção "Clientes" permite cadastrar e organizar seus contatos, com informações detalhadas, tags e histórico de interações.',
    },
  ];

  const categories = [
    { icon: FileQuestion, title: 'Documentos', description: 'Upload, rastreamento e análise', count: 12 },
    { icon: MessageCircle, title: 'Reuniões', description: 'Videoconferência e gravações', count: 8 },
    { icon: Mail, title: 'Email', description: 'Campanhas e rastreamento', count: 15 },
    { icon: Book, title: 'Tutoriais', description: 'Guias passo a passo', count: 20 },
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
          <HelpCircle className="h-7 w-7 text-primary" />
          Central de Ajuda
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">Como podemos ajudar você hoje?</p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar na central de ajuda..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-12 rounded-xl"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {categories.map((cat, index) => (
          <Card key={index} className="border-none shadow-md rounded-xl bg-card hover:shadow-lg transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="p-3 rounded-full bg-primary/10">
                  <cat.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-medium text-sm">{cat.title}</h3>
                <p className="text-xs text-muted-foreground">{cat.count} artigos</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FAQ */}
        <Card className="border-none shadow-lg rounded-2xl bg-card lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileQuestion className="h-5 w-5" />
              Perguntas Frequentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <Accordion type="single" collapsible className="space-y-2">
              {filteredFaqs.map((faq) => (
                <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {filteredFaqs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum resultado encontrado para "{searchQuery}"
              </p>
            )}
          </CardContent>
        </Card>

        {/* Contact Options */}
        <Card className="border-none shadow-lg rounded-2xl bg-card">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="h-5 w-5" />
              Fale Conosco
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-3">
            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Chat ao Vivo</p>
                  <p className="text-xs text-muted-foreground">Resposta em minutos</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Email</p>
                  <p className="text-xs text-muted-foreground">suporte@ellosuit.com</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button variant="outline" className="w-full justify-between h-auto py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Phone className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-sm">Telefone</p>
                  <p className="text-xs text-muted-foreground">Seg-Sex, 9h-18h</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="pt-4 border-t">
              <Button className="w-full" variant="default">
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Ticket de Suporte
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupportDashboard;
