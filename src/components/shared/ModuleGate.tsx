import React from 'react';
import { useSubscription, type ModuleType } from '@/hooks/useSubscription';
import LockedFeaturePage from './LockedFeaturePage';

interface ModuleGateProps {
  module: ModuleType;
  children: React.ReactNode;
}

export default function ModuleGate({ module, children }: ModuleGateProps) {
  const { isLoading, hasModuleAccess } = useSubscription();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasModuleAccess(module)) {
    return <LockedFeaturePage module={module}>{children}</LockedFeaturePage>;
  }

  return <>{children}</>;
}
