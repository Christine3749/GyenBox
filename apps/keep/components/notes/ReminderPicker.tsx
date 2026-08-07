"use client";

import React, { useState } from 'react';
import { Clock, Calendar, X } from 'lucide-react';

interface ReminderPickerProps {
  currentReminder?: string | null;
  onSelectReminder: (reminderIsoOrText: string | null) => void;
  onClose: () => void;
}

export const ReminderPicker: React.FC<ReminderPickerProps> = ({
  currentReminder,
  onSelectReminder,
  onClose,
}) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('08:00');

  const getTodayEvening = () => {
    const d = new Date();
    d.setHours(20, 0, 0, 0);
    if (d.getTime() < Date.now()) {
      d.setHours(22, 0, 0, 0);
    }
    return d.toISOString();
  };

  const getTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  };

  const getNextWeekMorning = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() + (day === 0 ? 1 : 8 - day); // next Monday
    d.setDate(diff);
    d.setHours(8, 0, 0, 0);
    return d.toISOString();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDate) return;
    const combined = new Date(`${customDate}T${customTime}`);
    if (!isNaN(combined.getTime())) {
      onSelectReminder(combined.toISOString());
      onClose();
    }
  };

  return (
    <div
      className="p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-xl z-50 text-sm w-64 text-zinc-800 dark:text-zinc-200"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-700 font-medium text-xs text-zinc-500 uppercase tracking-wider">
        <span>Remind me</span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!showCustom ? (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              onSelectReminder(getTodayEvening());
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Later today
            </span>
            <span className="text-xs text-zinc-400">8:00 PM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectReminder(getTomorrowMorning());
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-zinc-500" />
              Tomorrow
            </span>
            <span className="text-xs text-zinc-400">8:00 AM</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onSelectReminder(getNextWeekMorning());
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-zinc-500" />
              Next week
            </span>
            <span className="text-xs text-zinc-400">Mon 8:00 AM</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustom(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors text-amber-600 dark:text-amber-400 font-medium"
          >
            <Calendar className="w-4 h-4" />
            Select date & time
          </button>

          {currentReminder && (
            <button
              type="button"
              onClick={() => {
                onSelectReminder(null);
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-950/30 dark:text-red-400 transition-colors mt-2 border-t border-zinc-100 dark:border-zinc-700"
            >
              <X className="w-4 h-4" />
              Remove reminder
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={handleCustomSubmit} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Select date
            </label>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Select time
            </label>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              required
              className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCustom(false)}
              className="px-3 py-1 text-xs rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
            >
              Back
            </button>
            <button
              type="submit"
              className="px-3 py-1 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              Save
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
