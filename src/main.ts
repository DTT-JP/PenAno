/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * main.ts – エントリポイント
 *
 * PWA Service Worker の登録と、DOMContentLoaded 後のアプリ初期化のみを担う。
 * ビジネスロジックは app.ts 以下の各モジュールに委譲する。
 */
import { registerSW } from 'virtual:pwa-register';
import { initApp } from './app';

// PWA Service Worker 登録
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('新しいバージョンが利用可能です。');
  },
  onOfflineReady() {
    console.log('オフラインでの利用準備が完了しました。');
  },
});
void updateSW;

// DOMContentLoaded 後にアプリを初期化
document.addEventListener('DOMContentLoaded', initApp);