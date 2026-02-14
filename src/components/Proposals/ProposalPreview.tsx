
import { format } from 'date-fns';

interface ProposalItem {
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface PreviewProps {
  companyName: string;
  title: string;
  client: { name: string; company_name?: string; email?: string; phone?: string } | null;
  items: ProposalItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  notes: string;
  customTerms: string;
  validUntil: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  showHeader: boolean;
  showFooter: boolean;
  logoUrl?: string;
}

export default function ProposalPreview({
  companyName, title, client, items, subtotal, discountAmount, total,
  notes, customTerms, validUntil, primaryColor, secondaryColor, fontFamily,
  showHeader, showFooter, logoUrl,
}: PreviewProps) {

  const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const today = format(new Date(), 'dd/MM/yyyy');

  return (
    <div className="bg-white shadow-xl rounded-xl overflow-hidden text-[11px] leading-relaxed" style={{ fontFamily, maxWidth: 595 }}>
      {/* Header */}
      {showHeader && (
        <div className="px-8 py-6 flex items-center justify-between" style={{ background: primaryColor }}>
          <div>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-10 object-contain mb-1" />
            ) : (
              <div className="text-white font-bold text-lg tracking-wide">{companyName || 'Sua Empresa'}</div>
            )}
            <div className="text-white/70 text-[10px] mt-0.5 uppercase tracking-widest">Proposta Comercial</div>
          </div>
          <div className="text-right text-white/80 text-[10px] space-y-0.5">
            <div>Data: {today}</div>
            {validUntil && <div>Válida até: {format(new Date(validUntil + 'T12:00:00'), 'dd/MM/yyyy')}</div>}
          </div>
        </div>
      )}

      <div className="px-8 py-6 space-y-5">
        {/* Title */}
        <h2 className="text-base font-bold text-gray-900" style={{ color: primaryColor }}>
          {title || 'Título da Proposta'}
        </h2>

        {/* Client */}
        {client && (
          <div className="rounded-lg p-3" style={{ backgroundColor: secondaryColor + '15' }}>
            <div className="text-[9px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: primaryColor }}>Cliente</div>
            <div className="text-gray-800 font-medium text-xs">{client.name}</div>
            {client.company_name && <div className="text-gray-500 text-[10px]">{client.company_name}</div>}
            <div className="flex gap-4 mt-1 text-gray-500 text-[10px]">
              {client.email && <span>{client.email}</span>}
              {client.phone && <span>{client.phone}</span>}
            </div>
          </div>
        )}

        {/* Items table */}
        {items.length > 0 ? (
          <div>
            <div className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: primaryColor }}>Itens</div>
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ backgroundColor: primaryColor + '10' }}>
                  <th className="text-left text-[9px] font-semibold px-2 py-1.5 text-gray-600 uppercase">Item</th>
                  <th className="text-center text-[9px] font-semibold px-2 py-1.5 text-gray-600 uppercase w-12">Qtd</th>
                  <th className="text-right text-[9px] font-semibold px-2 py-1.5 text-gray-600 uppercase w-20">Valor Un.</th>
                  <th className="text-right text-[9px] font-semibold px-2 py-1.5 text-gray-600 uppercase w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-2 py-2">
                      <div className="font-medium text-gray-800 text-[11px]">{it.name || 'Item sem nome'}</div>
                      {it.description && <div className="text-gray-400 text-[9px] mt-0.5">{it.description}</div>}
                    </td>
                    <td className="text-center text-gray-700 px-2 py-2">{it.quantity}</td>
                    <td className="text-right text-gray-700 px-2 py-2">{fmtBRL(it.unit_price)}</td>
                    <td className="text-right font-medium text-gray-800 px-2 py-2">{fmtBRL(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-3 border-t border-gray-200 pt-3 space-y-1">
              <div className="flex justify-between text-gray-500 text-[10px] px-2">
                <span>Subtotal</span><span>{fmtBRL(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-red-500 text-[10px] px-2">
                  <span>Desconto</span><span>- {fmtBRL(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm px-2 pt-1" style={{ color: primaryColor }}>
                <span>TOTAL</span><span>{fmtBRL(total)}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-300 text-xs italic">
            Adicione itens à proposta para visualizar
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div>
            <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: primaryColor }}>Observações</div>
            <p className="text-gray-600 text-[10px] whitespace-pre-line">{notes}</p>
          </div>
        )}

        {/* Terms */}
        {customTerms && (
          <div>
            <div className="text-[9px] uppercase tracking-wider font-semibold mb-1" style={{ color: primaryColor }}>Termos e Condições</div>
            <p className="text-gray-500 text-[10px] whitespace-pre-line">{customTerms}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {showFooter && (
        <div className="px-8 py-3 text-center text-[8px] text-white" style={{ background: primaryColor }}>
          Gerado por Ellosuit • {companyName}
        </div>
      )}
    </div>
  );
}
