import React from 'react';
import { ExternalLink, Code, Send, Image, CheckCircle, Shield, Zap, AlertTriangle, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';
const API_ENDPOINT = `${SUPABASE_URL}/functions/v1/whatsapp-public-api`;

const DocsApiCrm: React.FC = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code }) => (
    <div className="relative group">
      <pre className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">{code}</pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-white hover:bg-zinc-700"
        onClick={() => copyToClipboard(code)}
      >
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Code className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Ellosuit WhatsApp API</h1>
              <p className="text-xs text-muted-foreground">Documentação para desenvolvedores</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">v1.0</Badge>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        {/* Introduction */}
        <section>
          <h2 className="text-2xl font-bold mb-3">Introdução</h2>
          <p className="text-muted-foreground leading-relaxed">
            A API pública da Ellosuit permite que sistemas externos enviem mensagens WhatsApp através de sessões conectadas.
            Autentique-se com uma <strong>API Key</strong> gerada no painel e faça chamadas HTTP simples.
          </p>
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm font-medium mb-1">Base URL</p>
            <code className="text-sm text-primary font-mono">{API_ENDPOINT}</code>
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 inline-flex" onClick={() => copyToClipboard(API_ENDPOINT)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        </section>

        {/* Authentication */}
        <section>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Shield className="h-5 w-5" /> Autenticação
          </h2>
          <p className="text-muted-foreground mb-4">
            Todas as requisições devem incluir o header <code className="bg-muted px-1.5 py-0.5 rounded text-sm">X-API-Key</code> com sua chave de API.
          </p>
          <CodeBlock code={`POST ${API_ENDPOINT}
Content-Type: application/json
X-API-Key: ek_sua_chave_aqui`} />
        </section>

        {/* Rate Limiting */}
        <section>
          <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <Zap className="h-5 w-5" /> Rate Limiting
          </h2>
          <p className="text-muted-foreground mb-3">
            Cada API Key possui um limite de requisições por minuto (padrão: 30). Se excedido, a API retorna status <code className="bg-muted px-1.5 py-0.5 rounded text-sm">429</code>.
          </p>
          <CodeBlock code={`{
  "error": "Rate limit exceeded",
  "limit": 30,
  "retry_after_seconds": 60
}`} />
        </section>

        {/* Endpoints */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Endpoints</h2>

          {/* send_text */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="h-4 w-4 text-primary" />
                send_text
                <Badge variant="default" className="ml-2">POST</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Envia uma mensagem de texto para um número WhatsApp.</p>

              <div>
                <h4 className="text-sm font-semibold mb-2">Parâmetros</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Campo</th>
                        <th className="px-4 py-2 text-left font-medium">Tipo</th>
                        <th className="px-4 py-2 text-left font-medium">Obrigatório</th>
                        <th className="px-4 py-2 text-left font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">action</td>
                        <td className="px-4 py-2">string</td>
                        <td className="px-4 py-2"><CheckCircle className="h-4 w-4 text-green-500" /></td>
                        <td className="px-4 py-2 text-muted-foreground">Sempre "send_text"</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">phone</td>
                        <td className="px-4 py-2">string</td>
                        <td className="px-4 py-2"><CheckCircle className="h-4 w-4 text-green-500" /></td>
                        <td className="px-4 py-2 text-muted-foreground">Número com DDI (ex: 5511999999999)</td>
                      </tr>
                      <tr className="border-t">
                        <td className="px-4 py-2 font-mono text-xs">message</td>
                        <td className="px-4 py-2">string</td>
                        <td className="px-4 py-2"><CheckCircle className="h-4 w-4 text-green-500" /></td>
                        <td className="px-4 py-2 text-muted-foreground">Conteúdo da mensagem</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Exemplo</h4>
                <Tabs defaultValue="curl">
                  <TabsList className="h-8">
                    <TabsTrigger value="curl" className="text-xs">cURL</TabsTrigger>
                    <TabsTrigger value="js" className="text-xs">JavaScript</TabsTrigger>
                    <TabsTrigger value="py" className="text-xs">Python</TabsTrigger>
                  </TabsList>
                  <TabsContent value="curl">
                    <CodeBlock code={`curl -X POST "${API_ENDPOINT}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ek_sua_chave" \\
  -d '{
    "action": "send_text",
    "phone": "5511999999999",
    "message": "Sua compra foi aprovada!"
  }'`} />
                  </TabsContent>
                  <TabsContent value="js">
                    <CodeBlock code={`const res = await fetch("${API_ENDPOINT}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "ek_sua_chave",
  },
  body: JSON.stringify({
    action: "send_text",
    phone: "5511999999999",
    message: "Sua compra foi aprovada!",
  }),
});
const data = await res.json();`} />
                  </TabsContent>
                  <TabsContent value="py">
                    <CodeBlock code={`import requests

res = requests.post(
    "${API_ENDPOINT}",
    headers={"Content-Type": "application/json", "X-API-Key": "ek_sua_chave"},
    json={"action": "send_text", "phone": "5511999999999", "message": "Sua compra foi aprovada!"},
)
print(res.json())`} />
                  </TabsContent>
                </Tabs>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Resposta de sucesso</h4>
                <CodeBlock code={`{
  "success": true,
  "message_id": "BAE5F2..."
}`} />
              </div>
            </CardContent>
          </Card>

          {/* send_media */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Image className="h-4 w-4 text-primary" />
                send_media
                <Badge variant="default" className="ml-2">POST</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Envia imagem, vídeo ou documento.</p>

              <div>
                <h4 className="text-sm font-semibold mb-2">Parâmetros</h4>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Campo</th>
                        <th className="px-4 py-2 text-left font-medium">Tipo</th>
                        <th className="px-4 py-2 text-left font-medium">Obrigatório</th>
                        <th className="px-4 py-2 text-left font-medium">Descrição</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">action</td><td className="px-4 py-2">string</td><td className="px-4 py-2"><CheckCircle className="h-4 w-4 text-green-500" /></td><td className="px-4 py-2 text-muted-foreground">Sempre "send_media"</td></tr>
                      <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">phone</td><td className="px-4 py-2">string</td><td className="px-4 py-2"><CheckCircle className="h-4 w-4 text-green-500" /></td><td className="px-4 py-2 text-muted-foreground">Número com DDI</td></tr>
                      <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">media_url</td><td className="px-4 py-2">string</td><td className="px-4 py-2"><CheckCircle className="h-4 w-4 text-green-500" /></td><td className="px-4 py-2 text-muted-foreground">URL pública do arquivo</td></tr>
                      <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">caption</td><td className="px-4 py-2">string</td><td className="px-4 py-2">-</td><td className="px-4 py-2 text-muted-foreground">Legenda da mídia</td></tr>
                      <tr className="border-t"><td className="px-4 py-2 font-mono text-xs">media_type</td><td className="px-4 py-2">string</td><td className="px-4 py-2">-</td><td className="px-4 py-2 text-muted-foreground">image, video, document (padrão: image)</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2">Exemplo</h4>
                <CodeBlock code={`{
  "action": "send_media",
  "phone": "5511999999999",
  "media_url": "https://exemplo.com/comprovante.pdf",
  "caption": "Segue seu comprovante",
  "media_type": "document"
}`} />
              </div>
            </CardContent>
          </Card>

          {/* check_status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-4 w-4 text-primary" />
                check_status
                <Badge variant="default" className="ml-2">POST</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Verifica se a sessão WhatsApp vinculada à API Key está conectada.</p>
              <div>
                <h4 className="text-sm font-semibold mb-2">Exemplo</h4>
                <CodeBlock code={`{
  "action": "check_status"
}`} />
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Resposta</h4>
                <CodeBlock code={`{
  "success": true,
  "status": "connected",
  "is_connected": true,
  "phone_number": "5511999999999"
}`} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Error Codes */}
        <section>
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Códigos de Erro
          </h2>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-4 py-2 text-left font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t"><td className="px-4 py-2 font-mono">400</td><td className="px-4 py-2 text-muted-foreground">Parâmetros inválidos ou ação desconhecida</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-mono">401</td><td className="px-4 py-2 text-muted-foreground">API Key inválida ou inativa</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-mono">429</td><td className="px-4 py-2 text-muted-foreground">Rate limit excedido</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-mono">502</td><td className="px-4 py-2 text-muted-foreground">Erro na comunicação com servidor WhatsApp</td></tr>
                <tr className="border-t"><td className="px-4 py-2 font-mono">503</td><td className="px-4 py-2 text-muted-foreground">Sessão WhatsApp desconectada ou servidor não configurado</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center py-8 border-t">
          <p className="text-sm text-muted-foreground">
            Ellosuit WhatsApp API — Documentação v1.0
          </p>
        </footer>
      </main>
    </div>
  );
};

export default DocsApiCrm;
