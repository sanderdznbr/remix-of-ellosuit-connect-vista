import React from 'react';
import { MapPin, BedDouble, Ruler, Car, Bath, Building2, Home, DollarSign } from 'lucide-react';

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
  s: number; // scale factor
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

const RenderLogo: React.FC<{ logoUrl?: string; logoPosition: string; s: number; isDark?: boolean }> = ({ logoUrl, logoPosition, s, isDark = true }) => {
  if (!logoUrl) return null;
  const size = 64 * s;
  const margin = 16 * s;
  const posStyle: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    objectFit: 'contain',
    zIndex: 15,
    ...(logoPosition.includes('top') ? { top: margin } : logoPosition.includes('bottom') ? { bottom: margin } : { top: '50%', marginTop: -(size / 2) }),
    ...(logoPosition.includes('left') ? { left: margin } : logoPosition.includes('right') ? { right: margin } : { left: '50%', marginLeft: -(size / 2) }),
    ...(isDark ? { filter: 'brightness(0) invert(1)' } : {}),
  };
  return <img src={logoUrl} alt="" style={posStyle} />;
};

// ─── COVER TEMPLATE ───
const CoverTemplate: React.FC<TemplateProps> = ({ property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, userName, isExport }) => {
  const hasPhoto = !!property.photo;
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
      {hasPhoto && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.3) 100%)' }} />

      {/* Top badge */}
      <div style={{ position: 'absolute', top: 24 * s, left: 36 * s, zIndex: 10, display: 'flex', gap: 8 * s }}>
        <div style={{ padding: `${8 * s}px ${16 * s}px`, borderRadius: 6 * s, backgroundColor: accentColor, display: 'flex', alignItems: 'center', gap: 6 * s }}>
          <span style={{ fontFamily: sansFamily, fontSize: 16 * s, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1.5 * s }}>
            {MODE_LABELS[property.mode] || 'Venda'}
          </span>
        </div>
        <div style={{ padding: `${8 * s}px ${16 * s}px`, borderRadius: 6 * s, backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}>
          <span style={{ fontFamily: sansFamily, fontSize: 14 * s, fontWeight: 600, color: '#fff' }}>
            {TYPE_LABELS[property.type] || 'Imóvel'}
          </span>
        </div>
      </div>

      {/* Bottom content */}
      <div style={{ position: 'absolute', bottom: 36 * s, left: 36 * s, right: 36 * s, zIndex: 10 }}>
        {/* Price */}
        {property.price && (
          <p style={{ fontFamily: sansFamily, fontSize: 44 * s, fontWeight: 900, color: accentColor, marginBottom: 8 * s, letterSpacing: -0.5 * s }}>
            {formatPrice(property.price)}
          </p>
        )}
        {/* Title / Location */}
        <h1 style={{ fontFamily: fontFamily, fontSize: 52 * s, fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 16 * s, textTransform: 'uppercase' }}>
          {property.title || property.neighborhood || property.location || 'Imóvel Exclusivo'}
        </h1>
        {/* Location */}
        {(property.location || property.neighborhood) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, marginBottom: 20 * s }}>
            <MapPin style={{ width: 16 * s, height: 16 * s, color: 'rgba(255,255,255,0.7)', flexShrink: 0 }} />
            <span style={{ fontFamily: sansFamily, fontSize: 18 * s, color: 'rgba(255,255,255,0.7)' }}>
              {[property.neighborhood, property.location].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
        {/* Specs bar */}
        <div style={{ display: 'flex', gap: 16 * s, flexWrap: 'wrap' }}>
          {property.area && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, padding: `${8 * s}px ${14 * s}px`, borderRadius: 8 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
              <Ruler style={{ width: 14 * s, height: 14 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 14 * s, fontWeight: 600, color: '#fff' }}>{property.area}m²</span>
            </div>
          )}
          {property.bedrooms && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, padding: `${8 * s}px ${14 * s}px`, borderRadius: 8 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
              <BedDouble style={{ width: 14 * s, height: 14 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 14 * s, fontWeight: 600, color: '#fff' }}>{property.bedrooms} quartos</span>
            </div>
          )}
          {property.bathrooms && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, padding: `${8 * s}px ${14 * s}px`, borderRadius: 8 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
              <Bath style={{ width: 14 * s, height: 14 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 14 * s, fontWeight: 600, color: '#fff' }}>{property.bathrooms} banhos</span>
            </div>
          )}
          {property.parking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s, padding: `${8 * s}px ${14 * s}px`, borderRadius: 8 * s, backgroundColor: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}>
              <Car style={{ width: 14 * s, height: 14 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 14 * s, fontWeight: 600, color: '#fff' }}>{property.parking} vagas</span>
            </div>
          )}
        </div>
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─── CONTENT TEMPLATE (Details / Highlights) ───
const ContentTemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, fontFamily, sansFamily, logoUrl, logoPosition, isExport, cardIndex }) => {
  const hasPhoto = !!property.photo;
  const variant = cardIndex % 3; // 0: photo top, 1: photo left, 2: specs focus

  if (variant === 2 || !hasPhoto) {
    // Specs-focused dark card
    const specs = [
      { icon: Ruler, label: 'Área', value: property.area ? `${property.area}m²` : '' },
      { icon: BedDouble, label: 'Quartos', value: property.bedrooms },
      { icon: Bath, label: 'Banheiros', value: property.bathrooms },
      { icon: Car, label: 'Vagas', value: property.parking },
    ].filter(s => s.value);

    const highlightsList = property.highlights
      ? property.highlights.split(',').map(h => h.trim()).filter(Boolean).slice(0, 6)
      : [];

    return (
      <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#111' }}>
        {hasPhoto && (
          <>
            <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.15 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(17,17,17,0.95) 0%, rgba(17,17,17,0.8) 100%)' }} />
          </>
        )}
        <div style={{ position: 'absolute', inset: 0, padding: `${48 * s}px ${40 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 24 * s, zIndex: 5 }}>
          {/* Section title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 * s, marginBottom: 8 * s }}>
            <div style={{ width: 40 * s, height: 3 * s, backgroundColor: accentColor, borderRadius: 2 * s }} />
            <span style={{ fontFamily: sansFamily, fontSize: 14 * s, fontWeight: 700, color: accentColor, textTransform: 'uppercase', letterSpacing: 3 * s }}>
              Detalhes
            </span>
          </div>

          {/* Specs grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 * s }}>
            {specs.map((spec, i) => (
              <div key={i} style={{ padding: `${20 * s}px`, borderRadius: 12 * s, backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <spec.icon style={{ width: 22 * s, height: 22 * s, color: accentColor, marginBottom: 8 * s }} />
                <p style={{ fontFamily: sansFamily, fontSize: 12 * s, color: 'rgba(255,255,255,0.5)', marginBottom: 4 * s, textTransform: 'uppercase', letterSpacing: 1 * s }}>{spec.label}</p>
                <p style={{ fontFamily: fontFamily, fontSize: 28 * s, fontWeight: 800, color: '#fff' }}>{spec.value}</p>
              </div>
            ))}
          </div>

          {/* Highlights */}
          {highlightsList.length > 0 && (
            <div style={{ marginTop: 8 * s }}>
              <p style={{ fontFamily: sansFamily, fontSize: 12 * s, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 12 * s }}>Destaques</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 * s }}>
                {highlightsList.map((hl, i) => (
                  <span key={i} style={{ padding: `${6 * s}px ${14 * s}px`, borderRadius: 20 * s, backgroundColor: `${accentColor}22`, border: `1px solid ${accentColor}44`, fontFamily: sansFamily, fontSize: 13 * s, color: '#fff', fontWeight: 500 }}>
                    {hl}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Price */}
          {property.price && (
            <div style={{ marginTop: 'auto', paddingTop: 16 * s }}>
              <p style={{ fontFamily: sansFamily, fontSize: 12 * s, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 2 * s, marginBottom: 4 * s }}>
                {property.mode === 'rent' ? 'Aluguel mensal' : 'Valor'}
              </p>
              <p style={{ fontFamily: sansFamily, fontSize: 36 * s, fontWeight: 900, color: accentColor }}>
                {formatPrice(property.price)}
              </p>
            </div>
          )}
        </div>
        <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
      </div>
    );
  }

  // Photo-dominant content card
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
      {/* Photo takes ~65% */}
      <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          width: '100%', height: '70%',
          objectFit: 'cover',
        }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '70%', background: 'linear-gradient(to top, rgba(10,10,10,1) 0%, rgba(10,10,10,0) 30%)' }} />

      {/* Text content at bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '38%', padding: `${24 * s}px ${36 * s}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 * s, zIndex: 5 }}>
        {/* Card text from AI or body */}
        <p style={{ fontFamily: fontFamily, fontSize: 32 * s, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
          {card.bodyTop || card.body || card.title || property.title || ''}
        </p>

        {/* Specs row */}
        <div style={{ display: 'flex', gap: 14 * s, flexWrap: 'wrap' }}>
          {property.area && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s }}>
              <Ruler style={{ width: 13 * s, height: 13 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 13 * s, color: 'rgba(255,255,255,0.7)' }}>{property.area}m²</span>
            </div>
          )}
          {property.bedrooms && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s }}>
              <BedDouble style={{ width: 13 * s, height: 13 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 13 * s, color: 'rgba(255,255,255,0.7)' }}>{property.bedrooms} quartos</span>
            </div>
          )}
          {property.bathrooms && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s }}>
              <Bath style={{ width: 13 * s, height: 13 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 13 * s, color: 'rgba(255,255,255,0.7)' }}>{property.bathrooms}</span>
            </div>
          )}
          {property.parking && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 * s }}>
              <Car style={{ width: 13 * s, height: 13 * s, color: accentColor }} />
              <span style={{ fontFamily: sansFamily, fontSize: 13 * s, color: 'rgba(255,255,255,0.7)' }}>{property.parking} vagas</span>
            </div>
          )}
        </div>

        {/* Location */}
        {(property.location || property.neighborhood) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 * s }}>
            <MapPin style={{ width: 13 * s, height: 13 * s, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }} />
            <span style={{ fontFamily: sansFamily, fontSize: 13 * s, color: 'rgba(255,255,255,0.5)' }}>
              {[property.neighborhood, property.location].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </div>

      <RenderLogo logoUrl={logoUrl} logoPosition={logoPosition} s={s} />
    </div>
  );
};

