import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, Mail, Clock, BookOpen, HelpCircle } from "lucide-react";

const SupportPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 border-b border-border bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              На главную
            </Link>
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">Поддержка</h1>
        <p className="text-muted-foreground mb-10">Мы всегда готовы помочь вам с любыми вопросами</p>

        <div className="space-y-10 text-muted-foreground">
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Email-поддержка</h3>
              </div>
              <p className="text-sm">
                Напишите нам на почту, и мы ответим в течение рабочего дня.
              </p>
              <a href="mailto:ikiselev@me.com" className="text-sm text-primary hover:underline font-medium">
                ikiselev@me.com
              </a>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Telegram</h3>
              </div>
              <p className="text-sm">
                Быстрая связь через Telegram для оперативных вопросов.
              </p>
              <a href="https://t.me/IvanKiselev" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline font-medium">
                @IvanKiselev
              </a>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Время работы</h3>
              </div>
              <p className="text-sm">
                Пн–Пт: 10:00–19:00 (МСК)<br />
                Сб–Вс: выходные
              </p>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-3">
              <div className="flex items-center gap-2 text-foreground">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Документация</h3>
              </div>
              <p className="text-sm">
                Ознакомьтесь с правовыми документами сервиса.
              </p>
              <div className="flex flex-col gap-1">
                <Link to="/privacy" className="text-sm text-primary hover:underline font-medium">Политика конфиденциальности</Link>
                <Link to="/terms" className="text-sm text-primary hover:underline font-medium">Условия использования</Link>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <HelpCircle className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Часто задаваемые вопросы</h2>
            </div>

            <div className="space-y-4">
              {[
                { q: "Как добавить новое мероприятие?", a: "Перейдите в раздел «Мероприятия» или «Календарь» и нажмите кнопку «+» или «Новое мероприятие». Заполните все необходимые поля и сохраните." },
                { q: "Как пригласить сотрудника?", a: "Администратор может отправить приглашение через раздел «Администрирование» → «Приглашения». Сотрудник получит ссылку для регистрации." },
                { q: "Как создать финансовую операцию?", a: "Перейдите в раздел «Финансы» и нажмите «Новая операция». Укажите тип операции, сумму, проект и другие детали." },
                { q: "Можно ли работать с телефона?", a: "Да, EventBalance полностью адаптирован для мобильных устройств. Вы можете использовать все функции через браузер на телефоне." },
              ].map((faq, i) => (
                <div key={i} className="rounded-lg border p-4 space-y-1">
                  <p className="font-medium text-foreground text-sm">{faq.q}</p>
                  <p className="text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;
