const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { pathToFileURL } = require('url');

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function createPng(width, height) {
  const signature = Buffer.from('89504e470d0a1a0a', 'hex');
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 4, 0xff)]);
  const raw = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

function readPngSize(filePath) {
  const buffer = fs.readFileSync(filePath);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readPngSizeFromBuffer(buffer) {
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function readZipEntries(filePath) {
  const buffer = fs.readFileSync(filePath);
  const entries = [];
  let offset = 0;
  while (offset + 30 <= buffer.length && buffer.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = buffer.subarray(nameStart, nameStart + nameLength).toString('utf8');
    entries.push({ name, data: buffer.subarray(dataStart, dataStart + compressedSize) });
    offset = dataStart + compressedSize;
  }
  return entries;
}

async function openApp(page) {
  await page.route('**/cropper.min.js', route => route.abort());
  await page.goto('/index.html');
}

async function openAppFromFile(page) {
  await page.route('**/cropper.min.js', route => route.abort());
  await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
}

async function switchView(page, name) {
  if (await page.locator('#menuButton').isVisible()) {
    await page.click('#menuButton');
  }
  await page.getByRole('button', { name }).click();
}

async function domClick(page, selector) {
  await page.locator(selector).dispatchEvent('click');
}

async function uploadValidImage(page) {
  await page.fill('#titleInput', 'Take control');
  await page.fill('#subtitleInput', 'Lower your trading costs\nwith Spec Markets.');
  await page.fill('#ctaInput', 'Find your edge');
  await page.setInputFiles('#uploadInput', {
    name: 'product.png',
    mimeType: 'image/png',
    buffer: createPng(600, 700)
  });
  await expect(page.locator('#uploadPreview')).toBeVisible();
  await expect(page.locator('#generateButton')).toBeEnabled();
}

test('initial state and text preview are safe', async ({ page, isMobile }) => {
  await openApp(page);
  await expect(page.locator('#generateButton')).toBeDisabled();
  await expect(page.locator('#downloadButton')).toBeDisabled();
  if (!isMobile) {
    await page.locator('#settingsPanel').evaluate(panel => { panel.scrollTop = panel.scrollHeight; });
    const settingsBox = await page.locator('#settingsPanel').boundingBox();
    const generateBox = await page.locator('#generateButton').boundingBox();
    expect(generateBox.y + generateBox.height).toBeLessThanOrEqual(settingsBox.y + settingsBox.height + 1);
  } else {
    await page.locator('#generateButton').scrollIntoViewIfNeeded();
  }
  await expect(page.locator('#generateButton')).toBeInViewport();

  await page.fill('#subtitleInput', '<img src=x onerror="window.__xss = true">\nSafe line');
  await expect(page.locator('#previewSubtitle img')).toHaveCount(0);
  await expect(page.locator('#previewSubtitle')).toContainText('<img src=x onerror="window.__xss = true">');
  await expect(page.locator('#previewSubtitle')).toContainText('Safe line');
  await expect(page.evaluate(() => Boolean(window.__xss))).resolves.toBe(false);
});

test('generation rules uploads multiple documents and previews markdown in modal', async ({ page }) => {
  await openApp(page);
  await switchView(page, '生成规则');
  await expect(page.locator('#rulesView')).toBeVisible();
  await page.setInputFiles('#rulesFileInput', [
    {
      name: 'rules.md',
      mimeType: 'text/markdown',
      buffer: Buffer.from('# 生成规则\n- 保持 Logo 对齐\n- 支持 PNG 透明背景')
    },
    {
      name: 'rules.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n%%EOF')
    }
  ]);
  await expect(page.locator('#rulesDocStatus')).toHaveText('2 个文档');
  await expect(page.locator('#rulesDocList .rules-doc-row')).toHaveCount(2);
  await expect(page.locator('#toast')).toContainText('已上传 2 个生成规则文档');

  await page.locator('#rulesDocList [data-rules-action="preview"]').first().click();
  await expect(page.locator('#rulesPreviewModal')).toHaveClass(/open/);
  await expect(page.locator('#rulesPreviewModalTitle')).toHaveText('rules.md');
  await expect(page.locator('#rulesPreviewModalBody h1')).toHaveText('生成规则');
  await expect(page.locator('#rulesPreviewModalBody li')).toHaveCount(2);

  await page.reload();
  await switchView(page, '生成规则');
  await expect(page.locator('#rulesDocStatus')).toHaveText('2 个文档');
  await expect(page.locator('#rulesDocList .rules-doc-row')).toHaveCount(2);
  await expect(page.locator('#rulesDocList')).toContainText('rules.md');
  await page.locator('#rulesDocList [data-rules-action="preview"]').first().click();
  await expect(page.locator('#rulesPreviewModalTitle')).toHaveText('rules.md');
  await expect(page.locator('#rulesPreviewModalBody h1')).toHaveText('生成规则');
  await page.locator('#rulesPreviewModal [data-rules-modal-action="close"]').click();

  await page.locator('#rulesDocList [data-rules-action="delete"]').first().click();
  await expect(page.locator('#rulesDocStatus')).toHaveText('1 个文档');
  await expect(page.locator('#toast')).toContainText('生成规则文档已删除');
  await page.reload();
  await switchView(page, '生成规则');
  await expect(page.locator('#rulesDocStatus')).toHaveText('1 个文档');
  await expect(page.locator('#rulesDocList')).not.toContainText('rules.md');
});

test('size and language settings persist until deleted', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop table editing covers persistence; mobile navigation is covered separately');
  await openApp(page);
  await switchView(page, '尺寸/语言设置');
  await expect(page.locator('#sizeLanguageSettingsView')).toBeVisible();
  await expect(page.locator('#languageSettingsBody tr').last().locator('[data-language-field="cn"]')).toHaveValue('马来语');
  await expect(page.locator('#languageSettingsBody tr').last().locator('[data-language-field="en"]')).toHaveValue('Melayu');

  await domClick(page, '#addSizeForm');
  await page.fill('#newSizeLabel', '640 x 360 Persist');
  await page.fill('#newSizeWidth', '640');
  await page.fill('#newSizeHeight', '360');
  await domClick(page, '#addSizeModal [data-settings-modal-action="submit"]');
  await expect(page.locator('#sizeSettingsCount')).toHaveText('18 个');

  await domClick(page, '#addLanguageForm');
  await page.fill('#newLanguageCn', '德语');
  await page.fill('#newLanguageNative', 'Deutsch');
  await domClick(page, '#addLanguageModal [data-settings-modal-action="submit"]');
  await expect(page.locator('#languageSettingsCount')).toHaveText('10 种');

  await page.reload();
  await switchView(page, '尺寸/语言设置');
  await expect(page.locator('#sizeSettingsCount')).toHaveText('18 个');
  await expect(page.locator('#languageSettingsCount')).toHaveText('10 种');
  const restoredSizeRow = page.locator('#sizeSettingsBody tr').last();
  await expect(restoredSizeRow.locator('[data-size-field="label"]')).toHaveValue('640 x 360 Persist');
  await expect(restoredSizeRow.locator('[data-size-field="width"]')).toHaveValue('640');
  await expect(restoredSizeRow.locator('[data-size-field="height"]')).toHaveValue('360');
  const restoredLanguageRow = page.locator('#languageSettingsBody tr').last();
  await expect(restoredLanguageRow.locator('[data-language-field="cn"]')).toHaveValue('德语');
  await expect(restoredLanguageRow.locator('[data-language-field="en"]')).toHaveValue('Deutsch');

  await restoredSizeRow.locator('[data-size-setting-action="delete"]').dispatchEvent('click');
  await expect(page.locator('#sizeSettingsCount')).toHaveText('17 个');
  await restoredLanguageRow.locator('[data-language-setting-action="delete"]').dispatchEvent('click');
  await expect(page.locator('#languageSettingsCount')).toHaveText('9 种');

  await page.reload();
  await switchView(page, '尺寸/语言设置');
  await expect(page.locator('#sizeSettingsCount')).toHaveText('17 个');
  await expect(page.locator('#languageSettingsCount')).toHaveText('9 种');
  expect(await page.locator('#sizeSettingsBody [data-size-field="label"]').evaluateAll(inputs => inputs.map(input => input.value))).not.toContain('640 x 360 Persist');
  expect(await page.locator('#languageSettingsBody [data-language-field="cn"]').evaluateAll(inputs => inputs.map(input => input.value))).not.toContain('德语');
});

