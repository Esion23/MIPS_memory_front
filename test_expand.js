const fs = require('fs');
const content = fs.readFileSync('src/store/useMipsStore.ts', 'utf8');

// Extract the required functions
const parseInitialMemoryStr = content.substring(
  content.indexOf('function parseInitialMemory'),
  content.indexOf('function expandPseudoInstructions')
);

const expandFnStr = content.substring(
  content.indexOf('function expandPseudoInstructions'),
  content.indexOf('function parseMipsToInstructions')
);

// We need to evaluate them
eval(parseInitialMemoryStr);
eval(expandFnStr);

const mips = `.data
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
`;

console.log("=== ORIGINAL ===");
console.log(mips);
console.log("\n=== EXPANDED ===");
console.log(expandPseudoInstructions(mips));
