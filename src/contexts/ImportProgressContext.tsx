import { createContext, useContext, useState, ReactNode } from 'react';

interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  failed: number;
  errors: Array<{ row: number; reason: string; data?: any }>;
}

interface ImportProgressContextType {
  isImporting: boolean;
  progress: number;
  result: ImportResult | null;
  startImport: (total: number) => void;
  updateProgress: (current: number, total: number) => void;
  finishImport: (result: ImportResult) => void;
  resetImport: () => void;
}

const ImportProgressContext = createContext<ImportProgressContextType | undefined>(undefined);

export const ImportProgressProvider = ({ children }: { children: ReactNode }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const startImport = (total: number) => {
    setIsImporting(true);
    setProgress(0);
    setResult(null);
  };

  const updateProgress = (current: number, total: number) => {
    setProgress(Math.round((current / total) * 100));
  };

  const finishImport = (importResult: ImportResult) => {
    setIsImporting(false);
    setProgress(100);
    setResult(importResult);
  };

  const resetImport = () => {
    setIsImporting(false);
    setProgress(0);
    setResult(null);
  };

  return (
    <ImportProgressContext.Provider
      value={{
        isImporting,
        progress,
        result,
        startImport,
        updateProgress,
        finishImport,
        resetImport,
      }}
    >
      {children}
    </ImportProgressContext.Provider>
  );
};

export const useImportProgress = () => {
  const context = useContext(ImportProgressContext);
  if (!context) {
    throw new Error('useImportProgress must be used within ImportProgressProvider');
  }
  return context;
};
