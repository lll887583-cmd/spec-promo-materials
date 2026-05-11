# spec-promo-materials

Promo Materials 批量推广素材生成系统 UI demo。

## 打开 UI Demo

```bash
open "/Users/macbookpro/Documents/spec-promo-materials/index.html"
```

## 本地回归测试

```bash
npm install
npx playwright install chromium
npm test
```

## 文件说明

- `index.html`：推广素材操作系统 UI demo
- `assets/spec-ui-foundation.css`：从本地 `spec-ui-demo/index.html` 提取的 SPEC UI 设计依赖
- `docs/spec-ui-dependency.md`：SPEC UI 设计原则、token、组件和响应式规范整理
- `assets/logo.png`：Promo Materials Logo
- `generate_exness_posters.py`：Pillow + Jinja 批量生成海报脚本
- `tests/promo-materials.spec.js`：Playwright 端到端回归测试
