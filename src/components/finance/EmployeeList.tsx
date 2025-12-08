import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatFullName, getInitials } from "@/utils/formatName";

interface Employee {
  id: string;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  avatar_url?: string | null;
  total_cash: number;
  cash_nastya: number;
  cash_lera: number;
  cash_vanya: number;
}

interface EmployeeListProps {
  onEmployeeSelect: (employeeId: string, employeeName: string, avatarUrl?: string | null) => void;
}

export function EmployeeList({ onEmployeeSelect }: EmployeeListProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const filtered = employees.filter(employee =>
      employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEmployees(filtered);
  }, [employees, searchTerm]);

  const fetchEmployees = async () => {
    try {
      // Only admins should be able to see the employee list
      const { data: profiles, error } = await supabase
        .rpc("get_admin_profiles");
      
      // Filter out admins from the list
      const employeeProfiles = profiles?.filter((p: any) => p.role !== "admin") || [];

      if (error) throw error;

      // Calculate cash totals for each employee
      const employeesWithTotals = await Promise.all(
        employeeProfiles.map(async (profile) => {
          const { data: cashData, error: cashError } = await supabase
            .rpc("calculate_user_cash_totals", { user_uuid: profile.id });

          if (cashError) {
            console.error("Error calculating cash for user:", profile.id, cashError);
            return {
              ...profile,
              total_cash: 0,
              cash_nastya: 0,
              cash_lera: 0,
              cash_vanya: 0,
            };
          }

          const totals = cashData?.[0] || {
            total_cash: 0,
            cash_nastya: 0,
            cash_lera: 0,
            cash_vanya: 0,
          };

          return {
            ...profile,
            ...totals,
          };
        })
      );

      setEmployees(employeesWithTotals);
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось загрузить список сотрудников",
      });
    } finally {
      setLoading(false);
    }
  };

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
            {searchTerm ? "Сотрудники не найдены" : "Нет сотрудников"}
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