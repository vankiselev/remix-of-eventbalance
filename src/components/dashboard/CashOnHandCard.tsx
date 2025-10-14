import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/contexts/AuthContext";

interface CashData {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface AdminCashData {
  myCash: CashData;
  companyCash: CashData;
}

const CashOnHandCard = () => {
  const [cashData, setCashData] = useState<CashData>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0,
  });
  const [companyCashData, setCompanyCashData] = useState<CashData>({
    total_cash: 0,
    cash_nastya: 0,
    cash_lera: 0,
    cash_vanya: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('employee');
  const { user } = useAuth();

  useEffect(() => {
    fetchUserRole();
  }, [user]);

  useEffect(() => {
    if (userRole) {
      fetchCashData();
    }
  }, [user, userRole]);

  const fetchUserRole = async () => {
    if (user) {
      const { data } = await supabase
        .rpc("get_user_basic_profile")
        .maybeSingle();
      setUserRole(data?.role || 'employee');
    }
  };

  const fetchCashData = async () => {
    try {
      if (userRole === 'admin') {
        // Админ видит свои данные И общую сумму по компании
        const [myData, companyData] = await Promise.all([
          supabase.rpc('calculate_user_cash_totals', { user_uuid: user?.id }).maybeSingle(),
          supabase.rpc('get_company_cash_summary').maybeSingle()
        ]);

        if (myData.error) throw myData.error;
        if (companyData.error) throw companyData.error;

        setCashData(myData.data || { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 });
        setCompanyCashData(companyData.data || { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 });
      } else {
        // Сотрудник видит только свои данные
        const { data, error } = await supabase
          .rpc('calculate_user_cash_totals', { user_uuid: user?.id })
          .maybeSingle();

        if (error) throw error;
        setCashData(data || { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 });
      }
    } catch (error) {
      console.error('Error fetching cash data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCashTypeDisplay = (type: string, amount: number) => {
    const names = {
      nastya: 'Наличка Настя',
      lera: 'Наличка Лера', 
      vanya: 'Наличка Ваня'
    };
    
    return {
      name: names[type as keyof typeof names] || type,
      amount: amount,
      color: amount >= 0 ? 'text-green-600' : 'text-red-600'
    };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Деньги на руках
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-4">
            Загрузка...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Деньги на руках
        </CardTitle>
      </CardHeader>
      <CardContent>
        {userRole === 'admin' ? (
          /* Для админа - две колонки */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:divide-x">
            {/* Колонка 1: Деньги администратора */}
            <div className="space-y-4 md:pr-6">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Мои деньги на руках
              </h3>
              <div className="text-center">
                <div className={`text-2xl font-bold ${cashData.total_cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(cashData.total_cash)}
                </div>
                <p className="text-sm text-muted-foreground">Общая сумма</p>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'nastya', amount: cashData.cash_nastya },
                  { type: 'lera', amount: cashData.cash_lera },
                  { type: 'vanya', amount: cashData.cash_vanya },
                ].map(({ type, amount }) => {
                  const display = getCashTypeDisplay(type, amount);
                  return (
                    <div key={type} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <span className="text-sm font-medium">{display.name}</span>
                      <span className={`text-sm font-semibold ${display.color}`}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Колонка 2: Общие деньги компании */}
            <div className="space-y-4 md:pl-6">
              <h3 className="text-sm font-semibold text-muted-foreground border-b pb-2">
                Всего у всех сотрудников
              </h3>
              <div className="text-center">
                <div className={`text-2xl font-bold ${companyCashData.total_cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(companyCashData.total_cash)}
                </div>
                <p className="text-sm text-muted-foreground">Общая сумма</p>
              </div>
              <div className="space-y-2">
                {[
                  { type: 'nastya', amount: companyCashData.cash_nastya },
                  { type: 'lera', amount: companyCashData.cash_lera },
                  { type: 'vanya', amount: companyCashData.cash_vanya },
                ].map(({ type, amount }) => {
                  const display = getCashTypeDisplay(type, amount);
                  return (
                    <div key={type} className="flex justify-between items-center p-2 rounded bg-muted/30">
                      <span className="text-sm font-medium">{display.name}</span>
                      <span className={`text-sm font-semibold ${display.color}`}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Для обычного сотрудника - одна колонка */
          <div className="space-y-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${cashData.total_cash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(cashData.total_cash)}
              </div>
              <p className="text-sm text-muted-foreground">Общая сумма</p>
            </div>
            <div className="space-y-2">
              {[
                { type: 'nastya', amount: cashData.cash_nastya },
                { type: 'lera', amount: cashData.cash_lera },
                { type: 'vanya', amount: cashData.cash_vanya },
              ].map(({ type, amount }) => {
                const display = getCashTypeDisplay(type, amount);
                return (
                  <div key={type} className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <span className="text-sm font-medium">{display.name}</span>
                    <span className={`text-sm font-semibold ${display.color}`}>
                      {formatCurrency(amount)}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-xs text-muted-foreground text-center mt-3">
              Показаны ваши личные суммы
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CashOnHandCard;