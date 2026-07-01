/* eslint-disable */
/* eslint-disable */
import React, { useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { authFetch } from '../services/authService';
import { API_URL } from '../services/config';

interface Schedule {
  id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  expand?: {
    course_id?: { code: string; title: string };
    instructor_id?: { name: string };
    classroom_id?: { name: string };
  };
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 12 }, (_, i) => `${i + 8}:00`);

const Timetable: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await authFetch(`${API_URL}/timetabling`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) setSchedules(data.data);
        }
      } catch (error) { console.error(error);
       } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const getSchedulesForSlot = (day: string, hour: string) => {
    return schedules.filter(s => {
      const startHour = parseInt(s.start_time.split(':')[0]);
      const slotHour = parseInt(hour.split(':')[0]);
      return s.day_of_week === day && startHour === slotHour;
    });
  };

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex-shrink-0 sticky top-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-6 py-3 shadow-sm flex justify-between items-center">
        <div className="pl-14">
          <h1 className="text-lg font-black text-[#2E004F] dark:text-white uppercase tracking-tighter">
            Academic Timetable
          </h1>
          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-widest">
            Weekly Schedule & Resource Allocation
          </p>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-[#4B0082] text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
          <Plus size={12} className="text-[#FFD700]" />
          Add Session
        </button>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto p-6">
        <div className="min-w-[800px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-xl">
          {/* Days Header */}
          <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700"></div>
            {DAYS.map(day => (
              <div key={day} className="p-4 text-center font-black text-[10px] uppercase tracking-widest text-gray-400 border-r border-gray-100 dark:border-gray-700 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          {/* Time Slots */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700 last:border-b-0 h-24">
              <div className="p-2 bg-gray-50 dark:bg-gray-900 border-r border-gray-100 dark:border-gray-700 flex items-center justify-center">
                <span className="text-[10px] font-black text-gray-400">{hour}</span>
              </div>
              {DAYS.map(day => {
                const slots = getSchedulesForSlot(day, hour);
                return (
                  <div key={`${day}-${hour}`} className="p-1 border-r border-gray-100 dark:border-gray-700 last:border-r-0 relative group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    {slots.map(s => (
                      <div key={s.id} className="h-full w-full bg-purple-50 dark:bg-purple-900/20 border-l-4 border-[#4B0082] p-2 flex flex-col justify-between overflow-hidden">
                        <div>
                          <p className="text-[9px] font-black text-[#4B0082] dark:text-purple-300 uppercase truncate">
                            {s.expand?.course_id?.code}
                          </p>
                          <p className="text-[8px] font-bold text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {s.expand?.course_id?.title}
                          </p>
                        </div>
                        <div className="flex flex-col gap-0.5 mt-auto">
                          <div className="flex items-center gap-1 text-[7px] font-bold text-gray-400 uppercase">
                            <MapPin size={8} /> {s.expand?.classroom_id?.name || 'TBA'}
                          </div>
                          <div className="flex items-center gap-1 text-[7px] font-bold text-gray-400 uppercase">
                            <User size={8} /> {s.expand?.instructor_id?.name || 'Staff'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Timetable;









