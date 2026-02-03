import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Upload, Send, CheckCircle2, Bug, Zap, HelpCircle, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ReportProblemForm = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    description: '',
    steps: '',
    expected: '',
    screenshot: null as File | null,
  });

  const categories = [
    { value: 'bug', label: 'Bug / Erro', icon: Bug },
    { value: 'performance', label: 'Lentidão', icon: Zap },
    { value: 'feature', label: 'Sugestão', icon: HelpCircle },
    { value: 'other', label: 'Outro', icon: AlertTriangle },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.title || !formData.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    // Simulate submission
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setLoading(false);
    setSubmitted(true);
    
    toast({
      title: 'Problema reportado!',
      description: 'Recebemos seu report e vamos analisar em breve.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, screenshot: file });
    }
  };

  if (submitted) {
    return (
      <div className="page-content p-4 md:p-6 min-h-screen bg-muted/30 flex items-center justify-center">
        <Card className="border-none shadow-lg rounded-2xl bg-card max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Obrigado pelo feedback!</h2>
            <p className="text-muted-foreground mb-6">
              Recebemos seu report e nossa equipe irá analisá-lo em breve. Você receberá atualizações por email.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Número do ticket:</p>
              <p className="font-mono font-bold text-lg">#ELLO-{Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
            </div>
            <Button className="w-full mt-6" onClick={() => setSubmitted(false)}>
              Reportar outro problema
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-content p-4 md:p-6 space-y-6 bg-muted/30 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-7 w-7 text-yellow-500" />
          Reportar Problema
        </h1>
        <p className="text-sm md:text-base text-muted-foreground mt-1">Encontrou um bug ou tem uma sugestão? Conte para nós!</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <Card className="border-none shadow-lg rounded-2xl bg-card lg:col-span-2">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg">Descreva o problema</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Category */}
              <div className="space-y-2">
                <Label>Categoria *</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {categories.map((cat) => (
                    <Button
                      key={cat.value}
                      type="button"
                      variant={formData.category === cat.value ? 'default' : 'outline'}
                      className="h-auto py-3 flex flex-col gap-1"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                    >
                      <cat.icon className="h-5 w-5" />
                      <span className="text-xs">{cat.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Título do problema *</Label>
                <Input
                  placeholder="Ex: Erro ao carregar documentos"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição detalhada *</Label>
                <Textarea
                  placeholder="Descreva o problema com o máximo de detalhes possível..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              {/* Steps to reproduce */}
              <div className="space-y-2">
                <Label>Passos para reproduzir (opcional)</Label>
                <Textarea
                  placeholder="1. Clique em...&#10;2. Navegue até...&#10;3. O erro aparece quando..."
                  value={formData.steps}
                  onChange={(e) => setFormData({ ...formData, steps: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Expected behavior */}
              <div className="space-y-2">
                <Label>O que deveria acontecer? (opcional)</Label>
                <Input
                  placeholder="Descreva o comportamento esperado"
                  value={formData.expected}
                  onChange={(e) => setFormData({ ...formData, expected: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Screenshot */}
              <div className="space-y-2">
                <Label>Screenshot (opcional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label htmlFor="screenshot-upload" className="cursor-pointer">
                    {formData.screenshot ? (
                      <div className="flex items-center justify-center gap-2 text-green-600">
                        <Image className="h-5 w-5" />
                        <span className="text-sm">{formData.screenshot.name}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload className="h-8 w-8" />
                        <span className="text-sm">Clique para enviar uma imagem</span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Report
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tips */}
        <Card className="border-none shadow-lg rounded-2xl bg-card h-fit">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg">Dicas para um bom report</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-3">
                <span className="text-primary font-bold">1.</span>
                <p>Seja específico sobre o que aconteceu e quando.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold">2.</span>
                <p>Inclua os passos exatos para reproduzir o problema.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold">3.</span>
                <p>Screenshots ajudam muito a entender o contexto.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-primary font-bold">4.</span>
                <p>Mencione o navegador e dispositivo que está usando.</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Tempo médio de resposta: <strong>24 horas</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportProblemForm;
