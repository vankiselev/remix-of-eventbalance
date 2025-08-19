import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableBodyProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableRowProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveTableCellProps {
  children: React.ReactNode;
  className?: string;
  header?: boolean;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ 
  children, 
  className 
}) => {
  return (
    <div className="table-container">
      <table className={cn("min-w-full border-collapse", className)}>
        {children}
      </table>
    </div>
  );
};

export const ResponsiveTableHeader: React.FC<ResponsiveTableHeaderProps> = ({ 
  children, 
  className 
}) => {
  return (
    <thead className={cn("table-sticky-header", className)}>
      {children}
    </thead>
  );
};

export const ResponsiveTableBody: React.FC<ResponsiveTableBodyProps> = ({ 
  children, 
  className 
}) => {
  return (
    <tbody className={cn("divide-y divide-border", className)}>
      {children}
    </tbody>
  );
};

export const ResponsiveTableRow: React.FC<ResponsiveTableRowProps> = ({ 
  children, 
  className 
}) => {
  return (
    <tr className={cn("hover:bg-muted/50 transition-colors", className)}>
      {children}
    </tr>
  );
};

export const ResponsiveTableCell: React.FC<ResponsiveTableCellProps> = ({ 
  children, 
  className,
  header = false
}) => {
  const Component = header ? 'th' : 'td';
  
  return (
    <Component 
      className={cn(
        "px-3 py-3 text-left align-middle text-sm",
        header ? "font-semibold bg-muted text-muted-foreground" : "text-foreground",
        className
      )}
    >
      <div className="flex items-center justify-center text-center">
        {children}
      </div>
    </Component>
  );
};