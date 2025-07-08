import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import MobileLayout from '@/components/Mobile/MobileLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import EmailTemplates from '@/components/Dashboard/EmailTemplates';

const Templates = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  if (!user) {
    return null;
  }

  if (isMobile) {
    return (
      <MobileLayout 
        title="Templates" 
        activeItem="templates" 
        onItemClick={() => {}}
      >
        <EmailTemplates />
      </MobileLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <EmailTemplates />
      </div>
    </div>
  );
};

export default Templates;