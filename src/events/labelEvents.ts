/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * events/labelEvents.ts – ラベル追加フォームのイベントバインド
 */
import { onAddLabel } from '../ui/labelList';

function $<T extends Element = HTMLElement>(id: string): T {
  return document.getElementById(id) as unknown as T;
}

export function bindLabelEvents(): void {
  // フォーム表示トグル
  $('btnAddLabel').addEventListener('click', () => {
    $('addLabelForm').classList.toggle('hidden');
    if (!$('addLabelForm').classList.contains('hidden')) {
      $<HTMLInputElement>('newLabelInput').focus();
    }
  });

  // 追加・キャンセルボタン
  $('btnConfirmAddLabel').addEventListener('click', onAddLabel);
  $('btnCancelAddLabel').addEventListener('click', () => {
    $('addLabelForm').classList.add('hidden');
    $<HTMLInputElement>('newLabelInput').value = '';
  });

  // キーボード操作
  $<HTMLInputElement>('newLabelInput').addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') onAddLabel();
    if (e.key === 'Escape') {
      $('addLabelForm').classList.add('hidden');
      $<HTMLInputElement>('newLabelInput').value = '';
    }
  });
}