import { useState, useEffect } from "react";
import { ArrowLeft, Mic } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/TransactionFormNew";
import { VoiceTransactionDialog } from "@/components/finance/VoiceTransactionDialog";

export function TransactionFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);

  // Auto-open voice dialog if ?voice=1
  useEffect(() => {
    if (searchParams.get('voice') === '1') {
      setVoiceDialogOpen(true);
    }
  }, [searchParams]);

  const handleFormClose = (open: boolean) => {
    if (!open) {
      navigate('/finances');
    }
  };

  const handleSuccess = () => {
    navigate('/finances', { replace: true, state: { refresh: Date.now() } });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/finances')}
            className="min-h-[44px] min-w-[44px] px-4 py-2 flex items-center justify-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Назад к финансам</span>
            <span className="sm:hidden">Назад</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setVoiceDialogOpen(true)}
            className="min-h-[44px] gap-2"
          >
            <Mic className="h-4 w-4" />
            <span className="hidden sm:inline">Заполнить голосом</span>
            <span className="sm:hidden">Голос</span>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Внести трату/приход</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Используем ту же форму, что и в финансах, но в режиме inline (без Dialog) */}
            <TransactionForm
              isOpen={true}
              onOpenChange={handleFormClose}
              onSuccess={handleSuccess}
              inline={true}
            />
          </CardContent>
        </Card>
      </div>

      <VoiceTransactionDialog
        isOpen={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
