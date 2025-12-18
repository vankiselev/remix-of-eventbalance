export interface WidgetConfig {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WidgetType = 
  | 'events'
  | 'birthdays'
  | 'vacations'
  | 'my_events'
  | 'cash'
  | 'advances'
  | 'tasks'
  | 'action_requests';

export interface WidgetDefinition {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  minW: number;
  minH: number;
  maxW: number;
  maxH: number;
  defaultW: number;
  defaultH: number;
}

export const WIDGET_DEFINITIONS: Record<WidgetType, WidgetDefinition> = {
  events: {
    type: 'events',
    name: 'Ближайшие мероприятия',
    description: 'Список предстоящих событий',
    icon: 'Calendar',
    minW: 1,
    minH: 1,
    maxW: 3,
    maxH: 3,
    defaultW: 2,
    defaultH: 2,
  },
  birthdays: {
    type: 'birthdays',
    name: 'Именинники',
    description: 'Дни рождения сегодня',
    icon: 'Cake',
    minW: 1,
    minH: 1,
    maxW: 2,
    maxH: 2,
    defaultW: 1,
    defaultH: 1,
  },
  vacations: {
    type: 'vacations',
    name: 'Отпуска',
    description: 'Кто сегодня в отпуске',
    icon: 'Palmtree',
    minW: 1,
    minH: 1,
    maxW: 2,
    maxH: 2,
    defaultW: 1,
    defaultH: 1,
  },
  my_events: {
    type: 'my_events',
    name: 'Мои мероприятия',
    description: 'Назначенные вам события',
    icon: 'User',
    minW: 2,
    minH: 1,
    maxW: 3,
    maxH: 2,
    defaultW: 3,
    defaultH: 1,
  },
  cash: {
    type: 'cash',
    name: 'Деньги на руках',
    description: 'Баланс по кассам',
    icon: 'Wallet',
    minW: 1,
    minH: 1,
    maxW: 2,
    maxH: 2,
    defaultW: 1,
    defaultH: 1,
  },
  advances: {
    type: 'advances',
    name: 'Авансы',
    description: 'Выданные авансы',
    icon: 'Banknote',
    minW: 1,
    minH: 1,
    maxW: 2,
    maxH: 2,
    defaultW: 1,
    defaultH: 1,
  },
  tasks: {
    type: 'tasks',
    name: 'Мои задачи',
    description: 'Назначенные задачи',
    icon: 'CheckSquare',
    minW: 1,
    minH: 1,
    maxW: 2,
    maxH: 2,
    defaultW: 2,
    defaultH: 1,
  },
  action_requests: {
    type: 'action_requests',
    name: 'Запросы действий',
    description: 'Запросы на изменение событий',
    icon: 'Bell',
    minW: 2,
    minH: 1,
    maxW: 3,
    maxH: 2,
    defaultW: 3,
    defaultH: 1,
  },
};

export const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: '1', type: 'events', x: 0, y: 0, w: 2, h: 2 },
  { id: '2', type: 'birthdays', x: 2, y: 0, w: 1, h: 1 },
  { id: '3', type: 'vacations', x: 2, y: 1, w: 1, h: 1 },
  { id: '4', type: 'my_events', x: 0, y: 2, w: 3, h: 1 },
];