test('validates languages and always generates all layout rules', async ({ page }) => {
  await openApp(page);
  await uploadValidImage(page);
  await expect(page.locator('.language-card').last()).toContainText('马来语');
  await expect(page.locator('.language-card').last()).toContainText('Melayu');

  await page.locator('#sizeChecks input').evaluateAll(inputs => inputs.forEach(input => { input.checked = false; }));
  const languageCards = page.locator('.language-card');
  const languageCount = await languageCards.count();
  for (let index = 0; index < languageCount; index += 1) {
    await languageCards.nth(index).click();
  }
  await expect(page.locator('#generateButton')).toBeDisabled();

  await languageCards.first().click();
  await expect(page.locator('#generateButton')).toBeEnabled();
  await page.click('#generateButton');
  await expect(page.locator('#downloadButton')).toBeEnabled({ timeout: 10_000 });
  await expect(page.locator('#statusMeta')).toContainText('17 个尺寸 × 1 种语言，共 17 张素材');
  await expect(page.locator('#sizePreviewRow .size-thumb')).toHaveCount(17);

  for (const label of ['160 x 600', '300 x 600', '320 x 480', '120 x 600', '828 x 1200']) {
    await page.locator('#sizePreviewRow .size-thumb', { hasText: label }).click();
    const cardBox = await page.locator('#materialCard').boundingBox();
    const areaBox = await page.locator('.canvas-area').boundingBox();
    expect(cardBox.height).toBeLessThanOrEqual(areaBox.height + 1);
    expect(cardBox.width).toBeLessThanOrEqual(areaBox.width + 1);
  }

  await page.locator('#sizePreviewRow .size-thumb', { hasText: '300 x 600' }).click();
  await page.locator('#productFrame').click();
  await expect(page.locator('#productFrame')).toHaveClass(/is-selected/);
  const frameBox = await page.locator('#productFrame').boundingBox();
  const beforeImageBox = await page.locator('#phoneHand').boundingBox();
  await page.mouse.move(frameBox.x + frameBox.width / 2, frameBox.y + frameBox.height / 2);
  await page.mouse.wheel(0, -260);
  await page.mouse.down();
  await page.mouse.move(frameBox.x + frameBox.width / 2 + 24, frameBox.y + frameBox.height / 2 + 18);
  await page.mouse.up();
  const afterImageBox = await page.locator('#phoneHand').boundingBox();
  expect(afterImageBox.width).toBeGreaterThan(beforeImageBox.width);
  expect(afterImageBox.y).not.toBe(beforeImageBox.y);
});

