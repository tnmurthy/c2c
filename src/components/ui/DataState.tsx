import React from 'react';
import { Loader2, AlertCircle, Inbox } from 'lucide-react';

interface DataStateProps {
  state: 'loading' | 'error' | 'empty';
  message?: string;
  className?: string;
}

export default function DataState({ state, message, className = '' }: DataStateProps) {
  const containerClass = `flex flex-col items-center justify-center p-8 text-center ${className}`;

  if (state === 'loading') {
    return (
      <div className={containerClass}>
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
        <p className="text-slate-400 text-sm">{message || 'Loading...'}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className={containerClass}>
        <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
        <p className="text-red-400 text-sm font-medium">{message || 'An error occurred while fetching data.'}</p>
      </div>
    );
  }

  if (state === 'empty') {
    return (
      <div className={containerClass}>
        <Inbox className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-slate-500 text-sm">{message || 'No data available.'}</p>
      </div>
    );
  }

  return null;
}
