# Star-Office-UI 像素风前端渲染分析

参考仓库：<https://github.com/ringhyacinth/Star-Office-UI.git>

本地路径：`refs/Star-Office-UI`

分析时间：2026-06-06

## 结论

Star-Office-UI 的像素风不是纯 CSS 或 DOM 拼块实现，而是基于 **Phaser 3 + HTML5 Canvas/WebGL** 的游戏式前端渲染。

它将办公室场景、人物、猫、植物、服务器机房、按钮等做成 PNG/WebP 图片与 spritesheet，通过 Phaser 在一个固定尺寸的游戏画布中绘制和播放动画；CSS 主要负责容器缩放、像素字体、像素化显示和部分按钮/面板皮肤。

## 前端渲染栈

核心技术：

- Phaser：`3.80.1`
- 渲染目标：Canvas/WebGL，由 `Phaser.AUTO` 自动选择
- 场景尺寸：`1280 x 720`
- 物理系统：Phaser Arcade Physics，仅做轻量状态/对象管理
- 美术资产：PNG、WebP、spritesheet
- 字体：`ArkPixel` 像素字体
- 样式：CSS 硬边框、像素化图片渲染、sprite button

关键代码位置：

- `refs/Star-Office-UI/frontend/index.html`
- `refs/Star-Office-UI/frontend/game.js`
- `refs/Star-Office-UI/frontend/layout.js`
- `refs/Star-Office-UI/frontend/electron-standalone.html`

典型 Phaser 配置：

```js
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 1280,
  height: 720,
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
}
```

## 像素风来源

像素风主要来自三层叠加：

1. 像素美术资源
   - 场景背景、人物、猫、植物、咖啡机、服务器等都是像素画风图片。
   - 动画使用 spritesheet 帧图，而不是 CSS 动画或 SVG。

2. Phaser 像素渲染设置
   - `pixelArt: true` 让 Phaser 避免对像素图进行平滑插值。
   - 固定游戏画布尺寸为 `1280 x 720`，方便按像素美术坐标布置对象。

3. CSS 像素化与像素 UI
   - 容器和 canvas 使用 `image-rendering: pixelated`。
   - 页面使用 `ArkPixel` 字体。
   - 控制栏、按钮、抽屉和弹窗使用硬边框、角线、sprite 图和低圆角风格。

相关 CSS 特征：

```css
#game-container {
  width: 1280px;
  height: 720px;
  image-rendering: pixelated;
}

#game-container canvas {
  image-rendering: pixelated;
  object-fit: contain;
}
```

## 资源与 spritesheet 机制

项目通过 Phaser 的资源加载接口加载图片和 spritesheet：

- `this.load.image(...)`
- `this.load.spritesheet(...)`

常见资源类型：

- 背景：`office_bg.webp` / `office_bg_small.webp`
- 主角待机：`star-idle-v5.png`
- 主角工作：`star-working-spritesheet-grid.webp`
- 同步动画：`sync-animation-v3-grid.webp`
- 错误 bug：`error-bug-spritesheet-grid.webp`
- 猫、植物、海报、服务器、咖啡机等装饰物 spritesheet
- 按钮状态图：`btn-state-sprite.png` 等

项目还做了 WebP 支持检测：

- 支持 WebP 时优先加载 WebP。
- 不支持时回退 PNG。
- 透明资源或特殊资源可强制 PNG，例如办公桌相关资源。

这说明它比较重视资源体积和加载速度，同时保留浏览器兼容性。

## 布局与层级控制

布局数据集中在 `frontend/layout.js`。

主要内容包括：

- 游戏画布尺寸：`1280 x 720`
- 各工作区域坐标：door、writing、researching、error、breakroom
- 家具和角色坐标
- depth 层级
- 强制 PNG 资源配置

对象遮挡不是依赖 DOM 层级，而是依赖 Phaser 对象的 `depth`：

```js
sprite.setDepth(1000)
```

这类层级规则适合像素场景：

- 背景放低层
- 沙发、家具居中层
- 主角根据场景放在桌子前后
- 植物、猫等前景元素放更高层

## 动画方式

项目通过 Phaser 动画系统播放 spritesheet：

