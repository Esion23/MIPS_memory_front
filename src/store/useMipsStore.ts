import { create } from 'zustand';

export interface Register {
  name: string;
  value: number;
  description: string;
}

export interface MemorySegment {
  name: string;
  startAddress: number;
  endAddress: number;
  size: number;
  color: string;
  description: string;
}

export const MEMORY_SEGMENTS: MemorySegment[] = [
  { name: 'Stack', startAddress: 0x7FFFFFFF, endAddress: 0x70000000, size: 256 * 1024 * 1024, color: 'bg-gray-300', description: '向下增长，存储局部变量和返回地址' },
  { name: 'Dynamic data (Heap)', startAddress: 0x10010000, endAddress: 0x6FFFFFFF, size: 1.5 * 1024 * 1024 * 1024, color: 'bg-blue-100', description: '向上增长，动态分配的内存 (malloc)' },
  { name: 'Static data', startAddress: 0x10000000, endAddress: 0x1000FFFF, size: 64 * 1024, color: 'bg-blue-200', description: '全局变量和静态变量，gp通常指向 0x10008000' },
  { name: 'Text (Code)', startAddress: 0x00400000, endAddress: 0x0FFFFFFF, size: 252 * 1024 * 1024, color: 'bg-yellow-100', description: '存储程序指令，PC初始值为 0x00400000' },
  { name: 'Reserved', startAddress: 0x00000000, endAddress: 0x003FFFFF, size: 4 * 1024 * 1024, color: 'bg-red-200', description: '操作系统保留区域' },
];

export const INITIAL_REGISTERS: Register[] = [
  { name: '$zero', value: 0, description: '始终为0' },
  { name: '$at', value: 0, description: '汇编器保留' },
  { name: '$v0', value: 0, description: '返回值' },
  { name: '$v1', value: 0, description: '返回值' },
  { name: '$a0', value: 0, description: '参数0' },
  { name: '$a1', value: 0, description: '参数1' },
  { name: '$a2', value: 0, description: '参数2' },
  { name: '$a3', value: 0, description: '参数3' },
  { name: '$t0', value: 0, description: '临时变量' },
  { name: '$t1', value: 0, description: '临时变量' },
  { name: '$t2', value: 0, description: '临时变量' },
  { name: '$t3', value: 0, description: '临时变量' },
  { name: '$t4', value: 0, description: '临时变量' },
  { name: '$t5', value: 0, description: '临时变量' },
  { name: '$t6', value: 0, description: '临时变量' },
  { name: '$t7', value: 0, description: '临时变量' },
  { name: '$s0', value: 0, description: '保存的变量' },
  { name: '$s1', value: 0, description: '保存的变量' },
  { name: '$s2', value: 0, description: '保存的变量' },
  { name: '$s3', value: 0, description: '保存的变量' },
  { name: '$s4', value: 0, description: '保存的变量' },
  { name: '$s5', value: 0, description: '保存的变量' },
  { name: '$s6', value: 0, description: '保存的变量' },
  { name: '$s7', value: 0, description: '保存的变量' },
  { name: '$t8', value: 0, description: '临时变量' },
  { name: '$t9', value: 0, description: '临时变量' },
  { name: '$k0', value: 0, description: '操作系统内核保留' },
  { name: '$k1', value: 0, description: '操作系统内核保留' },
  { name: '$gp', value: 0x10008000, description: '全局指针' },
  // 教学中为了严谨和可视化的字对齐，我们直接将 $sp 初始化为 0x7FFFFFFC
  // 因为 0x7FFFFFFF 在 MIPS 中虽然是用户空间最高地址，但实际存字(word)时必须字对齐
  { name: '$sp', value: 0x7FFFFFFC, description: '栈指针' },
  { name: '$fp', value: 0x7FFFFFFC, description: '帧指针' },
  { name: '$ra', value: 0, description: '返回地址' },
];

