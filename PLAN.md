# AMM 可视化交互网页开发计划（Uniswap v2 / Constant Product）

## 0. 目标与范围

**目标**：做一个用于学习与测试的 AMM（Uniswap v2）交互网页，支持 swap / add / remove，实时可视化曲线与指标，并支持历史回放；同时提供“连续曲线演示”模式用于观察平滑动态图像变化。

**范围（v1）**：

* 单池：Token A / Token B（可改名、可设小数位）
* 模型：恒定乘积 AMM（Uniswap v2）
* 操作：Swap、Add Liquidity、Remove Liquidity、Reset、Undo/Redo、导出/导入状态（可选）
* 可视化：曲线图 + 当前点/交易后点 + 价格时间线（可选）
* 指标：现价/成交均价/滑点/手续费/池子状态/LP 份额/累计手续费
* 视图：支持 Tab 切换（交易实验 / 连续曲线）
* 连续曲线：滑动条连续改变池中 `reserveX`，按 `x*y=k` 自动联动 `reserveY`，不依赖 execute/历史

**非目标（v1 不做）**：

* 多池路由、跨池套利
* v3 集中流动性、稳定币曲线
* 链上连接、钱包、真实合约交互

---

## 1. 页面信息架构（IA）

### 1.1 全局布局

* **Header**

  * 项目标题（AMM Lab）
  * 模型选择（固定 v2，v2-only 可隐藏）
  * 预设场景下拉（Deep pool / Shallow pool / Imbalanced / 0 fee 等）
  * Reset / Undo / Redo / Export / Import（Export/Import 可选）
* **Tab Switch（Header 下方）**

  * `交易实验`：完整操作与历史回放
  * `连续曲线`：最小化控制面板 + 曲线实时变化（隐藏 History / Last Trade 相关卡片）

* **Main（三列布局）**

  * **左栏：操作区 (Actions)**

    * Swap Card
    * Add Liquidity Card
    * Remove Liquidity Card
    * 外部价格/套利（v1 可不做或放到 v1.1）

  * **中栏：可视化区 (Visualization)**

    * 曲线图（x*y=k）
    * 点位标注：Before / After
    * 价格与状态小条：Spot Price、k、Reserves
    * （可选）价格时间线图

  * **右栏：数据区 (Metrics & History)**

    * Metrics Panel（现价、成交均价、滑点、手续费、池深、LP 信息）
    * Operation History（列表 + 点击回放）
    * 状态快照（当前 reserves、LP supply、feeAcc 等）

* **连续曲线模式（两列布局）**

  * 左栏：`ContinuousCurveCard`（滑动条、比例快捷键、base/live reserves）
  * 中栏：`PoolStateStrip + CurveChartV2`（只看连续变化，不执行交易）

---

## 2. 数据模型与状态设计

### 2.1 核心状态（单池）

* `tokenX`: { symbol, decimals }
* `tokenY`: { symbol, decimals }
* `reserveX`（池子里 X 数量）
* `reserveY`
* `feeRate`（如 0.003）
* `lpTotalSupply`（LP 总份额）
* `lpUserBalance`（用户持有的 LP）
* `feeAccX / feeAccY`（累计手续费，可按“池子内累计”或“LP 赚取”口径）
* `history[]`（操作历史快照，支持 undo/redo）
* `t`（时间步或序号，用于图表横轴）

> 建议把所有数值用同一精度策略：`Decimal` 或 `BigInt(定点数)`，避免 float 漂移导致教学误差。

### 2.2 历史回放

* 每次操作后保存一个 `Snapshot`：

  * reserves、lp supply、用户 lp、feeAcc、最后成交信息（dx/dy、avgPrice、slippage）
* undo/redo：

  * `past[] / present / future[]` 或 `pointer` 索引

---

## 3. Uniswap v2 公式实现要点（含手续费）

### 3.1 恒定乘积与价格

* `k = x * y`
* **现价（spot price）**（用 “1 X 值多少 Y” 举例）：

  * `p = y / x`
* 交易导致沿曲线移动，`k` 在无手续费理想情况下恒定；有手续费时 `k` 增大（因为手续费留在池子里）。

