import React from 'react';
import { MapPin, BedDouble, Ruler, Car, Bath, Phone, Mail, ArrowRight } from 'lucide-react';

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

/** Compute contrasting text color for a given hex bg */
const contrastText = (hex: string): string => {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#fff';
  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? '#111' : '#fff';
};

const RenderLogo: React.FC<{ logoUrl?: string; logoPosition: string; s: number }> = ({ logoUrl, logoPosition, s }) => {
  if (!logoUrl) return null;
  const size = 52 * s;
  const margin = 20 * s;
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    objectFit: 'contain',
    zIndex: 20,
    ...(logoPosition.includes('top') ? { top: margin } : logoPosition.includes('bottom') ? { bottom: margin } : { top: '50%', marginTop: -(size / 2) }),
    ...(logoPosition.includes('left') ? { left: margin } : logoPosition.includes('right') ? { right: margin } : { left: '50%', marginLeft: -(size / 2) }),
  };
  return <img src={logoUrl} alt="" style={posStyle} />;
};

// Shared spec pill component
const SpecPill: React.FC<{ icon: React.ElementType; value: string; label?: string; s: number; accent: string; variant?: 'glass' | 'solid' | 'outline' }> = ({ icon: Icon, value, label, s, accent, variant = 'glass' }) => {
  const styles: Record<string, React.CSSProperties> = {
    glass: { backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)' },
    solid: { backgroundColor: accent, border: 'none' },
    outline: { backgroundColor: 'transparent', border: `1.5px solid ${accent}55` },
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5 * s,
      padding: `${7 * s}px ${12 * s}px`, borderRadius: 8 * s,
      ...styles[variant],
    }}>
      <Icon style={{ width: 13 * s, height: 13 * s, color: variant === 'solid' ? contrastText(accent) : accent, flexShrink: 0 }} />
      <span style={{ fontSize: 13 * s, fontWeight: 600, color: variant === 'solid' ? contrastText(accent) : '#fff', whiteSpace: 'nowrap' }}>
        {value}{label ? ` ${label}` : ''}
      </span>
    </div>
  );
};

