import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Braces, Search, User, Building2, Phone, Mail, MapPin, Tag, Calendar, Globe, Copy, ChevronDown } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface Variable {
  key: string;
  label: string;
  example: string;
}

interface VariableCategory {
  name: string;
  icon: React.ReactNode;
  variables: Variable[];
}

const VARIABLE_CATEGORIES: VariableCategory[] = [
  {
    name: 'Dados Pessoais',
    icon: <User className="h-4 w-4" />,
    variables: [
      { key: 'nome_cliente', label: 'Nome Completo', example: 'João Silva' },
      { key: 'primeiro_nome', label: 'Primeiro Nome', example: 'João' },
      { key: 'email_cliente', label: 'E-mail', example: 'joao@email.com' },
      { key: 'telefone_cliente', label: 'Telefone', example: '(11) 99999-9999' },
      { key: 'whatsapp_cliente', label: 'WhatsApp', example: '(11) 99999-9999' },
      { key: 'cpf_cnpj', label: 'CPF/CNPJ', example: '123.456.789-00' },
      { key: 'data_nascimento', label: 'Data de Nascimento', example: '15/03/1990' },
      { key: 'profissao', label: 'Profissão', example: 'Engenheiro' },
    ],
  },
  {
    name: 'Empresa',
    icon: <Building2 className="h-4 w-4" />,
    variables: [
      { key: 'empresa_cliente', label: 'Nome da Empresa', example: 'Tech Corp' },
      { key: 'setor_empresa', label: 'Setor/Indústria', example: 'Tecnologia' },
      { key: 'porte_empresa', label: 'Porte', example: 'Médio' },
      { key: 'website_cliente', label: 'Website', example: 'www.techcorp.com' },
    ],
  },
  {
    name: 'Endereço',
    icon: <MapPin className="h-4 w-4" />,
    variables: [
      { key: 'rua_cliente', label: 'Rua', example: 'Rua das Flores' },
      { key: 'numero_cliente', label: 'Número', example: '123' },
      { key: 'cidade_cliente', label: 'Cidade', example: 'São Paulo' },
      { key: 'estado_cliente', label: 'Estado', example: 'SP' },
      { key: 'cep_cliente', label: 'CEP', example: '01234-567' },
    ],
  },
  {
    name: 'Redes Sociais',
    icon: <Globe className="h-4 w-4" />,
    variables: [
      { key: 'linkedin_cliente', label: 'LinkedIn', example: 'linkedin.com/in/joao' },
      { key: 'instagram_cliente', label: 'Instagram', example: '@joaosilva' },
      { key: 'facebook_cliente', label: 'Facebook', example: 'fb.com/joaosilva' },
    ],
  },
  {
    name: 'Outros',
    icon: <Tag className="h-4 w-4" />,
    variables: [
      { key: 'status_cliente', label: 'Status', example: 'Ativo' },
      { key: 'tags_cliente', label: 'Tags', example: 'VIP, Premium' },
      { key: 'notas_cliente', label: 'Observações', example: 'Cliente preferencial' },
      { key: 'data_cadastro', label: 'Data de Cadastro', example: '01/01/2025' },
    ],
  },
];

interface DynamicVariablesProps {
  onInsertVariable: (variable: string) => void;
}

export const DynamicVariables: React.FC<DynamicVariablesProps> = ({ onInsertVariable }) => {
  const [search, setSearch] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({ 'Dados Pessoais': true });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const filteredCategories = VARIABLE_CATEGORIES.map(cat => ({
    ...cat,
    variables: cat.variables.filter(
      v => v.label.toLowerCase().includes(search.toLowerCase()) || v.key.includes(search.toLowerCase())
    ),
  })).filter(cat => cat.variables.length > 0);

  const handleInsert = (key: string) => {
    onInsertVariable(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const toggleCategory = (name: string) => {
    setOpenCategories(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2 border-dashed border-orange-300 text-orange-600 hover:bg-orange-50 hover:text-orange-700">
          <Braces className="h-4 w-4" />
          Inserir Campo Dinâmico
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="left">
        <div className="p-3 border-b">
          <p className="text-sm font-semibold mb-1">Campos Dinâmicos</p>
          <p className="text-xs text-muted-foreground mb-2">
            Clique para inserir no texto. Serão substituídos pelos dados reais do cliente.
          </p>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar campo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[320px]">
          <div className="p-2 space-y-1">
            {filteredCategories.map(category => (
              <Collapsible
                key={category.name}
                open={openCategories[category.name] ?? false}
                onOpenChange={() => toggleCategory(category.name)}
              >
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm font-medium">
                  {category.icon}
                  <span className="flex-1 text-left">{category.name}</span>
                  <span className="text-xs text-muted-foreground mr-1">{category.variables.length}</span>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${openCategories[category.name] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="ml-2 mt-1 space-y-0.5">
                    {category.variables.map(variable => (
                      <button
                        key={variable.key}
                        onClick={() => handleInsert(variable.key)}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-orange-50 text-left group transition-colors"
                      >
                        <code className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-mono whitespace-nowrap">
                          {`{{${variable.key}}}`}
                        </code>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{variable.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">Ex: {variable.example}</p>
                        </div>
                        {copiedKey === variable.key ? (
                          <span className="text-[10px] text-green-600 font-medium">Inserido!</span>
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ))}
            {filteredCategories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhum campo encontrado</p>
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t bg-muted/30">
          <p className="text-[10px] text-muted-foreground text-center">
            💡 Use <code className="bg-muted px-1 rounded">{'{{nome_campo}}'}</code> diretamente no texto
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
