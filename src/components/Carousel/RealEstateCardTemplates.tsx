import React from 'react';
import { MapPin, BedDouble, Ruler, Car, Bath, Phone, Home, Key, Building2, Banknote, CheckCircle } from 'lucide-react';

export interface PropertyCardData {
  photo: string;
  title: string;
  type: string;
  mode: 'sale' | 'rent';
  price: string;
  area: string;
  bedrooms: string;
  suites: string;
  bathrooms: string;
  parking: string;
  location: string;
  neighborhood: string;
  highlights: string;
}

interface TemplateProps {
  card: {
    type: 'cover' | 'content' | 'cta';
    title?: string;
    subtitle?: string;
    body?: string;
    bodyTop?: string;
    bodyBottom?: string;
    imageUrl?: string;
  };
  property: PropertyCardData;
  w: number;
  h: number;
  s: number;
  accentColor: string;
  bgColor: string;
  fontFamily: string;
  sansFamily: string;
  logoUrl?: string;
  logoPosition: string;
  brandName: string;
  userName: string;
  isExport?: boolean;
  cardIndex: number;
  totalCards: number;
  templateVariant?: number;
}

const TYPE_LABELS: Record<string, string> = {
  apartment: 'Apartamento', house: 'Casa', commercial: 'Comercial',
  land: 'Terreno', studio: 'Studio', penthouse: 'Cobertura', farm: 'Chácara/Sítio',
};
const MODE_LABELS = { sale: 'Venda', rent: 'Aluguel' };

const formatPrice = (price: string) => {
  if (!price) return '';
  const num = parseFloat(price.replace(/[^\d.,]/g, '').replace(',', '.'));
  if (isNaN(num)) return price;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
};

const contrastText = (hex: string): string => {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#fff';
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) > 0.45 ? '#111' : '#fff';
};

const RenderLogo: React.FC<{ logoUrl?: string; logoPosition: string; s: number }> = ({ logoUrl, logoPosition, s }) => {
  if (!logoUrl) return null;
  const size = 48 * s;
  const margin = 16 * s;
  const posStyle: React.CSSProperties = {
    position: 'absolute', width: size, height: size, objectFit: 'contain', zIndex: 20,
    ...(logoPosition.includes('top') ? { top: margin } : logoPosition.includes('bottom') ? { bottom: margin } : { top: '50%', marginTop: -(size / 2) }),
    ...(logoPosition.includes('left') ? { left: margin } : logoPosition.includes('right') ? { right: margin } : { left: '50%', marginLeft: -(size / 2) }),
  };
  return <img src={logoUrl} alt="" style={posStyle} />;
};

