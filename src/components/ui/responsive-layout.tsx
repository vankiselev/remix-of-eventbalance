import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  type?: 'cards' | 'stats' | 'form';
}

export const ResponsiveCard: React.FC<ResponsiveCardProps> = ({ 
  children, 
  className,
  hover = true
}) => {
  return (
    <div 
      className={cn(
        "bg-card border border-border rounded-xl p-4 sm:p-6",
        "shadow-sm transition-all duration-200",
        hover && "hover:shadow-md hover:shadow-primary/5",
        className
      )}
    >
      {children}
    </div>
  );
};

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({ 
  children, 
  className,
  type = 'cards'
}) => {
  const gridClasses = {
    cards: 'grid-cards',
    stats: 'responsive-grid',
    form: 'form-grid'
  };

  return (
    <div className={cn(gridClasses[type], className)}>
      {children}
    </div>
  );
};

interface TextTruncateProps {
  children: React.ReactNode;
  className?: string;
  lines?: 1 | 2;
  tooltip?: boolean;
}

export const TextTruncate: React.FC<TextTruncateProps> = ({ 
  children, 
  className,
  lines = 1,
  tooltip = true
}) => {
  const truncateClass = lines === 1 ? 'text-truncate' : 'text-truncate-2';
  
  return (
    <div 
      className={cn(truncateClass, className)}
      title={tooltip ? children?.toString() : undefined}
    >
      {children}
    </div>
  );
};