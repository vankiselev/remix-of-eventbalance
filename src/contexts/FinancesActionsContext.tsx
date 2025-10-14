import { createContext, useContext, useState, ReactNode } from 'react';

interface FinancesActionsContextType {
  onExport?: () => void;
  onImport?: () => void;
  onDeleteAll?: () => void;
  setActions: (actions: {
    onExport?: () => void;
    onImport?: () => void;
    onDeleteAll?: () => void;
  }) => void;
}

const FinancesActionsContext = createContext<FinancesActionsContextType | undefined>(undefined);

export const FinancesActionsProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActionsState] = useState<{
    onExport?: () => void;
    onImport?: () => void;
    onDeleteAll?: () => void;
  }>({});

  const setActions = (newActions: {
    onExport?: () => void;
    onImport?: () => void;
    onDeleteAll?: () => void;
  }) => {
    setActionsState(newActions);
  };

  return (
    <FinancesActionsContext.Provider value={{ ...actions, setActions }}>
      {children}
    </FinancesActionsContext.Provider>
  );
};

export const useFinancesActions = () => {
  const context = useContext(FinancesActionsContext);
  if (context === undefined) {
    throw new Error('useFinancesActions must be used within a FinancesActionsProvider');
  }
  return context;
};
