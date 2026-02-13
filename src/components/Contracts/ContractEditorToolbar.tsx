import React from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered,
} from 'lucide-react';

interface Props {
  execCmd: (cmd: string, value?: string) => void;
}

const ContractEditorToolbar: React.FC<Props> = ({ execCmd }) => (
  <div className="h-10 bg-background border-b flex items-center gap-1 px-4 flex-shrink-0">
    <button onClick={() => execCmd('bold')} className="p-1.5 rounded-lg hover:bg-muted" title="Negrito"><Bold className="h-4 w-4" /></button>
    <button onClick={() => execCmd('italic')} className="p-1.5 rounded-lg hover:bg-muted" title="Itálico"><Italic className="h-4 w-4" /></button>
    <button onClick={() => execCmd('underline')} className="p-1.5 rounded-lg hover:bg-muted" title="Sublinhado"><Underline className="h-4 w-4" /></button>
    <div className="w-px h-5 bg-border mx-1" />
    <button onClick={() => execCmd('justifyLeft')} className="p-1.5 rounded-lg hover:bg-muted"><AlignLeft className="h-4 w-4" /></button>
    <button onClick={() => execCmd('justifyCenter')} className="p-1.5 rounded-lg hover:bg-muted"><AlignCenter className="h-4 w-4" /></button>
    <button onClick={() => execCmd('justifyRight')} className="p-1.5 rounded-lg hover:bg-muted"><AlignRight className="h-4 w-4" /></button>
    <div className="w-px h-5 bg-border mx-1" />
    <button onClick={() => execCmd('insertUnorderedList')} className="p-1.5 rounded-lg hover:bg-muted"><List className="h-4 w-4" /></button>
    <button onClick={() => execCmd('insertOrderedList')} className="p-1.5 rounded-lg hover:bg-muted"><ListOrdered className="h-4 w-4" /></button>
    <div className="w-px h-5 bg-border mx-1" />
    <select onChange={e => execCmd('fontSize', e.target.value)} className="text-xs border rounded-lg px-2 py-1 bg-background" defaultValue="3">
      <option value="1">Pequeno</option>
      <option value="3">Normal</option>
      <option value="5">Grande</option>
      <option value="7">Muito Grande</option>
    </select>
  </div>
);

export default ContractEditorToolbar;
