import React from 'react';
import { useMipsStore } from '../store/useMipsStore';

export function TimerView() {
  const { timers } = useMipsStore();

  const renderTimer = (id: string, name: string) => {
    const timer = timers[name] || timers[id] || { ctrl: '00000000', preset: '00000000', count: '00000000' };
    
    return (
      <div className="bg-white border border-slate-200 rounded p-2 text-xs flex flex-col gap-1 mb-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
          <span className="font-mono font-bold text-blue-800">{name}</span>
          <span className="font-mono text-slate-500">ID: {id}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-500">CTRL</span>
          <span className="font-mono text-slate-700">{timer.ctrl}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-slate-500">PRESET</span>
          <span className="font-mono text-slate-700">{timer.preset}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-green-600 font-semibold">COUNT</span>
          <span className="font-mono text-green-700 font-bold">{timer.count}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <div className="bg-slate-200 px-3 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex justify-between mb-2 -mx-2">
        <span>Timers (MMIO)</span>
      </div>
      {renderTimer('0', 'Timer 0')}
      {renderTimer('1', 'Timer 1')}
    </div>
  );
}
