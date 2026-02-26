import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, Clock, Star, Grid3X3, List, Filter } from 'lucide-react';

interface DashboardProjectsProps {
  onStartCarousel: (topic?: string) => void;
  filterMode?: 'all' | 'starred';
  searchQuery?: string;
}

const DashboardProjects: React.FC<DashboardProjectsProps> = ({ onStartCarousel, filterMode = 'all', searchQuery = '' }) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState('recent');

  const title = filterMode === 'starred' ? 'Favoritos' : 'Projetos';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#0a0a0f' }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-4">
        <motion.h1
          className="text-white text-2xl font-semibold mb-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {title}
        </motion.h1>

        {/* Search & Filters bar */}
        <motion.div
          className="flex items-center gap-3 flex-wrap"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Buscar projetos..."
              className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-9 pr-4 py-2 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-white/20 transition-colors"
              autoFocus={!!searchQuery}
            />
          </div>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/[0.06] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white/60 outline-none cursor-pointer"
          >
            <option value="recent">Mais recentes</option>
            <option value="name">Nome A-Z</option>
            <option value="oldest">Mais antigos</option>
          </select>

          {/* View toggle */}
          <div className="flex items-center border border-white/[0.08] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-white/[0.1] text-white' : 'text-white/30 hover:text-white/50'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        <motion.div
          className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4' : 'flex flex-col gap-2 mt-4'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {/* Create new project card */}
          <div
            onClick={() => onStartCarousel()}
            className={`${
              viewMode === 'grid'
                ? 'aspect-[4/3] rounded-xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-3'
                : 'rounded-xl border border-dashed border-white/10 flex items-center gap-3 px-4 py-4'
            } text-white/25 hover:text-white/40 hover:border-white/20 transition-colors cursor-pointer`}
          >
            <Plus className="w-6 h-6" />
            <span className="text-sm">Criar novo projeto</span>
          </div>

          {/* Empty state */}
          {filterMode === 'starred' && (
            <div className={`${viewMode === 'grid' ? 'col-span-full' : ''} flex flex-col items-center justify-center py-16 text-center`}>
              <Star className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Nenhum projeto favoritado</p>
              <p className="text-white/15 text-xs mt-1">Favorite projetos para acessá-los rapidamente</p>
            </div>
          )}

          {filterMode === 'all' && (
            <div className={`${viewMode === 'grid' ? 'col-span-full' : ''} flex flex-col items-center justify-center py-16 text-center`}>
              <Clock className="w-10 h-10 text-white/10 mb-3" />
              <p className="text-white/30 text-sm">Nenhum projeto ainda</p>
              <p className="text-white/15 text-xs mt-1">Crie seu primeiro carrossel para começar</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardProjects;
