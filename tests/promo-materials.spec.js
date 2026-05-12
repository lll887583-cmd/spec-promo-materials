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

function zipBuffer(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name);
    const data = Buffer.from(entry.data);
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(0, 10);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(0, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function createDocx(text) {
  const paragraphs = String(text).split(/\r?\n/).map(line => (
    `<w:p><w:r><w:t>${line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>`
  )).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`;
  return zipBuffer([{ name: 'word/document.xml', data: documentXml }]);
}

function createSimplePdf(text) {
  const escapePdfText = value => String(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const content = `BT\n/F1 12 Tf\n72 720 Td\n${String(text).split(/\r?\n/).map(line => `(${escapePdfText(line)}) Tj\nT*`).join('\n')}\nET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(objectOffset => {
    pdf += `${String(objectOffset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
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
  await expect(page.locator('#rulesDocStatus')).toContainText('2 个文档');
  await expect(page.locator('#rulesDocList .rules-doc-row')).toHaveCount(2);
  await expect(page.locator('#toast')).toContainText('已上传 2 个生成规则文档');

  await page.locator('#rulesDocList [data-rules-action="preview"]').first().click();
  await expect(page.locator('#rulesPreviewModal')).toHaveClass(/open/);
  await expect(page.locator('#rulesPreviewModalTitle')).toHaveText('rules.md');
  await expect(page.locator('#rulesPreviewModalBody h1')).toHaveText('生成规则');
  await expect(page.locator('#rulesPreviewModalBody li')).toHaveCount(2);

  await page.reload();
  await switchView(page, '生成规则');
  await expect(page.locator('#rulesDocStatus')).toContainText('2 个文档');
  await expect(page.locator('#rulesDocList .rules-doc-row')).toHaveCount(2);
  await expect(page.locator('#rulesDocList')).toContainText('rules.md');
  await page.locator('#rulesDocList [data-rules-action="preview"]').first().click();
  await expect(page.locator('#rulesPreviewModalTitle')).toHaveText('rules.md');
  await expect(page.locator('#rulesPreviewModalBody h1')).toHaveText('生成规则');
  await page.locator('#rulesPreviewModal [data-rules-modal-action="close"]').click();

  await page.locator('#rulesDocList [data-rules-action="delete"]').first().click();
  await expect(page.locator('#rulesDocStatus')).toContainText('1 个文档');
  await expect(page.locator('#toast')).toContainText('生成规则文档已删除');
  await page.reload();
  await switchView(page, '生成规则');
  await expect(page.locator('#rulesDocStatus')).toContainText('1 个文档');
  await expect(page.locator('#rulesDocList')).not.toContainText('rules.md');
});

[
  {
    kind: 'MD',
    name: 'rules.md',
    mimeType: 'text/markdown',
    title: 'MD Rule Title',
    bufferFor: text => Buffer.from(text)
  },
  {
    kind: 'PDF',
    name: 'rules.pdf',
    mimeType: 'application/pdf',
    title: 'PDF Rule Title',
    bufferFor: createSimplePdf
  },
  {
    kind: 'Word',
    name: 'rules.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    title: 'Word Rule Title',
    bufferFor: createDocx
  }
].forEach(ruleFixture => {
  test(`${ruleFixture.kind} generation rule content drives generated assets`, async ({ page }) => {
    const ruleText = [
      '尺寸: 640 x 360',
      '语言: English',
      `标题: ${ruleFixture.title}`,
      `${ruleFixture.kind} 副标题: Ignored line without known key`,
      '副标题: Parsed document subtitle',
      '按钮: Parsed CTA',
      `文件名: ${ruleFixture.kind.toLowerCase()}-rule.png`
    ].join('\n');

    await openApp(page);
    await switchView(page, '生成规则');
    await page.setInputFiles('#rulesFileInput', {
      name: ruleFixture.name,
      mimeType: ruleFixture.mimeType,
      buffer: ruleFixture.bufferFor(ruleText)
    });
    await expect(page.locator('#rulesDocStatus')).toContainText('1 个文档');
    await page.locator('#rulesDocList [data-rules-action="preview"]').first().click();
    await expect(page.locator('#rulesPreviewModalBody')).toContainText('已解析 1 条生成规则');
    await page.locator('#rulesPreviewModal [data-rules-modal-action="close"]').click();

    await switchView(page, '素材生成');
    await uploadValidImage(page);
    await page.click('#generateButton');
    await expect(page.locator('#downloadButton')).toBeEnabled({ timeout: 10_000 });
    await expect(page.locator('#statusMeta')).toContainText('已按生成规则准备 1 张素材');
    await expect(page.locator('#sizePreviewRow .size-thumb')).toHaveCount(1);
    await expect(page.locator('#previewTitle')).toHaveText(ruleFixture.title);
    await expect(page.locator('#previewSubtitle')).toContainText('Parsed document subtitle');
    await expect(page.locator('#previewCta')).toHaveText('Parsed CTA');
  });
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
  const restoredSizeRow = page.locator('#sizeSettingsBody tr').filter({ has: page.locator('[data-size-field="label"][value="640 x 360 Persist"]') });
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
  expect(readPngSizeFromBuffer(entries[0].data)).toEqual({ width: 120, height: 600 });
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
  expect(download.suggestedFilename()).toContain('ad_120x600');
  expect(readPngSize(target)).toEqual({ width: 120, height: 600 });
});

test('template manager edits visual anchors, multi-aligns, and commits mapping', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop precision drag is covered in the desktop project');
  await openApp(page);
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#templateManagerView')).toBeVisible();
  await expect(page.locator('.anchor-box')).toHaveCount(6);
  await expect(page.locator('.anchor-box[data-anchor="title"]')).toHaveCount(1);
  await expect(page.locator('.anchor-box[data-anchor="subtitle"]')).toHaveCount(1);
  await expect(page.locator('.anchor-box[data-anchor="cta"]')).toHaveCount(1);
  await expect(page.locator('#anchorSummary')).toHaveCount(0);
  await expect(page.locator('#templateManagerView .align-panel')).toBeVisible();

  const titleAnchor = page.locator('.anchor-box[data-anchor="title"]');
  const subtitleAnchor = page.locator('.anchor-box[data-anchor="subtitle"]');
  const ctaAnchor = page.locator('.anchor-box[data-anchor="cta"]');
  const logoAnchor = page.locator('.anchor-box[data-anchor="logo"]');
  if (!isMobile) {
    const before = await titleAnchor.getAttribute('style');
    const subtitleBefore = await subtitleAnchor.getAttribute('style');
    const ctaBefore = await ctaAnchor.getAttribute('style');
    const box = await titleAnchor.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2 + 20);
    await page.mouse.up();
    await expect(titleAnchor).not.toHaveAttribute('style', before);
    await expect(subtitleAnchor).toHaveAttribute('style', subtitleBefore);
    await expect(ctaAnchor).toHaveAttribute('style', ctaBefore);
    await expect(page.locator('#commitAnchorsButton')).toBeEnabled();
  }

  await logoAnchor.click();
  await titleAnchor.click({ modifiers: ['Shift'] });
  await expect(logoAnchor).toHaveClass(/is-selected/);
  await expect(titleAnchor).toHaveClass(/is-selected/);
  await expect(page.getByRole('button', { name: '顶对齐' })).toBeEnabled();
  await page.getByRole('button', { name: '顶对齐' }).click();
  await expect(titleAnchor).toHaveAttribute('style', /top: 8(?:\.0)?%/);

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

test('material generation can add mapped templates while manager only switches templates', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop template mapping flow is covered in the desktop project');
  await openApp(page);

  await expect(page.locator('#generatorView #addTemplateButton')).toBeVisible();
  await expect(page.locator('#generatorView #deleteTemplateButton')).toBeVisible();
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#templateManagerView #addTemplateButton')).toHaveCount(0);
  await expect(page.locator('#templateManagerView #deleteTemplateButton')).toHaveCount(0);

  await page.getByRole('button', { name: '素材生成' }).click();
  await page.getByRole('button', { name: '新增模板' }).click();

  await expect(page.locator('#templateGrid .template-card[data-template="template-3"]')).toBeVisible();
  await expect(page.locator('#templateGrid .template-card[data-template="template-3"]')).toHaveClass(/active/);
  await page.getByRole('button', { name: '模板管理' }).click();
  await expect(page.locator('#managerTemplateGrid .template-card[data-template="template-3"]')).toBeVisible();
  await expect(page.locator('#managerTemplateGrid .template-card[data-template="template-3"]')).toHaveClass(/active/);

  await page.getByRole('button', { name: '素材生成' }).click();
  for (let count = 0; count < 5; count += 1) {
    await page.getByRole('button', { name: '新增模板' }).click();
  }
  await page.getByRole('button', { name: '模板管理' }).click();
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
