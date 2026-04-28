import React from 'react';
import { useMipsStore } from '../store/useMipsStore';

export function TimerView() {
  const { timers, changedTimers } = useMipsStore();

  const renderTimer = (id: string, name: string) => {
    const timer = timers[name] || timers[id] || { ctrl: '00000000', preset: '00000000', count: '00000000' };
    
    // Check if the specific timer's fields changed
    // The backend uses 'Timer 0' or 'Timer 1' as key, so check for both `id` and `name` variants
    const ctrlChanged = changedTimers.has(`${name}.ctrl`) || changedTimers.has(`${id}.ctrl`);
    const presetChanged = changedTimers.has(`${name}.preset`) || changedTimers.has(`${id}.preset`);
    const countChanged = changedTimers.has(`${name}.count`) || changedTimers.has(`${id}.count`);
    
    return (
      <div className="bg-white border border-slate-200 rounded p-2 text-xs flex flex-col gap-1 mb-3">
        <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
          <span className="font-mono font-bold text-blue-800">{name}</span>
          <span className="font-mono text-slate-500">ID: {id}</span>
        </div>
        
        <div className={`flex justify-between items-center px-1 rounded transition-all ${ctrlChanged ? 'bg-yellow-100 text-yellow-800' : ''}`}>
          <span className={ctrlChanged ? 'text-yellow-700' : 'text-slate-500'}>CTRL</span>
          <span className={`font-mono ${ctrlChanged ? 'text-yellow-800 font-bold' : 'text-slate-700'}`}>{timer.ctrl}</span>
        </div>
        
        <div className={`flex justify-between items-center px-1 rounded transition-all ${presetChanged ? 'bg-yellow-100 text-yellow-800' : ''}`}>
          <span className={presetChanged ? 'text-yellow-700' : 'text-slate-500'}>PRESET</span>
          <span className={`font-mono ${presetChanged ? 'text-yellow-800 font-bold' : 'text-slate-700'}`}>{timer.preset}</span>
        </div>
        
        <div className={`flex justify-between items-center px-1 rounded transition-all ${countChanged ? 'bg-yellow-100 text-yellow-800' : ''}`}>
          <span className={`font-semibold ${countChanged ? 'text-yellow-700' : 'text-green-600'}`}>COUNT</span>
          <span className={`font-mono font-bold ${countChanged ? 'text-yellow-800' : 'text-green-700'}`}>{timer.count}</span>
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