// ─── CTA TEMPLATE ───
const CTATemplate: React.FC<TemplateProps> = ({ card, property, w, h, s, accentColor, bgColor, fontFamily, sansFamily, logoUrl, logoPosition, brandName, userName, isExport }) => {
  const hasPhoto = !!property.photo;
  return (
    <div style={{ width: w, height: h, position: 'relative', overflow: 'hidden', backgroundColor: '#0a0a0a' }}>
      {hasPhoto && (
        <img src={property.photo} alt="" {...(isExport ? { crossOrigin: "anonymous" } : {})}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(12px) brightness(0.3)', transform: 'scale(1.1)' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${accentColor}33 0%, transparent 70%)` }} />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: `${48 * s}px`, zIndex: 5 }}>
        {/* Decorative line */}
        <div style={{ width: 60 * s, height: 4 * s, backgroundColor: accentColor, borderRadius: 4 * s, marginBottom: 32 * s }} />

        <h2 style={{ fontFamily: fontFamily, fontSize: 48 * s, fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 16 * s, textTransform: 'uppercase' }}>
          {card.title || 'Agende uma visita'}
        </h2>

        {card.body && (
          <p style={{ fontFamily: sansFamily, fontSize: 20 * s, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, marginBottom: 32 * s, maxWidth: 800 * s }}>
            {card.body}
          </p>
        )}

        {/* CTA button */}
        <div style={{ padding: `${16 * s}px ${48 * s}px`, backgroundColor: accentColor, borderRadius: 12 * s, display: 'inline-flex', alignItems: 'center', gap: 10 * s }}>
          <span style={{ fontFamily: sansFamily, fontSize: 20 * s, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: 2 * s }}>
            Fale Conosco →
          </span>
        </div>

        {/* Contact info */}
        {userName && (
          <p style={{ fontFamily: sansFamily, fontSize: 16 * s, color: 'rgba(255,255,255,0.4)', marginTop: 24 * s, letterSpacing: 1 * s }}>
            @{userName}
          </p>
        )}
        {brandName && (
          <p style={{ fontFamily: sansFamily, fontSize: 14 * s, color: 'rgba(255,255,255,0.3)', marginTop: 8 * s, textTransform: 'uppercase', letterSpacing: 2 * s }}>
            {brandName}
          </p>
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
