* [ ] `.ktext 0x4180` 能被正确解析，异常后 PC 能进入 `_entry`

* [ ] `mfc0` 与 `mtc0` 可正确读写 CP0 寄存器（至少支持 `$13/$14`）

* [ ] `eret` 能按 EPC 正确返回执行流

* [ ] Cause.ExcCode 能被按位提取（`[6:2]`）并驱动分支路径

* [ ] 非中断异常路径能完成 `EPC + 4` 写回并跳过故障指令

* [ ] `_save_context` 与 `_restore_context` 的 `$sp` / GPR / HI / LO 保存恢复次序正确

* [ ] SR 位域（IM/EXL/IE）与 Cause 位域（BD/IP/ExcCode）在 UI 中可见且实时更新

* [ ] EPC 值在 UI 中可见，并在异常返回前后变化正确

* [ ] 原有示例程序单步执行行为无回归（寄存器、内存、PC）

