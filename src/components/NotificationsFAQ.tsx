import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertCircle, Smartphone, Globe, Bell } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const NotificationsFAQ = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Часто задаваемые вопросы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Как включить уведомления на iPhone?
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p><strong>Требования:</strong> iOS 16.4 или новее, Safari</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Откройте приложение в Safari (не в Chrome или другом браузере)</li>
                  <li>Включите переключатель "Web Push-уведомления" в настройках</li>
                  <li>Нажмите "Разрешить" когда Safari запросит разрешение</li>
                  <li>Проверьте настройки в iOS: Настройки → Safari → Уведомления</li>
                </ol>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Web Push не работает в режиме приватного просмотра
                  </AlertDescription>
                </Alert>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-2">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Как включить уведомления на Android?
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p><strong>Поддерживаемые браузеры:</strong> Chrome, Firefox, Edge</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Включите переключатель "Web Push-уведомления" в настройках приложения</li>
                  <li>Нажмите "Разрешить" когда браузер запросит разрешение</li>
                  <li>Убедитесь, что уведомления включены в настройках Android для браузера</li>
                  <li>Проверьте: Настройки Android → Приложения → [Ваш браузер] → Уведомления</li>
                </ol>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-3">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                В чём разница между Web Push и нативным приложением?
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-semibold mb-2">Web Push (текущая реализация):</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>✅ Работает в браузере без установки</li>
                    <li>✅ Не требует скачивания из магазина приложений</li>
                    <li>✅ Автоматические обновления</li>
                    <li>❌ Требует iOS 16.4+ для iPhone</li>
                    <li>❌ Не работает в фоновом режиме на iOS</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2">Нативное приложение:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>✅ Полная поддержка push-уведомлений</li>
                    <li>✅ Работает в фоновом режиме</li>
                    <li>✅ Доступ к нативным функциям устройства</li>
                    <li>❌ Требует установки из App Store/Google Play</li>
                    <li>❌ Требует разработки и публикации приложения</li>
                  </ul>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-4">
            <AccordionTrigger>
              Почему не приходят уведомления?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p className="font-semibold">Проверьте следующее:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li><strong>Разрешения браузера:</strong> Убедитесь, что разрешения не заблокированы</li>
                  <li><strong>Системные настройки:</strong> Проверьте настройки уведомлений в iOS/Android</li>
                  <li><strong>Режим "Не беспокоить":</strong> Отключите режим "Не беспокоить"</li>
                  <li><strong>Подключение к интернету:</strong> Проверьте стабильность подключения</li>
                  <li><strong>Версия браузера:</strong> Обновите браузер до последней версии</li>
                  <li><strong>Приватный режим:</strong> Web Push не работает в приватном режиме</li>
                </ol>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Если проблема сохраняется, попробуйте отключить и заново включить уведомления в настройках приложения
                  </AlertDescription>
                </Alert>
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="item-5">
            <AccordionTrigger>
              Можно ли добавить приложение на главный экран?
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 text-sm">
                <p>Да! Вы можете добавить приложение на главный экран и использовать его как обычное приложение:</p>
                
                <div className="mt-2">
                  <p className="font-semibold">На iPhone (Safari):</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                    <li>Нажмите кнопку "Поделиться" (квадрат со стрелкой вверх)</li>
                    <li>Выберите "На экран Домой"</li>
                    <li>Нажмите "Добавить"</li>
                  </ol>
                </div>

                <div className="mt-3">
                  <p className="font-semibold">На Android (Chrome):</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                    <li>Откройте меню (три точки)</li>
                    <li>Выберите "Добавить на главный экран"</li>
                    <li>Нажмите "Добавить"</li>
                  </ol>
                </div>

                <p className="text-muted-foreground mt-3">
                  После добавления приложение будет открываться в полноэкранном режиме, как обычное приложение.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};
