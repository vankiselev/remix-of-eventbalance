import { useIsMobile } from "@/hooks/use-mobile";
import { WidgetGrid } from "@/components/dashboard/WidgetGrid";

const Dashboard = () => {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-6 w-full overflow-x-hidden">
      {/* Header — hidden on mobile since Layout already shows page title */}
      {!isMobile && (
        <div className="min-w-0">
          <h1 className="text-3xl font-bold truncate">Главная</h1>
          <p className="text-muted-foreground truncate">
            Добро пожаловать в EventBalance
          </p>
        </div>
      )}

      {/* Customizable Widget Grid */}
      <WidgetGrid />
    </div>
  );
};

export default Dashboard;
