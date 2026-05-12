(function () {
  'use strict';

  function createRulesParser(deps = {}) {
    const normalizeHexColor = deps.normalizeHexColor || (value => String(value || ''));
    const parsePositiveInt = deps.parsePositiveInt || (value => {
      const number = parseInt(value, 10);
      return Number.isFinite(number) && number > 0 ? number : null;
    });

    function rulesFileKind(input) {
      const file = input?.file || input || {};
      const name = (file.name || '').toLowerCase();
      const type = file.type || '';
      if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
      if (/\.(md|markdown|txt)$/.test(name) || /^text\//.test(type)) return 'text';
      if (/\.(doc|docx)$/.test(name) || /wordprocessingml|msword/.test(type)) return 'word';
      if (name.endsWith('.xlsx') || type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'spreadsheet';
      return 'file';
    }

    function normalizeRuleHeader(value) {
      return String(value || '').trim().toLowerCase().replace(/[\s_\-/.()[\]（）【】]+/g, '');
    }

    function normalizeRuleText(value) {
      return String(value ?? '').trim();
    }

    function normalizedRuleRow(row = {}) {
      return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeRuleHeader(key), value]));
    }

    function ruleCell(row, aliases) {
      for (const alias of aliases) {
        const value = row[normalizeRuleHeader(alias)];
        if (value !== undefined && value !== null && String(value).trim() !== '') return value;
      }
      return '';
    }

    function parseRuleNumber(value) {
      if (value === undefined || value === null || String(value).trim() === '') return null;
      const raw = String(value).trim();
      const number = Number(raw.replace('%', ''));
      if (!Number.isFinite(number)) return null;
      return raw.includes('%') || Math.abs(number) > 1 ? number : number * 100;
    }

    function parseRuleBool(value) {
      if (value === undefined || value === null || String(value).trim() === '') return null;
      const text = String(value).trim().toLowerCase();
      if (['1', 'true', 'yes', 'y', 'show', 'visible', '显示', '是', '开启'].includes(text)) return true;
      if (['0', 'false', 'no', 'n', 'hide', 'hidden', '隐藏', '否', '关闭'].includes(text)) return false;
      return null;
    }

    function parseRuleColor(value) {
      const text = normalizeRuleText(value);
      if (!text) return '';
      const hexMatch = text.match(/#?[0-9a-fA-F]{6}\b|#?[0-9a-fA-F]{3}\b/);
      if (hexMatch) return normalizeHexColor(hexMatch[0]) || '';
      const colorNames = {
        white: '#FFFFFF', black: '#000000', red: '#FF3B30', blue: '#1F3472',
        cyan: '#03B2CB', green: '#24A661', orange: '#FF8A00', yellow: '#FFD54A',
        purple: '#6C3BFF', pink: '#FF4DA6', gray: '#666666', grey: '#666666',
        白: '#FFFFFF', 黑: '#000000', 红: '#FF3B30', 蓝: '#1F3472', 青: '#03B2CB',
        绿: '#24A661', 橙: '#FF8A00', 黄: '#FFD54A', 紫: '#6C3BFF', 粉: '#FF4DA6', 灰: '#666666'
      };
      return colorNames[text.toLowerCase()] || colorNames[text] || '';
    }

    const ruleElementAliases = {
      image: ['image', 'mainimage', 'product', '主图', '主图区', '商品图'],
      logo: ['logo', 'brand', '标志', '品牌', '品牌logo'],
      title: ['title', 'headline', '标题', '标题文案'],
      subtitle: ['subtitle', 'subheadline', '副标题', '富标题', '副标题文案', '富标题文案'],
      cta: ['cta', 'button', '按钮', '按钮文案'],
      trust: ['trust', 'trustpilot', 'rating', '评分']
    };

    function normalizeRuleElement(value) {
      const text = normalizeRuleHeader(value);
      return Object.entries(ruleElementAliases).find(([, aliases]) =>
        aliases.some(alias => text === normalizeRuleHeader(alias))
      )?.[0] || '';
    }

    function prefixedRuleCell(row, element, suffixes) {
      const prefixes = ruleElementAliases[element] || [element];
      const aliases = prefixes.flatMap(prefix => suffixes.map(suffix => `${prefix}${suffix}`));
      return ruleCell(row, aliases);
    }

    function readRuleAnchor(row, element, useGeneric = false) {
      const x = parseRuleNumber(useGeneric ? ruleCell(row, ['x', 'left', '左', '横坐标']) : prefixedRuleCell(row, element, ['x', 'left', '左', '横坐标']));
      const y = parseRuleNumber(useGeneric ? ruleCell(row, ['y', 'top', '上', '纵坐标']) : prefixedRuleCell(row, element, ['y', 'top', '上', '纵坐标']));
      const w = parseRuleNumber(useGeneric ? ruleCell(row, ['w', 'width', '宽', '宽度']) : prefixedRuleCell(row, element, ['w', 'width', '宽', '宽度']));
      const h = parseRuleNumber(useGeneric ? ruleCell(row, ['h', 'height', '高', '高度']) : prefixedRuleCell(row, element, ['h', 'height', '高', '高度']));
      const anchor = {};
      if (x !== null) anchor.x = x;
      if (y !== null) anchor.y = y;
      if (w !== null) anchor.w = w;
      if (h !== null) anchor.h = h;
      const align = normalizeRuleText(useGeneric ? ruleCell(row, ['align', 'textalign', '对齐', '文字对齐']) : prefixedRuleCell(row, element, ['align', 'textalign', '对齐', '文字对齐'])).toLowerCase();
      if (['left', 'center', 'right', '左', '居中', '右'].includes(align)) {
        anchor.align = align === '居中' ? 'center' : align === '右' ? 'right' : align === '左' ? 'left' : align;
      }
      return Object.keys(anchor).length ? anchor : null;
    }

    function parseRuleSize(row) {
      const sizeText = normalizeRuleText(ruleCell(row, ['size', '尺寸', '规格', 'format', '生成尺寸', '素材尺寸', '广告尺寸', '投放尺寸', '图片尺寸', '尺寸规格']));
      const width = parsePositiveInt(ruleCell(row, ['width', 'w', '宽', '宽度', '素材宽度', '尺寸宽度', '广告宽度', '图片宽度'])) || parsePositiveInt(sizeText.match(/(\d+)\s*[x×*]\s*(\d+)/i)?.[1]);
      const height = parsePositiveInt(ruleCell(row, ['height', 'h', '高', '高度', '素材高度', '尺寸高度', '广告高度', '图片高度'])) || parsePositiveInt(sizeText.match(/(\d+)\s*[x×*]\s*(\d+)/i)?.[2]);
      return { label: sizeText || (width && height ? `${width} x ${height}` : ''), width, height };
    }

    function parseRuleCommon(row, order) {
      const size = parseRuleSize(row);
      return {
        id: normalizeRuleText(ruleCell(row, ['id', '编号', 'assetid', '素材id'])) || `rules-${order + 1}`,
        order,
        sizeLabel: size.label,
        width: size.width,
        height: size.height,
        language: normalizeRuleText(ruleCell(row, ['language', 'lang', '语言', '语种', '投放语言', '素材语言'])),
        template: normalizeRuleText(ruleCell(row, ['template', '模板'])),
        fileName: normalizeRuleText(ruleCell(row, ['filename', 'file', '文件名', '导出文件名', '输出文件名', '下载文件名']))
      };
    }

    function applyRuleRowElement(rule, element, row, useGeneric = false) {
      if (!element) return;
      const anchor = readRuleAnchor(row, element, useGeneric);
      if (anchor) rule.anchors[element] = { ...(rule.anchors[element] || {}), ...anchor };
      const visible = parseRuleBool(useGeneric ? ruleCell(row, ['visible', 'show', '显示']) : prefixedRuleCell(row, element, ['visible', 'show', '显示']));
      if (element === 'trust' && visible !== null) rule.trustVisible = visible;
      const text = normalizeRuleText(useGeneric ? ruleCell(row, ['text', 'copy', '文案', '内容']) : prefixedRuleCell(row, element, ['text', 'copy', '文案', '内容']));
      if (text && element === 'title') rule.copy.title = text;
      if (text && element === 'subtitle') rule.copy.subtitle = text;
      if (text && element === 'cta') rule.copy.cta = text;
    }

    function parseWideRuleRow(row, order) {
      const rule = { ...parseRuleCommon(row, order), anchors: {}, copy: {}, styles: {} };
      const title = normalizeRuleText(ruleCell(row, ['title', 'headline', '标题', '主标题', '大标题', '标题文案']));
      const subtitle = normalizeRuleText(ruleCell(row, ['subtitle', 'subheadline', '副标题', '小标题', '说明文案', '富标题', '副标题文案', '富标题文案']));
      const cta = normalizeRuleText(ruleCell(row, ['cta', 'button', 'buttontext', '按钮', '行动按钮', '按钮文字', '按钮文案', 'cta文案']));
      if (title) rule.copy.title = title;
      if (subtitle) rule.copy.subtitle = subtitle;
      if (cta) rule.copy.cta = cta;
      const logoVariant = normalizeRuleText(ruleCell(row, ['logovariant', 'logo版本', 'logo颜色', 'logo明暗']));
      if (logoVariant) rule.logoVariant = /white|light|亮|白/i.test(logoVariant) ? 'white' : 'black';
      const trustVisible = parseRuleBool(ruleCell(row, ['trustvisible', 'trustpilotvisible', 'trust显示', 'trustpilot显示']));
      if (trustVisible !== null) rule.trustVisible = trustVisible;
      const backgroundColor = parseRuleColor(ruleCell(row, ['background', 'backgroundcolor', 'bg', 'bgcolor', '背景', '背景色', '底色']));
      const gradientStart = parseRuleColor(ruleCell(row, ['gradientstart', '渐变起色', '渐变开始', '渐变色1']));
      const gradientEnd = parseRuleColor(ruleCell(row, ['gradientend', '渐变止色', '渐变结束', '渐变色2']));
      const textColor = parseRuleColor(ruleCell(row, ['textcolor', 'copycolor', 'fontcolor', '文字颜色', '文案颜色', '字体颜色']));
      const buttonColor = parseRuleColor(ruleCell(row, ['buttoncolor', 'ctacolor', '按钮颜色', '按钮背景色', 'cta颜色']));
      const buttonTextColor = parseRuleColor(ruleCell(row, ['buttontextcolor', 'ctatextcolor', '按钮文字颜色', '按钮字体颜色']));
      if (backgroundColor) rule.styles.backgroundColor = backgroundColor;
      if (gradientStart) rule.styles.gradientStart = gradientStart;
      if (gradientEnd) rule.styles.gradientEnd = gradientEnd;
      if (gradientStart || gradientEnd) rule.styles.backgroundMode = 'gradient';
      if (textColor) rule.styles.textColor = textColor;
      if (buttonColor) rule.styles.buttonColor = buttonColor;
      if (buttonTextColor) rule.styles.buttonTextColor = buttonTextColor;
      ['image', 'logo', 'title', 'subtitle', 'cta', 'trust'].forEach(element => applyRuleRowElement(rule, element, row));
      return rule;
    }

    function hasRuleContent(rule) {
      return rule.width || rule.height || rule.language || rule.template || rule.fileName
        || Object.keys(rule.anchors || {}).length || Object.keys(rule.copy || {}).length
        || Object.keys(rule.styles || {}).length || rule.logoVariant || rule.trustVisible !== undefined;
    }

    function parseNormalizedRuleRows(rows, sheetName = '文档规则') {
      const longGroups = new Map();
      const wideRules = [];
      rows.forEach((row, rowIndex) => {
        const order = wideRules.length + longGroups.size + rowIndex;
        const element = normalizeRuleElement(ruleCell(row, ['element', '元素', '对象', '图层', 'target']));
        if (element) {
          const common = parseRuleCommon(row, order);
          const groupKey = normalizeRuleText(ruleCell(row, ['asset', 'assetid', '素材', '素材id', 'group', '组'])) || `${common.sizeLabel}|${common.width}x${common.height}|${common.language}|${common.template}`;
          if (!longGroups.has(groupKey)) longGroups.set(groupKey, { ...common, anchors: {}, copy: {} });
          applyRuleRowElement(longGroups.get(groupKey), element, row, true);
        } else {
          const rule = parseWideRuleRow(row, order);
          if (hasRuleContent(rule)) wideRules.push(rule);
        }
      });
      return [...wideRules, ...longGroups.values()].map((rule, index) => ({ ...rule, sheetName, order: rule.order ?? index }));
    }

    function splitMarkdownTableRow(line) {
      const trimmed = String(line || '').trim();
      if (!trimmed.includes('|')) return [];
      return trimmed.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
    }

    function isMarkdownSeparatorRow(line) {
      const cells = splitMarkdownTableRow(line);
      return cells.length > 1 && cells.every(cell => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
    }

    function markdownTableRows(text) {
      const lines = String(text || '').split(/\r?\n/);
      const rows = [];
      for (let index = 0; index < lines.length - 1; index += 1) {
        const headers = splitMarkdownTableRow(lines[index]);
        if (headers.length < 2 || !isMarkdownSeparatorRow(lines[index + 1])) continue;
        index += 2;
        while (index < lines.length && splitMarkdownTableRow(lines[index]).length) {
          const cells = splitMarkdownTableRow(lines[index]);
          if (cells.length < 2) break;
          rows.push(normalizedRuleRow(Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] || '']))));
          index += 1;
        }
      }
      return rows;
    }

    function keyValueRowsFromText(text) {
      const rows = [];
      let current = {};
      const commit = () => {
        const normalized = normalizedRuleRow(current);
        if (Object.keys(normalized).length) rows.push(normalized);
        current = {};
      };
      const readStatement = statement => {
        const match = String(statement || '').match(/^\s*(?:[-*+]\s*)?(?:\*\*)?([^:：=|]{1,48})(?:\*\*)?\s*[:：=]\s*(.*?)\s*$/);
        if (!match) return false;
        const key = match[1].replace(/^#+\s*/, '').trim();
        const value = match[2].trim();
        if (!key || !value) return false;
        current[key] = value;
        return true;
      };
      String(text || '').split(/\r?\n/).forEach(line => {
        const cleaned = line.replace(/<[^>]+>/g, '').trim();
        if (!cleaned || /^-{3,}$/.test(cleaned)) {
          commit();
          return;
        }
        const parts = cleaned.split(/[;；]/).map(part => part.trim()).filter(Boolean);
        const matched = parts.length > 1 ? parts.some(readStatement) : readStatement(cleaned);
        if (!matched && /^(#{1,6}\s*)?(素材|asset|rule|规则)\b/i.test(cleaned) && Object.keys(current).length) commit();
      });
      commit();
      return rows;
    }

    function parseTextGenerationRules(text, sheetName = '文档规则') {
      const rows = [...markdownTableRows(text), ...keyValueRowsFromText(text)];
      return parseNormalizedRuleRows(rows, sheetName);
    }

    function bytesToBinaryString(bytes) {
      let output = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        output += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      return output;
    }

    function decodeTextBytes(bytes) {
      const data = new Uint8Array(bytes);
      if (data[0] === 0xfe && data[1] === 0xff) {
        let output = '';
        for (let index = 2; index + 1 < data.length; index += 2) output += String.fromCharCode((data[index] << 8) | data[index + 1]);
        return output;
      }
      if (data.some(byte => byte >= 0x80)) {
        try {
          return new TextDecoder('utf-8', { fatal: true }).decode(data);
        } catch (error) {
          // PDFDocEncoding is close enough to latin1 for the structured ASCII keys we parse.
        }
      }
      return new TextDecoder('latin1').decode(data);
    }

    function decodePdfString(value) {
      const bytes = [];
      for (let index = 0; index < value.length; index += 1) {
        const char = value[index];
        if (char !== '\\') {
          bytes.push(char.charCodeAt(0) & 0xff);
          continue;
        }
        const next = value[++index];
        if (next === undefined) break;
        const escapeMap = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
        if (escapeMap[next] !== undefined) bytes.push(escapeMap[next]);
        else if (/[0-7]/.test(next)) {
          let octal = next;
          while (index + 1 < value.length && octal.length < 3 && /[0-7]/.test(value[index + 1])) octal += value[++index];
          bytes.push(parseInt(octal, 8));
        } else if (next !== '\n' && next !== '\r') {
          bytes.push(next.charCodeAt(0) & 0xff);
        }
      }
      return decodeTextBytes(bytes);
    }

    function decodePdfHexString(value) {
      const clean = String(value || '').replace(/\s+/g, '');
      const bytes = new Uint8Array(Math.floor(clean.length / 2));
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = parseInt(clean.slice(index * 2, index * 2 + 2), 16);
      return decodeTextBytes(bytes);
    }

    async function extractPdfText(file) {
      const source = bytesToBinaryString(new Uint8Array(await file.arrayBuffer()));
      const chunks = [];
      source.replace(/\[((?:.|\r|\n)*?)\]\s*TJ/g, (_, arrayBody) => {
        const text = [];
        arrayBody.replace(/\((?:\\.|[^\\)])*\)|<([0-9a-fA-F\s]+)>/g, token => {
          if (token.startsWith('(')) text.push(decodePdfString(token.slice(1, -1)));
          else if (token.startsWith('<')) text.push(decodePdfHexString(token.slice(1, -1)));
          return token;
        });
        if (text.length) chunks.push(text.join(''));
        return _;
      });
      source.replace(/\((?:\\.|[^\\)])*\)\s*Tj/g, token => {
        chunks.push(decodePdfString(token.replace(/\s*Tj$/, '').slice(1, -1)));
        return token;
      });
      return chunks.join('\n').replace(/\s+\n/g, '\n').trim();
    }

    function littleUint16(view, offset) {
      return view.getUint16(offset, true);
    }

    function littleUint32(view, offset) {
      return view.getUint32(offset, true);
    }

    async function inflateZipEntry(bytes, method) {
      if (method === 0) return bytes;
      if (method !== 8) throw new Error(`Unsupported ZIP compression method: ${method}`);
      if (!window.DecompressionStream) throw new Error('This browser cannot decompress Word documents');
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    async function unzipEntries(buffer, wantedNames) {
      const bytes = new Uint8Array(buffer);
      const view = new DataView(buffer);
      let eocdOffset = -1;
      for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 0x10000 - 22); offset -= 1) {
        if (littleUint32(view, offset) === 0x06054b50) {
          eocdOffset = offset;
          break;
        }
      }
      if (eocdOffset < 0) throw new Error('ZIP end of central directory not found');
      const entryCount = littleUint16(view, eocdOffset + 10);
      let centralOffset = littleUint32(view, eocdOffset + 16);
      const wanted = new Set(wantedNames);
      const output = {};
      for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
        if (littleUint32(view, centralOffset) !== 0x02014b50) break;
        const method = littleUint16(view, centralOffset + 10);
        const compressedSize = littleUint32(view, centralOffset + 20);
        const nameLength = littleUint16(view, centralOffset + 28);
        const extraLength = littleUint16(view, centralOffset + 30);
        const commentLength = littleUint16(view, centralOffset + 32);
        const localOffset = littleUint32(view, centralOffset + 42);
        const name = new TextDecoder().decode(bytes.subarray(centralOffset + 46, centralOffset + 46 + nameLength));
        if (wanted.has(name) && littleUint32(view, localOffset) === 0x04034b50) {
          const localNameLength = littleUint16(view, localOffset + 26);
          const localExtraLength = littleUint16(view, localOffset + 28);
          const dataStart = localOffset + 30 + localNameLength + localExtraLength;
          output[name] = await inflateZipEntry(bytes.subarray(dataStart, dataStart + compressedSize), method);
        }
        centralOffset += 46 + nameLength + extraLength + commentLength;
      }
      return output;
    }

    function decodeXmlEntities(text) {
      return String(text || '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'");
    }

    function wordXmlToText(xml) {
      const parts = [];
      String(xml || '').replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<\/w:p>/g, (match, text) => {
        if (text !== undefined) parts.push(decodeXmlEntities(text));
        else if (match.startsWith('<w:tab')) parts.push('\t');
        else parts.push('\n');
        return match;
      });
      return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
    }

    async function extractWordText(file) {
      if (/\.docx$/i.test(file.name || '') || /wordprocessingml/.test(file.type || '')) {
        const entries = await unzipEntries(await file.arrayBuffer(), ['word/document.xml']);
        const documentXml = entries['word/document.xml'];
        if (!documentXml) return '';
        return wordXmlToText(new TextDecoder().decode(documentXml));
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      return bytesToBinaryString(bytes).replace(/[^\x09\x0a\x0d\x20-\x7e\u00a0-\uffff]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
    }

    async function extractRulesText(file, existingText = '') {
      const kind = rulesFileKind(file);
      if (kind === 'text') return existingText || await file.text();
      if (kind === 'pdf') return extractPdfText(file);
      if (kind === 'word') return extractWordText(file);
      return existingText || '';
    }

    async function parseSpreadsheetRules(file) {
      if (!window.XLSX) {
        showToast('XLSX 解析库加载失败，请检查网络后刷新页面');
        return [];
      }
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      return workbook.SheetNames.flatMap(sheetName => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' }).map(normalizedRuleRow);
        return parseNormalizedRuleRows(rows, sheetName);
      });
    }

    async function parseGenerationRulesFile(file, existingText = '') {
      const kind = rulesFileKind(file);
      if (kind === 'spreadsheet') return { text: existingText || '', rules: await parseSpreadsheetRules(file) };
      const text = await extractRulesText(file, existingText);
      return { text, rules: parseTextGenerationRules(text, file.name || '文档规则') };
    }

    function isAllowedRulesFile(file) {
      return ['pdf', 'text', 'word', 'spreadsheet'].includes(rulesFileKind(file));
    }

    return {
      rulesFileKind,
      isAllowedRulesFile,
      parseGenerationRulesFile,
      parseTextGenerationRules,
      parseNormalizedRuleRows
    };
  }

  window.createRulesParser = createRulesParser;
})();
