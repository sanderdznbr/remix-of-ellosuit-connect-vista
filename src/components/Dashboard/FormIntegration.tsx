import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code2, Copy, Plus, Trash2, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';

interface FormToken {
  id: string;
  name: string;
  token: string;
  contact_type: string;
  is_active: boolean;
  created_at: string;
}

const SUPABASE_URL = 'https://jwddiyuezqrpuakazvgg.supabase.co';

const FormIntegration: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<FormToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showCodeDialog, setShowCodeDialog] = useState<FormToken | null>(null);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('prospecto');
  const [copied, setCopied] = useState(false);

  const fetchTokens = async () => {
    if (!user) return;
    try {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!companyUser) return;

      const { data, error } = await supabase
        .from('form_integration_tokens')
        .select('*')
        .eq('company_id', companyUser.company_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTokens(data || []);
    } catch (e) {
      console.error('Error fetching tokens:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTokens(); }, [user]);

  const handleCreate = async () => {
    if (!user || !newName.trim()) return;
    try {
      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user.id)
        .single();
      if (!companyUser) return;

      const { error } = await supabase.from('form_integration_tokens').insert({
        name: newName.trim(),
        contact_type: newType,
        company_id: companyUser.company_id,
        created_by: user.id,
      });
      if (error) throw error;
      toast({ title: 'Formulário criado' });
      setNewName('');
      setShowCreateDialog(false);
      fetchTokens();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este formulário?')) return;
    await supabase.from('form_integration_tokens').delete().eq('id', id);
    toast({ title: 'Formulário excluído' });
    fetchTokens();
  };

  const toggleActive = async (token: FormToken) => {
    await supabase.from('form_integration_tokens').update({ is_active: !token.is_active }).eq('id', token.id);
    fetchTokens();
  };

  const generateEmbedCode = (token: FormToken) => {
    return `<!-- ElloSuit Form Integration -->
<form id="ellosuit-form" onsubmit="return submitEllosuit(event)">
  <div style="max-width:400px;margin:0 auto;font-family:sans-serif;">
    <h3 style="margin-bottom:16px;">Cadastro</h3>
    <div style="margin-bottom:12px;">
      <label style="display:block;margin-bottom:4px;font-size:14px;">Nome *</label>
      <input name="name" required style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
    </div>
    <div style="margin-bottom:12px;">
      <label style="display:block;margin-bottom:4px;font-size:14px;">Email</label>
      <input name="email" type="email" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
    </div>
    <div style="margin-bottom:12px;">
      <label style="display:block;margin-bottom:4px;font-size:14px;">Telefone</label>
      <input name="phone" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
    </div>
    <div style="margin-bottom:12px;">
      <label style="display:block;margin-bottom:4px;font-size:14px;">Empresa</label>
      <input name="company_name" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;" />
    </div>
    <div style="margin-bottom:16px;">
      <label style="display:block;margin-bottom:4px;font-size:14px;">Observações</label>
      <textarea name="notes" rows="3" style="width:100%;padding:8px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;"></textarea>
    </div>
    <button type="submit" style="width:100%;padding:10px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:14px;cursor:pointer;">
      Enviar
    </button>
    <p id="ellosuit-msg" style="margin-top:12px;text-align:center;font-size:13px;"></p>
  </div>
</form>
<script>
async function submitEllosuit(e) {
  e.preventDefault();
  var f = e.target;
  var msg = document.getElementById('ellosuit-msg');
  msg.textContent = 'Enviando...';
  msg.style.color = '#666';
  try {
    var res = await fetch('${SUPABASE_URL}/functions/v1/form-capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: '${token.token}',
        name: f.name.value,
        email: f.email.value || null,
        phone: f.phone.value || null,
        company_name: f.company_name.value || null,
        notes: f.notes.value || null
      })
    });
    var data = await res.json();
    if (res.ok) {
      msg.textContent = 'Cadastro enviado com sucesso!';
      msg.style.color = 'green';
      f.reset();
    } else {
      msg.textContent = data.error || 'Erro ao enviar';
      msg.style.color = 'red';
    }
  } catch(err) {
    msg.textContent = 'Erro de conexão';
    msg.style.color = 'red';
  }
  return false;
}
</script>`;
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: 'Código copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-emerald-50">
            <Code2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Formulários de Captação</h2>
            <p className="text-sm text-muted-foreground">Gere códigos embed para captar contatos externos</p>
          </div>
        </div>
        <Button className="rounded-xl" onClick={() => { setNewName(''); setNewType('prospecto'); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Formulário
        </Button>
      </div>

      {tokens.length === 0 ? (
        <Card className="border-none shadow-lg rounded-2xl">
          <CardContent className="py-12 text-center">
            <Code2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum formulário criado</h3>
            <p className="text-muted-foreground mb-4">Crie um formulário para receber contatos via HTML externo</p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" /> Criar Formulário
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tokens.map(t => (
            <Card key={t.id} className="border-none shadow-lg rounded-2xl">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{t.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tipo: <Badge variant="secondary" className="rounded-full text-xs">{t.contact_type}</Badge>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant={t.is_active ? 'default' : 'secondary'} className="rounded-full cursor-pointer" onClick={() => toggleActive(t)}>
                      {t.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setShowCodeDialog(t)}>
                    <Code2 className="h-3.5 w-3.5 mr-1.5" /> Ver Código
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleCopy(generateEmbedCode(t))}>
                    <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar
                  </Button>
                  <Button size="sm" variant="ghost" className="rounded-xl text-destructive" onClick={() => handleDelete(t.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Criado em {new Date(t.created_at).toLocaleDateString('pt-BR')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Novo Formulário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome do formulário" value={newName} onChange={e => setNewName(e.target.value)} />
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="prospecto">Prospecto</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
                <SelectItem value="fornecedor">Fornecedor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Preview Dialog */}
      <Dialog open={!!showCodeDialog} onOpenChange={() => setShowCodeDialog(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Código Embed - {showCodeDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Copie e cole este código HTML em qualquer página web. Os dados enviados serão salvos automaticamente na sua conta ElloSuit.
            </p>
            <div className="relative">
              <pre className="bg-muted rounded-xl p-4 text-xs overflow-auto max-h-96 font-mono">
                {showCodeDialog && generateEmbedCode(showCodeDialog)}
              </pre>
              <Button
                size="sm"
                className="absolute top-2 right-2 rounded-lg"
                onClick={() => showCodeDialog && handleCopy(generateEmbedCode(showCodeDialog))}
              >
                {copied ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FormIntegration;
