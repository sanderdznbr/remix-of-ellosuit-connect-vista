import React, { useState } from 'react';
import DashboardSidebar from './DashboardSidebar';
import DashboardHome from './DashboardHome';

interface DashboardLayoutProps {
  onStartCarousel: (topic?: string) => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ onStartCarousel }) => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      <DashboardSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <DashboardHome onStartCarousel={onStartCarousel} />
    </div>
  );
};

export default DashboardLayout;
