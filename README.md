# AMM Lab (Uniswap v2 + Uniswap v3)

用于学习与测试的单池 AMM 交互网页，基于 React + TypeScript + Vite。

## 当前支持

### Uniswap v2

- 恒定乘积模型（x*y=k）
- swap exact-in、add/remove liquidity
- 外部价格套利（step/auto）
- 历史回放、undo/redo、导入/导出
- 连续曲线模式

### Uniswap v3（教学核心版）

- fee tier：0.05% / 0.3% / 1%
- Q64.96 价格与 tick 计算（TickMath）
- 单仓位集中流动性（tickLower/tickUpper）
- swap exact-in（支持跨边界）
- partial fill：超过区间后返回 consumed / unfilled
- add/remove liquidity、历史回放、undo/redo、导入/导出（v3 payload）
- 连续曲线模式（tick/price 连续演示，不写历史）

## 当前不支持（v3）

- multi-position
- exact-output
- 外部套利
- 链上交互

## 本地运行

```bash
npm install
npm run dev
```

## 测试与构建

```bash
npm run test
npm run build
```