### 3.2 Swap：给定输入 `dx`，求输出 `dy`

设当前储备为 `x, y`，手续费 `f`（如 0.003）。

* 有效输入：

  * `dx_eff = dx * (1 - f)`
* 交易后储备：

  * `x' = x + dx_eff`
  * `y' = k / x'`（其中 `k = x * y`）
* 用户得到输出：

  * `dy = y - y'`

**手续费流向（口径 1：留在池子）**：

* 手续费量：`dx_fee = dx - dx_eff`
* 这部分没有进入 `x'`，但实际链上实现等价于“被池子收走并计入 LP 收益”。为了教学直观，你可以：

  * 方案 A：直接把 `dx_fee` 也加进储备（更贴近“池子总额增加”展示），但要小心与上面公式一致性
  * 方案 B（推荐，最清晰）：储备按公式更新（使用 dx_eff），另设 `feeAccX += dx_fee`

> Uniswap v2 合约里是通过 `amountInWithFee` 计算输出，手续费效果会体现在“池子价值增长”。教学上把手续费单独累计显示更容易解释。

### 3.3 反向 Swap：给定期望输出 `dy`，求需要输入 `dx`

（可选功能，但很实用）

* 目标：得到 `dy`，则 `y' = y - dy`
* 需要 `x' = k / y'`
* 有效输入：`dx_eff = x' - x`
* 实际输入：`dx = dx_eff / (1 - f)`

### 3.4 成交均价、滑点

* 成交均价（以 X 换 Y）：

  * `avgPrice = dy / dx`
* 现价：`spotPrice = y / x`
* 价格冲击（不含手续费的曲线影响 vs 含手续费总滑点）建议拆开显示：

  * `slippage_total = 1 - (avgPrice / spotPrice)`（方向注意：按你定义统一）
  * `fee_cost = f`（近似；更严谨可用“无手续费输出”和“有手续费输出”的差值占比）
  * `slippage_curve = slippage_total - fee_component`（用差分法计算更稳：见下）
* 差分法（推荐展示）：

  * `dy_no_fee`：用 `dx_eff = dx` 计算一次
  * `dy_fee`：用 `dx_eff = dx*(1-f)` 计算
  * 手续费导致的输出损失：`dy_no_fee - dy_fee`

### 3.5 Add Liquidity（按比例注入）

当前储备 `x, y`，LP 总量 `L`。用户注入 `ax, ay`。

* 理想比例：`ax / ay = x / y`
* 实际接收（如果用户输入不匹配，按较小侧裁剪）：

  * `ax_used = min(ax, ay * x / y)`
  * `ay_used = min(ay, ax * y / x)`
  * 退款：`ax - ax_used`、`ay - ay_used`（可显示）
* 铸造 LP（当 L>0）：

  * `mint = min(ax_used * L / x, ay_used * L / y)`
* 初次注入（L=0）：

  * `mint = sqrt(ax_used * ay_used)`（教学版本可忽略 MINIMUM_LIQUIDITY）
* 更新：

  * `x += ax_used`
  * `y += ay_used`
  * `L += mint`
  * `lpUserBalance += mint`

### 3.6 Remove Liquidity（按份额赎回）

用户赎回 `burn` LP。

* 份额比例：`share = burn / L`
* 输出：

  * `outX = x * share`
  * `outY = y * share`
* 更新：

  * `x -= outX`
  * `y -= outY`
  * `L -= burn`
  * `lpUserBalance -= burn`

---

## 4. 组件拆分清单

### 4.1 页面与布局

* `AppShell`

  * `HeaderBar`
  * `TabSwitch`
  * `MainGrid`（Left / Center / Right）

### 4.2 左栏：操作组件

* `SwapCard`

  * `SwapDirectionToggle`（X→Y / Y→X）
  * `AmountInput`（支持 slider + 输入框 + “MAX”按钮）
  * `SwapPreview`（dy、avgPrice、fee、slippage）
  * `SwapButton`
* `ContinuousCurveCard`

  * `ReserveXSlider`（连续调节池中 X）
  * `LiveReservePreview`（base/live 对比）
  * `CurvePlayHint`（说明“仅可视化，不写历史”）
