const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'CO_assistant', 'stack', 'danzhouqi', 'src', 'store', 'useMipsStore.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Import piplineClient
content = content.replace(
  "import { create } from 'zustand';",
  "import { create } from 'zustand';\nimport { piplineClient } from '../api/piplineClient';"
);

// 2. Add extractTextSegment function
const extractTextSegmentFn = `
function extractTextSegment(expandedMips: string): string {
  const lines = expandedMips.split('\\n');
  const textLines: string[] = [];
  let inDataSection = false;

  lines.forEach(line => {
    let text = line.trim();
    if (text === '.data') {
      inDataSection = true;
      return;
    }
    if (text === '.text') {
      inDataSection = false;
      return;
    }
    if (!inDataSection) {
      textLines.push(line);
    }
  });

  return textLines.join('\\n');
}

function toHexString(num: number): string {
  let hex = num.toString(16);
  // Pad with leading zeros to 8 chars
  return hex.padStart(8, '0');
}
`;

content = content.replace(
  "function parseMipsToInstructions(mips: string)",
  extractTextSegmentFn + "\nfunction parseMipsToInstructions(mips: string)"
);

// 3. Change PC base
content = content.replace(
  "let currentAddress = 0x00400000;",
  "let currentAddress = 0x00003000;"
);

// 4. Helper to prepare pipline payload
const preparePayloadFn = `
const preparePiplinePayload = (expandedMips: string, memoryRecord: Record<number, number>) => {
  const asm_source = extractTextSegment(expandedMips);
  const initial_memory: Record<string, string> = {};
  for (const [addr, val] of Object.entries(memoryRecord)) {
    initial_memory[toHexString(parseInt(addr, 10))] = toHexString(val);
  }
  const initial_registers: Record<string, string> = {
    '28': toHexString(0x10008000), // gp
    '29': toHexString(0x7FFFFFFC)  // sp
  };
  return { asm_source, initial_memory, initial_registers };
};
`;

content = content.replace(
  "export const useMipsStore = create<MipsState>((set, get) => {",
  preparePayloadFn + "\nexport const useMipsStore = create<MipsState>((set, get) => {"
);

// 5. Update compileToMips, loadExample, setSourceMipsCode to be async and call backend
content = content.replace(
  "setSourceMipsCode: (code) => {",
  "setSourceMipsCode: async (code) => {"
);
content = content.replace(
  "compileToMips: () => {",
  "compileToMips: async () => {"
);
content = content.replace(
  "loadExample: (index: number) => {",
  "loadExample: async (index: number) => {"
);

// For each of the three, we need to inject the piplineClient call
const injectPiplineLoad = `
      const payload = preparePiplinePayload(expanded, memory);
      try {
        await piplineClient.load_program(payload.asm_source, payload.initial_memory, payload.initial_registers);
      } catch (e) {
        console.error("Failed to load program to pipline backend:", e);
      }
`;

// It's easier to just replace the set({ ... }) block in each
content = content.replace(
  /set\(\{\s+sourceMipsCode: code,[\s\S]*?interruptState: \{ isActive: false, step: 0, savedPc: 0 \}\s+\}\);/g,
  `$&\n${injectPiplineLoad}`
);

content = content.replace(
  /set\(\{\s+sourceMipsCode: example\.mipsCode,[\s\S]*?isPlaying: false,\s+\}\);/g,
  `$&\n${injectPiplineLoad}`
);

content = content.replace(
  /set\(\{\s+cCode: ex\.cCode,[\s\S]*?interruptState: \{ isActive: false, step: 0, savedPc: 0 \}\s+\}\);/g,
  `$&\n${injectPiplineLoad}`
);

// Fix initial pc in the store:
content = content.replace(/pc: 0x00400000/g, "pc: 0x00003000");

// 6. Update stepExecution
const newStepExecution = `
    stepExecution: async () => {
      try {
        const snap = await piplineClient.step_cycle() as any;
        
        const newRegisters = JSON.parse(JSON.stringify(get().registers)) as Register[];
        for (const [idxStr, regInfo] of Object.entries(snap.registers || {})) {
          const idx = parseInt(idxStr, 10);
          if (newRegisters[idx] && (regInfo as any).value) {
            newRegisters[idx].value = parseInt((regInfo as any).value, 16);
          }
        }
        
        const newMemory = { ...get().memory };
        for (const [addrHex, valHex] of Object.entries(snap.memory || {})) {
          newMemory[parseInt(addrHex, 16)] = parseInt(valHex as string, 16);
        }
        
        const nextPc = parseInt(snap.pc, 16);
        
        const { instructions } = get();
        let nextUiIndex = instructions.findIndex(inst => inst.address === nextPc && inst.type === 'code');
        if (nextUiIndex === -1) {
          nextUiIndex = instructions.length;
        }
        
        set({
          registers: newRegisters,
          memory: newMemory,
          pc: nextPc,
          currentInstructionIndex: nextUiIndex,
          isPlaying: !snap.outofbound && get().isPlaying
        });
        
        if (snap.outofbound) {
          set({ isPlaying: false });
        }
      } catch (e) {
        console.error("Simulation step error:", e);
        set({ isPlaying: false });
      }
    },
`;

// Replace old stepExecution
content = content.replace(
  /stepExecution: \(\) => \{[\s\S]*?resetExecution: \(\) => \{/,
  `${newStepExecution.trim()}\n    \n    resetExecution: async () => {`
);

// 7. Update resetExecution
const newResetExecution = `
    resetExecution: async () => {
      const { sourceMipsCode } = get();
      const { memory } = parseInitialMemory(sourceMipsCode);
      const expanded = expandPseudoInstructions(sourceMipsCode);
      const payload = preparePiplinePayload(expanded, memory);
      try {
        await piplineClient.reset();
        await piplineClient.load_program(payload.asm_source, payload.initial_memory, payload.initial_registers);
      } catch (e) {
        console.error("Failed to reset program on pipline backend:", e);
      }

      set({
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        memory,
        pc: 0x00003000,
        delayedPc: null,
        currentInstructionIndex: Math.max(0, get().instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
      });
    },
`;

content = content.replace(
  /resetExecution: async \(\) => \{[\s\S]*?togglePlay: \(\) => set/,
  `${newResetExecution.trim()}\n    \n    togglePlay: () => set`
);


fs.writeFileSync(filePath, content);
console.log("Successfully updated useMipsStore.ts");
