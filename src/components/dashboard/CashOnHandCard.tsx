import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/formatCurrency";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRbacRoles } from "@/hooks/useUserRbacRoles";

interface CashData {
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

const defaultCash: CashData = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 };

function parseCashRows(rows: any[]): CashData {
  if (!rows || rows.length === 0) return defaultCash;
  // Flat format
  if ('total_cash' in rows[0]) {
    return {
      total_cash: Number(rows[0].total_cash) || 0,
      cash_nastya: Number(rows[0].cash_nastya) || 0,
      cash_lera: Number(rows[0].cash_lera) || 0,
      cash_vanya: Number(rows[0].cash_vanya) || 0,
    };
  }
  // Grouped format (cash_type, total_income, total_expense)
  let total_cash = 0, cash_nastya = 0, cash_lera = 0, cash_vanya = 0;
  for (const row of rows) {
    const net = (Number(row.total_income) || 0) - (Number(row.total_expense) || 0);
    total_cash += net;
    const ct = (row.cash_type || '').trim();
    if (ct === 'Наличка Настя') cash_nastya += net;
    else if (ct === 'Наличка Лера') cash_lera += net;
    else if (ct === 'Наличка Ваня') cash_vanya += net;
  }
  return { total_cash, cash_nastya, cash_lera, cash_vanya };
}

const CashOnHandCard = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRbacRoles();
  const [cashData, setCashData] = useState<CashData>(defaultCash);
  const [companyCashData, setCompanyCashData] = useState<CashData>(defaultCash);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCashData();
    }
  }, [user, isAdmin]);

  const fetchCashData = async () => {
    try {
      if (isAdmin) {
        const [myResult, companyResult] = await Promise.all([
          supabase.rpc('calculate_user_cash_totals', { p_user_id: user?.id }),
          supabase.rpc('get_company_cash_summary' as any)
        ]);

        if (myResult.error) throw myResult.error;
        setCashData(parseCashRows(myResult.data as any[] || []));
        
        if (!companyResult.error && companyResult.data) {
          const companyRows = Array.isArray(companyResult.data) ? companyResult.data : [companyResult.data];
          setCompanyCashData(parseCashRows(companyRows as any[]));
        }
      } else {
        const { data, error } = await supabase.rpc('calculate_user_cash_totals', { p_user_id: user?.id });
        if (error) throw error;
        setCashData(parseCashRows(data as any[] || []));
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
        {isAdmin ? (
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
