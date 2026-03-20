import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Mail, Send, Building2 } from "lucide-react";

const ContactsInfoPage = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Контакты</h1>
        <p className="text-muted-foreground mb-10">Свяжитесь с нами удобным для вас способом</p>

        <div className="space-y-10">
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="rounded-lg border bg-card p-6 space-y-3 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Email</h3>
              <a href="mailto:ikiselev@me.com" className="text-sm text-primary hover:underline">
                ikiselev@me.com
              </a>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-3 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Телефон</h3>
              <a href="tel:+79152903377" className="text-sm text-primary hover:underline">
                +7 (915) 290-33-77
              </a>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-3 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Адрес</h3>
              <p className="text-sm text-muted-foreground">г. Москва</p>
            </div>
          </section>

          <section className="rounded-lg border bg-muted/30 p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Юридическая информация</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <div>
                <span className="font-medium text-foreground">Наименование:</span>{" "}
                ИП Киселёв Иван Павлович
              </div>
              <div>
                <span className="font-medium text-foreground">ИНН:</span>{" "}
                773365251443
              </div>
              <div>
                <span className="font-medium text-foreground">ОГРНИП:</span>{" "}
                321774600221968
              </div>
              <div>
                <span className="font-medium text-foreground">Дата регистрации:</span>{" "}
                14.04.2021
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ContactsInfoPage;
