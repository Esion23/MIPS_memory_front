# Tasks
- [ ] Task 1: 扩展汇编解析与执行模型，支持异常处理程序所需指令与段
  - [ ] SubTask 1.1: 在解析阶段支持 `.ktext 0x4180` 与异常入口标签地址映射
  - [ ] SubTask 1.2: 在执行器中补齐 `mfc0/mtc0/eret/addu/and/ori/addiu/move/mfhi/mflo/mthi/mtlo` 指令语义
  - [ ] SubTask 1.3: 保证新指令与现有 `stepExecution`、PC 递进、延迟槽逻辑兼容

- [ ] Task 2: 建立 CP0 状态模型并接入异常流程
  - [ ] SubTask 2.1: 在 store 中新增 CP0 寄存器状态（至少 SR/Status、Cause、EPC）
  - [ ] SubTask 2.2: 建立异常触发时的入口跳转、Cause.ExcCode 赋值、EPC 保存规则
  - [ ] SubTask 2.3: 实现“ExcCode=0 直接恢复”与“ExcCode!=0 执行 EPC+4 再恢复”两条路径

- [ ] Task 3: 实现上下文保存/恢复可执行链路
  - [ ] SubTask 3.1: 依据示例程序验证 `_save_context` 对 `$sp`、GPR、HI/LO 的保存顺序
  - [ ] SubTask 3.2: 依据示例程序验证 `_restore_context` 对 `$sp`、GPR、HI/LO 的恢复顺序
  - [ ] SubTask 3.3: 验证 `eret` 后 PC 回到预期位置（中断返回原指令，异常返回下一条）

- [ ] Task 4: 在 UI 增加 CP0 位域展开面板
  - [ ] SubTask 4.1: 在中断/异常区域展示 SR 位域：IM[15:10]、EXL[1]、IE[0]
  - [ ] SubTask 4.2: 展示 Cause 位域：BD[31]、IP[15:10]、ExcCode[6:2]
  - [ ] SubTask 4.3: 展示 EPC 当前值，并在关键执行步高亮变化

- [ ] Task 5: 验证与回归
  - [ ] SubTask 5.1: 使用给定异常处理程序进行单步演示，确认每一步寄存器/CP0 状态正确
  - [ ] SubTask 5.2: 回归现有示例（如 Fibonacci、二维数组）不受破坏
  - [ ] SubTask 5.3: 修正显示对齐与可读性问题，保证教学视图稳定

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1 and Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 1, Task 2, Task 3, and Task 4
