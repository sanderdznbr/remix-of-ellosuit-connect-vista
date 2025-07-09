import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileStatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  onClick?: () => void;
}

const MobileStatsCard: React.FC<MobileStatsCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  color = 'blue',
  onClick
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 border-blue-200 text-blue-600';
      case 'green':
        return 'bg-green-50 border-green-200 text-green-600';
      case 'purple':
        return 'bg-purple-50 border-purple-200 text-purple-600';
      case 'orange':
        return 'bg-orange-50 border-orange-200 text-orange-600';
      case 'red':
        return 'bg-red-50 border-red-200 text-red-600';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-600';
    }
  };

  const getChangeIcon = () => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'decrease':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600';
      case 'decrease':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div 
      className={cn(
        "bg-white rounded-2xl border-2 p-4 shadow-sm transition-all",
        getColorClasses(color),
        onClick && "active:scale-[0.98] cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {icon && (
              <div className="text-current">
                {icon}
              </div>
            )}
            <h3 className="text-sm font-medium text-gray-600">{title}</h3>
          </div>
          
          <div className="mb-2">
            <span className="text-2xl font-bold text-gray-900">
              {value}
            </span>
          </div>
          
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              {getChangeIcon()}
              <span className={cn("text-xs font-medium", getChangeColor())}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-gray-500">vs. anterior</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileStatsCard;