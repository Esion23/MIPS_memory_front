import { create } from 'zustand';
import { piplineClient } from '../api/piplineClient';

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
  { name: 'MMIO', startAddress: 0x00007f00, endAddress: 0x00007FFF, size: 256, color: 'bg-purple-100', description: 'Memory Mapped I/O' },
  { name: 'Exception Handler', startAddress: 0x00004180, endAddress: 0x00004FFF, size: 4096, color: 'bg-orange-100', description: '异常处理程序' },
  { name: 'Text (Code)', startAddress: 0x00003000, endAddress: 0x00003FFF, size: 4096, color: 'bg-yellow-100', description: '存储程序指令，PC初始值为 0x00003000' },
  { name: 'Stack', startAddress: 0x00002ffc, endAddress: 0x00002000, size: 4096, color: 'bg-gray-300', description: '向下增长，存储局部变量和返回地址' },
  { name: 'Heap', startAddress: 0x00002000, endAddress: 0x00002000, size: 0, color: 'bg-green-50', description: '向上增长，动态分配的内存' },
  { name: 'Static data', startAddress: 0x00000000, endAddress: 0x00001FFF, size: 8192, color: 'bg-blue-200', description: '全局变量和静态变量，gp通常指向 0x00001800' },
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
  { name: '$gp', value: 0x00001800, description: '全局指针' },
  // 教学中为了严谨和可视化的字对齐，我们直接将 $sp 初始化为 0x00002ffc
  // 因为 0x7FFFFFFF 在 MIPS 中虽然是用户空间最高地址，但实际存字(word)时必须字对齐
  { name: '$sp', value: 0x00002ffc, description: '栈指针' },
  { name: '$fp', value: 0x00002ffc, description: '帧指针' },
  { name: '$ra', value: 0, description: '返回地址' },
  { name: '$hi', value: 0, description: '乘法高位/除法余数' },
  { name: '$lo', value: 0, description: '乘法低位/除法商' },
];

