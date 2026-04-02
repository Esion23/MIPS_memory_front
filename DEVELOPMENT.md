# MIPS Tutor Studio 开发指南

欢迎来到 **MIPS Tutor Studio** 项目！这是一个旨在通过可视化方式帮助学生理解 MIPS 汇编执行、内存管理和中断机制的交互式教学工具。

## 🚀 技术栈

- **前端框架**: [React 18](https://react.dev/)
- **构建工具**: [Vite 6](https://vitejs.dev/)
- **状态管理**: [Zustand 5](https://zustand-demo.pmnd.rs/) (用于模拟 MIPS 寄存器、内存和程序状态)
- **样式方案**: [Tailwind CSS](https://tailwindcss.com/)
- **图标库**: [Lucide React](https://lucide.dev/)
- **动画库**: [Framer Motion](https://www.framer.com/motion/)
- **编辑器组件**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (用于 C 代码编辑和 MIPS 显示)

## 📂 项目结构

```text
src/
├── assets/          # 静态资源
├── components/      # UI 组件
├── hooks/           # 自定义 React Hooks (如 useTheme)
├── lib/             # 工具函数 (如 tailwind-merge)
├── pages/           # 页面级组件 (主要为 Ide.tsx)
└── store/           # 核心业务逻辑 (useMipsStore.ts)
```

## 🧠 核心架构

### 1. MIPS 模拟引擎 (The Store)
项目最核心的部分位于 [useMipsStore.ts](file:///d:/CO_assistant/stack/src/store/useMipsStore.ts)。
- **状态维护**: 模拟 32 个通用寄存器、PC 指针、内存数据段（`memory` 对象映射）以及当前执行的指令流。
- **指令解析**: `parseMipsToInstructions` 函数将汇编字符串解析为可执行的指令对象。
- **单步执行**: `stepExecution` 函数实现了 MIPS 指针的解释执行，目前支持以下指令子集：
  - 数据传输: `li`, `sw`, `lw`
  - 算术运算: `addi`, `add`, `sll`
  - 控制流: `jal`, `jr`, `j`, `beq`, `bne`, `slt`

### 2. 可视化界面 (The UI)
主页面 [Ide.tsx](file:///d:/CO_assistant/stack/src/pages/Ide.tsx) 负责将模拟器的状态呈现给用户：
- **汇编代码视图**: 高亮显示当前执行行。
- **寄存器列表**: 实时反映 CPU 内部状态。
- **内存/栈帧可视化**: 使用 SVG 和 Tailwind 模拟 MIPS 内存布局（Stack, Dynamic data, Static data, Text）。
- **中断处理演示**: 动画演示 CPU 如何保存 PC、跳转 ISR 并通过 `eret` 返回。

## 🛠️ 开发工作流

### 环境准备
1. 确保已安装 Node.js (推荐 v18+)。
2. 克隆仓库后运行 `npm install` 安装依赖。

### 启动开发服务器
```bash
npm run dev
```

### 生产构建
```bash
npm run build
```

## 📝 如何扩展项目

### 添加新的指令支持
在 [useMipsStore.ts](file:///d:/CO_assistant/stack/src/store/useMipsStore.ts) 的 `stepExecution` 函数中，在 `try-catch` 块内添加新的 `else if (op === 'your-op')` 逻辑即可。

### 添加新的教学示例
在 `useMipsStore.ts` 的 `EXAMPLES` 常量中添加一个包含 `name`, `cCode`, 和 `mipsCode` 的对象。

### 改进可视化
内存布局和中断演示主要在 `Ide.tsx` 中使用纯 CSS 和 SVG 实现。如果需要更复杂的动画，可以利用 `framer-motion`。

## ⚠️ 注意事项
- **地址对齐**: 模拟器目前遵循 4 字节字对齐，初始化 `$sp` 为 `0x7FFFFFFC`。
- **无后端**: 该项目目前是纯前端应用，所有“编译”和“模拟”逻辑均在客户端完成。
- **Monaco Editor**: 建议使用 `Ide.tsx` 中已有的配置，确保语法高亮正确。

---

希望这份文档能帮助你快速上手开发！如有疑问，请查阅 [prd.md](file:///d:/CO_assistant/stack/.trae/documents/mips_tutor_prd.md) 或 [technical_architecture.md](file:///d:/CO_assistant/stack/.trae/documents/mips_tutor_technical_architecture.md)。
