import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, UserPlus, Database } from "lucide-react";

export function TestDataManagement() {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", password: "", firstName: "", lastName: "" });
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  // Fetch test users
  const { data: testUsers, isLoading: loadingTestUsers } = useQuery({
    queryKey: ["test-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, first_name, last_name, created_at")
        .eq("is_test_user", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all users for transaction deletion dropdown
  const { data: allUsers } = useQuery({
    queryKey: ["all-profiles-for-deletion"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name");
      
      if (error) throw error;
      return data;
    },
  });

  // Create test user mutation
  const createTestUser = useMutation({
    mutationFn: async (userData: typeof newUser) => {
      const { data, error } = await supabase.functions.invoke("create-test-user", {
        body: userData,
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Тестовый пользователь создан");
      setNewUser({ email: "", password: "", firstName: "", lastName: "" });
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: ["test-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-profiles-for-deletion"] });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  // Delete test user mutation
  const deleteTestUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("delete_employee_permanently", {
        p_employee_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Тестовый пользователь удалён");
      queryClient.invalidateQueries({ queryKey: ["test-users"] });
      queryClient.invalidateQueries({ queryKey: ["all-profiles-for-deletion"] });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  // Delete all transactions mutation
  const deleteAllTransactions = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("delete_all_transactions");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Все транзакции удалены");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  // Delete user transactions mutation
  const deleteUserTransactions = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("delete_user_transactions", {
        target_user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Транзакции пользователя удалены");
      setSelectedUserId("");
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    },
    onError: (error) => {
      toast.error(`Ошибка: ${error.message}`);
    },
  });

  const handleCreateUser = () => {
    if (!newUser.email || !newUser.password) {
      toast.error("Email и пароль обязательны");
      return;
    }
    createTestUser.mutate(newUser);
  };

  return (
    <div className="space-y-6">
      {/* Test Users Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Тестовые пользователи
              </CardTitle>
              <CardDescription>
                Создание пользователей для тестирования без регистрации
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Создать
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Create form */}
          {showCreateForm && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Имя</Label>
                    <Input
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      placeholder="Иван"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Фамилия</Label>
                    <Input
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      placeholder="Иванов"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="test@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Пароль *</Label>
                    <Input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCreateUser} 
                    disabled={createTestUser.isPending}
                  >
                    {createTestUser.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Создать пользователя
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Отмена
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test users table */}
          {loadingTestUsers ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : testUsers && testUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Имя</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Создан</TableHead>
                  <TableHead className="w-[100px]">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {testUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.full_name || `${user.last_name || ""} ${user.first_name || ""}`.trim() || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("ru-RU")}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить тестового пользователя?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Пользователь {user.full_name || user.email} и все его данные будут удалены безвозвратно.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTestUser.mutate(user.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Тестовых пользователей пока нет
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Очистка транзакций
          </CardTitle>
          <CardDescription>
            Удаление финансовых транзакций для очистки тестовых данных
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delete all transactions */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Удалить ВСЕ транзакции</p>
              <p className="text-sm text-muted-foreground">
                Полная очистка всех финансовых транзакций в системе
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить все
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Удалить ВСЕ транзакции?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Это действие удалит ВСЕ финансовые транзакции в системе. 
                    Это действие необратимо!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteAllTransactions.mutate()}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deleteAllTransactions.isPending}
                  >
                    {deleteAllTransactions.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Да, удалить все
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete user transactions */}
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <p className="font-medium">Удалить транзакции пользователя</p>
              <p className="text-sm text-muted-foreground">
                Удаление транзакций конкретного пользователя
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Выберите пользователя" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={!selectedUserId}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить транзакции пользователя?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Все транзакции выбранного пользователя будут удалены. Это действие необратимо!
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteUserTransactions.mutate(selectedUserId)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={deleteUserTransactions.isPending}
                    >
                      {deleteUserTransactions.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Да, удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
