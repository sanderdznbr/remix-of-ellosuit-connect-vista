import React from 'react';
import { MapPin, BedDouble, Ruler, Car, Bath, Phone, Home, Key, Building2 } from 'lucide-react';

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
// COVER: Title top (dark bg) + Real photo middle + Specs card overlay + CTA button
// Inspired by professional real estate social media posts
// ─────────────────────────────────────────────────────────
const CoverTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, bgColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, isExport }) => {
  const ctxt = contrastText(accentColor);
  const titleText = card.title || property.title || `${TYPE_LABELS[property.type] || 'Imóvel'} em ${property.neighborhood || property.location || 'Localização Premium'}`;
  const subtitleText = card.subtitle || card.body || (property.location ? `${TYPE_LABELS[property.type] || 'Imóvel'} em ${[property.neighborhood, property.location].filter(Boolean).join(', ')}. ${property.highlights ? property.highlights.split(',')[0]?.trim() + '.' : ''}` : '');

  // Specs list
  const specs = [
    property.type && { icon: Key, text: TYPE_LABELS[property.type] || property.type },
    property.area && { icon: Home, text: `${property.area}m²` },
    property.bedrooms && { icon: BedDouble, text: `${property.bedrooms} Quartos` },
    property.bathrooms && { icon: Bath, text: `${property.bathrooms} Banheiros` },
    property.parking && { icon: Car, text: `${property.parking} Vagas` },
    (property.location || property.neighborhood) && { icon: MapPin, text: [property.neighborhood, property.location].filter(Boolean).join(', ') },
  ].filter(Boolean) as { icon: React.ElementType; text: string }[];

  const topH = 0.22; // 22% for title area
  const photoH = 0.58; // 58% for photo
  const bottomH = 0.20; // 20% for CTA area

  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#111', fontFamily: sansFamily, display: 'flex', flexDirection: 'column' }}>
      
      {/* ─── TOP: Title section (dark) ─── */}
      <div style={{ height: `${topH * 100}%`, padding: `${24 * s}px ${28 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 5 }}>
        <h1 style={{
          fontFamily, fontSize: 36 * s, fontWeight: 900, color: '#fff',
          lineHeight: 1.05, textAlign: 'center', textTransform: 'uppercase',
          letterSpacing: -0.3 * s,
        }}>
          {titleText}
        </h1>
        {subtitleText && (
          <p style={{
            fontSize: 14 * s, color: 'rgba(255,255,255,0.55)',
            textAlign: 'center', marginTop: 8 * s, lineHeight: 1.4,
            maxWidth: 600 * s, marginLeft: 'auto', marginRight: 'auto',
          }}>
            {subtitleText}
          </p>
        )}
      </div>

      {/* ─── MIDDLE: Real photo + specs overlay ─── */}
      <div style={{ height: `${photoH * 100}%`, position: 'relative', overflow: 'hidden' }}>
        {property.photo ? (
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #222 0%, #333 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 style={{ width: 48 * s, height: 48 * s, color: 'rgba(255,255,255,0.15)' }} />
          </div>
        )}

        {/* Specs card overlay (bottom-right of photo) */}
        {specs.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 12 * s, right: 12 * s,
            backgroundColor: accentColor, borderRadius: 12 * s,
            padding: `${14 * s}px ${18 * s}px`,
            display: 'flex', flexDirection: 'column', gap: 6 * s,
            minWidth: 180 * s,
            boxShadow: `0 8px 32px rgba(0,0,0,0.4)`,
          }}>
            {specs.map((spec, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 * s }}>
                <spec.icon style={{ width: 14 * s, height: 14 * s, color: ctxt, flexShrink: 0, opacity: 0.8 }} />
                <span style={{ fontSize: 13 * s, fontWeight: 600, color: ctxt, lineHeight: 1.2 }}>{spec.text}</span>
              </div>
            ))}
            {/* Price inside specs card */}
            {property.price && (
              <div style={{ marginTop: 4 * s, paddingTop: 6 * s, borderTop: `1px solid ${ctxt === '#fff' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'}` }}>
                <span style={{ fontSize: 20 * s, fontWeight: 900, color: ctxt }}>
                  {formatPrice(property.price)}
                </span>
                {property.mode === 'rent' && (
                  <span style={{ fontSize: 11 * s, color: ctxt, opacity: 0.7, marginLeft: 4 * s }}>/ mês</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── BOTTOM: CTA bar ─── */}
      <div style={{
        height: `${bottomH * 100}%`, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: `${0}px ${28 * s}px`, position: 'relative',
      }}>
        <div style={{
          padding: `${12 * s}px ${36 * s}px`, backgroundColor: accentColor,
          borderRadius: 8 * s, display: 'inline-flex', alignItems: 'center', gap: 8 * s,
        }}>
          <span style={{ fontSize: 16 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 1.5 * s }}>
            {property.mode === 'rent' ? 'Agende uma Visita' : 'Realize Seu Sonho'}
          </span>
        </div>
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CONTENT: Photo dominant with info overlay 
// ─────────────────────────────────────────────────────────
const ContentTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, isExport, cardIndex }) => {
  const ctxt = contrastText(accentColor);
  const variant = cardIndex % 2;

  // Variant 0: Full photo with gradient bottom + specs
  if (variant === 0) {
    return (
      <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0c0c0c', fontFamily: sansFamily }}>
        {/* Full photo */}
        {property.photo && (
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        )}
        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.02) 35%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.95) 100%)' }} />

        {/* Top badge */}
        <div style={{ position: 'absolute', top: 20 * s, left: 20 * s, zIndex: 10 }}>
          <div style={{ padding: `${6 * s}px ${14 * s}px`, borderRadius: 6 * s, backgroundColor: accentColor }}>
            <span style={{ fontSize: 11 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
              {MODE_LABELS[property.mode] || 'Venda'}
            </span>
          </div>
        </div>

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${24 * s}px ${24 * s}px`, zIndex: 10 }}>
          {property.price && (
            <p style={{ fontSize: 32 * s, fontWeight: 900, color: accentColor, marginBottom: 4 * s }}>
              {formatPrice(property.price)}
              {property.mode === 'rent' && <span style={{ fontSize: 14 * s, opacity: 0.7, color: '#fff' }}> /mês</span>}
            </p>
          )}
          <h2 style={{ fontFamily, fontSize: 28 * s, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 10 * s, textTransform: 'uppercase' }}>
            {card.bodyTop || card.title || property.title || property.neighborhood || 'Imóvel Exclusivo'}
          </h2>
          {(property.location || property.neighborhood) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, marginBottom: 12 * s }}>
              <MapPin style={{ width: 13 * s, height: 13 * s, color: 'rgba(255,255,255,0.5)' }} />
              <span style={{ fontSize: 13 * s, color: 'rgba(255,255,255,0.5)' }}>
                {[property.neighborhood, property.location].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 * s, flexWrap: 'wrap' }}>
            {property.area && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 * s, padding: `${5 * s}px ${10 * s}px`, borderRadius: 6 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <Ruler style={{ width: 12 * s, height: 12 * s, color: accentColor }} />
                <span style={{ fontSize: 12 * s, fontWeight: 600, color: '#fff' }}>{property.area}m²</span>
              </div>
            )}
            {property.bedrooms && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 * s, padding: `${5 * s}px ${10 * s}px`, borderRadius: 6 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <BedDouble style={{ width: 12 * s, height: 12 * s, color: accentColor }} />
                <span style={{ fontSize: 12 * s, fontWeight: 600, color: '#fff' }}>{property.bedrooms} qts</span>
              </div>
            )}
            {property.bathrooms && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 * s, padding: `${5 * s}px ${10 * s}px`, borderRadius: 6 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <Bath style={{ width: 12 * s, height: 12 * s, color: accentColor }} />
                <span style={{ fontSize: 12 * s, fontWeight: 600, color: '#fff' }}>{property.bathrooms}</span>
              </div>
            )}
            {property.parking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 * s, padding: `${5 * s}px ${10 * s}px`, borderRadius: 6 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                <Car style={{ width: 12 * s, height: 12 * s, color: accentColor }} />
                <span style={{ fontSize: 12 * s, fontWeight: 600, color: '#fff' }}>{property.parking} vg</span>
              </div>
            )}
          </div>
        </div>
        <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
      </div>
    );
  }

  // Variant 1: Specs grid card (dark, data-rich) with faded photo bg
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
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0c0c0c', fontFamily: sansFamily }}>
      {property.photo && (
        <>
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.1 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(12,12,12,0.92)' }} />
        </>
      )}

      <div style={{ position: 'absolute', inset: 0, padding: `${36 * s}px ${24 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 * s, zIndex: 5 }}>
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * s }}>
          <div style={{ width: 28 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 2 * s }} />
          <span style={{ fontSize: 11 * s, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: 3 * s }}>
            Detalhes do Imóvel
          </span>
        </div>

        {/* Specs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 * s }}>
          {specsList.map((spec, i) => (
            <div key={i} style={{
              padding: `${16 * s}px ${14 * s}px`, borderRadius: 10 * s,
              backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <spec.icon style={{ width: 18 * s, height: 18 * s, color: accentColor, marginBottom: 5 * s }} />
              <p style={{ fontSize: 9 * s, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5 * s, marginBottom: 2 * s }}>{spec.label}</p>
              <p style={{ fontFamily, fontSize: 22 * s, fontWeight: 800, color: '#fff' }}>{spec.value}</p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        {highlightsList.length > 0 && (
          <div>
            <p style={{ fontSize: 9 * s, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 8 * s }}>Destaques</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 * s }}>
              {highlightsList.map((hl, i) => (
                <span key={i} style={{
                  padding: `${4 * s}px ${10 * s}px`, borderRadius: 16 * s,
                  backgroundColor: `${accentColor}18`, border: `1px solid ${accentColor}33`,
                  fontSize: 11 * s, color: 'rgba(255,255,255,0.75)', fontWeight: 500,
                }}>{hl}</span>
              ))}
            </div>
          </div>
        )}

        {/* Price footer */}
        {property.price && (
          <div style={{ marginTop: 'auto', paddingTop: 10 * s, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 9 * s, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 3 * s }}>
              {property.mode === 'rent' ? 'Aluguel mensal' : 'Investimento'}
            </p>
            <p style={{ fontSize: 28 * s, fontWeight: 900, color: accentColor }}>{formatPrice(property.price)}</p>
          </div>
        )}
      </div>
      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// CTA: Blurred photo bg + centered CTA
// ─────────────────────────────────────────────────────────
const CTATemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, userName, isExport }) => {
  const ctxt = contrastText(accentColor);
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0c0c0c', fontFamily: sansFamily }}>
      {property.photo && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(14px) brightness(0.2) saturate(1.2)', transform: 'scale(1.12)' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 40%, ${accentColor}20 0%, transparent 60%)` }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `${36 * s}px ${28 * s}px`, zIndex: 5, gap: 14 * s }}>
        <div style={{ width: 40 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 3 * s }} />

        <h2 style={{ fontFamily, fontSize: 36 * s, fontWeight: 900, color: '#fff', lineHeight: 1.08, textTransform: 'uppercase' }}>
          {card.title || 'Agende sua visita'}
        </h2>

        {card.body && (
          <p style={{ fontSize: 15 * s, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, maxWidth: 600 * s }}>{card.body}</p>
        )}

        <div style={{
          marginTop: 6 * s, padding: `${12 * s}px ${36 * s}px`,
          backgroundColor: accentColor, borderRadius: 8 * s,
          display: 'inline-flex', alignItems: 'center', gap: 8 * s,
          boxShadow: `0 6px 24px ${accentColor}44`,
        }}>
          <Phone style={{ width: 15 * s, height: 15 * s, color: ctxt }} />
          <span style={{ fontSize: 15 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
            Fale Conosco
          </span>
        </div>

        {(userName || brandName) && (
          <div style={{ marginTop: 10 * s }}>
            {userName && <p style={{ fontSize: 13 * s, color: 'rgba(255,255,255,0.3)' }}>@{userName}</p>}
            {brandName && <p style={{ fontSize: 11 * s, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 3 * s, fontWeight: 700, marginTop: 4 * s }}>{brandName}</p>}
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