test('generates all layouts and exports PNG assets', async ({ page }, testInfo) => {
  await openApp(page);
  await uploadValidImage(page);

  await page.locator('#sizeChecks input').evaluateAll(inputs => inputs.forEach(input => { input.checked = false; }));
  await page.locator('.language-card').evaluateAll(cards => cards.forEach((card, index) => card.classList.toggle('active', index < 2)));
  await page.click('#generateButton');
  await expect(page.locator('#downloadButton')).toBeEnabled({ timeout: 10_000 });
  await expect(page.locator('#statusMeta')).toContainText('17 个尺寸 × 2 种语言，共 34 张素材');
  await expect(page.locator('#sizePreviewRow .size-thumb')).toHaveCount(17);

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.click('#downloadButton').then(async () => {
      await expect(page.locator('#downloadMenu')).toHaveClass(/open/);
      await page.locator('[data-download-kind="all"]').click();
      await expect(page.locator('#downloadOptionsModal')).toHaveClass(/open/);
      await page.selectOption('#downloadMethod', 'zip');
      await expect(page.locator('#downloadFolderName')).toHaveValue('spec-promo-materials');
      await page.fill('#downloadFolderName', 'spec-promo-test');
      await page.locator('#downloadOptionsModal [data-download-modal-action="submit"]').click();
    })
  ]).then(([downloadResult]) => downloadResult);
  const target = path.join(testInfo.outputDir, 'export.zip');
  await download.saveAs(target);
  expect(download.suggestedFilename()).toBe('spec-promo-test.zip');
  const entries = readZipEntries(target);
  expect(entries).toHaveLength(34);
  expect(entries.every(entry => entry.name.startsWith('spec-promo-test/') && entry.name.endsWith('.png'))).toBe(true);
  expect(entries.filter(entry => entry.name.startsWith('spec-promo-test/English/'))).toHaveLength(17);
  expect(entries.filter(entry => entry.name.startsWith('spec-promo-test/日本語/'))).toHaveLength(17);
  expect(readPngSizeFromBuffer(entries[0].data)).toEqual({ width: 1200, height: 628 });
});