export interface Instruction {
  id: string;
  address: number;
  text: string;
  type: 'code' | 'label' | 'comment' | 'directive';
  isInterrupt?: boolean;
}

export interface InterruptState {
  isActive: boolean;
  step: number; // 0: Idle, 1: Request, 2: Save PC, 3: Jump ISR, 4: Exec ISR, 5: Return
  savedPc: number;
}

interface MipsState {
  cCode: string;
  sourceMipsCode: string;
  mipsCode: string;
  instructions: Instruction[];
  labels: Record<string, number>;
  
  registers: Register[];
  memory: Record<number, number>; // address -> value (word)
  pc: number;
  isPlaying: boolean;
  currentInstructionIndex: number;
  
  interruptState: InterruptState;
  
  setCCode: (code: string) => void;
  setSourceMipsCode: (code: string) => void;
  setMipsCode: (code: string) => void;
  compileToMips: () => void;
  stepExecution: () => void;
  resetExecution: () => void;
  togglePlay: () => void;
  
  triggerInterrupt: () => void;
  stepInterrupt: () => void;
  resetInterrupt: () => void;
  loadExample: (index: number) => void;
}

export const EXAMPLES = [
  {
    name: "基本加法调用",
    cCode: `int main() {
  int a = 5;
  int b = 10;
  int c = add(a, b);
  return 0;
}

int add(int x, int y) {
  return x + y;
}`,
    mipsCode: `.text
main:
  # prologue (need 16 bytes for $ra, a, b, c)
  addi $sp, $sp, -16
  sw   $ra, 12($sp)
  
  # a = 5
  li   $t0, 5
  sw   $t0, 8($sp)
  
  # b = 10
  li   $t0, 10
  sw   $t0, 4($sp)
  
  # call add(a, b)
  lw   $a0, 8($sp)
  lw   $a1, 4($sp)
  jal  add
  sw   $v0, 0($sp) # c = add(a,b)
  
  # epilogue
  li   $v0, 0
  lw   $ra, 12($sp)
  addi $sp, $sp, 16
  jr   $ra

add:
  # prologue (no need to allocate stack, just leaf function)
  # x + y
  add  $v0, $a0, $a1
  
  # epilogue
  jr   $ra`
  },
  {
    name: "数组求和循环",
    cCode: `int main() {
  int arr[3] = {1, 2, 3};
  int sum = 0;
  for(int i = 0; i < 3; i++) {
    sum += arr[i];
  }
  return sum;
}`,
    mipsCode: `.data
array:  .word 10, 20, 30
sum:    .word 0

.text
main:
  # prologue
  addi $sp, $sp, -24
  sw   $ra, 20($sp)
  
  # i = 0
  li   $t2, 0
  sw   $t2, 0($sp)
  
  # load base address of array into $t8 (simulating .data at 0x10000000)
  # Actually, we will just use absolute addresses for simplicity in this emulator
  # array is at 0x10000000, sum is at 0x1000000C
  la   $t8, array
  
  # init sum in memory to 0
  li   $t1, 0
  sw   $t1, sum

loop_start:
  lw   $t2, 0($sp)
  li   $t3, 3
  slt  $t4, $t2, $t3
  beq  $t4, $zero, loop_end
  
  # sum += array[i]
  sll  $t5, $t2, 2
  add  $t6, $t8, $t5
  lw   $t7, 0($t6)      # load array[i] from .data
  
  lw   $t1, sum         # load sum from .data
  add  $t1, $t1, $t7
  sw   $t1, sum         # store sum back to .data
  
  # i++
  lw   $t2, 0($sp)
  addi $t2, $t2, 1
  sw   $t2, 0($sp)
  j    loop_start

loop_end:
  lw   $v0, sum         # return sum
  lw   $ra, 20($sp)
  addi $sp, $sp, 24
  jr   $ra`
  },
  {
    name: "斐波那契递归调用",
    cCode: `int main() {
  int result = fib(3);
  return result;
}

int fib(int n) {
  if (n == 0) return 0;
  if (n == 1) return 1;
  return fib(n - 1) + fib(n - 2);
}`,
    mipsCode: `.text
main:
  # prologue (need 8 bytes for $ra and local var 'result')
  addi $sp, $sp, -8
  sw   $ra, 4($sp)

  # call fib(3)
  li   $a0, 3
  jal  fib
  
  # store result
  sw   $v0, 0($sp)
  
  # epilogue
  lw   $ra, 4($sp)
  addi $sp, $sp, 8
  jr   $ra

fib:
  # prologue (need 12 bytes: $ra, arg $a0, and space for temp fib(n-1))
  addi $sp, $sp, -12
  sw   $ra, 8($sp)
  
  # save arg n
  sw   $a0, 4($sp)
  
  # if (n == 0) return 0
  lw   $v1, 4($sp)
  bne  $v1, $zero, check_one
  li   $v0, 0
  j    fib_end
  
check_one:
  # if (n == 1) return 1
  lw   $v1, 4($sp)
  li   $t0, 1
  bne  $v1, $t0, recursive_case
  li   $v0, 1
  j    fib_end

recursive_case:
  # fib(n - 1)
  lw   $a0, 4($sp)
  addi $a0, $a0, -1
  jal  fib
  sw   $v0, 0($sp)  # save fib(n-1) result
  
  # fib(n - 2)
  lw   $a0, 4($sp)
  addi $a0, $a0, -2
  jal  fib
  
  # return fib(n-1) + fib(n-2)
  lw   $t1, 0($sp)
  add  $v0, $t1, $v0

fib_end:
  # epilogue
  lw   $ra, 8($sp)
  addi $sp, $sp, 12
  jr   $ra`
  }
];


