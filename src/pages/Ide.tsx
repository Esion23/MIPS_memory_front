import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, StepForward, ArrowRight, Zap, FileCode } from 'lucide-react';
import { useMipsStore, EXAMPLES } from '../store/useMipsStore';
import Editor from '@monaco-editor/react';
import { TimerView } from '../components/TimerView';

export function IdePage() {
  const { 
    sourceMipsCode, setSourceMipsCode,
    instructions, currentInstructionIndex, registers, cp0Registers, pc, memory,
    changedRegisters, changedCp0Registers, changedMemory,
    stepExecution, resetExecution,
    interruptState, triggerInterrupt, stepInterrupt, resetInterrupt
  } = useMipsStore();

  const [activeTab, setActiveTab] = useState<'stackAndMemory' | 'interrupt'>('stackAndMemory');
  const codeContainerRef = useRef<HTMLDivElement>(null);
  const stackBlockRef = useRef<HTMLDivElement>(null);
  const staticDataBlockRef = useRef<HTMLDivElement>(null);
  const stackViewRef = useRef<HTMLDivElement>(null);
  const dataSegmentViewRef = useRef<HTMLDivElement>(null);
  const mmioBlockRef = useRef<HTMLDivElement>(null);
  const timersBlockRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const [arrowPaths, setArrowPaths] = useState({ 
    top: 'M 0,120 L 64,50', 
    bottom: 'M 0,200 L 64,380',
    dataTop: 'M 0,0 L 0,0',
    dataBottom: 'M 0,0 L 0,0',
    mmioArrow: 'M 0,0 L 0,0'
  });

  useEffect(() => {
    if (codeContainerRef.current) {
      const activeEl = codeContainerRef.current.querySelector('.bg-blue-100');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentInstructionIndex]);

  useEffect(() => {
    if (dataSegmentViewRef.current) {
      dataSegmentViewRef.current.scrollTop = dataSegmentViewRef.current.scrollHeight;
    }
  }, [activeTab]);

  useEffect(() => {
    const updateArrows = () => {
      if (activeTab !== 'stackAndMemory') return;
      if (!stackBlockRef.current || !stackViewRef.current || !svgContainerRef.current) return;
      
      const blockRect = stackBlockRef.current.getBoundingClientRect();
      const viewRect = stackViewRef.current.getBoundingClientRect();
      const svgRect = svgContainerRef.current.getBoundingClientRect();

      // The SVG covers the whole container.
      // So we calculate relative to the svgContainer.
      const startX = blockRect.right - svgRect.left;
      const startY1 = blockRect.top - svgRect.top;
      const startY2 = blockRect.bottom - svgRect.top;
      
      const endX = viewRect.left - svgRect.left;
      const endY1 = viewRect.top - svgRect.top + 10;
      const endY2 = viewRect.bottom - svgRect.top - 10;

      let dataTopPath = 'M 0,0 L 0,0';
      let dataBottomPath = 'M 0,0 L 0,0';
      let mmioPath = 'M 0,0 L 0,0';

      if (staticDataBlockRef.current && dataSegmentViewRef.current) {
        const dataBlockRect = staticDataBlockRef.current.getBoundingClientRect();
        const dataViewRect = dataSegmentViewRef.current.getBoundingClientRect();
        
        const dataStartX = dataBlockRect.left - svgRect.left;
        const dataStartY1 = dataBlockRect.top - svgRect.top;
        const dataStartY2 = dataBlockRect.bottom - svgRect.top;
        
        const dataEndX = dataViewRect.left - svgRect.left;
        const dataEndY1 = dataViewRect.top - svgRect.top + 10;
        const dataEndY2 = dataViewRect.bottom - svgRect.top - 10;

        dataTopPath = `M ${dataStartX},${dataStartY1} C ${dataStartX - 80},${dataStartY1} ${dataEndX - 80},${dataEndY1} ${dataEndX},${dataEndY1}`;
        dataBottomPath = `M ${dataStartX},${dataStartY2} C ${dataStartX - 120},${dataStartY2} ${dataEndX - 120},${dataEndY2} ${dataEndX},${dataEndY2}`;
      }

      if (mmioBlockRef.current && timersBlockRef.current) {
        const mmioRect = mmioBlockRef.current.getBoundingClientRect();
        const timersRect = timersBlockRef.current.getBoundingClientRect();
        
        // From MMIO block left edge
        const mmioStartX = mmioRect.left - svgRect.left;
        const mmioStartY = mmioRect.top + mmioRect.height / 2 - svgRect.top;
        
        // To Timers block right edge
        const timersEndX = timersRect.right - svgRect.left + 15;
        const timersEndY = timersRect.top + 20 - svgRect.top;

        mmioPath = `M ${mmioStartX},${mmioStartY} C ${mmioStartX - 50},${mmioStartY} ${timersEndX + 50},${timersEndY} ${timersEndX},${timersEndY}`;
      }

      setArrowPaths({
        top: `M ${startX},${startY1} L ${endX},${endY1}`,
        bottom: `M ${startX},${startY2} L ${endX},${endY2}`,
        dataTop: dataTopPath,
        dataBottom: dataBottomPath,
        mmioArrow: mmioPath
      });
    };

    updateArrows();
    const timer = setTimeout(updateArrows, 100);
    window.addEventListener('resize', updateArrows);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateArrows);
    };
  }, [activeTab]);

  const toHex = (num: number) => '0x' + num.toString(16).padStart(8, '0').toUpperCase();

  const handleStep = () => {
    if (interruptState.isActive) {
      stepInterrupt();
    } else {
      stepExecution();
    }
  };

  const handleReset = () => {
    resetExecution();
    resetInterrupt();
  };

  const spVal = registers.find(r => r.name === '$sp')?.value || 0;
  
  const stackCells: { address: number, value: number | undefined, isSp: boolean }[] = [];
  // MIPS 中栈通常从高地址向下增长，且是字对齐(4字节)的。
  const startAddr = 0x00002ffc;
  // 严格渲染到当前的字对齐边界
  const alignedSpVal = spVal - (spVal % 4);
  
  // 确保遍历条件能包含到 alignedSpVal
  for (let addr = startAddr; addr >= alignedSpVal && addr > 0x00002f00; addr -= 4) {
    stackCells.push({
      address: addr,
      value: memory[addr], // can be undefined
      isSp: addr === alignedSpVal,
    });
  }

  // 计算 .data 段的最大地址
  const maxDataAddr = Object.keys(memory)
    .map(Number)
    .filter(addr => addr >= 0x00000000 && addr < 0x00001800)
    .reduce((max, addr) => Math.max(max, addr), 0x00000000);
  
  // 确保至少显示 20 个字（80字节），或者显示到最大的分配地址
  const dataWordCount = Math.max(20, (maxDataAddr - 0x00000000) / 4 + 1);

  return (
    <div className="flex flex-col h-screen bg-slate-100 overflow-hidden">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold tracking-wide">MIPS Tutor Studio</h1>
          <span className="text-slate-400 text-sm">MIPS 执行可视化</span>
          <div className="ml-4 flex items-center bg-slate-800 rounded px-2 py-1 border border-slate-700">
            <FileCode size={16} className="text-slate-400 mr-2" />
            <select 
              className="bg-transparent text-sm text-slate-200 outline-none cursor-pointer"
              onChange={(e) => useMipsStore.getState().loadExample(parseInt(e.target.value))}
            >
              {EXAMPLES.map((ex, i) => (
                <option key={i} value={i} className="bg-slate-800">{ex.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="font-mono bg-slate-800 px-3 py-1 rounded text-green-400 border border-slate-700">
            PC: {toHex(pc)}
          </span>
          <div className="w-px h-6 bg-slate-700 mx-2"></div>
          <button
            onClick={handleReset}
            className="flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm font-medium transition-colors"
          >
            <RotateCcw size={16} className="mr-1" />
            重置
          </button>
          <button
            onClick={handleStep}
            className="flex items-center px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm font-medium transition-colors"
          >
            <StepForward size={16} className="mr-1" />
            单步执行
          </button>
          <button
            onClick={triggerInterrupt}
            disabled={interruptState.isActive || currentInstructionIndex === 0}
            className={`flex items-center px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              interruptState.isActive || currentInstructionIndex === 0 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-amber-600 hover:bg-amber-500'
            }`}
          >
            <Zap size={16} className="mr-1" />
            触发中断
          </button>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel 1: MIPS Code */}
        <div className="w-[26%] flex flex-col border-r border-slate-300 shadow-sm z-10 bg-white">
          {/* Source MIPS Code (with pseudo instructions) */}
          <div className="bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
            <span>Source MIPS Code</span>
          </div>
          <div className="h-[40%] border-b border-slate-300">
            <Editor
              height="100%"
              language="mips"
              theme="light"
              value={sourceMipsCode}
              onChange={(value) => setSourceMipsCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                folding: false,
                lineDecorationsWidth: 20,
              }}
            />
          </div>

          {/* Expanded MIPS Assembly */}
          <div className="bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
            <span>MIPS Assembly (Expanded)</span>
          </div>
          <div className="flex-1 overflow-auto font-mono text-sm p-2" ref={codeContainerRef}>
              {instructions.map((inst, index) => {
                const isActive = index === currentInstructionIndex && !interruptState.isActive;
                let colorClass = 'text-slate-800';
                if (inst.type === 'comment') colorClass = 'text-green-600';
                if (inst.type === 'label') colorClass = 'text-purple-700 font-bold';
                if (inst.type === 'directive') colorClass = 'text-blue-600 font-bold';

                return (
                  <div 
                    key={inst.id} 
                    className={`flex px-2 py-0.5 rounded ${isActive ? 'bg-blue-100 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                  >
                    <span className="w-24 text-slate-400 select-none text-xs leading-5 flex-shrink-0">
                      {inst.type === 'code' ? toHex(inst.address) : ''}
                    </span>
                    <span className={`whitespace-pre ${colorClass}`}>
                      {inst.type === 'label' ? inst.text.trim() : '  ' + inst.text.trim()}
                    </span>
                  </div>
                );
              })}
            </div>
        </div>

        {/* Left Panel 2: Registers */}
        <div className="w-44 flex-shrink-0 flex flex-col border-r border-slate-300 shadow-sm z-10 bg-slate-50">
          <div className="bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
            <span>通用寄存器</span>
          </div>
          <div className="flex-1 overflow-auto p-2">
            <div className="flex flex-col gap-1.5">
              {registers.map((reg, idx) => (
                <div key={reg.name} className={`flex justify-between items-center border p-1 px-2 rounded text-xs transition-all ${changedRegisters.has(idx) ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'}`} title={reg.description}>
                  <span className="font-mono font-bold text-blue-800 w-8">{reg.name}</span>
                  <span className="font-mono text-slate-600">{toHex(reg.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Left Panel 3: CP0 Registers */}
        <div className="w-48 flex-shrink-0 flex flex-col border-r border-slate-300 shadow-sm z-10 bg-slate-50">
          <div className="bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
            <span>CP0 寄存器</span>
          </div>
          <div 
            className="flex-1 overflow-auto p-2"
            onScroll={() => {
              window.dispatchEvent(new Event('resize'));
            }}
          >
            <div className="flex flex-col gap-3">
              {/* SR */}
              <div className={`border rounded p-2 text-xs flex flex-col gap-1 transition-all ${changedCp0Registers.has(12) ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                  <span className="font-mono font-bold text-purple-800">SR (12)</span>
                  <span className="font-mono text-slate-600">{toHex(cp0Registers?.find(r => r.name === 'SR')?.value || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" title="Interrupt Mask (15:10)">IM (15:10)</span>
                  <span className="font-mono text-slate-700">{(((cp0Registers?.find(r => r.name === 'SR')?.value || 0) >>> 10) & 0x3F).toString(2).padStart(6, '0')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" title="Exception Level (1)">EXL (1)</span>
                  <span className="font-mono text-slate-700">{((cp0Registers?.find(r => r.name === 'SR')?.value || 0) >>> 1) & 0x1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" title="Interrupt Enable (0)">IE (0)</span>
                  <span className="font-mono text-slate-700">{(cp0Registers?.find(r => r.name === 'SR')?.value || 0) & 0x1}</span>
                </div>
              </div>
              
              {/* Cause */}
              <div className={`border rounded p-2 text-xs flex flex-col gap-1 transition-all ${changedCp0Registers.has(13) ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                  <span className="font-mono font-bold text-purple-800">Cause (13)</span>
                  <span className="font-mono text-slate-600">{toHex(cp0Registers?.find(r => r.name === 'Cause')?.value || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" title="Branch Delay (31)">BD (31)</span>
                  <span className="font-mono text-slate-700">{((cp0Registers?.find(r => r.name === 'Cause')?.value || 0) >>> 31) & 0x1}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" title="Interrupt Pending (15:10)">IP (15:10)</span>
                  <span className="font-mono text-slate-700">{(((cp0Registers?.find(r => r.name === 'Cause')?.value || 0) >>> 10) & 0x3F).toString(2).padStart(6, '0')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500" title="Exception Code (6:2)">ExcCode (6:2)</span>
                  <span className="font-mono text-slate-700">{(((cp0Registers?.find(r => r.name === 'Cause')?.value || 0) >>> 2) & 0x1F).toString(2).padStart(5, '0')}</span>
                </div>
              </div>

              {/* EPC */}
              <div className={`border rounded p-2 text-xs flex flex-col gap-1 transition-all ${changedCp0Registers.has(14) ? 'bg-yellow-100 border-yellow-300' : 'bg-white border-slate-200'}`}>
                <div className="flex justify-between items-center border-b border-slate-100 pb-1 mb-1">
                  <span className="font-mono font-bold text-purple-800">EPC (14)</span>
                  <span className="font-mono text-slate-600">{toHex(cp0Registers?.find(r => r.name === 'EPC')?.value || 0)}</span>
                </div>
                <div className="text-slate-500 text-[10px] leading-tight">
                  记录异常处理结束后需要返回的 PC
                </div>
              </div>
            </div>

            {/* Timer Registers placed here */}
            <div ref={timersBlockRef}>
              <TimerView />
            </div>

          </div>
        </div>

        {/* Right Panel: Visualization State */}
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Tabs */}
          <div className="flex bg-slate-100 border-b border-slate-300 px-2 pt-2">
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'stackAndMemory' ? 'bg-white text-blue-600 border-t border-x border-slate-300 border-b-white translate-y-px' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('stackAndMemory')}
            >
              栈帧 & 内存管理
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium rounded-t-lg ${activeTab === 'interrupt' || interruptState.isActive ? 'bg-white text-amber-600 border-t border-x border-slate-300 border-b-white translate-y-px' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setActiveTab('interrupt')}
            >
              {interruptState.isActive && <span className="inline-block w-2 h-2 bg-amber-500 rounded-full mr-2 animate-pulse"></span>}
              中断处理过程
            </button>
          </div>

          {/* Tab Content */}
          <div 
            className="flex-1 overflow-auto p-4 bg-white relative"
            onScroll={() => {
              window.dispatchEvent(new Event('resize'));
            }}
          >
            
            {/* Tab 1: Stack & Memory */}
            {activeTab === 'stackAndMemory' && (
              <div className="flex h-full overflow-hidden relative">
                <div className="flex-1 flex flex-col items-center justify-start pt-2 p-4 relative" id="memory-layout-container">
                  <div className="flex flex-col w-full max-w-md items-center justify-start space-y-4 pb-4">
                    {/* Diagram Top */}
                    <div className="w-52 border-2 border-red-800 bg-white relative flex-shrink-0 ml-16">
                      
                      {/* MMIO */}
                      <div ref={mmioBlockRef} className="h-12 bg-purple-100 border-b border-slate-400 flex flex-col items-center justify-center relative">
                        <span className="text-blue-800 font-bold text-xs">MMIO</span>
                        <div className="absolute -left-20 -bottom-2 text-blue-800 font-mono text-[10px] bg-white/80 px-1 rounded">
                          {toHex(0x00007f00)}
                        </div>
                      </div>
                    
                      {/* Exception Handler */}
                      <div className="h-12 bg-orange-100 border-b border-slate-400 flex flex-col items-center justify-center relative">
                        <span className="text-blue-800 font-bold text-xs">Exception Handler</span>
                        <div className="absolute -left-20 -bottom-2 text-blue-800 font-mono text-[10px] bg-white/80 px-1 rounded">
                          {toHex(0x00004180)}
                        </div>
                        {/* PC Indicator (Exception Handler) */}
                        {pc >= 0x00004180 && (
                          <div 
                            className="absolute -left-[100px] flex items-center text-black font-bold font-mono text-[10px] transition-all duration-300 z-10 bg-white/80 px-1 rounded shadow-sm"
                            style={{ bottom: `${-8 + Math.min(40, Math.max(0, (pc - 0x00004180) / 4 * 4))}px` }}
                          >
                            PC <span className="text-red-600 mx-1">▶</span> {toHex(pc)}
                          </div>
                        )}
                      </div>
                    
                      {/* Text Segment */}
                      <div className="h-32 bg-yellow-100 border-b border-slate-400 flex flex-col items-center justify-center relative">
                        <span className="text-blue-800 font-bold text-xs">.text Segment</span>
                        <div className="absolute -left-20 -bottom-2 text-blue-800 font-mono text-[10px] bg-white/80 px-1 rounded">
                          {toHex(0x00003000)}
                        </div>
                        {/* PC Indicator */}
                        {pc < 0x00004180 && (
                          <div 
                            className="absolute -left-[100px] flex items-center text-black font-bold font-mono text-[10px] transition-all duration-300 z-10 bg-white/80 px-1 rounded shadow-sm"
                            style={{ bottom: `${-8 + Math.min(110, Math.max(0, (pc - 0x00003000) / 4 * 4))}px` }}
                          >
                            PC <span className="text-red-600 mx-1">▶</span> {toHex(pc)}
                          </div>
                        )}
                      </div>
                    
                      {/* Stack Segment */}
                      <div ref={stackBlockRef} className="h-24 bg-slate-300 border-b border-slate-400 flex flex-col items-center pt-2 relative">
                        <span className="text-blue-800 font-bold text-sm">Stack</span>
                        <div className="text-blue-800">↓</div>
                        <div className="absolute -left-20 -top-2 text-blue-800 font-mono text-[10px] bg-white/80 px-1 rounded">
                          {toHex(0x00003000)}
                        </div>
                        {/* SP Indicator */}
                        <div 
                          className="absolute -left-28 flex items-center text-black font-bold font-mono text-xs transition-all duration-300 z-10 bg-white/80 px-1 rounded shadow-sm"
                          style={{ top: `${Math.min(85, Math.max(0, (0x00002ffc - spVal) / 4 * 4))}px` }}
                        >
                          $sp <span className="text-red-600 mx-1">▶</span> {toHex(spVal)}
                        </div>
                      </div>
                    
                      {/* Heap Segment */}
                      <div className="h-16 bg-green-50 flex flex-col items-center justify-center border-b border-slate-400 relative">
                        <div className="text-blue-800 text-xs mb-1">↑</div>
                        <span className="text-blue-800 font-bold text-xs">Heap</span>
                        <div className="absolute -left-20 -bottom-2 text-blue-800 font-mono text-[10px] bg-white/80 px-1 rounded">
                          {toHex(0x00002000)}
                        </div>
                      </div>
                    
                      {/* Data Segment */}
                      <div ref={staticDataBlockRef} className="h-24 bg-blue-100 flex flex-col items-center justify-end pb-2 relative">
                        <span className="text-blue-800 text-xs mb-8">.data Segment</span>
                        <div className="absolute -left-[100px] top-2 flex items-center text-black font-bold font-mono text-[10px] bg-white/80 px-1 rounded shadow-sm">
                          $gp <span className="text-red-600 mx-1">▶</span> {toHex(0x00001800)}
                        </div>
                        <div className="absolute -left-20 -bottom-2 text-blue-800 font-mono text-[10px] bg-white/80 px-1 rounded">
                          {toHex(0x00000000)}
                        </div>
                      </div>
                    </div>
                    
                    {/* .data section view */}
                    <div className="w-full flex flex-col items-center mt-4 relative z-10 ml-16">
                      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">.data 段内存 (0x00000000)</h3>
                      <div 
                        ref={dataSegmentViewRef} 
                        className="w-52 border border-slate-300 bg-white rounded overflow-y-auto text-xs font-mono h-48 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] relative"
                        onScroll={() => {
                          // Manually trigger the update arrows effect when data segment scrolls
                          window.dispatchEvent(new Event('resize'));
                        }}
                      >
                        {/* We will display a few words from 0x00000000, growing upwards visually to match address increment */}
                        {Array.from({ length: dataWordCount }).map((_, i) => {
                          const offset = (dataWordCount - 1 - i) * 4;
                          const addr = 0x00000000 + offset;
                          const val = memory[addr];
                          const isChanged = changedMemory.has(addr);
                          return (
                            <div key={addr} className={`flex border-b border-slate-200 last:border-b-0 transition-all ${isChanged ? 'bg-yellow-100' : 'hover:bg-slate-50'}`}>
                              <div className="w-24 bg-slate-100 p-1 text-slate-500 border-r border-slate-200 text-center">
                                {toHex(addr)}
                              </div>
                              <div className={`flex-1 p-1 text-center ${isChanged ? 'text-yellow-800 font-bold' : 'text-slate-800'}`}>
                                {val !== undefined ? toHex(val) : '-'}
                              </div>
                            </div>
                          );
                        })}
                        <div className="p-2 text-center font-mono text-slate-400 text-xs sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-slate-200">↑ 向上增长 ↑</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Connecting Visual SVG */}
                <div ref={svgContainerRef} className="hidden lg:block fixed inset-0 pointer-events-none z-[60]" style={{ overflow: 'visible' }}>
                   <svg width="100%" height="100%" className="absolute inset-0" style={{ overflow: 'visible' }}>
                    <defs>
                      <marker id="arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                      </marker>
                      <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                      </marker>
                    </defs>
                    {/* Stack arrows */}
                    {/* Upper arrow: from top-right of Stack block to top-left of Stack View */}
                    <path d={arrowPaths.top} stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrow-red)" strokeDasharray="4 2" />
                    {/* Lower arrow: from bottom-right of Stack block to bottom-left of Stack View */}
                    <path d={arrowPaths.bottom} stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrow-red)" strokeDasharray="4 2" />
                    
                    {/* Data Segment arrows */}
                    <path d={arrowPaths.dataTop} stroke="#3b82f6" strokeWidth="2" fill="none" markerEnd="url(#arrow-blue)" strokeDasharray="4 2" />
                    <path d={arrowPaths.dataBottom} stroke="#3b82f6" strokeWidth="2" fill="none" markerEnd="url(#arrow-blue)" strokeDasharray="4 2" />

                    {/* MMIO arrow to Timers */}
                    <path d={arrowPaths.mmioArrow} stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrow-red)" strokeDasharray="4 2" />
                  </svg>
                </div>

                {/* Stack View */}
                <div 
                  ref={stackViewRef} 
                  className="w-56 flex-shrink-0 flex flex-col border-l border-slate-200 p-4 bg-slate-50 overflow-y-auto relative z-10 shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)]"
                  onScroll={() => {
                    window.dispatchEvent(new Event('resize'));
                  }}
                >
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 text-center">当前栈帧 (Stack)</h3>
                  <div className="flex-1 flex justify-center bg-slate-50 rounded border border-slate-200 p-4 overflow-hidden">
                    <div className="w-full border-2 border-slate-400 bg-white relative text-sm overflow-y-auto">
                      {stackCells.map((cell) => {
                        const isChanged = cell.value !== undefined && changedMemory.has(cell.address);
                        return (
                        <div key={cell.address} className={`border-b border-dashed border-slate-300 p-2 text-center font-mono relative h-12 flex flex-col justify-center transition-all ${isChanged ? 'bg-yellow-100' : ''}`}>
                          {cell.isSp && (
                            <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex items-center text-red-500 font-mono text-xs font-bold z-10">
                              $sp <ArrowRight size={14} />
                            </div>
                          )}
                          <span className="text-slate-400 text-[10px] block absolute top-1 left-1">{toHex(cell.address)}</span>
                          
                           {spVal !== 0 && cell.address >= alignedSpVal && (
                             <span className="text-slate-300 text-[9px] block absolute bottom-1 left-1">
                               {cell.address - alignedSpVal}($sp)
                             </span>
                           )}
                           
                           <span className={`font-bold ${isChanged ? 'text-yellow-800' : 'text-slate-800'}`}>
                             {cell.value !== undefined ? toHex(cell.value) : '-'}
                           </span>
                         </div>
                        );
                      })}
                      <div className="p-2 text-center font-mono text-slate-400 text-xs">
                        ↓ 向下增长 ↓
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Interrupt Handling */}
            {activeTab === 'interrupt' && (
              <div className="h-full flex flex-col p-4 overflow-auto">
                <h2 className="text-2xl font-bold text-center mb-8 text-slate-800">中断处理I/O的基本过程示例</h2>
                
                <div className="flex flex-1">
                  <div className="w-1/2 p-4">
                    <div className="space-y-4 text-sm font-medium">
                      {[
                        "1) 设备向cpu发出中断请求信号",
                        "2) cpu执行完sub后，将sub下一条指令的PC值保存好",
                        "3) cpu自动将ISR的首地址加载到PC中，从而实现跳转",
                        "4) cpu执行ISR完成输入输出等操作",
                        "5) cpu执行eret指令实现从ISR返回"
                      ].map((text, i) => (
                        <div key={i} className="flex items-start">
                          <span className="inline-block w-2.5 h-2.5 bg-green-500 mr-3 mt-1 shrink-0"></span>
                          <span className={`${interruptState.step === i + 1 ? 'text-blue-600 font-bold' : 'text-slate-700'}`}>
                            {text}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-start pl-5 text-xs text-slate-500 italic mt-2">
                        <span className="mr-2">◆</span>
                        eret功能之一是将保存的PC值写入PC
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-1/2 flex justify-center items-center relative p-8">
                    {/* Container for Arrows and Stack to ensure alignment */}
                    <div className="relative flex items-center h-[400px]">
                      
                      {/* Middle Layer: Labels and Arrows (mimicking PowerPoint style) */}
                      <div className="w-48 h-full relative pointer-events-none z-20 mr-2">
                        <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                          <defs>
                            <marker id="arrowRed" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                              <path d="M 0 0 L 10 5 L 0 10 z" fill="red" />
                            </marker>
                          </defs>

                          {/* 1) 中断请求有效 -> sub (60px) */}
                          {interruptState.step >= 1 && (
                            <line x1="140" y1="60" x2="188" y2="60" stroke="red" strokeWidth="2" markerEnd="url(#arrowRed)" />
                          )}

                          {/* 2) 保存PC -> and (100px) */}
                          {interruptState.step >= 2 && (
                            <line x1="140" y1="100" x2="188" y2="100" stroke="red" strokeWidth="2" markerEnd="url(#arrowRed)" />
                          )}

                          {/* Vertical arrow from Step 2 to Step 3 */}
                          {interruptState.step >= 3 && (
                            <line x1="110" y1="120" x2="110" y2="140" stroke="red" strokeWidth="2" markerEnd="url(#arrowRed)" />
                          )}

                          {/* 3) 跳转ISR -> lw (220px) */}
                          {interruptState.step >= 3 && (
                            <path d="M 140,160 L 160,160 L 160,220 L 188,220" stroke="red" strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />
                          )}

                          {/* 5) Return: eret (340px) -> and (100px) */}
                          {interruptState.step >= 5 && (
                            <path d="M 188,340 L 175,340 L 175,100 L 188,100" stroke="red" strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />
                          )}
                        </svg>

                        {/* Labels - positioned to align with PowerPoint layout */}
                        {interruptState.step >= 1 && (
                          <div className="absolute top-[50px] left-0 w-full text-right pr-12 text-black font-bold text-xs whitespace-nowrap">
                            1) 中断请求有效
                          </div>
                        )}
                        
                        {interruptState.step >= 2 && (
                          <div className="absolute top-[90px] left-0 w-full text-right pr-12 text-black font-bold text-xs whitespace-nowrap">
                            2) 保存PC
                          </div>
                        )}
                        
                        {interruptState.step >= 3 && (
                          <div className="absolute top-[150px] left-0 w-full text-right pr-12 text-black font-bold text-xs whitespace-nowrap">
                            3) 跳转ISR
                          </div>
                        )}
                        
                        {interruptState.step >= 4 && (
                          <div className="absolute top-[210px] left-0 w-full text-right pr-12 text-black font-bold text-xs whitespace-nowrap">
                            4) 执行ISR
                          </div>
                        )}
                      </div>

                      {/* Execution Stack */}
                      <div className="w-24 border-2 border-black font-mono text-center text-xs relative bg-white z-10 shrink-0">
                        <div className="absolute -right-8 top-[1.5rem] text-black font-bold tracking-widest text-[10px]" style={{ writingMode: 'vertical-rl' }}>用户程序</div>                   
                        {/* User Program */}
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#E6F3F7]">add</div>
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#E6F3F7]">sub</div>
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#E6F3F7] ring-2 ring-red-500 ring-inset text-green-600 font-bold">and</div>
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#E6F3F7]">or</div>
                        
                        {/* Gap */}
                        <div className="h-10 border-b border-black bg-white"></div>
                        
                        {/* ISR Program */}
                        <div className="absolute -right-10 bottom-[1.5rem] text-black font-bold text-[10px]">ISR</div>
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#FEF2E4]">lw</div>
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#FEF2E4]">store</div>
                        <div className="h-10 border-b border-black flex items-center justify-center bg-[#FEF2E4]">...</div>
                        <div className="h-10 flex items-center justify-center bg-[#FEF2E4] text-green-600 font-bold">eret</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default IdePage;
