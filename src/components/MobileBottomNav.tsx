import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BarChart3, Calendar, Plus, DollarSign, MoreHorizontal, Users, UserPlus, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const MobileBottomNav = ({ activeTab, onTabChange }: MobileBottomNavProps) => {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        const { data } = await supabase
          .rpc("get_user_basic_profile")
          .single();
        setUserRole(data?.role || 'employee');
      }
    };
    fetchUserRole();
  }, [user]);

  const mainNavItems = [
    { id: "dashboard", label: "Главная", icon: BarChart3 },
    { id: "calendar", label: "Календарь", icon: Calendar },
    { id: "finances", label: "Финансы", icon: DollarSign },
  ];

  const moreMenuItems = [
    { id: "events", label: "Мероприятия", icon: Calendar },
    { id: "staff", label: "Сотрудники", icon: Users },
    { id: "contacts", label: "Контакты", icon: Briefcase },
    ...(userRole === 'admin' ? [{ id: "invitations", label: "Приглашения", icon: UserPlus }] : []),
  ];

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setIsMoreMenuOpen(false);
  };

  const isActiveTab = (tabId: string) => activeTab === tabId;

  return (
    <>
      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/40 backdrop-blur-md bg-card/95">
        <div className="flex items-center justify-around px-2 py-2 safe-area-inset-bottom">
          {/* Dashboard */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabChange("dashboard")}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 ${
              isActiveTab("dashboard") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">Главная</span>
          </Button>

          {/* Calendar */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabChange("calendar")}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 ${
              isActiveTab("calendar") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs font-medium">Календарь</span>
          </Button>

          {/* Add Transaction - Central FAB */}
          <Button
            onClick={() => handleTabChange("transaction")}
            className={`relative h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg ${
              isActiveTab("transaction") ? "ring-2 ring-primary/20 ring-offset-2" : ""
            }`}
          >
            <Plus className="h-6 w-6" />
          </Button>

          {/* Finances */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleTabChange("finances")}
            className={`flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 ${
              isActiveTab("finances") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <DollarSign className="h-5 w-5" />
            <span className="text-xs font-medium">Финансы</span>
          </Button>

          {/* More Menu */}
          <Sheet open={isMoreMenuOpen} onOpenChange={setIsMoreMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0 text-muted-foreground"
              >
                <MoreHorizontal className="h-5 w-5" />
                <span className="text-xs font-medium">Ещё</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Меню</SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 pb-6">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant={isActiveTab(item.id) ? "secondary" : "ghost"}
                      onClick={() => handleTabChange(item.id)}
                      className={`w-full justify-start gap-3 h-12 ${
                        isActiveTab(item.id) 
                          ? "bg-primary/10 text-primary font-medium" 
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </Button>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Bottom padding to prevent content overlap */}
      <div className="h-20 flex-shrink-0" />
    </>
  );
};

export default MobileBottomNav;