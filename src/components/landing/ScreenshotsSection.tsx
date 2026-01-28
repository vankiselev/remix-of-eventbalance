import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  Users,
  BarChart3
} from "lucide-react";

const screenshots = [
  {
    id: "dashboard",
    title: "Дашборд",
    description: "Главный экран с ключевыми показателями и быстрым доступом к важным разделам",
    icon: LayoutDashboard,
  },
  {
    id: "calendar",
    title: "Календарь",
    description: "Визуальное планирование мероприятий с удобным интерфейсом",
    icon: Calendar,
  },
  {
    id: "finances",
    title: "Финансы",
    description: "Учёт всех денежных операций и контроль бюджета",
    icon: DollarSign,
  },
  {
    id: "team",
    title: "Команда",
    description: "Управление сотрудниками и распределение задач",
    icon: Users,
  },
  {
    id: "reports",
    title: "Отчёты",
    description: "Аналитика и визуализация данных",
    icon: BarChart3,
  },
];

const ScreenshotsSection = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  const activeScreenshot = screenshots.find(s => s.id === activeTab);

  return (
    <section id="screenshots" className="py-24">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Удобный интерфейс
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Интуитивно понятный дизайн, который помогает работать быстрее
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {screenshots.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.title}</span>
            </button>
          ))}
        </div>

        {/* Screenshot display */}
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
            {/* Browser-like header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-muted border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background rounded-md px-4 py-1.5 text-sm text-muted-foreground max-w-md mx-auto">
                  eventbalance.lovable.app/{activeTab}
                </div>
              </div>
            </div>

            {/* Screenshot placeholder */}
            <div className="aspect-video bg-muted/50 flex items-center justify-center">
              <div className="text-center p-8">
                {activeScreenshot && (
                  <>
                    <activeScreenshot.icon className="h-16 w-16 text-primary/30 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {activeScreenshot.title}
                    </h3>
                    <p className="text-muted-foreground max-w-md">
                      {activeScreenshot.description}
                    </p>
                    <p className="text-sm text-muted-foreground/60 mt-4">
                      Добавьте реальный скриншот: /public/screenshots/{activeTab}.png
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScreenshotsSection;
