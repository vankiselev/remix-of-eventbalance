import TodayEventsCard from './TodayEventsCard';
import TodayBirthdaysCard from './TodayBirthdaysCard';
import TodayVacationsCard from './TodayVacationsCard';
import MyEventsCard from './MyEventsCard';

export function WidgetGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* Ближайшие мероприятия - занимает 2 колонки и 2 ряда на десктопе */}
      <div className="md:col-span-2 lg:row-span-2">
        <TodayEventsCard />
      </div>
      
      {/* Мои мероприятия - занимает 2 колонки на десктопе */}
      <div className="lg:col-span-2">
        <MyEventsCard />
      </div>
      
      {/* Именинники - 1 колонка */}
      <div className="lg:col-span-1">
        <TodayBirthdaysCard />
      </div>
      
      {/* Отпуска - 1 колонка */}
      <div className="lg:col-span-1">
        <TodayVacationsCard />
      </div>
    </div>
  );
}

export default WidgetGrid;
