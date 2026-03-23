import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';

interface FinancesActions {
  onExport?: () => void;
  onImport?: () => void;
  onDeleteAll?: () => void;
}

interface FinancesActionsContextType extends FinancesActions {
  setActions: (actions: FinancesActions) => void;
}

const FinancesActionsContext = createContext<FinancesActionsContextType>({
  setActions: () => {},
});

export const FinancesActionsProvider = ({ children }: { children: ReactNode }) => {
  const [actions, setActionsState] = useState<FinancesActions>({});
  const actionsRef = useRef(actions);

  // Stable setter that only triggers re-render if function references actually changed
  const setActions = useCallback((newActions: FinancesActions) => {
    const prev = actionsRef.current;
    if (
      prev.onExport === newActions.onExport &&
      prev.onImport === newActions.onImport &&
      prev.onDeleteAll === newActions.onDeleteAll
    ) {
      return; // No change — skip setState entirely
    }
    actionsRef.current = newActions;
    setActionsState(newActions);
  }, []);

  return (
    <FinancesActionsContext.Provider value={{ ...actions, setActions }}>
      {children}
    </FinancesActionsContext.Provider>
  );
};

export const useFinancesActions = () => {
  return useContext(FinancesActionsContext);
};
