// @ts-nocheck
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFullName, getInitials } from "@/utils/formatName";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface Employee {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar_url?: string | null;
  employment_status?: string;
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface EmployeeListProps {
  onEmployeeSelect: (employeeId: string, employeeName: string, avatarUrl?: string | null) => void;
}

export function EmployeeList({ onEmployeeSelect }: EmployeeListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"active" | "terminated">("active");

  // Fetch profiles via React Query (cached, no waterfall)
  const { data: employees = [], isLoading: loading } = useQuery({
    queryKey: ['employee-list-with-cash'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .rpc("get_admin_profiles");
      
      if (error) throw error;

      // Filter out admins
      const employeeProfiles = profiles?.filter((p: any) => p.role !== "admin") || [];

      // Batch: fetch all cash totals in one query instead of N RPCs
      const employeeIds = employeeProfiles.map((p: any) => p.id);
      
      if (employeeIds.length === 0) return [];

      // Get all transactions for all employees in ONE query
      const { data: txData, error: txError } = await supabase
        .from('financial_transactions')
        .select('created_by, cash_type, income_amount, expense_amount')
        .in('created_by', employeeIds);

      // Build cash totals map
      const cashMap = new Map<string, { total_cash: number; cash_nastya: number; cash_lera: number; cash_vanya: number }>();
      
      if (!txError && txData) {
        for (const tx of txData) {
          if (!tx.created_by) continue;
          let entry = cashMap.get(tx.created_by);
          if (!entry) {
            entry = { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 };
            cashMap.set(tx.created_by, entry);
          }
          const net = (tx.income_amount || 0) - (tx.expense_amount || 0);
          entry.total_cash += net;
          const ct = (tx.cash_type || '').trim();
          if (ct === 'Наличка Настя') entry.cash_nastya += net;
          else if (ct === 'Наличка Лера') entry.cash_lera += net;
          else if (ct === 'Наличка Ваня') entry.cash_vanya += net;
        }
      }

      return employeeProfiles.map((profile: any) => ({
        ...profile,
        ...(cashMap.get(profile.id) || { total_cash: 0, cash_nastya: 0, cash_lera: 0, cash_vanya: 0 }),
      })) as Employee[];
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const filteredEmployees = useMemo(() => {
    return employees.filter(employee => {
      const matchesSearch = employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "active" 
        ? employee.employment_status === "active"
        : employee.employment_status === "terminated";
      return matchesSearch && matchesStatus;
    });
  }, [employees, searchTerm, statusFilter]);

  const activeCount = useMemo(() => employees.filter(e => e.employment_status === "active").length, [employees]);
  const terminatedCount = useMemo(() => employees.filter(e => e.employment_status === "terminated").length, [employees]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-muted h-12 w-full rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as "active" | "terminated")}>
        <TabsList className="w-full grid grid-cols-2">
          <TabsTrigger value="active" className="gap-2">
            Активные
            <Badge variant="secondary" className="ml-1">{activeCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="terminated" className="gap-2">
            Уволенные
            <Badge variant="secondary" className="ml-1">{terminatedCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск сотрудников..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>
      
      <div className="space-y-2">
        {filteredEmployees.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {searchTerm ? "Сотрудники не найдены" : statusFilter === "active" ? "Нет активных сотрудников" : "Нет уволенных сотрудников"}
          </p>
        ) : (
          filteredEmployees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => onEmployeeSelect(employee.id, employee.full_name, employee.avatar_url)}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={employee.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(employee)}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{employee.full_name}</h3>
                <p className="text-sm text-muted-foreground truncate">{employee.email}</p>
              </div>
              
              <div className="text-right mr-2 shrink-0">
                <p className="font-semibold">{formatCurrency(employee.total_cash)}</p>
                <p className="text-xs text-muted-foreground">на руках</p>
              </div>
              
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
