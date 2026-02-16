import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

interface HubModuleCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  path: string;
  preview: string;
  color: string;
}

export default function HubModuleCard({ title, description, icon: Icon, path, preview, color }: HubModuleCardProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Link to={path} className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:shadow-md hover:border-border transition-all">
      <div className="relative w-full aspect-[16/10] overflow-hidden bg-muted">
        {/* Skeleton shimmer shown while image loads */}
        {!loaded && (
          <div className="absolute inset-0 hub-card-skeleton" />
        )}
        <img
          src={preview}
          alt={`Preview ${title}`}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
          onLoad={() => setLoaded(true)}
        />
        {loaded && (
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute bottom-2 left-2 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
              <Icon className="h-4 w-4 text-white" />
            </div>
          </>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}
