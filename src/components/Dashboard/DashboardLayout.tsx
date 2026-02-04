import React from 'react';
import { Outlet } from 'react-router-dom';
import MegaMenuHeader from './MegaMenuHeader';

export function DashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <MegaMenuHeader />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;
