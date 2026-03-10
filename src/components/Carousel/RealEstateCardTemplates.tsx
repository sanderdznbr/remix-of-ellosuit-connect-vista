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

// ─── Spec row with icon ───
const SpecRow: React.FC<{ icon: React.ElementType; text: string; s: number; accentColor: string }> = ({ icon: Icon, text, s, accentColor }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 * s, marginBottom: 0 }}>
    <div style={{
      width: 42 * s, height: 42 * s, borderRadius: 8 * s,
      backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon style={{ width: 22 * s, height: 22 * s, color: contrastText(accentColor) }} />
    </div>
    <span style={{ fontSize: 18 * s, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{text}</span>
  </div>
);

// ─────────────────────────────────────────────────────────
// COVER — Based on SVG template:
// Dark bg (#414141), photo top-right (large rounded rect),
// specs with icon squares on the left, price box bottom-left
// ─────────────────────────────────────────────────────────
const CoverTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, bgColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, isExport }) => {
  const ctxt = contrastText(accentColor);

  // Build specs list matching SVG layout (5 rows)
  const specs = [
    property.bathrooms && { icon: Bath, text: `${property.bathrooms} Banheiros` },
    property.bedrooms && { icon: BedDouble, text: `${property.bedrooms} Quartos` },
    property.parking && { icon: Car, text: `${property.parking} Vagas` },
    property.area && { icon: Ruler, text: `${property.area}m² área total` },
    property.highlights ? { icon: CheckCircle, text: property.highlights.split(',')[0]?.trim() || 'Financiável' } : null,
  ].filter(Boolean) as { icon: React.ElementType; text: string }[];

  // Proportions from SVG: canvas 1080x1350
  // Photo rect: x=591 y=831 w=411 h=402 → right ~55%, top ~61.5%, w~38%, h~29.8%
  // But on cover, photo should be prominent. Let's use the SVG layout proportionally.
  // Specs start at y~911 with 59px spacing, icons at x=651
  // Price box: x=78, y=1098, w=411, h=135

  const photoTop = 0.08;
  const photoRight = 0.05;
  const photoW = 0.52;
  const photoH = 0.42;

  const specsLeft = 0.06;
  const specsTop = 0.12;
  const specsGap = 59; // from SVG y-spacing

  const priceBoxBottom = 0.06;
  const priceBoxLeft = 0.06;

  return (
    <div style={{
      width: w, height: h, position: 'relative', overflow: 'hidden',
      backgroundColor: '#414141', fontFamily: sansFamily,
    }}>
      {/* ─── Photo (top-right, rounded rect) ─── */}
      <div style={{
        position: 'absolute',
        top: photoTop * h,
        right: photoRight * w,
        width: photoW * w,
        height: photoH * h,
        borderRadius: 25 * s,
        overflow: 'hidden',
        backgroundColor: '#D9D9D9',
      }}>
        {property.photo ? (
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #ccc 0%, #eee 100%)' }}>
            <Building2 style={{ width: 48 * s, height: 48 * s, color: 'rgba(0,0,0,0.15)' }} />
          </div>
        )}
      </div>

      {/* ─── Title area (top-left, above specs) ─── */}
      <div style={{
        position: 'absolute',
        top: photoTop * h,
        left: specsLeft * w,
        width: (1 - photoW - photoRight - specsLeft - 0.02) * w,
        zIndex: 5,
      }}>
        <h1 style={{
          fontFamily, fontSize: 32 * s, fontWeight: 900, color: '#fff',
          lineHeight: 1.1, textTransform: 'uppercase', letterSpacing: -0.5 * s,
        }}>
          {card.title || property.title || `${TYPE_LABELS[property.type] || 'Imóvel'} em ${property.neighborhood || property.location || ''}`}
        </h1>
        {(property.location || property.neighborhood) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, marginTop: 8 * s }}>
            <MapPin style={{ width: 14 * s, height: 14 * s, color: accentColor }} />
            <span style={{ fontSize: 14 * s, color: 'rgba(255,255,255,0.6)' }}>
              {[property.neighborhood, property.location].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* ─── Specs list (left side, icon squares + text) ─── */}
      <div style={{
        position: 'absolute',
        left: specsLeft * w,
        top: (specsTop + 0.28) * h,
        display: 'flex', flexDirection: 'column',
        gap: specsGap * s * (h / 1350),
        zIndex: 5,
      }}>
        {specs.map((spec, i) => (
          <SpecRow key={i} icon={spec.icon} text={spec.text} s={s} accentColor={accentColor} />
        ))}
      </div>

      {/* ─── Price box (bottom-left, rounded rect) ─── */}
      <div style={{
        position: 'absolute',
        bottom: priceBoxBottom * h,
        left: priceBoxLeft * w,
        width: 0.38 * w,
        borderRadius: 25 * s,
        backgroundColor: '#D9D9D9',
        padding: `${20 * s}px ${24 * s}px`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 11 * s, fontWeight: 700, color: '#333', textTransform: 'uppercase', letterSpacing: 1.5 * s, marginBottom: 4 * s }}>
          {MODE_LABELS[property.mode] || 'Valor de venda'}
        </span>
        <span style={{ fontFamily, fontSize: 28 * s, fontWeight: 900, color: '#111' }}>
          {formatPrice(property.price) || 'R$ 250.000,00'}
        </span>
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CONTENT — Photo dominant with info overlay
// ─────────────────────────────────────────────────────────
const ContentTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, isExport, cardIndex }) => {
  const ctxt = contrastText(accentColor);
  const variant = cardIndex % 2;

  // Variant 0: Same SVG-inspired layout but with different photo
  if (variant === 0) {
    const specs = [
      property.area && { icon: Ruler, text: `${property.area}m²` },
      property.bedrooms && { icon: BedDouble, text: `${property.bedrooms} Quartos` },
      property.bathrooms && { icon: Bath, text: `${property.bathrooms} Banheiros` },
      property.parking && { icon: Car, text: `${property.parking} Vagas` },
    ].filter(Boolean) as { icon: React.ElementType; text: string }[];

    return (
      <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#414141', fontFamily: sansFamily }}>
        {/* Full photo with gradient */}
        {property.photo && (
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.02) 40%, rgba(0,0,0,0.65) 72%, rgba(0,0,0,0.95) 100%)' }} />

        {/* Top badge */}
        <div style={{ position: 'absolute', top: 20 * s, left: 20 * s, zIndex: 10 }}>
          <div style={{ padding: `${6 * s}px ${14 * s}px`, borderRadius: 6 * s, backgroundColor: accentColor }}>
            <span style={{ fontSize: 11 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
              {MODE_LABELS[property.mode] || 'Venda'}
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${28 * s}px ${24 * s}px`, zIndex: 10 }}>
          {property.price && (
            <p style={{ fontSize: 32 * s, fontWeight: 900, color: accentColor, marginBottom: 6 * s }}>
              {formatPrice(property.price)}
              {property.mode === 'rent' && <span style={{ fontSize: 14 * s, opacity: 0.7, color: '#fff' }}> /mês</span>}
            </p>
          )}
          <h2 style={{ fontFamily, fontSize: 26 * s, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 12 * s, textTransform: 'uppercase' }}>
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
                  width: 32 * s, height: 32 * s, borderRadius: 6 * s,
                  backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <spec.icon style={{ width: 16 * s, height: 16 * s, color: ctxt }} />
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

  // Variant 1: Specs grid (dark bg with faded photo)
  const specsList = [
    { icon: Ruler, label: 'Área Total', value: property.area ? `${property.area}m²` : '' },
    { icon: BedDouble, label: 'Quartos', value: property.bedrooms },
    { icon: Bath, label: 'Banheiros', value: property.bathrooms },
    { icon: Car, label: 'Vagas', value: property.parking },
  ].filter(sp => sp.value);

  const highlightsList = property.highlights
    ? property.highlights.split(',').map(hl => hl.trim()).filter(Boolean).slice(0, 6)
    : [];

  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#414141', fontFamily: sansFamily }}>
      {property.photo && (
        <>
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.08 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(65,65,65,0.92)' }} />
        </>
      )}

      <div style={{ position: 'absolute', inset: 0, padding: `${36 * s}px ${28 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 * s, zIndex: 5 }}>
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * s }}>
          <div style={{ width: 28 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 2 * s }} />
          <span style={{ fontSize: 12 * s, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: 3 * s }}>
            Detalhes do Imóvel
          </span>
        </div>

        {/* Specs grid with icon squares */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 * s }}>
          {specsList.map((spec, i) => (
            <div key={i} style={{
              padding: `${18 * s}px ${16 * s}px`, borderRadius: 14 * s,
              backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', gap: 8 * s,
            }}>
              <div style={{
                width: 36 * s, height: 36 * s, borderRadius: 8 * s,
                backgroundColor: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <spec.icon style={{ width: 18 * s, height: 18 * s, color: contrastText(accentColor) }} />
              </div>
              <p style={{ fontSize: 10 * s, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5 * s }}>{spec.label}</p>
              <p style={{ fontFamily, fontSize: 24 * s, fontWeight: 800, color: '#fff' }}>{spec.value}</p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        {highlightsList.length > 0 && (
          <div>
            <p style={{ fontSize: 10 * s, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 8 * s }}>Destaques</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 * s }}>
              {highlightsList.map((hl, i) => (
                <span key={i} style={{
                  padding: `${5 * s}px ${12 * s}px`, borderRadius: 16 * s,
                  backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}33`,
                  fontSize: 12 * s, color: 'rgba(255,255,255,0.75)', fontWeight: 500,
                }}>{hl}</span>
              ))}
            </div>
          </div>
        )}

        {/* Price footer */}
        {property.price && (
          <div style={{
            marginTop: 'auto', borderRadius: 20 * s,
            backgroundColor: '#D9D9D9', padding: `${16 * s}px ${20 * s}px`,
          }}>
            <p style={{ fontSize: 10 * s, color: '#555', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 4 * s }}>
              {property.mode === 'rent' ? 'Aluguel mensal' : 'Investimento'}
            </p>
            <p style={{ fontFamily, fontSize: 28 * s, fontWeight: 900, color: '#111' }}>{formatPrice(property.price)}</p>
          </div>
        )}
      </div>
      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CTA — Blurred photo bg + centered CTA
// ─────────────────────────────────────────────────────────
const CTATemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, userName, isExport }) => {
  const ctxt = contrastText(accentColor);
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#414141', fontFamily: sansFamily }}>
      {property.photo && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) brightness(0.25) saturate(1.2)', transform: 'scale(1.12)' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${accentColor}20 0%, transparent 60%)` }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `${36 * s}px ${28 * s}px`, zIndex: 5, gap: 16 * s }}>
        <div style={{ width: 40 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 3 * s }} />

        <h2 style={{ fontFamily, fontSize: 36 * s, fontWeight: 900, color: '#fff', lineHeight: 1.08, textTransform: 'uppercase' }}>
          {card.title || 'Agende sua visita'}
        </h2>

        {card.body && (
          <p style={{ fontSize: 15 * s, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, maxWidth: 600 * s }}>{card.body}</p>
        )}

        <div style={{
          marginTop: 8 * s, padding: `${14 * s}px ${40 * s}px`,
          backgroundColor: accentColor, borderRadius: 12 * s,
          display: 'inline-flex', alignItems: 'center', gap: 10 * s,
          boxShadow: `0 6px 24px ${accentColor}44`,
        }}>
          <Phone style={{ width: 18 * s, height: 18 * s, color: ctxt }} />
          <span style={{ fontSize: 16 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
            Fale Conosco
          </span>
        </div>

        {(userName || brandName) && (
          <div style={{ marginTop: 12 * s }}>
            {userName && <p style={{ fontSize: 14 * s, color: 'rgba(255,255,255,0.35)' }}>@{userName}</p>}
            {brandName && <p style={{ fontSize: 12 * s, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 3 * s, fontWeight: 700, marginTop: 4 * s }}>{brandName}</p>}
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
