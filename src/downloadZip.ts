/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * downloadZip.ts – アノテーションJSON の ZIP エクスポート
 */
import JSZip from 'jszip';
import DataManager from './data';

export async function onDownloadZip(): Promise<void> {
  const zip = new JSZip();
  let hasData = false;

  for (const file of DataManager.files) {
    if (file.json) {
      const base = file.name.replace(/\.[^.]+$/, '');
      zip.file(base + '.json', JSON.stringify(file.json, null, 2));
      hasData = true;
    }
  }

  if (!hasData) {
    alert('保存するデータがありません。');
    return;
  }

  try {
    const content = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotations.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error(err);
    alert('ZIPの作成に失敗しました。');
  }
}