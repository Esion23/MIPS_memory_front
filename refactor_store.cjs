const fs = require('fs');
const path = 'd:/CO_assistant/stack/src/store/useMipsStore.ts';

let code = fs.readFileSync(path, 'utf8');

// 1. Add pseudo instruction parser
const helperFunctions = `
function parseInitialMemory(mips: string): { memory: Record<number, number>, dataLabels: Record<string, number> } {
  const memory: Record<number, number> = {};
  const dataLabels: Record<string, number> = {};
  let inDataSection = false;
  let currentDataAddress = 0x10000000;
  
  mips.split('\\n').forEach(line => {
    let text = line.trim();
    if (text === '.data') {
      inDataSection = true;
      return;
    }
    if (text === '.text') {
      inDataSection = false;
      return;
    }
    if (inDataSection) {
      // Extract label if present
      let labelName = '';
      if (text.includes(':')) {
        const parts = text.split(':');
        labelName = parts[0].trim();
        dataLabels[labelName] = currentDataAddress;
        text = parts.slice(1).join(':').trim();
      }
      
      const match = text.match(/\\.word\\s+(.+)/);
      if (match) {
        let valuesStr = match[1];
        const cIdx = valuesStr.indexOf('#');
        if (cIdx !== -1) {
          valuesStr = valuesStr.substring(0, cIdx);
        }
        const values = valuesStr.split(',').map(v => parseInt(v.trim(), 10));
        values.forEach(val => {
          if (!isNaN(val)) {
            memory[currentDataAddress] = val;
            currentDataAddress += 4;
          }
        });
      }
    }
  });
  return { memory, dataLabels };
}

function expandPseudoInstructions(mips: string): string {
  const { dataLabels } = parseInitialMemory(mips);
  const lines = mips.split('\\n');
  const expandedLines: string[] = [];
  let inDataSection = false;

  lines.forEach(line => {
    let text = line.trim();
    const cIdx = text.indexOf('#');
    let comment = '';
    if (cIdx !== -1) {
      comment = line.substring(cIdx);
      text = text.substring(0, cIdx).trim();
    }
    
    if (text === '.data') {
      inDataSection = true;
      expandedLines.push(line);
      return;
    } else if (text === '.text') {
      inDataSection = false;
      expandedLines.push(line);
      return;
    }
    
    if (inDataSection || !text) {
      expandedLines.push(line);
      return;
    }
    
    let prefix = '';
    if (text.includes(':')) {
      const colonIdx = text.indexOf(':');
      prefix = text.substring(0, colonIdx + 1) + ' ';
      text = text.substring(colonIdx + 1).trim();
      if (!text) {
        expandedLines.push(line);
        return;
      }
    }
    
    const parts = text.split(/[\\s,]+/).filter(Boolean);
    const op = parts[0];
    
    // expand la
    if (op === 'la' && parts.length === 3) {
      const reg = parts[1];
      const label = parts[2];
      if (dataLabels[label] !== undefined) {
        const addrHex = '0x' + dataLabels[label].toString(16).toUpperCase();
        expandedLines.push(\`\${prefix}li   \${reg}, \${addrHex} \${comment}\`);
      } else {
        expandedLines.push(line);
      }
    } 
    // expand lw with label
    else if (op === 'lw' && parts.length === 3 && !parts[2].includes('(') && isNaN(parseInt(parts[2]))) {
      const reg = parts[1];
      const label = parts[2];
      if (dataLabels[label] !== undefined) {
        const addrHex = '0x' + dataLabels[label].toString(16).toUpperCase();
        if (prefix) expandedLines.push(\`\${prefix}\`);
        expandedLines.push(\`  li   $at, \${addrHex} \${comment}\`);
        expandedLines.push(\`  lw   \${reg}, 0($at)\`);
      } else {
        expandedLines.push(line);
      }
    }
    // expand sw with label
    else if (op === 'sw' && parts.length === 3 && !parts[2].includes('(') && isNaN(parseInt(parts[2]))) {
      const reg = parts[1];
      const label = parts[2];
      if (dataLabels[label] !== undefined) {
        const addrHex = '0x' + dataLabels[label].toString(16).toUpperCase();
        if (prefix) expandedLines.push(\`\${prefix}\`);
        expandedLines.push(\`  li   $at, \${addrHex} \${comment}\`);
        expandedLines.push(\`  sw   \${reg}, 0($at)\`);
      } else {
        expandedLines.push(line);
      }
    } 
    else {
      expandedLines.push(line);
    }
  });

  return expandedLines.join('\\n');
}
`;

code = code.replace(/function parseMipsToInstructions/g, helperFunctions + '\nfunction parseMipsToInstructions');

