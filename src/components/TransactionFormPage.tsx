import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionForm } from "@/components/finance/TransactionFormNew";

export function TransactionFormPage() {
  const navigate = useNavigate();

  const handleFormClose = (open: boolean) => {
    if (!open) {
      navigate('/finances');
    }
  };

  const handleSuccess = () => {
    navigate('/finances', { replace: true, state: { refresh: Date.now() } });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/finances')}
          className="mb-4 min-h-[44px] min-w-[44px] px-4 py-2 flex items-center justify-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4 flex-shrink-0" />
          <span>Назад к финансам</span>
        </Button>
        
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
    </div>
  );
}