export const INITIAL_CP0_REGISTERS: Register[] = [
  { name: 'SR', value: 0x00000000, description: 'Status Register (12)' },
  { name: 'Cause', value: 0x00000000, description: 'Cause Register (13)' },
  { name: 'EPC', value: 0x00000000, description: 'Exception Program Counter (14)' },
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

export interface TimerState {
  ctrl: string;
  preset: string;
  count: string;
}

export const INITIAL_TIMERS: { [key: string]: TimerState } = {
  'Timer 0': { ctrl: '00000000', preset: '00000000', count: '00000000' },
  'Timer 1': { ctrl: '00000000', preset: '00000000', count: '00000000' },
};

interface MipsState {
  cCode: string;
  sourceMipsCode: string;
  mipsCode: string;
  instructions: Instruction[];
  labels: Record<string, number>;
  
  registers: Register[];
  cp0Registers: Register[];
  memory: Record<number, number>; // address -> value (word)
  timers: { [key: string]: TimerState };
  
  // Track changes for highlighting
  changedRegisters: Set<number>;
  changedCp0Registers: Set<number>;
  changedMemory: Set<number>;
  changedTimers: Set<string>; // 'Timer 0.ctrl'

  pc: number;
  delayedPc: number | null;
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
    name: "Timer 0 (定时器倒计时)",
    cCode: `int main() {
  int* timer0_ctrl = (int*)0x00007F00;
  int* timer0_preset = (int*)0x00007F04;
  int* timer0_count = (int*)0x00007F08;
  
  // 设置倒计时 5 个周期
  *timer0_preset = 5;
  // 启动 Timer0 (Mode 0, Enable)
  *timer0_ctrl = 1;
  
  // 等待倒计时结束
  while (*timer0_count > 0) {
    // wait
  }
  
  return 0xbeef;
}`,
    mipsCode: `main:
  # 1. 初始化 Timer 0 基地址 0x00007F00
  lui $t0, 0x0000
  ori $t0, $t0, 0x7F00
  
  # 2. 设置 PRESET 倒计时初值 = 5
  addi $t1, $zero, 5
  sw $t1, 4($t0)        # 写入 PRESET 寄存器
  
  # 3. 启动 Timer 0 (CTRL = 1: Enable=1, Mode=0, IM=0)
  addi $t1, $zero, 1
  sw $t1, 0($t0)        # 写入 CTRL 寄存器
  
  # 等待 Timer 完成内部状态加载 (IDLE -> LOAD -> CNT)
  nop
  nop
  nop

wait_loop:
  # 4. 读取当前 COUNT 值
  lw $t2, 8($t0)        # 读取 COUNT 寄存器
  
  # 5. 检查 COUNT 是否 <= 0
  blez $t2, timer_done
  nop                   # 延迟槽
  
  # 6. 继续等待
  j wait_loop
  nop                   # 延迟槽

timer_done:
  # 7. 定时器结束，设置完成标志 0xBEEF 到 $v0
  lui $v0, 0x0000
  ori $v0, $v0, 0xBEEF
`
  },
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
  nop
  
`
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
  nop
  li  $t1, 0                      # $t1 = j = 0

in_j:
  beq $t1, $s1, in_j_end
  nop
  li  $v0, 5                      # 模拟输入的值 (原本是 syscall 5)
  
  # getindex($t2, $t0, $t1) -> $t2 = (i * 8 + j) * 4
  sll $t2, $t0, 3
  add $t2, $t2, $t1
  sll $t2, $t2, 2
  
  add $t3, $s2, $t2               # 计算实际地址
  sw  $v0, 0($t3)                 # matrix[i][j] = 5
  
  addi $t1, $t1, 1
  j   in_j
  nop

in_j_end:
  addi $t0, $t0, 1
  j   in_i
  nop

in_i_end:
`
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
  nop
  add $s1, $s1, $t0       # $s1 = $s1 + $t0
  addi $t0, $t0, 1        # $t0 = $t0 + 1
  j   loop                
  nop

loop_end:
  move $a0, $s1           # 赋值，$a0 = $s1
`
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
  nop
  li $v0, 8                  # 模拟输入的数组元素值
  
  sll $t1, $t0, 2            # $t1 = $t0 * 4
  add $t2, $s1, $t1          # 计算实际地址
  sw $v0, 0($t2)             # array[i] = 8
  
  addi $t0, $t0, 1           # $t0 = $t0 + 1
  j loop_in
  nop

loop_in_end:
`
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
  nop
  move    $s1, $v0        # $s1 保存阶乘结果

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
  nop
  li      $v0, 1
  j       if_end  
  nop
  
  # 递归情况  
else:
  addi    $t1, $t0, -1
  move    $a0, $t1
  jal     factorial
  nop
  mult    $t0, $v0
  mflo    $v0

if_end:
  # 出栈
  lw      $t0, 0($sp)
  lw      $ra, 4($sp)
  addi    $sp, $sp, 8
  # 返回
  jr      $ra
  nop`
  }
];


function parseInitialMemory(mips: string): { memory: Record<number, number>, dataLabels: Record<string, number> } {
  const memory: Record<number, number> = {};
  const dataLabels: Record<string, number> = {};
  let inDataSection = false;
  let currentDataAddress = 0x00000000;
  
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
    
    // helper for generating li
    const expandLi = (reg: string, val: number) => {
      const isSigned16 = val >= -32768 && val <= 32767;
      if (isSigned16) {
        expandedLines.push(`${formatInst('addi', `${reg}, $zero, ${val}`)} ${comment}`.trimEnd());
      } else if (val >= 0 && val <= 65535) {
        expandedLines.push(`${formatInst('ori', `${reg}, $zero, ${val}`)} ${comment}`.trimEnd());
      } else {
        const upper = (val >>> 16) & 0xFFFF;
        const lower = val & 0xFFFF;
        expandedLines.push(`${formatInst('lui', `${reg}, ${upper}`)} ${comment}`.trimEnd());
        if (lower !== 0) {
          expandedLines.push(formatInstNoPrefix('ori', `${reg}, ${reg}, ${lower}`));
        }
      }
    };

    // expand la
    if (op === 'la' && parts.length === 3) {
      const reg = parts[1];
      const label = parts[2];
      if (dataLabels[label] !== undefined) {
        expandLi(reg, dataLabels[label]);
      } else {
        expandedLines.push(line);
      }
    } 
    // expand li
    else if (op === 'li' && parts.length === 3) {
      const reg = parts[1];
      const valStr = parts[2];
      let val = parseInt(valStr, 10);
      if (valStr.toLowerCase().startsWith('0x')) {
        val = parseInt(valStr, 16);
      }
      expandLi(reg, val);
    }
    // expand lw with label
    else if (op === 'lw' && parts.length === 3 && !parts[2].includes('(') && isNaN(parseInt(parts[2]))) {
      const reg = parts[1];
      const label = parts[2];
      if (dataLabels[label] !== undefined) {
        expandLi('$at', dataLabels[label]);
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
        expandLi('$at', dataLabels[label]);
        expandedLines.push(formatInstNoPrefix('sw', `${reg}, 0($at)`));
      } else {
        expandedLines.push(line);
      }
    } 
    // expand move
    else if (op === 'move' && parts.length === 3) {
      expandedLines.push(`${formatInst('add', `${parts[1]}, ${parts[2]}, $zero`)} ${comment}`.trimEnd());
    }
    // expand subi
    else if (op === 'subi' && parts.length === 4) {
      expandedLines.push(`${formatInst('addi', `${parts[1]}, ${parts[2]}, -${parts[3]}`)} ${comment}`.trimEnd());
    }
    // expand bgt
    else if (op === 'bgt' && parts.length === 4) {
      expandedLines.push(`${formatInst('slt', `$at, ${parts[2]}, ${parts[1]}`)} ${comment}`.trimEnd());
      expandedLines.push(formatInstNoPrefix('bne', `$at, $zero, ${parts[3]}`));
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
  let currentAddress = 0x00003000;
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

function extractTextSegment(expandedMips: string): string {
  const lines = expandedMips.split('\n');
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

  return textLines.join('\n');
}

function toHexString(num: number): string {
  let hex = num.toString(16);
  return hex.padStart(8, '0');
}

const preparePiplinePayload = (expandedMips: string, memoryRecord: Record<number, number>) => {
  const asm_source = extractTextSegment(expandedMips);
  const initial_memory: Record<string, string> = {};
  for (const [addr, val] of Object.entries(memoryRecord)) {
    initial_memory[toHexString(parseInt(addr, 10))] = toHexString(val);
  }
  const initial_registers: Record<string, string> = {
    '28': toHexString(0x00001800), // gp
    '29': toHexString(0x00002ffc)  // sp
  };
  return { asm_source, initial_memory, initial_registers };
};

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
    cp0Registers: JSON.parse(JSON.stringify(INITIAL_CP0_REGISTERS)),
      memory: initialMemory,
      timers: JSON.parse(JSON.stringify(INITIAL_TIMERS)),
      changedRegisters: new Set(),
        changedCp0Registers: new Set(),
        changedMemory: new Set(),
        changedTimers: new Set(),
        pc: 0x00003000,
    delayedPc: null,
    isPlaying: false,
    currentInstructionIndex: initialStartIndex,
    
    interruptState: {
      isActive: false,
      step: 0,
      savedPc: 0,
    },
    
    setCCode: (code) => set({ cCode: code }),
    
    
    setSourceMipsCode: async (code) => {
      const expanded = expandPseudoInstructions(code);
      const parsed = parseMipsToInstructions(expanded);
      const { memory } = parseInitialMemory(code);

      const payload = preparePiplinePayload(expanded, memory);
      try {
        await piplineClient.load_program(payload.asm_source, payload.initial_memory, payload.initial_registers);
      } catch (e) {
        console.error("Failed to load program to pipline backend:", e);
      }

      set({
        sourceMipsCode: code,
        mipsCode: expanded,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        cp0Registers: JSON.parse(JSON.stringify(INITIAL_CP0_REGISTERS)),
        memory,
        timers: JSON.parse(JSON.stringify(INITIAL_TIMERS)),
        changedRegisters: new Set(),
        changedCp0Registers: new Set(),
        changedMemory: new Set(),
        changedTimers: new Set(),
        pc: 0x00003000,
        delayedPc: null,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
        interruptState: { isActive: false, step: 0, savedPc: 0 }
      });
    },
    
    setMipsCode: (code) => set({ mipsCode: code }),


    
    compileToMips: async () => {
      const example = EXAMPLES.find(e => get().cCode.includes(e.cCode.substring(0, 20))) || EXAMPLES[0];
      const expanded = expandPseudoInstructions(example.mipsCode);
      const parsed = parseMipsToInstructions(expanded);
      const { memory } = parseInitialMemory(example.mipsCode);

      const payload = preparePiplinePayload(expanded, memory);
      try {
        await piplineClient.load_program(payload.asm_source, payload.initial_memory, payload.initial_registers);
      } catch (e) {
        console.error("Failed to load program to pipline backend:", e);
      }

      set({
        sourceMipsCode: example.mipsCode,
        mipsCode: expanded,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        cp0Registers: JSON.parse(JSON.stringify(INITIAL_CP0_REGISTERS)),
        memory,
        timers: JSON.parse(JSON.stringify(INITIAL_TIMERS)),
        changedRegisters: new Set(),
        changedCp0Registers: new Set(),
        changedMemory: new Set(),
        changedTimers: new Set(),
        pc: 0x00003000,
        delayedPc: null,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
      });
    },


    
    loadExample: async (index: number) => {
      const ex = EXAMPLES[index];
      const expanded = expandPseudoInstructions(ex.mipsCode);
      const parsed = parseMipsToInstructions(expanded);
      const { memory } = parseInitialMemory(ex.mipsCode);

      const payload = preparePiplinePayload(expanded, memory);
      try {
        await piplineClient.load_program(payload.asm_source, payload.initial_memory, payload.initial_registers);
      } catch (e) {
        console.error("Failed to load program to pipline backend:", e);
      }

      set({
        cCode: ex.cCode,
        sourceMipsCode: ex.mipsCode,
        mipsCode: expanded,
        instructions: parsed.instructions,
        labels: parsed.labels,
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        cp0Registers: JSON.parse(JSON.stringify(INITIAL_CP0_REGISTERS)),
        memory,
        timers: JSON.parse(JSON.stringify(INITIAL_TIMERS)),
        changedRegisters: new Set(),
        changedCp0Registers: new Set(),
        changedMemory: new Set(),
        changedTimers: new Set(),
        pc: 0x00003000,
        delayedPc: null,
        currentInstructionIndex: Math.max(0, parsed.instructions.findIndex(i => i.type === 'code')),
        isPlaying: false,
        interruptState: { isActive: false, step: 0, savedPc: 0 }
      });
    },

    
    stepExecution: async () => {
      try {
        const snap = await piplineClient.step_cycle() as any;
        
        const prevRegisters = get().registers;
        const newRegisters = JSON.parse(JSON.stringify(prevRegisters)) as Register[];
        const changedRegisters = new Set<number>();
        for (const [idxStr, regInfo] of Object.entries(snap.registers || {})) {
          const idx = parseInt(idxStr, 10);
          if (newRegisters[idx] && (regInfo as any).value) {
            const newVal = parseInt((regInfo as any).value, 16);
            if (newRegisters[idx].value !== newVal) {
              changedRegisters.add(idx);
            }
            newRegisters[idx].value = newVal;
          }
        }
        
        const prevMemory = get().memory;
        const newMemory = { ...prevMemory };
        const changedMemory = new Set<number>();
        for (const [addrHex, valHex] of Object.entries(snap.memory || {})) {
          const addr = parseInt(addrHex, 16);
          const val = parseInt(valHex as string, 16);
          if (prevMemory[addr] !== val) {
            changedMemory.add(addr);
          }
          newMemory[addr] = val;
        }
        
        const prevTimers = get().timers;
        const newTimers = snap.timers || {};
        const changedTimers = new Set<string>();
        
        // Ensure we only mark as changed if the previous timer state actually existed and was different.
        // On the very first step, prevTimers might be empty {}, we should treat this as initialization, not a change.
        // Now that we have INITIAL_TIMERS, we can just check if they are equal to '00000000' on the first load if needed,
        // but simply comparing to prevTimers is fine.
        const isFirstTimerLoad = false;
        
        for (const timerId in newTimers) {
          if (!isFirstTimerLoad) {
            const oldTimer = prevTimers[timerId] || { ctrl: '', preset: '', count: '' };
            const newTimer = newTimers[timerId];
            if (oldTimer.ctrl !== newTimer.ctrl) changedTimers.add(`${timerId}.ctrl`);
            if (oldTimer.preset !== newTimer.preset) changedTimers.add(`${timerId}.preset`);
            if (oldTimer.count !== newTimer.count) changedTimers.add(`${timerId}.count`);
          }
        }

        // We do the same for CP0 if the backend returns it (mocked for now, not tracked)
        const changedCp0Registers = new Set<number>();
        
        let nextPc = parseInt(snap.pc, 16);
        
        // Use MEM stage as macro PC if it has a valid instruction, else EX, ID, IF
        if (snap.pipeline?.MEM && !snap.pipeline.MEM.is_bubble) {
          nextPc = parseInt(snap.pipeline.MEM.pc, 16);
        } else if (snap.pipeline?.EX && !snap.pipeline.EX.is_bubble) {
          nextPc = parseInt(snap.pipeline.EX.pc, 16);
        } else if (snap.pipeline?.ID && !snap.pipeline.ID.is_bubble) {
          nextPc = parseInt(snap.pipeline.ID.pc, 16);
        } else if (snap.pipeline?.IF && !snap.pipeline.IF.is_bubble) {
          nextPc = parseInt(snap.pipeline.IF.pc, 16);
        }
        
        const { instructions } = get();
        let nextUiIndex = instructions.findIndex(inst => inst.address === nextPc && inst.type === 'code');
        if (nextUiIndex === -1) {
          nextUiIndex = instructions.length;
        }

        set({
          registers: newRegisters,
          memory: newMemory,
          timers: newTimers,
          changedRegisters,
          changedCp0Registers,
          changedMemory,
          changedTimers,
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
    
    
    resetExecution: async () => {
      const { sourceMipsCode } = get();
      const { memory } = parseInitialMemory(sourceMipsCode);
      const expanded = expandPseudoInstructions(sourceMipsCode);
      const payload = preparePiplinePayload(expanded, memory);
      try {
        await piplineClient.load_program(payload.asm_source, payload.initial_memory, payload.initial_registers);
      } catch (e) {
        console.error("Failed to load program on pipline backend during reset:", e);
      }

      set({
        registers: JSON.parse(JSON.stringify(INITIAL_REGISTERS)),
        cp0Registers: JSON.parse(JSON.stringify(INITIAL_CP0_REGISTERS)),
        memory,
        timers: JSON.parse(JSON.stringify(INITIAL_TIMERS)),
        changedRegisters: new Set(),
        changedCp0Registers: new Set(),
        changedMemory: new Set(),
        changedTimers: new Set(),
        pc: 0x00003000,
        delayedPc: null,
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

// Initialize the backend simulator on startup
if (typeof window !== 'undefined') {
  useMipsStore.getState().resetExecution();
}
