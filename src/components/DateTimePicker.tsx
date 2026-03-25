import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval, 
  isBefore, 
  startOfToday,
  isToday
} from 'date-fns';

interface DateTimePickerProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  selectedTime: string | null;
  onTimeSelect: (time: string) => void;
  bookedSlots: string[]; // Array of "HH:MM AM/PM" strings
}

const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
];

export default function DateTimePicker({ 
  selectedDate, 
  onDateSelect, 
  selectedTime, 
  onTimeSelect,
  bookedSlots 
}: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const today = startOfToday();

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => {
    if (isSameMonth(currentMonth, today)) return;
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-12">
      {/* Date Selection */}
      <div className="bg-white p-8 border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col">
            <h3 className="text-xs font-sans font-semibold tracking-[0.3em] uppercase text-[#C5A059] mb-1">
              Select Date
            </h3>
            <p className="text-2xl font-serif text-[#1a1a1a] font-light">
              {format(currentMonth, 'MMMM yyyy')}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={prevMonth}
              disabled={isSameMonth(currentMonth, today)}
              className="p-2 hover:bg-[#f5f2ed] transition-colors disabled:opacity-20"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 hover:bg-[#f5f2ed] transition-colors"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-sans font-semibold tracking-widest text-[#1a1a1a]/30 uppercase py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-px bg-black/5 border border-black/5">
          {calendarDays.map((day, i) => {
            const isSelected = selectedDate && isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isPast = isBefore(day, today);
            const isCurrentDay = isToday(day);

            return (
              <button
                key={day.toString()}
                disabled={!isCurrentMonth || isPast}
                onClick={() => onDateSelect(day)}
                className={`
                  relative aspect-square flex flex-col items-center justify-center transition-all duration-300
                  ${!isCurrentMonth || isPast ? 'bg-[#fcfcfc] text-black/10 cursor-not-allowed' : 'bg-white hover:bg-[#f5f2ed]'}
                  ${isSelected ? 'bg-[#1a1a1a]! text-white!' : ''}
                `}
              >
                <span className={`text-sm font-sans ${isSelected ? 'font-medium' : 'font-light'}`}>
                  {format(day, 'd')}
                </span>
                {isCurrentDay && !isSelected && (
                  <div className="absolute bottom-2 w-1 h-1 bg-[#C5A059] rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Selection */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-8 border border-black/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
          >
            <div className="flex flex-col mb-8">
              <h3 className="text-xs font-sans font-semibold tracking-[0.3em] uppercase text-[#C5A059] mb-1">
                Select Time
              </h3>
              <p className="text-2xl font-serif text-[#1a1a1a] font-light">
                Available Slots for {format(selectedDate, 'MMM do')}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TIME_SLOTS.map((time) => {
                const isSelected = selectedTime === time;
                const isBooked = bookedSlots.includes(time);
                
                return (
                  <button
                    key={time}
                    disabled={isBooked}
                    onClick={() => onTimeSelect(time)}
                    className={`
                      py-4 px-6 border text-xs font-sans tracking-[0.2em] uppercase transition-all duration-300 flex items-center justify-center gap-3
                      ${isSelected 
                        ? 'bg-[#C5A059] border-[#C5A059] text-white' 
                        : isBooked
                        ? 'bg-black/5 border-transparent text-black/20 cursor-not-allowed'
                        : 'bg-transparent border-black/10 text-[#1a1a1a]/60 hover:border-[#C5A059] hover:text-[#C5A059]'
                      }
                    `}
                  >
                    <Clock className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-[#C5A059]'}`} strokeWidth={1.5} />
                    {time}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
