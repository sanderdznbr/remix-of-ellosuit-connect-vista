import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import MarketplaceContent from '@/components/Marketplace/MarketplaceContent';

const Marketplace: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <MarketplaceContent />;
  }

  return (
    <div className="flex h-screen w-full" style={{ backgroundColor: '#0a0a0f' }}>
      <MarketplaceContent />
    </div>
  );
};

export default Marketplace;
