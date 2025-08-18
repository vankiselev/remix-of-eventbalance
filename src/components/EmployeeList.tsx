import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatCurrency";
import { User, ChevronRight } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  totalCash: number;
}

interface EmployeeListProps {
  employees: Employee[];
  onEmployeeClick: (employeeId: string) => void;
}

export function EmployeeList({ employees, onEmployeeClick }: EmployeeListProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Список сотрудников</h2>
      <div className="space-y-2">
        {employees.map((employee) => (
          <Card 
            key={employee.id} 
            className="cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onEmployeeClick(employee.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium">{employee.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{employee.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Общая сумма на руках</p>
                    <p className="text-lg font-bold">{formatCurrency(employee.totalCash)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}