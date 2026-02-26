import React, { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardHome from './DashboardHome';
import DashboardProjects from './DashboardProjects';

interface DashboardLayoutProps {
  onStartCarousel: (topic?: string) => void;
  onLoadCarousel?: (carouselItem: any) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onStartCarousel, onLoadCarousel }) => {
  const [activeTab, setActiveTab] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query) {
      setActiveTab('projects');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <DashboardProjects onStartCarousel={onStartCarousel} filterMode="all" searchQuery={searchQuery} />;
      case 'starred':
        return <DashboardProjects onStartCarousel={onStartCarousel} filterMode="starred" searchQuery={searchQuery} />;
      default:
        return <DashboardHome onStartCarousel={onStartCarousel} onLoadCarousel={onLoadCarousel} onViewAllProjects={() => handleTabChange('projects')} />;
    }
  };

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} onSearch={handleSearch} />
      {renderContent()}
    </div>
  );
};

export default DashboardLayout;
