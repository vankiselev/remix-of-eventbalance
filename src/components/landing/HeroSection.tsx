import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar, DollarSign, Users } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Система управления мероприятиями
          </div>

          {/* Main heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Управляйте мероприятиями{" "}
            <span className="text-primary">легко и эффективно</span>
          </h1>

          {/* Subheading */}
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in">
            EventBalance — это современная CRM для event-агентств. 
            Календарь, финансы, команда и клиенты — всё в одном месте.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16 animate-fade-in">
            <Button asChild size="lg" className="text-lg px-8 py-6">
              <Link to="/auth">
                Начать работу
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Узнать больше
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto animate-fade-in">
            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-card border border-border">
              <Calendar className="h-6 w-6 text-primary" />
              <span className="text-foreground font-medium">Календарь событий</span>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-card border border-border">
              <DollarSign className="h-6 w-6 text-primary" />
              <span className="text-foreground font-medium">Финансовый учёт</span>
            </div>
            <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-card border border-border">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-foreground font-medium">Управление командой</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview placeholder */}
        <div className="mt-16 max-w-5xl mx-auto animate-fade-in">
          <div className="relative rounded-xl overflow-hidden shadow-2xl border border-border bg-card">
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent z-10" />
            <div className="aspect-video bg-muted flex items-center justify-center">
              <div className="text-center z-20 relative">
                <p className="text-muted-foreground text-lg">
                  Скриншот дашборда
                </p>
                <p className="text-muted-foreground/60 text-sm mt-2">
                  Добавьте реальный скриншот позже
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
