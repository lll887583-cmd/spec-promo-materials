# SPEC UI 设计依赖说明

来源：本地 `spec-ui-demo/index.html`。
用途：作为 `spec-promo-materials` 的基础设计依赖，统一品牌色、排版、容器、表单、上传、按钮、表格等规则。

## 核心原则

- 风格保持简洁、大方、专业、克制，优先业务可读性和操作效率。
- 页面使用真实响应式网页宽度，不使用固定 1920px 画布或整体缩放。
- 视觉层级优先通过字号、字重、间距、边框和白底卡片建立，不依赖强渐变和重阴影。
- 品牌主色固定为 `#1F3472`，状态色只用于成功、警告、错误等语义反馈。
- 信息密集区域可提高密度，但必须保留清晰边界、分组标题和可扫描行高。
- 移动端优先核心任务流，减少非必要常驻信息，按钮可整行铺满。

## 设计 Token

### 色彩

| Token | 值 | 用途 |
| --- | --- | --- |
| `--spec-color-primary` | `#1F3472` | 品牌主色、主按钮、导航高亮、focus |
| `--spec-color-secondary` | `#1C1A19` | 深色强调、tooltip 背景 |
| `--spec-color-text` | `#1D1D1D` | 主文字 |
| `--spec-color-muted` | `#777777` | 次级文字、placeholder |
| `--spec-color-pale` | `#5D647D` | 辅助文字、图标 |
| `--spec-color-line` | `#DBDBDB` | 常规边框、表格分隔 |
| `--spec-color-line-soft` | `#EDEFF4` | 轻边框、卡片边界 |
| `--spec-color-body-bg` | `#F9FAFB` | 页面背景 |
| `--spec-color-white` | `#FFFFFF` | 卡片和导航背景 |
| `--spec-color-disabled` | `#FBFBFB` | 输入框底色、禁用背景 |
| `--spec-color-column-head` | `#F8FAFF` | 表头、hover、轻高亮 |
| `--spec-color-success` | `#24A661` | 成功态 |
| `--spec-color-warning` | `#FFAE57` | 警告态 |
| `--spec-color-error` | `#A1261F` | 错误态 |
| `--spec-color-danger` | `#FF4D4F` | 删除、危险提示 |

### 排版

- 字体：`"ubuntu-font", "Ubuntu", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- 默认字号：`14px`
- 默认行高：`20px`
- 常用字号：`12 / 13 / 14 / 16 / 18 / 20px`
- 常用字重：`400` 正文、`500` 控件和业务文本、`700` 标题和重点。

### 间距和圆角

- 间距：`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40px`
- 圆角：`3px` 标签、`4px` 输入和按钮、`6px` 上传框、`8px` 卡片、`10px` 大表单卡片。
- 阴影：默认克制；业务卡片可无阴影，浮层使用 `--spec-shadow-popup`。

## 组件规范

### Button

- 主按钮：`36px` 最小高度、`8px 16px` padding、`4px` 圆角、主色背景。
- 次按钮：白底、主色文字和主色边框。
- 危险按钮：白底、错误色文字和错误色边框。
- hover 不做位移，不加重阴影，保持稳定。

可用依赖类：`spec-button`、`spec-button-secondary`、`spec-button-danger-outline`。

### Field / Input / Select

- 标签使用 `12px`、`#666666`。
- 控件最小高度 `38px`，背景 `#FBFBFB`，边框 `#EDEFF4`。
- focus 使用主色边框和 `rgba(31, 52, 114, 0.08)` focus ring。
- placeholder 使用 `#777777`，字重 `400`。

可用依赖类：`spec-field`、`spec-field-label`、`spec-input`、`spec-select`、`spec-textarea`。

### Card

- 白底、`#EDEFF4` 边框、`8px` 圆角、默认无阴影。
- 卡片内部推荐自上而下：标题区、操作区、正文区、底部操作区。
- 复杂表单卡片使用 `20px 24px 24px` 一类的舒适内边距，移动端收缩为 `16px`。

可用依赖类：`spec-card`、`spec-panel-card`。

### Upload

- 空状态使用虚线边框 `#C5C5C5`、背景 `#FBFBFB`、灰色图标。
- 推荐比例 `440 / 240`，默认最小高度 `174px`。
- hover/focus 使用品牌主色边框和 `#F8FAFF` 背景。
- 上传后的预览应保持原容器尺寸，操作按钮放到右侧或下方 meta 区域。

可用依赖类：`spec-upload`、`spec-upload-dropzone`、`spec-upload-empty`、`spec-upload-icon`。

### Table

- 表格外层必须可横向滚动，不让整个页面横向滚动。
- 表头背景 `#F6F7F9`，表头文字 `13px / 500 / #666666`。
- 行分隔线用 `#EDEFF4`，hover 行背景 `#F9FAFB`。

可用依赖类：`spec-table-wrap`、`spec-table`。

### Toggle / Tag

- Toggle 宽 `40px`、高 `22px`，关闭灰色，打开主色。
- Tag 最小高度 `24px`，`2px 8px` padding，`3px` 圆角。

可用依赖类：`spec-toggle`、`spec-toggle-slider`、`spec-tag`。

## 响应式规则

- `>= 1024px`：保留完整桌面布局和侧栏。
- `768px - 1023px`：表单、上传、卡片布局从多列转为单列或两列。
- `<= 767px`：内容单列，主按钮整行铺满，表格容器横向滚动，非核心信息隐藏或收起。

## 在 spec-promo-materials 中的接入方式

当前页面已通过以下文件接入：

```html
<link rel="stylesheet" href="assets/spec-ui-foundation.css" />
```

页面内的旧变量通过 fallback 依赖 `--spec-*` token，例如：

```css
--primary: var(--spec-color-primary, #1F3472);
--bg: var(--spec-color-body-bg, #f9fafb);
--line: var(--spec-color-line, #dbdbdb);
```

后续新增组件优先复用 `assets/spec-ui-foundation.css` 中的 `spec-*` 类；页面特有视觉只写在 `index.html` 内部样式中。