// ─────────────────────────────────────────────────────────
// COVER — Based on user's SVG/mockup:
// PHOTO = full background (full-bleed)
// Bottom-right: white rounded "Informações" card with icon squares + spec text
// Bottom-left: white rounded price card
// ─────────────────────────────────────────────────────────
const CoverTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, bgColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, isExport }) => {
  const ctxt = contrastText(accentColor);

  // Build specs list matching mockup layout (5 rows)
  const specs = [
    property.bathrooms && { icon: Bath, text: `${property.bathrooms} Banheiros` },
    property.bedrooms && { icon: BedDouble, text: `${property.bedrooms} Quartos` },
    property.parking && { icon: Car, text: `${property.parking} Vagas` },
    property.area && { icon: Ruler, text: `${property.area}m²` },
    property.highlights ? { icon: CheckCircle, text: property.highlights.split(',')[0]?.trim() || 'Financiável' } : null,
  ].filter(Boolean) as { icon: React.ElementType; text: string }[];

  return (
    <div style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      backgroundColor: '#333', fontFamily: sansFamily,
    }}>
      {/* ─── PHOTO = FULL BACKGROUND ─── */}
      {property.photo ? (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #555 0%, #333 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building2 style={{ width: 64 * s, height: 64 * s, color: 'rgba(255,255,255,0.1)' }} />
        </div>
      )}

      {/* Subtle gradient at bottom for readability */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.4) 100%)' }} />

      {/* ─── Bottom-right: Informações card (white rounded rect) ─── */}
      {specs.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 60 * s,
          right: 24 * s,
          width: 0.44 * w,
          borderRadius: 25 * s,
          backgroundColor: 'rgba(255,255,255,0.94)',
          backdropFilter: 'blur(16px)',
          padding: `${22 * s}px ${26 * s}px ${26 * s}px`,
          zIndex: 10,
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        }}>
          {/* Header */}
          <p style={{
            fontSize: 16 * s, fontWeight: 800, color: accentColor,
            textAlign: 'center', marginBottom: 18 * s,
            textTransform: 'uppercase', letterSpacing: 2 * s,
          }}>
            Informações
          </p>
          {/* Spec rows with icon squares */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 * s }}>
            {specs.map((spec, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 * s }}>
                <div style={{
                  width: 44 * s, height: 44 * s, borderRadius: 10 * s,
                  backgroundColor: accentColor, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <spec.icon style={{ width: 22 * s, height: 22 * s, color: ctxt }} />
                </div>
                <span style={{ fontSize: 20 * s, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>
                  {spec.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Bottom-left: Price card (white rounded rect) ─── */}
      <div style={{
        position: 'absolute',
        bottom: 60 * s,
        left: 24 * s,
        borderRadius: 25 * s,
        backgroundColor: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        padding: `${20 * s}px ${32 * s}px`,
        zIndex: 10,
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
      }}>
        <p style={{
          fontSize: 14 * s, fontWeight: 700, color: '#555',
          textTransform: 'uppercase', letterSpacing: 1.5 * s, marginBottom: 6 * s,
          textAlign: 'center',
        }}>
          {property.mode === 'rent' ? 'Valor de aluguel' : 'Valor de venda'}
        </p>
        <p style={{
          fontFamily, fontSize: 32 * s, fontWeight: 900, color: '#111', textAlign: 'center',
        }}>
          {formatPrice(property.price) || 'R$ 250.000,00'}
        </p>
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CONTENT — Full photo bg + overlay info
// ─────────────────────────────────────────────────────────
const ContentTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, isExport, cardIndex }) => {
  const ctxt = contrastText(accentColor);
  const variant = cardIndex % 2;

  // Variant 0: Full photo with bottom gradient + specs row
  if (variant === 0) {
    const specs = [
      property.area && { icon: Ruler, text: `${property.area}m²` },
      property.bedrooms && { icon: BedDouble, text: `${property.bedrooms} Qts` },
      property.bathrooms && { icon: Bath, text: `${property.bathrooms} Ban` },
      property.parking && { icon: Car, text: `${property.parking} Vg` },
    ].filter(Boolean) as { icon: React.ElementType; text: string }[];

    return (
      <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#333', fontFamily: sansFamily }}>
        {/* Full photo bg */}
        {property.photo && (
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.65) 72%, rgba(0,0,0,0.95) 100%)' }} />

        {/* Top badge */}
        <div style={{ position: 'absolute', top: 20 * s, left: 20 * s, zIndex: 10 }}>
          <div style={{ padding: `${6 * s}px ${14 * s}px`, borderRadius: 20 * s, backgroundColor: 'rgba(255,255,255,0.9)' }}>
            <span style={{ fontSize: 11 * s, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: 2 * s }}>
              {MODE_LABELS[property.mode] || 'Venda'}
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${28 * s}px ${24 * s}px`, zIndex: 10 }}>
          {property.price && (
            <p style={{ fontSize: 32 * s, fontWeight: 900, color: '#fff', marginBottom: 6 * s }}>
              {formatPrice(property.price)}
              {property.mode === 'rent' && <span style={{ fontSize: 14 * s, opacity: 0.7 }}> /mês</span>}
            </p>
          )}
          <h2 style={{ fontFamily, fontSize: 24 * s, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 12 * s }}>
            {card.bodyTop || card.title || property.title || property.neighborhood || 'Imóvel Exclusivo'}
          </h2>
          {(property.location || property.neighborhood) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, marginBottom: 14 * s }}>
              <MapPin style={{ width: 13 * s, height: 13 * s, color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: 13 * s, color: 'rgba(255,255,255,0.5)' }}>
                {[property.neighborhood, property.location].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          {/* Specs as icon squares row */}
          <div style={{ display: 'flex', gap: 10 * s, flexWrap: 'wrap' }}>
            {specs.map((spec, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 * s }}>
                <div style={{
                  width: 30 * s, height: 30 * s, borderRadius: 6 * s,
                  backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <spec.icon style={{ width: 15 * s, height: 15 * s, color: ctxt }} />
                </div>
                <span style={{ fontSize: 13 * s, fontWeight: 600, color: '#fff' }}>{spec.text}</span>
              </div>
            ))}
          </div>
        </div>
        <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
      </div>
    );
  }

  // Variant 1: Full photo bg + white info card overlay (matching cover style)
  const specsList = [
    { icon: Ruler, label: 'Área', value: property.area ? `${property.area}m²` : '' },
    { icon: BedDouble, label: 'Quartos', value: property.bedrooms },
    { icon: Bath, label: 'Banheiros', value: property.bathrooms },
    { icon: Car, label: 'Vagas', value: property.parking },
  ].filter(sp => sp.value);

  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#333', fontFamily: sansFamily }}>
      {/* Full photo bg */}
      {property.photo && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.5) 100%)' }} />

      {/* White overlay card at bottom */}
      <div style={{
        position: 'absolute', bottom: 24 * s, left: 24 * s, right: 24 * s,
        borderRadius: 25 * s, backgroundColor: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(12px)', padding: `${22 * s}px ${24 * s}px`,
        zIndex: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      }}>
        {/* Title */}
        <h2 style={{ fontFamily, fontSize: 22 * s, fontWeight: 800, color: '#111', lineHeight: 1.15, marginBottom: 12 * s }}>
          {card.bodyTop || card.title || property.title || 'Detalhes do Imóvel'}
        </h2>

        {/* Specs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 * s, marginBottom: 14 * s }}>
          {specsList.map((spec, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 * s }}>
              <div style={{
                width: 32 * s, height: 32 * s, borderRadius: 8 * s,
                backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <spec.icon style={{ width: 16 * s, height: 16 * s, color: ctxt }} />
              </div>
              <div>
                <p style={{ fontSize: 9 * s, color: '#888', textTransform: 'uppercase', letterSpacing: 1 * s }}>{spec.label}</p>
                <p style={{ fontSize: 18 * s, fontWeight: 800, color: '#111' }}>{spec.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Price */}
        {property.price && (
          <div style={{ paddingTop: 10 * s, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <p style={{ fontSize: 10 * s, color: '#888', textTransform: 'uppercase', letterSpacing: 1.5 * s, marginBottom: 2 * s }}>
              {property.mode === 'rent' ? 'Aluguel mensal' : 'Investimento'}
            </p>
            <p style={{ fontFamily, fontSize: 26 * s, fontWeight: 900, color: accentColor }}>{formatPrice(property.price)}</p>
          </div>
        )}
      </div>
      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CTA — Full photo bg + centered white CTA card
// ─────────────────────────────────────────────────────────
const CTATemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, userName, isExport }) => {
  const ctxt = contrastText(accentColor);
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#333', fontFamily: sansFamily }}>
      {/* Full photo bg (blurred) */}
      {property.photo && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(8px) brightness(0.35)', transform: 'scale(1.08)' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}

      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', textAlign: 'center',
        padding: `${36 * s}px ${32 * s}px`, zIndex: 5, gap: 16 * s,
      }}>
        {/* White CTA card */}
        <div style={{
          backgroundColor: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
          borderRadius: 30 * s, padding: `${32 * s}px ${36 * s}px`,
          boxShadow: '0 12px 48px rgba(0,0,0,0.3)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 * s,
        }}>
          <h2 style={{ fontFamily, fontSize: 30 * s, fontWeight: 900, color: '#111', lineHeight: 1.1, textTransform: 'uppercase' }}>
            {card.title || 'Agende sua visita'}
          </h2>

          {card.body && (
            <p style={{ fontSize: 14 * s, color: '#666', lineHeight: 1.5, maxWidth: 500 * s }}>{card.body}</p>
          )}

          <div style={{
            marginTop: 4 * s, padding: `${14 * s}px ${40 * s}px`,
            backgroundColor: accentColor, borderRadius: 12 * s,
            display: 'inline-flex', alignItems: 'center', gap: 10 * s,
            boxShadow: `0 6px 24px ${accentColor}44`,
          }}>
            <Phone style={{ width: 18 * s, height: 18 * s, color: ctxt }} />
            <span style={{ fontSize: 16 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
              Fale Conosco
            </span>
          </div>
        </div>

        {(userName || brandName) && (
          <div style={{ marginTop: 8 * s }}>
            {userName && <p style={{ fontSize: 14 * s, color: 'rgba(255,255,255,0.4)' }}>@{userName}</p>}
            {brandName && <p style={{ fontSize: 12 * s, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 3 * s, fontWeight: 700, marginTop: 4 * s }}>{brandName}</p>}
          </div>
        )}
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─── MAIN RENDERER ───
export const renderRealEstateCard = (props: TemplateProps): React.ReactNode => {
  const { card } = props;
  if (card.type === 'cover') return <CoverTemplate {...props} />;
  if (card.type === 'cta') return <CTATemplate {...props} />;
  return <ContentTemplate {...props} />;
};

export default renderRealEstateCard;