test('exports the currently previewed single PNG asset', async ({ page }, testInfo) => {
  await openApp(page);
  await uploadValidImage(page);
  await page.click('#generateButton');
  await expect(page.locator('#downloadButton')).toBeEnabled({ timeout: 10_000 });

  await page.locator('#sizePreviewRow .size-thumb', { hasText: '300 x 250' }).click();
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.click('#downloadButton').then(async () => {
      await expect(page.locator('#downloadMenu')).toHaveClass(/open/);
      await page.locator('[data-download-kind="single"]').click();
    })
  ]).then(([downloadResult]) => downloadResult);
  const target = path.join(testInfo.outputDir, 'single.png');
  await download.saveAs(target);
  expect(download.suggestedFilename()).toContain('ad_300x250');
  expect(readPngSize(target)).toEqual({ width: 300, height: 250 });
});


test('exports single PNG when opened directly from the file system', async ({ page }, testInfo) => {
  await openAppFromFile(page);
  await uploadValidImage(page);
  await page.click('#generateButton');
  await expect(page.locator('#downloadButton')).toBeEnabled({ timeout: 10_000 });

  const download = await Promise.all([
    page.waitForEvent('download'),
    page.click('#downloadButton').then(async () => {
      await expect(page.locator('#downloadMenu')).toHaveClass(/open/);
      await page.locator('[data-download-kind="single"]').click();
    })
  ]).then(([downloadResult]) => downloadResult);
  const target = path.join(testInfo.outputDir, 'single-file-url.png');
  await download.saveAs(target);
  expect(download.suggestedFilename()).toContain('1200x628');
  expect(readPngSize(target)).toEqual({ width: 1200, height: 628 });
});

test('template manager edits visual anchors, multi-aligns, and commits mapping', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop precision drag is covered in the desktop project');
  await openApp(page);
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#templateManagerView')).toBeVisible();
  await expect(page.locator('.anchor-box')).toHaveCount(5);
  await expect(page.locator('.anchor-box[data-anchor="cta"]')).toHaveCount(1);
  await expect(page.locator('#anchorSummary')).toHaveCount(0);
  await expect(page.locator('#templateManagerView .align-panel')).toBeVisible();

  const textAnchor = page.locator('.anchor-box[data-anchor="text"]');
  const ctaAnchor = page.locator('.anchor-box[data-anchor="cta"]');
  const logoAnchor = page.locator('.anchor-box[data-anchor="logo"]');
  if (!isMobile) {
    const before = await textAnchor.getAttribute('style');
    const ctaBefore = await ctaAnchor.getAttribute('style');
    const box = await textAnchor.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20);
    await page.mouse.up();
    await expect(textAnchor).not.toHaveAttribute('style', before);
    await expect(ctaAnchor).toHaveAttribute('style', ctaBefore);
    await expect(page.locator('#commitAnchorsButton')).toBeEnabled();
  }

  await logoAnchor.click();
  await textAnchor.click({ modifiers: ['Shift'] });
  await expect(logoAnchor).toHaveClass(/is-selected/);
  await expect(textAnchor).toHaveClass(/is-selected/);
  await expect(page.getByRole('button', { name: '顶对齐' })).toBeEnabled();
  await page.getByRole('button', { name: '顶对齐' }).click();
  await expect(textAnchor).toHaveAttribute('style', /top: 8(?:\.0)?%/);

  await page.selectOption('#backgroundModeSelect', 'gradient');
  await page.locator('#gradientStartInput').fill('#112233');
  await page.locator('#gradientEndInput').fill('#44ccff');
  await page.locator('#textColorInput').fill('#ffffff');
  await page.locator('#buttonColorInput').fill('#ff6600');
  await page.getByRole('button', { name: '亮版' }).click();
  await expect(page.locator('#anchorCanvas')).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.locator('#gradientControl')).not.toHaveClass(/visible/);
  const canvasBox = await page.locator('#anchorCanvas').boundingBox();
  await page.mouse.click(canvasBox.x + canvasBox.width * 0.5, canvasBox.y + canvasBox.height * 0.05);
  await expect(page.locator('#gradientControl')).toHaveClass(/visible/);
  const angleBefore = await page.locator('#gradientAngleInput').inputValue();
  const gradientHandle = page.locator('[data-gradient-handle="end"]');
  const handleBox = await gradientHandle.boundingBox();
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 70, handleBox.y + handleBox.height / 2 + 40);
  await page.mouse.up();
  await expect(page.locator('#gradientAngleInput')).not.toHaveValue(angleBefore);
  await expect(page.locator('#commitAnchorsButton')).toBeEnabled();
  await page.getByRole('button', { name: '提交模板映射' }).click();
  await expect(page.locator('#commitAnchorsButton')).toBeDisabled();
  await page.getByRole('button', { name: '素材生成' }).click();
  await expect(page.locator('#generatorView')).toBeVisible();
  await expect(page.locator('#materialCard')).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.locator('.creative-copy')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('#previewCta')).toHaveCSS('background-color', 'rgb(255, 102, 0)');
  await expect(page.locator('#creativeLogoImage')).toHaveAttribute('src', /logo-market-dark\.png/);

  await page.reload();
  await expect(page.locator('#materialCard')).toHaveCSS('background-image', /linear-gradient/);
  await expect(page.locator('.creative-copy')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('#creativeLogoImage')).toHaveAttribute('src', /logo-market-dark\.png/);
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#backgroundModeSelect')).toHaveValue('gradient');
  await expect(page.locator('#gradientStartHexInput')).toHaveValue('#112233');
  await expect(page.locator('#gradientEndHexInput')).toHaveValue('#44CCFF');

  await page.getByRole('button', { name: '素材生成' }).click();
  await page.getByRole('button', { name: '重置' }).click();
  await page.reload();
  await expect(page.locator('#materialCard')).toHaveCSS('background-image', /linear-gradient/);
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#backgroundModeSelect')).toHaveValue('gradient');
  await page.getByRole('button', { name: '素材生成' }).click();
  await expect(page.locator('#creativeLogoImage')).toHaveAttribute('src', /logo-market-dark\.png/);
});

