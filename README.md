# spec-promo-materials

Promo Materials 批量推广素材生成系统 UI demo。

## 推荐启动方式：带服务器数据库

现在项目包含一个本地后端服务和 SQLite 数据库，用于永久保存：

- 尺寸/语言设置：默认数据、编辑保存、新增、删除、排序
- 生成规则：上传、重新上传、删除的规则文档

启动：

```bash
cd "/Users/macbookpro/Documents/New project/spec-promo-materials"
npm start
```

打开：

```text
http://127.0.0.1:4173
```

数据库文件会自动创建在：

```text
/Users/macbookpro/Documents/New project/spec-promo-materials/data/spec_promo_materials.sqlite3
```

使用方式：

1. 用 `npm start` 启动服务。
2. 浏览器访问 `http://127.0.0.1:4173`，不要直接双击打开 `index.html`。
3. 在「尺寸/语言设置」里新增、编辑、删除或排序后，点击对应保存按钮，数据会写入 SQLite。
4. 在「生成规则」里上传、重新上传或删除文档后，文档会写入 SQLite。
5. 停掉服务再重启、或刷新页面，数据会从服务器数据库恢复。

> 如果没有通过 `npm start` 启动，而是直接打开 HTML 或使用纯静态服务，页面会自动回退到浏览器本地 IndexedDB/localStorage，但那不是服务器数据库。

## 仅静态预览（不推荐用于保存数据）

```bash
cd "/Users/macbookpro/Documents/New project/spec-promo-materials"
npm run serve:static
```

静态预览只适合临时查看 UI；服务器数据库 API 不可用时，保存会回退到浏览器本地数据库。

## 本地回归测试

```bash
npm install
npx playwright install chromium
npm test
```

## 文件说明

- `index.html`：推广素材操作系统 UI demo
- `server.py`：本地后端服务，提供静态页面和 SQLite API
- `data/spec_promo_materials.sqlite3`：本地 SQLite 数据库（首次启动后自动创建）
- `assets/spec-ui-foundation.css`：从本地 `spec-ui-demo/index.html` 提取的 SPEC UI 设计依赖
- `docs/spec-ui-dependency.md`：SPEC UI 设计原则、token、组件和响应式规范整理
- `assets/logo.png`：Promo Materials Logo
- `generate_exness_posters.py`：Pillow + Jinja 批量生成海报脚本
- `tests/promo-materials.spec.js`：Playwright 端到端回归测试
