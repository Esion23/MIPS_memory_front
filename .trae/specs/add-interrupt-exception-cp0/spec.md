# 中断与异常处理支持 Spec

## Why
当前项目仅有简化的中断演示，无法按真实异常入口流程展示上下文保存、ExcCode 判定、EPC 修正与 eret 返回。需要新增可教学的异常处理链路，并将 CP0 关键寄存器按位可视化展开。

## What Changes
- 新增 `.ktext 0x4180` 异常入口区域的解析与执行支持。
- 新增异常处理程序执行流程：`_entry -> _save_context -> _main_handler -> _restore_context -> _exception_return`。
- 新增 CP0 关键寄存器（SR/Status、Cause、EPC）的状态模型与位域展开展示。
- 新增 CP0 指令子集支持：`mfc0`、`mtc0`、`eret`、`mthi`、`mtlo`、`mfhi`、`mflo`、`addu`、`and`、`ori`、`addiu`、`move`（用于给定异常程序可运行）。
- 新增“异常时 EPC + 4 跳过当前指令”的可视化状态变更。
- 调整“中断/异常演示”区域，使其可区分“外部中断（ExcCode=0）”与“异常（ExcCode!=0）”两种路径。

## Impact
- Affected specs: 指令解释执行、异常流程可视化、寄存器面板、内存与PC状态同步
- Affected code: `src/store/useMipsStore.ts`、`src/pages/Ide.tsx`（必要时补充子组件）

## ADDED Requirements
### Requirement: 支持异常入口与 `.ktext` 区域执行
系统 SHALL 识别 `.ktext` 段及其起始地址 `0x4180`，并允许异常发生后将执行流切换到该入口。

#### Scenario: 异常触发后进入入口
- **WHEN** 用户触发异常且系统已加载异常程序
- **THEN** PC 切换到 `.ktext` 指定入口地址并从 `_entry` 开始执行

### Requirement: 支持异常处理程序核心指令
系统 SHALL 正确执行本次异常处理程序中涉及的 CP0 与算术/访存指令，至少覆盖 `mfc0`、`mtc0`、`eret`、`addu`、`and`、`ori`、`addiu`、`move`、`mfhi`、`mflo`、`mthi`、`mtlo`。

#### Scenario: 读取 Cause 并提取 ExcCode
- **WHEN** 处理程序执行 `mfc0 $k0, $13` 与位运算掩码逻辑
- **THEN** `$k0` 能得到按位提取后的 ExcCode 值（来自 Cause[6:2]）

### Requirement: EPC 跳过故障指令语义
系统 SHALL 在异常分支路径下支持 `EPC = EPC + 4` 并写回 CP0 EPC（寄存器 14）。

#### Scenario: 非中断异常返回前修正 EPC
- **WHEN** ExcCode 非 0 且执行 `mfc0/mtc0` 对 EPC 的加4写回逻辑
- **THEN** `eret` 返回后从原故障指令的下一条指令继续执行

### Requirement: CP0 位域展开展示
系统 SHALL 在界面中按位展示 SR、Cause、EPC 的关键字段，并同步执行过程中的变化。

#### Scenario: Cause 位域可视化
- **WHEN** 异常或中断状态变化
- **THEN** 面板可显示并更新 Cause 的 `BD(31)`、`IP(15:10)`、`ExcCode(6:2)` 字段值

#### Scenario: Status 位域可视化
- **WHEN** 中断屏蔽或异常级状态变化
- **THEN** 面板可显示并更新 Status 的 `IM(15:10)`、`EXL(1)`、`IE(0)` 字段值

## MODIFIED Requirements
### Requirement: 中断流程演示
现有中断演示 SHALL 升级为“中断/异常统一入口模型”：当 ExcCode=0 走“直接恢复上下文”路径；当 ExcCode!=0 走“EPC+4 后恢复上下文”路径，并最终 `eret` 返回。

## REMOVED Requirements
### Requirement: 仅动画化的简化中断流程
**Reason**: 仅动画无法承载异常程序的逐指令教学需求，且不能解释 CP0 位级语义。
**Migration**: 保留原交互入口与视觉风格，但底层状态机切换为真实异常处理程序驱动。