test('template manager can add a mapped template for generation', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop template mapping flow is covered in the desktop project');
  await openApp(page);
  await page.getByRole('button', { name: '模板管理' }).click();
  await page.getByRole('button', { name: '新增模板' }).click();

  await expect(page.locator('#managerTemplateGrid .template-card[data-template="template-3"]')).toBeVisible();
  await expect(page.locator('#managerTemplateGrid .template-card[data-template="template-3"]')).toHaveClass(/active/);

  for (let count = 0; count < 5; count += 1) {
    await page.getByRole('button', { name: '新增模板' }).click();
  }
  await expect(page.locator('#managerTemplateGrid .template-card[data-template="template-8"]')).toBeVisible();
  expect(await page.locator('#managerTemplateGrid').evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);
  await page.locator('#managerTemplateGrid').evaluate(node => { node.scrollLeft = node.scrollWidth; });
  expect(await page.locator('#managerTemplateGrid').evaluate(node => node.scrollLeft > 0)).toBe(true);

  await page.getByRole('button', { name: '素材生成' }).click();
  await expect(page.locator('#templateGrid .template-card[data-template="template-8"]')).toBeVisible();
  await expect(page.locator('#templateGrid .template-card[data-template="template-8"]')).toHaveClass(/active/);
  expect(await page.locator('#templateGrid').evaluate(node => node.scrollWidth > node.clientWidth)).toBe(true);

  await page.locator('#templateGrid .template-card[data-template="template-1"]').click();
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#managerTemplateGrid .template-card[data-template="template-1"]')).toHaveClass(/active/);

  await page.reload();
  await expect(page.locator('#templateGrid .template-card[data-template="template-8"]')).toBeVisible();
  await expect(page.locator('#templateGrid .template-card[data-template="template-1"]')).toHaveClass(/active/);
});

test('desktop sidebar has icons and can collapse or expand', async ({ page, isMobile }) => {
  test.skip(isMobile, 'mobile navigation is covered separately');
  await openApp(page);
  await expect(page.locator('.nav-icon')).toHaveCount(4);

  const app = page.locator('.app');
  const collapseButton = page.locator('#sidebarCollapseButton');
  await collapseButton.click();
  await expect(app).toHaveClass(/sidebar-collapsed/);
  await expect(collapseButton).toHaveAttribute('aria-label', '展开侧边栏');

  await collapseButton.click();
  await expect(app).not.toHaveClass(/sidebar-collapsed/);
  await expect(collapseButton).toHaveAttribute('aria-label', '折叠侧边栏');
});

test('mobile layout opens navigation', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only smoke');
  await openApp(page);
  await page.click('#menuButton');
  await expect(page.locator('#sidebar')).toHaveClass(/open/);
});