// 2. Update EXAMPLES
code = code.replace(/li\s+\$t8,\s+0x10000000/g, 'la   $t8, array');
code = code.replace(/li\s+\$t1,\s+0\s*\n\s*sw\s+\$t1,\s+12\(\$t8\)/g, 'li   $t1, 0\n  sw   $t1, sum');
code = code.replace(/lw\s+\$t1,\s+12\(\$t8\)\s*# load sum from \.data\s*\n\s*add\s+\$t1,\s+\$t1,\s+\$t7\s*\n\s*sw\s+\$t1,\s+12\(\$t8\)\s*# store sum back to \.data/g, 'lw   $t1, sum         # load sum from .data\n  add  $t1, $t1, $t7\n  sw   $t1, sum         # store sum back to .data');
code = code.replace(/lw\s+\$v0,\s+12\(\$t8\)\s*# return sum/g, 'lw   $v0, sum         # return sum');

// 3. Update interface MipsState
code = code.replace('cCode: string;\n  mipsCode: string;', 'cCode: string;\n  sourceMipsCode: string;\n  mipsCode: string;');
code = code.replace('setMipsCode: (code: string) => void;', 'setSourceMipsCode: (code: string) => void;\n  setMipsCode: (code: string) => void;');

// 4. Update useMipsStore create
const initReplacement = `
  const initialSource = EXAMPLES[0].mipsCode;
  const initialExpanded = expandPseudoInstructions(initialSource);
  const initialParse = parseMipsToInstructions(initialExpanded);
  const initialStartIndex = Math.max(0, initialParse.instructions.findIndex(i => i.type === 'code'));
  
  const { memory: initialMemory } = parseInitialMemory(initialSource);
`;
code = code.replace(/const initialParse = parseMipsToInstructions\(EXAMPLES\[0\]\.mipsCode\);\s*const initialStartIndex = Math\.max\(0, initialParse\.instructions\.findIndex\(i => i\.type === 'code'\)\);\s*\/\/[^\n]*\s*const initialMemory: Record<number, number> = {};\s*let inDataSectionInitial = false;\s*let currentDataAddressInitial = 0x10000000;\s*EXAMPLES\[0\]\.mipsCode\.split\('\\n'\)\.forEach\(line => {[\s\S]*?}\);\s*}/g, initReplacement);

// Fix the return object in create
code = code.replace('cCode: EXAMPLES[0].cCode,\n    mipsCode: EXAMPLES[0].mipsCode,', 'cCode: EXAMPLES[0].cCode,\n    sourceMipsCode: initialSource,\n    mipsCode: initialExpanded,');

// Fix setMipsCode to setSourceMipsCode
const setSourceMipsCodeReplacement = `
    setSourceMipsCode: (code) => {
      const expanded = expandPseudoInstructions(code);
      const parsed = parseMipsToInstructions(expanded);
      const { memory } = parseInitialMemory(code);

      set({
        sourceMipsCode: code,
        mipsCode: expanded,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        memory,
        pc: 0x00400000,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
        interruptState: { isActive: false, step: 0, savedPc: 0 }
      });
    },
    
    setMipsCode: (code) => set({ mipsCode: code }),
`;

code = code.replace(/setMipsCode: \(code\) => \{[\s\S]*?interruptState: \{ isActive: false, step: 0, savedPc: 0 \}\s*}\);\s*},/g, setSourceMipsCodeReplacement);

// Fix compileToMips
const compileToMipsReplacement = `
    compileToMips: () => {
      const example = EXAMPLES.find(e => get().cCode.includes(e.cCode.substring(0, 20))) || EXAMPLES[0];
      const expanded = expandPseudoInstructions(example.mipsCode);
      const parsed = parseMipsToInstructions(expanded);
      const { memory } = parseInitialMemory(example.mipsCode);
      set({
        sourceMipsCode: example.mipsCode,
        mipsCode: expanded,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        memory,
        pc: 0x00400000,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
      });
    },
`;
code = code.replace(/compileToMips: \(\) => \{[\s\S]*?isPlaying: false,\s*}\);\s*},/g, compileToMipsReplacement);

// Fix loadExample
const loadExampleReplacement = `
    loadExample: (index: number) => {
      const ex = EXAMPLES[index];
      const expanded = expandPseudoInstructions(ex.mipsCode);
      const parsed = parseMipsToInstructions(expanded);
      const { memory } = parseInitialMemory(ex.mipsCode);

      set({
        cCode: ex.cCode,
        sourceMipsCode: ex.mipsCode,
        mipsCode: expanded,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        memory,
        pc: 0x00400000,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
        interruptState: { isActive: false, step: 0, savedPc: 0 }
      });
    },
`;
code = code.replace(/loadExample: \(index: number\) => \{[\s\S]*?interruptState: \{ isActive: false, step: 0, savedPc: 0 \}\s*}\);\s*},/g, loadExampleReplacement);

// Fix resetExecution
const resetExecutionReplacement = `
    resetExecution: () => {
      const { sourceMipsCode } = get();
      const { memory } = parseInitialMemory(sourceMipsCode);

      set({
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        memory,
        pc: 0x00400000,
        currentInstructionIndex: Math.max(0, get().instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
      });
    },
`;
code = code.replace(/resetExecution: \(\) => \{[\s\S]*?isPlaying: false,\s*}\);\s*},/g, resetExecutionReplacement);


fs.writeFileSync(path, code, 'utf8');