// ─── COVER ───
const CoverTemplate: React.FC<TemplateProps> = ({ property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, isExport }) => {
  const hasPhoto = !!property.photo;
  const ctxt = contrastText(accentColor);
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0c0c0c', fontFamily: sansFamily }}>
      {hasPhoto && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      {/* Cinematic gradient */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.92) 85%, rgba(0,0,0,0.98) 100%)` }} />

      {/* Top badges */}
      <div style={{ position: 'absolute', top: 28 * s, left: 28 * s, zIndex: 10, display: 'flex', gap: 8 * s }}>
        <div style={{
          padding: `${7 * s}px ${16 * s}px`, borderRadius: 6 * s,
          backgroundColor: accentColor,
        }}>
          <span style={{ fontSize: 13 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
            {MODE_LABELS[property.mode] || 'Venda'}
          </span>
        </div>
        <div style={{
          padding: `${7 * s}px ${14 * s}px`, borderRadius: 6 * s,
          backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span style={{ fontSize: 12 * s, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
            {TYPE_LABELS[property.type] || 'Imóvel'}
          </span>
        </div>
      </div>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: `${32 * s}px ${28 * s}px`, zIndex: 10 }}>
        {/* Accent line */}
        <div style={{ width: 40 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 2 * s, marginBottom: 14 * s }} />

        {/* Price */}
        {property.price && (
          <p style={{ fontSize: 38 * s, fontWeight: 900, color: accentColor, marginBottom: 6 * s, letterSpacing: -0.5 * s, lineHeight: 1 }}>
            {formatPrice(property.price)}
          </p>
        )}

        {/* Title */}
        <h1 style={{ fontFamily, fontSize: 40 * s, fontWeight: 800, color: '#fff', lineHeight: 1.05, marginBottom: 10 * s, textTransform: 'uppercase', letterSpacing: -0.3 * s }}>
          {property.title || property.neighborhood || 'Imóvel Exclusivo'}
        </h1>

        {/* Location */}
        {(property.location || property.neighborhood) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s, marginBottom: 16 * s }}>
            <MapPin style={{ width: 14 * s, height: 14 * s, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            <span style={{ fontSize: 14 * s, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
              {[property.neighborhood, property.location].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}

        {/* Specs */}
        <div style={{ display: 'flex', gap: 8 * s, flexWrap: 'wrap' }}>
          {property.area && <SpecPill icon={Ruler} value={`${property.area}m²`} s={s} accent={accentColor} />}
          {property.bedrooms && <SpecPill icon={BedDouble} value={property.bedrooms} label="quartos" s={s} accent={accentColor} />}
          {property.bathrooms && <SpecPill icon={Bath} value={property.bathrooms} label="banhos" s={s} accent={accentColor} />}
          {property.parking && <SpecPill icon={Car} value={property.parking} label="vagas" s={s} accent={accentColor} />}
        </div>
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─── CONTENT (Details / Highlights) ───
const ContentTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, isExport, cardIndex }) => {
  const hasPhoto = !!property.photo;
  const variant = cardIndex % 2; // alternate between 2 layouts

  // Variant 0: Photo top 65%, info bottom
  if (variant === 0 && hasPhoto) {
    return (
      <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0c0c0c', fontFamily: sansFamily }}>
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, width: '100%', height: '65%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        {/* Fade into dark bottom */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(180deg, transparent 50%, #0c0c0c 100%)' }} />

        {/* Bottom info */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%', padding: `${24 * s}px ${28 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 * s, zIndex: 5 }}>
          {/* Text from AI */}
          <p style={{ fontFamily, fontSize: 26 * s, fontWeight: 700, color: '#fff', lineHeight: 1.2, marginBottom: 2 * s }}>
            {card.bodyTop || card.body || card.title || property.title || ''}
          </p>

          {/* Specs row */}
          <div style={{ display: 'flex', gap: 8 * s, flexWrap: 'wrap' }}>
            {property.area && <SpecPill icon={Ruler} value={`${property.area}m²`} s={s} accent={accentColor} variant="outline" />}
            {property.bedrooms && <SpecPill icon={BedDouble} value={`${property.bedrooms} qts`} s={s} accent={accentColor} variant="outline" />}
            {property.bathrooms && <SpecPill icon={Bath} value={property.bathrooms} s={s} accent={accentColor} variant="outline" />}
            {property.parking && <SpecPill icon={Car} value={`${property.parking} vg`} s={s} accent={accentColor} variant="outline" />}
          </div>

          {/* Location */}
          {(property.location || property.neighborhood) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s }}>
              <MapPin style={{ width: 12 * s, height: 12 * s, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
              <span style={{ fontSize: 12 * s, color: 'rgba(255,255,255,0.4)' }}>
                {[property.neighborhood, property.location].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
        </div>
        <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
      </div>
    );
  }

  // Variant 1: Specs-focused grid card (dark, data-rich)
  const specs = [
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
      {hasPhoto && (
        <>
          <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.12 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(12,12,12,0.96) 0%, rgba(12,12,12,0.88) 100%)' }} />
        </>
      )}

      <div style={{ position: 'absolute', inset: 0, padding: `${40 * s}px ${28 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 20 * s, zIndex: 5 }}>
        {/* Section label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 * s }}>
          <div style={{ width: 32 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 2 * s }} />
          <span style={{ fontSize: 11 * s, fontWeight: 800, color: accentColor, textTransform: 'uppercase', letterSpacing: 3 * s }}>
            Detalhes do Imóvel
          </span>
        </div>

        {/* Specs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 * s }}>
          {specs.map((spec, i) => (
            <div key={i} style={{
              padding: `${18 * s}px ${16 * s}px`, borderRadius: 12 * s,
              backgroundColor: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <spec.icon style={{ width: 20 * s, height: 20 * s, color: accentColor, marginBottom: 6 * s }} />
              <p style={{ fontSize: 10 * s, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5 * s, marginBottom: 3 * s }}>{spec.label}</p>
              <p style={{ fontFamily, fontSize: 24 * s, fontWeight: 800, color: '#fff' }}>{spec.value}</p>
            </div>
          ))}
        </div>

        {/* Highlights */}
        {highlightsList.length > 0 && (
          <div>
            <p style={{ fontSize: 10 * s, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 10 * s }}>Destaques</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 * s }}>
              {highlightsList.map((hl, i) => (
                <span key={i} style={{
                  padding: `${5 * s}px ${12 * s}px`, borderRadius: 20 * s,
                  backgroundColor: `${accentColor}18`,
                  border: `1px solid ${accentColor}33`,
                  fontSize: 12 * s, color: 'rgba(255,255,255,0.8)', fontWeight: 500,
                }}>
                  {hl}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Price footer */}
        {property.price && (
          <div style={{ marginTop: 'auto', paddingTop: 12 * s, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 10 * s, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 4 * s }}>
              {property.mode === 'rent' ? 'Aluguel mensal' : 'Investimento'}
            </p>
            <p style={{ fontSize: 32 * s, fontWeight: 900, color: accentColor, letterSpacing: -0.5 * s }}>
              {formatPrice(property.price)}
            </p>
          </div>
        )}
      </div>
      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─── CTA ───
const CTATemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, userName, isExport }) => {
  const hasPhoto = !!property.photo;
  const ctxt = contrastText(accentColor);
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0c0c0c', fontFamily: sansFamily }}>
      {hasPhoto && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(16px) brightness(0.25) saturate(1.3)', transform: 'scale(1.15)' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      {/* Radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 35%, ${accentColor}25 0%, transparent 65%)` }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `${40 * s}px ${32 * s}px`, zIndex: 5, gap: 16 * s }}>
        {/* Decorative accent */}
        <div style={{ width: 48 * s, height: 4 * s, backgroundColor: accentColor, borderRadius: 4 * s }} />

        <h2 style={{ fontFamily, fontSize: 40 * s, fontWeight: 900, color: '#fff', lineHeight: 1.08, textTransform: 'uppercase', letterSpacing: -0.3 * s }}>
          {card.title || 'Agende sua visita'}
        </h2>

        {card.body && (
          <p style={{ fontSize: 17 * s, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, maxWidth: 700 * s }}>
            {card.body}
          </p>
        )}

        {/* CTA button */}
        <div style={{
          marginTop: 8 * s,
          padding: `${14 * s}px ${40 * s}px`,
          backgroundColor: accentColor,
          borderRadius: 10 * s,
          display: 'inline-flex', alignItems: 'center', gap: 8 * s,
          boxShadow: `0 8px 32px ${accentColor}44`,
        }}>
          <Phone style={{ width: 16 * s, height: 16 * s, color: ctxt }} />
          <span style={{ fontSize: 16 * s, fontWeight: 800, color: ctxt, textTransform: 'uppercase', letterSpacing: 2 * s }}>
            Fale Conosco
          </span>
        </div>

        {/* Contact info */}
        <div style={{ marginTop: 12 * s, display: 'flex', flexDirection: 'column', gap: 4 * s }}>
          {userName && (
            <p style={{ fontSize: 14 * s, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 * s }}>
              @{userName}
            </p>
          )}
          {brandName && (
            <p style={{ fontSize: 12 * s, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 3 * s, fontWeight: 700 }}>
              {brandName}
            </p>
          )}
        </div>
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
