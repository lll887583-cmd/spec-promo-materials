(function () {
  'use strict';

  function createAssetExporter(options = {}) {
    const { defaultFolderName, getLanguages, getGenerated, getDownloadButton, getAssets, renderPngAsset, showToast } = options;

    function sanitizeFolderName(name) {
      return String(name || '')
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .slice(0, 80) || defaultFolderName;
    }

    function exportLanguageFolderName(languageIndex) {
      const [cn = '', en = ''] = getLanguages()[languageIndex] || [];
      return sanitizeFolderName(en || cn || `language-${languageIndex + 1}`);
    }

    function exportAssetRelativePath(asset, fileName) {
      return `${exportLanguageFolderName(asset.languageIndex)}/${fileName}`;
    }

    function zipDateTime(date = new Date()) {
      const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
      const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
      return { time, day };
    }

    function zipCrc32(bytes) {
      let crc = ~0;
      bytes.forEach(byte => {
        crc ^= byte;
        for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
      });
      return ~crc >>> 0;
    }

    function zipHeader(size) {
      const buffer = new ArrayBuffer(size);
      return { bytes: new Uint8Array(buffer), view: new DataView(buffer) };
    }

    async function createZipBlob(entries) {
      const encoder = new TextEncoder();
      const localParts = [];
      const centralParts = [];
      let offset = 0;
      const { time, day } = zipDateTime();
      for (const entry of entries) {
        const data = new Uint8Array(await entry.blob.arrayBuffer());
        const nameBytes = encoder.encode(entry.path);
        const crc = zipCrc32(data);
        const local = zipHeader(30 + nameBytes.length);
        local.view.setUint32(0, 0x04034b50, true);
        local.view.setUint16(4, 20, true);
        local.view.setUint16(8, 0, true);
        local.view.setUint16(10, time, true);
        local.view.setUint16(12, day, true);
        local.view.setUint32(14, crc, true);
        local.view.setUint32(18, data.length, true);
        local.view.setUint32(22, data.length, true);
        local.view.setUint16(26, nameBytes.length, true);
        local.bytes.set(nameBytes, 30);
        localParts.push(local.bytes, data);

        const central = zipHeader(46 + nameBytes.length);
        central.view.setUint32(0, 0x02014b50, true);
        central.view.setUint16(4, 20, true);
        central.view.setUint16(6, 20, true);
        central.view.setUint16(10, 0, true);
        central.view.setUint16(12, time, true);
        central.view.setUint16(14, day, true);
        central.view.setUint32(16, crc, true);
        central.view.setUint32(20, data.length, true);
        central.view.setUint32(24, data.length, true);
        central.view.setUint16(28, nameBytes.length, true);
        central.view.setUint32(42, offset, true);
        central.bytes.set(nameBytes, 46);
        centralParts.push(central.bytes);
        offset += local.bytes.length + data.length;
      }
      const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
      const end = zipHeader(22);
      end.view.setUint32(0, 0x06054b50, true);
      end.view.setUint16(8, entries.length, true);
      end.view.setUint16(10, entries.length, true);
      end.view.setUint32(12, centralSize, true);
      end.view.setUint32(16, offset, true);
      return new Blob([...localParts, ...centralParts, end.bytes], { type: 'application/zip' });
    }

    async function pickDownloadFolderHandle(folderName) {
      if (!window.showDirectoryPicker) return null;
      const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: defaultFolderName, startIn: 'downloads' });
      return rootHandle.getDirectoryHandle(folderName, { create: true });
    }

    async function saveAssetsToFolder(entries, folderHandle) {
      if (!folderHandle) throw new Error('directory picker unsupported');
      for (const entry of entries) {
        const pathParts = String(entry.path || entry.fileName).split('/').filter(Boolean);
        const fileName = pathParts.pop() || entry.fileName;
        let targetFolder = folderHandle;
        for (const folder of pathParts) {
          targetFolder = await targetFolder.getDirectoryHandle(folder, { create: true });
        }
        const fileHandle = await targetFolder.getFileHandle(fileName, { create: true });
        const writer = await fileHandle.createWritable();
        await writer.write(entry.blob);
        await writer.close();
      }
    }

    function triggerBlobDownload(blob, fileName) {
      const a = document.createElement('a');
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = fileName;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    async function downloadPngAsset(asset, index, total) {
      const { blob, fileName } = await renderPngAsset(asset);
      triggerBlobDownload(blob, fileName);
      if (total > 1) await new Promise(resolve => setTimeout(resolve, index === total - 1 ? 0 : 120));
    }

    async function exportAssetsWithOptions({ folderName, method }) {
      const assets = getAssets();
      if (!assets.length) {
        showToast('暂无可下载素材');
        return;
      }
      const safeFolderName = sanitizeFolderName(folderName);
      const saveToFolder = method === 'folder' && Boolean(window.showDirectoryPicker);
      const downloadButton = getDownloadButton();
      downloadButton.disabled = true;
      try {
        const folderHandle = saveToFolder ? await pickDownloadFolderHandle(safeFolderName) : null;
        const entries = [];
        for (const asset of assets) {
          const rendered = await renderPngAsset(asset);
          const relativePath = exportAssetRelativePath(asset, rendered.fileName);
          entries.push({ ...rendered, path: folderHandle ? relativePath : `${safeFolderName}/${relativePath}` });
        }
        if (folderHandle) {
          await saveAssetsToFolder(entries, folderHandle);
          showToast(`已保存 ${entries.length} 张 PNG 到 ${safeFolderName}`);
        } else {
          const zipBlob = await createZipBlob(entries);
          triggerBlobDownload(zipBlob, `${safeFolderName}.zip`);
          const fallbackText = method === 'folder' ? '当前浏览器不支持选择文件夹，已改为 ZIP 下载。' : '';
          showToast(`${fallbackText}已打包 ${entries.length} 张 PNG 素材`);
        }
      } catch (error) {
        console.warn('Assets export failed', error);
        if (error?.name === 'AbortError') showToast('已取消下载');
        else showToast('素材导出失败，请重试');
      } finally {
        downloadButton.disabled = !getGenerated();
      }
    }

    return { sanitizeFolderName, downloadPngAsset, exportAssetsWithOptions };
  }

  window.createAssetExporter = createAssetExporter;
}());
