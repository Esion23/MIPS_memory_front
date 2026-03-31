const fs = require('fs');

try {
  // 1. Refactor Ide.tsx
  let ide = fs.readFileSync('src/pages/Ide.tsx', 'utf8');
  ide = ide.replace("import Editor from '@monaco-editor/react';\n", "");
  ide = ide.replace("    cCode, setCCode,\n", "");
  ide = ide.replace("C -{'>'} MIPS -{'>'} 执行可视化", "MIPS 执行可视化");

  const leftPanelRegex = /\{\/\* Left Panel: Editors \(C and MIPS\) \*\/\}[\s\S]*?ref=\{codeContainerRef\}>/;
  const leftPanelReplacement = `{/* Left Panel: MIPS Code */}
        <div className="w-5/12 flex flex-col border-r border-slate-300 shadow-sm z-10 bg-white">
          <div className="bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 uppercase tracking-wider flex justify-between">
            <span>MIPS Assembly</span>
          </div>
          <div className="flex-1 overflow-auto font-mono text-sm p-2" ref={codeContainerRef}>`;
  
  ide = ide.replace(leftPanelRegex, leftPanelReplacement);
  fs.writeFileSync('src/pages/Ide.tsx', ide);
  console.log('Ide.tsx updated successfully.');

  // 2. Refactor useMipsStore.ts
  let store = fs.readFileSync('src/store/useMipsStore.ts', 'utf8');

  // Remove cCode from EXAMPLES
  store = store.replace(/\s*cCode:\s*`[\s\S]*?`,\n/g, '\n');

  // Update MipsState interface
  store = store.replace("  cCode: string;\n  mipsCode: string;\n", "  mipsCode: string;\n");
  store = store.replace("  setCCode: (code: string) => void;\n  compileToMips: () => void;\n", "  setMipsCode: (code: string) => void;\n");

  // Update store initialization
  store = store.replace("    cCode: EXAMPLES[0].cCode,\n    mipsCode: EXAMPLES[0].mipsCode,\n", "    mipsCode: EXAMPLES[0].mipsCode,\n");

  // Update methods
  const compileToMipsRegex = /\s*setCCode: \(code\) => set\(\{ cCode: code \}\),[\s\S]*?compileToMips: \(\) => \{[\s\S]*?isPlaying: false,\n\s*\}\);\n\s*\},/;
  
  const setMipsCodeReplacement = `
    setMipsCode: (code) => {
      const parsed = parseMipsToInstructions(code);
      set({
        mipsCode: code,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        memory: {},
        pc: 0x00400000,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
        interruptState: { isActive: false, step: 0, savedPc: 0 }
      });
    },`;

  store = store.replace(compileToMipsRegex, setMipsCodeReplacement);

  store = store.replace("      set({\n        cCode: ex.cCode,\n        mipsCode: ex.mipsCode,\n", "      set({\n        mipsCode: ex.mipsCode,\n");

  fs.writeFileSync('src/store/useMipsStore.ts', store);
  console.log('useMipsStore.ts updated successfully.');

} catch (err) {
  console.error('Error during refactoring:', err);
}
