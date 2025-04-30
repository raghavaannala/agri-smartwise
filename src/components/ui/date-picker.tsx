import React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// If Calendar component doesn't exist, creating a simple substitute
export const DatePicker = ({ value, onChange }: { value: Date; onChange: (date: Date) => void }) => {
  return (
    <input
      type="date"
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      value={value.toISOString().split('T')[0]}
      onChange={(e) => {
        const newDate = new Date(e.target.value);
        onChange(newDate);
      }}
      max={new Date().toISOString().split('T')[0]}
    />
  );
}; 