function parseInitialMemory(mips: string): { memory: Record<number, number>, dataLabels: Record<string, number> } {
  const memory: Record<number, number> = {};
  const dataLabels: Record<string, number> = {};
  let inDataSection = false;
  let currentDataAddress = 0x10000000;
  
  mips.split('\n').forEach(line => {
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
      
      const match = text.match(/\.word\s+(.+)/);
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
  const lines = mips.split('\n');
  const expandedLines: string[] = [];
  let inDataSection = false;

  lines.forEach(line => {
    const indentMatch = line.match(/^\s*/);
    const indent = indentMatch ? indentMatch[0] : '';
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
    
    const parts = text.split(/[\s,]+/).filter(Boolean);
    const op = parts[0];

    const formatInst = (mnemonic: string, args: string) => {
      const paddedMnemonic = mnemonic.padEnd(5, ' ');
      return `${indent}${prefix}${paddedMnemonic}${args}`;
    };

    const formatInstNoPrefix = (mnemonic: string, args: string) => {
      const paddedMnemonic = mnemonic.padEnd(5, ' ');
      const prefixPadding = ' '.repeat(prefix.length);
      // Ensure there is at least a default indent (2 spaces) if the original line had none but it's an instruction
      const actualIndent = indent || '  ';
      return `${actualIndent}${prefixPadding}${paddedMnemonic}${args}`;
    };
    
    // expand la
    if (op === 'la' && parts.length === 3) {
      const reg = parts[1];
      const label = parts[2];
      if (dataLabels[label] !== undefined) {
        const addrHex = '0x' + dataLabels[label].toString(16).toUpperCase();
        expandedLines.push(`${formatInst('li', `${reg}, ${addrHex}`)} ${comment}`.trimEnd());
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
        expandedLines.push(`${formatInst('li', `$at, ${addrHex}`)} ${comment}`.trimEnd());
        expandedLines.push(formatInstNoPrefix('lw', `${reg}, 0($at)`));
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
        expandedLines.push(`${formatInst('li', `$at, ${addrHex}`)} ${comment}`.trimEnd());
        expandedLines.push(formatInstNoPrefix('sw', `${reg}, 0($at)`));
      } else {
        expandedLines.push(line);
      }
    } 
    else {
      expandedLines.push(line);
    }
  });

  return expandedLines.join('\n');
}

function parseMipsToInstructions(mips: string): { instructions: Instruction[], labels: Record<string, number> } {
  const lines = mips.split('\n');
  const instructions: Instruction[] = [];
  const labels: Record<string, number> = {};
  let currentAddress = 0x00400000;
  let inDataSection = false;
  
  lines.forEach((line, index) => {
    const text = line.trim();
    if (!text) return;
    
    // Check if it has a comment
    const commentIdx = text.indexOf('#');
    let pureCode = text;
    if (commentIdx !== -1) {
      pureCode = text.substring(0, commentIdx).trim();
    }
    
    if (pureCode === '') {
      instructions.push({ id: `line-${index}`, address: 0, text: line, type: 'comment' });
    } else if (pureCode === '.data') {
      inDataSection = true;
      instructions.push({ id: `line-${index}`, address: 0, text: line, type: 'directive' });
    } else if (pureCode === '.text') {
      inDataSection = false;
      instructions.push({ id: `line-${index}`, address: 0, text: line, type: 'directive' });
    } else if (inDataSection) {
      // In .data section, lines like "array: .word 10, 20" shouldn't get PC addresses
      instructions.push({ id: `line-${index}`, address: 0, text: line, type: 'directive' });
    } else if (pureCode.startsWith('.')) {
      instructions.push({ id: `line-${index}`, address: 0, text: line, type: 'directive' });
    } else if (pureCode.endsWith(':')) {
      const labelName = pureCode.substring(0, pureCode.length - 1);
      labels[labelName] = currentAddress;
      instructions.push({ id: `line-${index}`, address: currentAddress, text: line, type: 'label' });
    } else {
      instructions.push({ id: `line-${index}`, address: currentAddress, text: line, type: 'code' });
      currentAddress += 4;
    }
  });
  
  return { instructions, labels };
}

// Helper to parse memory operand like "20($sp)"
function parseMemOp(operand: string, getReg: (n: string) => number): { addr: number } {
  const match = operand.match(/(-?\d+)\((.+)\)/);
  if (match) {
    const offset = parseInt(match[1], 10);
    const reg = match[2];
    const base = getReg(reg);
    return { addr: base + offset };
  }
  return { addr: 0 };
}

export const useMipsStore = create<MipsState>((set, get) => {
  
  const initialSource = EXAMPLES[0].mipsCode;
  const initialExpanded = expandPseudoInstructions(initialSource);
  const initialParse = parseMipsToInstructions(initialExpanded);
  const initialStartIndex = Math.max(0, initialParse.instructions.findIndex(i => i.type === 'code'));
  
  const { memory: initialMemory } = parseInitialMemory(initialSource);

  return {
    cCode: EXAMPLES[0].cCode,
    sourceMipsCode: initialSource,
    mipsCode: initialExpanded,
    instructions: initialParse.instructions,
    labels: initialParse.labels,
    
    registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
    memory: initialMemory,
    pc: 0x00400000,
    isPlaying: false,
    currentInstructionIndex: initialStartIndex,
    
    interruptState: {
      isActive: false,
      step: 0,
      savedPc: 0,
    },
    
    setCCode: (code) => set({ cCode: code }),
    
    
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

    
    stepExecution: () => {
      const { instructions, currentInstructionIndex, registers, memory, pc, labels } = get();
      
      let nextIndex = currentInstructionIndex;
      
      // Skip non-code
      while (nextIndex < instructions.length && instructions[nextIndex].type !== 'code') {
        nextIndex++;
      }
      
      if (nextIndex >= instructions.length) {
        set({ isPlaying: false });
        return;
      }
      
      const currentInst = instructions[nextIndex];
      const newRegisters = JSON.parse(JSON.stringify(registers)) as Register[];
      const newMemory = { ...memory };
      let nextPc = pc + 4;
      
      const getReg = (name: string) => newRegisters.find(r => r.name === name)?.value || 0;
      const setReg = (name: string, val: number) => {
        if (name === '$zero') return;
        const idx = newRegisters.findIndex(r => r.name === name);
        if (idx !== -1) newRegisters[idx].value = val;
      };

      // Strip comment
      let text = currentInst.text;
      const cIdx = text.indexOf('#');
      if (cIdx !== -1) text = text.substring(0, cIdx);
      text = text.trim();
      
      const parts = text.split(/[\s,]+/).filter(Boolean);
      const op = parts[0];
      
      try {
        if (op === 'li') {
          const valStr = parts[2];
          const val = valStr.startsWith('0x') ? parseInt(valStr, 16) : parseInt(valStr, 10);
          setReg(parts[1], val);
        } else if (op === 'addi') {
          setReg(parts[1], getReg(parts[2]) + parseInt(parts[3], 10));
        } else if (op === 'add') {
          setReg(parts[1], getReg(parts[2]) + getReg(parts[3]));
        } else if (op === 'sw') {
          const { addr } = parseMemOp(parts[2], getReg);
          const val = getReg(parts[1]);
          // Use Object.assign to create a new reference to trigger React re-render
          Object.assign(newMemory, { [addr]: val });
        } else if (op === 'lw') {
          const { addr } = parseMemOp(parts[2], getReg);
          setReg(parts[1], newMemory[addr] || 0);
        } else if (op === 'jal') {
          setReg('$ra', nextPc);
          const target = labels[parts[1]];
          if (target !== undefined) nextPc = target;
        } else if (op === 'jr') {
          nextPc = getReg(parts[1]);
        } else if (op === 'j') {
          const target = labels[parts[1]];
          if (target !== undefined) nextPc = target;
        } else if (op === 'slt') {
          setReg(parts[1], getReg(parts[2]) < getReg(parts[3]) ? 1 : 0);
        } else if (op === 'beq') {
          if (getReg(parts[1]) === getReg(parts[2])) {
            const target = labels[parts[3]];
            if (target !== undefined) nextPc = target;
          }
        } else if (op === 'bne') {
          if (getReg(parts[1]) !== getReg(parts[2])) {
            const target = labels[parts[3]];
            if (target !== undefined) nextPc = target;
          }
        } else if (op === 'sll') {
          setReg(parts[1], getReg(parts[2]) << parseInt(parts[3], 10));
        }
      } catch (e) {
        console.error("Simulation error on:", text, e);
      }
      
      // Update UI index based on nextPc
      let nextUiIndex = instructions.findIndex(inst => inst.address === nextPc && inst.type === 'code');
      if (nextUiIndex === -1) {
        // If we can't find it exactly (e.g. program end), just set to end
        nextUiIndex = instructions.length;
      }
      
      set({
        registers: newRegisters,
        memory: newMemory,
        pc: nextPc,
        currentInstructionIndex: nextUiIndex,
      });
    },
    
    
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

    
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    
    triggerInterrupt: () => set((state) => ({
      interruptState: {
        isActive: true,
        step: 1, // Request
        savedPc: state.pc,
      }
    })),
    
    stepInterrupt: () => set((state) => {
      const currentStep = state.interruptState.step;
      const nextStep = currentStep + 1;
      if (nextStep > 5) {
        return {
          interruptState: {
            isActive: false,
            step: 0,
            savedPc: 0,
          }
        };
      }
      return {
        interruptState: {
          ...state.interruptState,
          step: nextStep,
        }
      };
    }),
    
    resetInterrupt: () => set({
      interruptState: {
        isActive: false,
        step: 0,
        savedPc: 0,
      }
    }),
  };
});
