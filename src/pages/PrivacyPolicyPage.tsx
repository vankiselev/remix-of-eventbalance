import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Content */}
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Политика конфиденциальности
        </h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">
            Дата последнего обновления: {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">1. Общие положения</h2>
            <p>
              Настоящая Политика конфиденциальности персональных данных (далее — Политика) действует в отношении всей информации, которую сервис EventBalance (далее — Сервис), принадлежащий ИП Киселёв Иван Павлович (ИНН 773365251443, ОГРНИП 321774600221968), может получить о Пользователе во время использования Сервиса.
            </p>
            <p>
              Использование Сервиса означает безоговорочное согласие Пользователя с настоящей Политикой и указанными в ней условиями обработки его персональных данных.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">2. Персональные данные, которые мы собираем</h2>
            <p>В рамках использования Сервиса мы можем собирать следующие данные:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Фамилия, имя, отчество</li>
              <li>Адрес электронной почты</li>
              <li>Номер телефона</li>
              <li>Данные об организации (при наличии)</li>
              <li>Информация о мероприятиях и финансовых операциях, вносимая пользователем</li>
              <li>Техническая информация: IP-адрес, тип браузера, время доступа</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">3. Цели сбора персональных данных</h2>
            <p>Персональные данные Пользователя используются для:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Предоставления доступа к функциям Сервиса</li>
              <li>Идентификации Пользователя</li>
              <li>Связи с Пользователем, включая уведомления</li>
              <li>Улучшения качества Сервиса</li>
              <li>Обеспечения технической поддержки</li>
              <li>Выполнения требований законодательства РФ</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">4. Защита персональных данных</h2>
            <p>
              Мы принимаем необходимые организационные и технические меры для защиты персональных данных Пользователя от неправомерного доступа, уничтожения, изменения, блокирования, копирования, распространения:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Шифрование данных при передаче (SSL/TLS)</li>
              <li>Хранение данных на защищённых серверах</li>
              <li>Ограничение доступа сотрудников к персональным данным</li>
              <li>Регулярный аудит безопасности</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">5. Передача данных третьим лицам</h2>
            <p>
              Мы не передаём персональные данные третьим лицам, за исключением случаев:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Получения явного согласия Пользователя</li>
              <li>Требований законодательства РФ</li>
              <li>Необходимости для исполнения договора с Пользователем (например, платёжные системы)</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">6. Права Пользователя</h2>
            <p>Пользователь имеет право:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Получить информацию об обработке своих персональных данных</li>
              <li>Требовать уточнения, блокирования или уничтожения персональных данных</li>
              <li>Отозвать согласие на обработку персональных данных</li>
              <li>Обратиться с жалобой в Роскомнадзор</li>
            </ul>
            <p>
              Для реализации своих прав Пользователь может обратиться по адресу: support@eventbalance.ru
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">7. Cookies и аналитика</h2>
            <p>
              Сервис может использовать файлы cookies для улучшения работы и анализа использования. Пользователь может отключить cookies в настройках браузера, однако это может повлиять на функциональность Сервиса.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">8. Срок хранения данных</h2>
            <p>
              Персональные данные хранятся в течение срока действия учётной записи Пользователя и 30 дней после её удаления. После этого данные удаляются безвозвратно.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">9. Изменение Политики</h2>
            <p>
              Мы оставляем за собой право вносить изменения в настоящую Политику. Актуальная версия всегда доступна на данной странице. При существенных изменениях мы уведомим Пользователей по электронной почте.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">10. Контактная информация</h2>
            <p>
              По всем вопросам, связанным с обработкой персональных данных, обращайтесь:
            </p>
            <div className="bg-muted/50 rounded-lg p-4 space-y-1">
              <p><strong>ИП Киселёв Иван Павлович</strong></p>
              <p>ИНН: 773365251443</p>
              <p>ОГРНИП: 321774600221968</p>
              <p>Адрес: г. Москва, Новокуркинское шоссе д.47</p>
              <p>Email: support@eventbalance.ru</p>
              <p>Телефон: +7 (915) 290-33-77</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
