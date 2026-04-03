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
  { name: '$hi', value: 0, description: '乘法高位/除法余数' },
  { name: '$lo', value: 0, description: '乘法低位/除法商' },
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
  delayedPc: number | null;
  enableDelaySlot: boolean;
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
  toggleDelaySlot: () => void;
  
  triggerInterrupt: () => void;
  stepInterrupt: () => void;
  resetInterrupt: () => void;
  loadExample: (index: number) => void;
}

export const EXAMPLES = [
  {
    name: "Fibonacci (数组与循环)",
    cCode: `int main() {
  int size = 12;
  int fibs[12];
  fibs[0] = 1;
  fibs[1] = 1;
  for(int i = 0; i < size - 2; i++) {
    fibs[i+2] = fibs[i] + fibs[i+1];
  }
  return 0;
}`,
    mipsCode: `.data
fibs: .space 48
size: .word 12

.text
main:
  la   $t0, fibs              # load address of array
  la   $t5, size              # load address of size variable
  lw   $t5, 0($t5)            # load array size
  li   $t2, 1                 # 1 is first and second Fib. number
  sw   $t2, 0($t0)            # F[0] = 1
  sw   $t2, 4($t0)            # F[1] = F[0] = 1
  addi $t1, $t5, -2           # Counter for loop

loop:
  lw   $t3, 0($t0)            # Get value from array F[n]
  lw   $t4, 4($t0)            # Get value from array F[n+1]
  add  $t2, $t3, $t4          # $t2 = F[n] + F[n+1]
  sw   $t2, 8($t0)            # Store F[n+2]
  addi $t0, $t0, 4            # increment address
  addi $t1, $t1, -1           # decrement loop counter
  bgtz $t1, loop              # repeat if not finished yet.
  
  li   $v0, 10                # system call for exit
  syscall`
  },
  {
    name: "二维数组操作",
    cCode: `int main() {
  int matrix[8][8];
  int rows = 3; // 模拟输入
  int cols = 3; // 模拟输入
  
  for(int i = 0; i < rows; i++) {
    for(int j = 0; j < cols; j++) {
       matrix[i][j] = 5; // 模拟输入
    }
  }
  return 0;
}`,
    mipsCode: `.data
# 为了演示简化，分配 64 words 用于 8x8 matrix (256 bytes)
matrix: .space 256

.text
main:
  li  $s0, 3                      # 模拟输入行数
  li  $s1, 3                      # 模拟输入列数
  li  $t0, 0                      # $t0 = i = 0
  la  $s2, matrix                 # 基地址

in_i:
  beq $t0, $s0, in_i_end
  li  $t1, 0                      # $t1 = j = 0

in_j:
  beq $t1, $s1, in_j_end
  li  $v0, 5                      # 模拟输入的值 (原本是 syscall 5)
  
  # getindex($t2, $t0, $t1) -> $t2 = (i * 8 + j) * 4
  sll $t2, $t0, 3
  add $t2, $t2, $t1
  sll $t2, $t2, 2
  
  add $t3, $s2, $t2               # 计算实际地址
  sw  $v0, 0($t3)                 # matrix[i][j] = 5
  
  addi $t1, $t1, 1
  j   in_j

in_j_end:
  addi $t0, $t0, 1
  j   in_i

in_i_end:
  li  $v0, 10
  syscall`
  },
  {
    name: "基本循环与累加",
    cCode: `int main() {
  int n = 5; // 模拟输入
  int sum = 0;
  for(int i = 1; i <= n; i++) {
    sum += i;
  }
  return sum;
}`,
    mipsCode: `.text
main:
  li  $s0, 5              # 模拟输入 n = 5
  li  $s1, 0              # $s1 用于存储累加的值，$s1 = 0
  li  $t0, 1              # $t0 是循环变量

loop:
  bgt $t0, $s0, loop_end  # 当 $t0 > $s0 的时候跳转
  add $s1, $s1, $t0       # $s1 = $s1 + $t0
  addi $t0, $t0, 1        # $t0 = $t0 + 1
  j   loop                

loop_end:
  move $a0, $s1           # 赋值，$a0 = $s1
  li  $v0, 10             # 结束程序
  syscall`
  },
  {
    name: "一维数组赋值",
    cCode: `int main() {
  int array[10];
  int n = 3; // 模拟输入
  for(int i=0; i<n; i++) {
    array[i] = 8; // 模拟输入
  }
  return 0;
}`,
    mipsCode: `.data
array: .space 40

.text
main:
  li $s0, 3                  # 模拟输入 n = 3
  li $t0, 0                  # $t0 循环变量 i = 0
  la $s1, array              # 数组基地址

loop_in:
  beq $t0, $s0, loop_in_end  # $t0 == $s0 的时候跳出循环
  li $v0, 8                  # 模拟输入的数组元素值
  
  sll $t1, $t0, 2            # $t1 = $t0 * 4
  add $t2, $s1, $t1          # 计算实际地址
  sw $v0, 0($t2)             # array[i] = 8
  
  addi $t0, $t0, 1           # $t0 = $t0 + 1
  j loop_in

loop_in_end:
  li $v0, 10
  syscall`
  },
  {
    name: "递归函数调用 (阶乘)",
    cCode: `int factorial(int n) {
  if (n == 1) return 1;
  return n * factorial(n - 1);
}

int main() {
  return factorial(4); // 模拟输入4
}`,
    mipsCode: `.text
main:
  li      $s0, 4          # 模拟输入 n = 4

  move    $a0, $s0
  jal     factorial
  move    $s1, $v0        # $s1 保存阶乘结果

  li      $v0, 10
  syscall

factorial:
  # 入栈
  addi    $sp, $sp, -8
  sw      $ra, 4($sp)
  sw      $t0, 0($sp)
  
  # 将参数存入临时寄存器中
  move    $t0, $a0
  
  # 基准情况
  li      $t2, 1
  bne     $t0, $t2, else
  li      $v0, 1
  j       if_end  
  
  # 递归情况  
else:
  addi    $t1, $t0, -1
  move    $a0, $t1
  jal     factorial
  mult    $t0, $v0
  mflo    $v0

if_end:
  # 出栈
  lw      $t0, 0($sp)
  lw      $ra, 4($sp)
  addi    $sp, $sp, 8
  # 返回
  jr      $ra`
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
      
      const spaceMatch = text.match(/\.space\s+(\d+)/);
      if (spaceMatch) {
        const bytes = parseInt(spaceMatch[1], 10);
        if (!isNaN(bytes)) {
          // Initialize allocated space to 0, align to word boundary
          const words = Math.ceil(bytes / 4);
          for (let i = 0; i < words; i++) {
            memory[currentDataAddress] = 0;
            currentDataAddress += 4;
          }
        }
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
      const paddedMnemonic = mnemonic.padEnd(8, ' ');
      return `${paddedMnemonic}${args}`;
    };

    const formatInstNoPrefix = (mnemonic: string, args: string) => {
      const paddedMnemonic = mnemonic.padEnd(8, ' ');
      return `${paddedMnemonic}${args}`;
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
      instructions.push({ id: `line-${index}`, address: 0, text: text, type: 'comment' });
    } else if (pureCode === '.data') {
      inDataSection = true;
      instructions.push({ id: `line-${index}`, address: 0, text: text, type: 'directive' });
    } else if (pureCode === '.text') {
      inDataSection = false;
      instructions.push({ id: `line-${index}`, address: 0, text: text, type: 'directive' });
    } else if (inDataSection) {
      // In .data section, lines like "array: .word 10, 20" shouldn't get PC addresses
      instructions.push({ id: `line-${index}`, address: 0, text: text, type: 'directive' });
    } else if (pureCode.startsWith('.')) {
      instructions.push({ id: `line-${index}`, address: 0, text: text, type: 'directive' });
    } else if (pureCode.endsWith(':')) {
      const labelName = pureCode.substring(0, pureCode.length - 1);
      labels[labelName] = currentAddress;
      instructions.push({ id: `line-${index}`, address: currentAddress, text: text, type: 'label' });
    } else {
      // For code, let's also try to align mnemonics if they aren't already
      let formattedText = pureCode;
      const spaceIdx = pureCode.indexOf(' ');
      const tabIdx = pureCode.indexOf('\t');
      const splitIdx = (spaceIdx === -1) ? tabIdx : (tabIdx === -1 ? spaceIdx : Math.min(spaceIdx, tabIdx));
      
      if (splitIdx !== -1) {
        const op = pureCode.substring(0, splitIdx);
        const args = pureCode.substring(splitIdx).trim();
        formattedText = op.padEnd(8, ' ') + args;
      } else {
        formattedText = pureCode.padEnd(8, ' ');
      }

      instructions.push({ id: `line-${index}`, address: currentAddress, text: formattedText, type: 'code' });
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
    delayedPc: null,
    enableDelaySlot: false,
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
        delayedPc: null,
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
        delayedPc: null,
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
        delayedPc: null,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
        interruptState: { isActive: false, step: 0, savedPc: 0 }
      });
    },

    
    stepExecution: () => {
      const { instructions, currentInstructionIndex, registers, memory, pc, delayedPc, enableDelaySlot, labels } = get();
      
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
      let nextDelayedPc: number | null = null;
      
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
          setReg('$ra', enableDelaySlot ? pc + 8 : nextPc);
          const target = labels[parts[1]];
          if (target !== undefined) {
            if (enableDelaySlot) nextDelayedPc = target;
            else nextPc = target;
          }
        } else if (op === 'jr') {
          if (enableDelaySlot) nextDelayedPc = getReg(parts[1]);
          else nextPc = getReg(parts[1]);
        } else if (op === 'j') {
          const target = labels[parts[1]];
          if (target !== undefined) {
            if (enableDelaySlot) nextDelayedPc = target;
            else nextPc = target;
          }
        } else if (op === 'slt') {
          setReg(parts[1], getReg(parts[2]) < getReg(parts[3]) ? 1 : 0);
        } else if (op === 'beq') {
          if (getReg(parts[1]) === getReg(parts[2])) {
            const target = labels[parts[3]];
            if (target !== undefined) {
              if (enableDelaySlot) nextDelayedPc = target;
              else nextPc = target;
            }
          }
        } else if (op === 'bne') {
          if (getReg(parts[1]) !== getReg(parts[2])) {
            const target = labels[parts[3]];
            if (target !== undefined) {
              if (enableDelaySlot) nextDelayedPc = target;
              else nextPc = target;
            }
          }
        } else if (op === 'sll') {
          setReg(parts[1], getReg(parts[2]) << parseInt(parts[3], 10));
        } else if (op === 'move') {
          setReg(parts[1], getReg(parts[2]));
        } else if (op === 'subi') {
          setReg(parts[1], getReg(parts[2]) - parseInt(parts[3], 10));
        } else if (op === 'bgt') {
          if (getReg(parts[1]) > getReg(parts[2])) {
            const target = labels[parts[3]];
            if (target !== undefined) {
              if (enableDelaySlot) nextDelayedPc = target;
              else nextPc = target;
            }
          }
        } else if (op === 'bgtz') {
          if (getReg(parts[1]) > 0) {
            const target = labels[parts[2]];
            if (target !== undefined) {
              if (enableDelaySlot) nextDelayedPc = target;
              else nextPc = target;
            }
          }
        } else if (op === 'mult') {
          const res = getReg(parts[1]) * getReg(parts[2]);
          // For simplicity, just store in $lo and ignore 64-bit overflow for small numbers
          setReg('$lo', res);
          setReg('$hi', 0);
        } else if (op === 'mflo') {
          setReg(parts[1], getReg('$lo'));
        } else if (op === 'syscall') {
          const v0 = getReg('$v0');
          if (v0 === 10) {
            // Exit program
            set({ isPlaying: false });
            nextPc = instructions[instructions.length - 1].address + 4; // Skip past end
          }
        } else if (op === 'nop') {
          // Do nothing
        }
      } catch (e) {
        console.error("Simulation error on:", text, e);
      }
      
      // If we had a delayed branch/jump from the previous instruction, apply it now
      if (delayedPc !== null) {
        nextPc = delayedPc;
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
        delayedPc: nextDelayedPc,
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
        delayedPc: null,
        currentInstructionIndex: Math.max(0, get().instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
      });
    },

    
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    
    toggleDelaySlot: () => set((state) => ({ enableDelaySlot: !state.enableDelaySlot })),
    
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