* `AddLiquidityCard`

  * `DualAmountInput`（ax、ay）
  * `ProportionHint`（提示当前池比例、裁剪后 used/ refund）
  * `MintPreview`（预计 LP 铸造量、注入后份额）
  * `AddButton`
* `RemoveLiquidityCard`

  * `LpAmountInput`（burn）
  * `RemovePreview`（outX/outY）
  * `RemoveButton`

### 4.3 中栏：可视化组件

* `CurveChartV2`

  * 输入：`reserveX, reserveY, tradePointBefore, tradePointAfter`
  * 输出：曲线、点、辅助线（可选）
* `PoolStateStrip`

  * `spotPrice`, `k`, `reserves`
* `PriceTimelineChart`（可选，v1.1）

  * 输入：history 中的 spot price 序列

### 4.4 右栏：指标与历史

* `MetricsPanel`

  * `SpotPriceCard`
  * `TradeMetricsCard`（avgPrice、dy、fee、slippage 分解）
  * `LPStatsCard`（lpUserBalance、share%、累计 fee）
  * `DepthCard`（可选：1% impact 所需金额等）
* `HistoryPanel`

  * `HistoryList`
  * `HistoryItem`（点击跳转回放）
* `SnapshotViewer`（可选：JSON 展示/复制）

### 4.5 公共组件

* `NumberInput`（带 decimals、格式化）
* `SliderInput`
* `Toggle`
* `Tooltip`
* `Card`

---

## 5. 业务逻辑与模块划分（建议目录）

```
src/
  core/
    ammV2.ts          // 纯函数：swap/add/remove/quote
    math.ts           // Decimal/BigInt 定点数工具、sqrt、min、clamp
    types.ts          // State, Snapshot, Action, Quote 等
  store/
    useAmmStore.ts    // Zustand/Redux：状态、history、actions
  components/
    actions/...
    charts/...
    panels/...
  pages/
    Home.tsx
```

### 5.1 核心函数接口（建议）

* `quoteSwapExactIn(state, direction, amountIn) -> { amountOut, feeAmount, avgPrice, spotPriceBefore, spotPriceAfter, dyNoFee }`
* `applySwapExactIn(state, quote) -> newState + snapshot`
* `quoteAddLiquidity(state, ax, ay) -> { axUsed, ayUsed, lpMint, refundX, refundY }`
* `applyAddLiquidity(...)`
* `quoteRemoveLiquidity(state, burn) -> { outX, outY }`
* `applyRemoveLiquidity(...)`

> “quote / apply”分离：UI 实时预览只调用 quote，不改状态；点击按钮才 apply，体验顺滑且好测。

---

## 6. 关键 UX 规则

* 输入不足或导致 `reserve` 变负：按钮禁用 + 明确错误提示
* `dy` 低于最小阈值：提示“输出太小，可能被精度吞掉”
* 提供“重置为预设池子”按钮，方便重复实验
* 所有展示统一单位与方向（例如始终显示 `1 X = ? Y`）

---

## 7. 测试清单

* swap exact-in：对几个固定输入输出做断言（含手续费/不含手续费）
* add liquidity：不同比例输入时 used/refund 与 mint 正确
* remove liquidity：按份额输出正确
* history：undo/redo 后状态一致
* 精度：小数位较多时不出现 NaN/Infinity

---

## 8. 里程碑与交付物

### Milestone A

* v2 swap exact-in + 曲线图点位更新 + 基础指标（spot/avg/slippage/fee）
* 单元测试覆盖 swap

### Milestone B

* add/remove liquidity + LP 份额 + 累计手续费展示
* history + undo/redo
* 完整单元测试

### Milestone C （todo）

* 预设场景、价格时间线、导出/导入状态
* 外部价格 + 套利演示

### Milestone D （todo）

* Tab 结构：交易实验 / 连续曲线
* 连续曲线演示：滑动条连续改变 reserves，曲线平滑实时响应
* 连续模式隐藏非必要卡片（History/Last Trade）

# 技术方案
React + TypeScript + Vite

# Further
v3 的集中流动性