```js
this.anims.create({
  key: 'star_idle',
  frames: this.anims.generateFrameNumbers('star_idle_sheet', {
    start: 0,
    end: 29
  }),
  frameRate: 12,
  repeat: -1
})
```

典型动画包括：

- `star_idle`：主角待机
- `star_working`：主角工作
- `star_researching`：主角研究
- `sync_anim`：同步状态
- `error_bug`：错误状态
- `coffee_machine`：咖啡机动画
- `serverroom_on`：服务器机房动画
- `sofa_busy`：休息区动画

这种方式更接近 2D 游戏，而不是普通网页 UI。

## 状态驱动渲染

前端会定时向后端接口获取 agent 状态：

- `/status`：单 agent 状态
- `/agents`：多 agent 状态

轮询间隔大致为：

- 状态轮询：约 2 秒
- agents 轮询：约 2.5 秒

状态会映射到不同办公室区域和动画：

```js
idle        -> breakroom
writing     -> writing
researching -> researching
executing   -> writing
syncing     -> writing / sync_anim
error       -> error / error_bug
```

因此它本质上是一个“agent 状态可视化办公室”：

- 不同状态对应不同位置。
- 不同任务对应不同动画。
- 错误、同步、工作等状态都有独立视觉反馈。

## CSS 像素 UI

除 Phaser 画布外，项目还用 CSS 做了不少像素风 UI：

- 像素字体 `ArkPixel`
- 硬边框面板
- 像素角线
- sprite button
- 控制栏和抽屉 UI
- 首屏 skeleton 占位，避免 Phaser 加载前黑屏

按钮通常使用一张横向 sprite 图，通过 `background-position` 切换状态：

- normal
- active
- done

这种方式和游戏 UI 的按钮状态图一致。

## 对 Carbon Code 可借鉴点

1. 状态可视化面板
   - 可以把 Carbon Code 的 agent / task / session 状态可视化成一个可选 Web Dashboard。
   - 不必替代 TUI，而是作为可选的观察窗口。

2. 状态到动画的映射
   - 将内部状态抽象成：`idle`、`planning`、`coding`、`testing`、`syncing`、`error` 等。
   - 每种状态绑定固定区域和动画资源。

3. 布局配置化
   - Star-Office-UI 把坐标、depth、区域配置集中在 `layout.js`。
   - Carbon Code 如果做视觉化，也应避免把坐标散落在业务逻辑里。

4. 资源格式策略
   - 不透明资源优先 WebP。
   - 透明资源或兼容性敏感资源保留 PNG。
   - 加载前检测 WebP 支持并 fallback。

5. Phaser 适合做状态看板
   - 如果目标是像素风、动画角色、多层场景，Phaser 比纯 React/CSS 更合适。
   - 它天然支持 spritesheet、动画、depth、camera、resize 和输入事件。

6. 保留核心 CLI 简洁性
   - 像素 UI 应作为附加模块，不应污染 CLI 核心业务。
   - 推荐以独立 `web-dashboard`、`visualizer` 或 `ui-pixel` 包形式存在。

## 不建议照搬点

1. 不建议把 Phaser 嵌入终端 TUI
   - Carbon Code 当前是 CLI/TUI 工具，Phaser 是浏览器/Canvas 方案。
   - 直接嵌入终端会增加复杂度且收益有限。

2. 不建议把业务状态写死在前端
   - 应由 CLI/Core 输出统一状态事件。
   - 前端只订阅事件并渲染。

3. 不建议让视觉资源影响核心包体积
   - 像素图、spritesheet、字体资源可能较大。
   - 应独立懒加载或拆包。

4. 不建议复制其完整 Electron 壳
   - 除非 Carbon Code 明确需要桌面宠物或桌面状态面板。
   - 否则先做 Web Dashboard 更轻量。

## 总体评价

Star-Office-UI 是一个“Phaser 游戏引擎驱动的像素办公室状态看板”。

它值得 Carbon Code 借鉴的不是具体代码，而是这套表达方式：

- 用像素场景承载 agent 状态。
- 用 spritesheet 动画表达任务进展。
- 用布局配置维护场景坐标和层级。
- 用 CSS 保持外围 UI 的像素一致性。

如果 Carbon Code 未来希望增加更有趣的状态可视化，可以考虑单独做一个基于 Phaser 的可选前端，而不是改动现有 CLI/TUI 主路径。
