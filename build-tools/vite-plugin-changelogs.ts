/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * build-tools/vite-plugin-changelogs.ts
 *
 * vite.config.ts から読み込まれる薄いプラグイン。
 * 実際の変換処理は build-changelogs.ts に委譲し、ここではビルドフックへの
 * 接続のみを担う。
 *
 * - buildStart（`vite build` 実行時）に一度実行される。
 * - `vite dev` 起動時にも configureServer 経由で1回実行し、開発中も
 *   public/changelogs/ が常に最新の状態になるようにしている。
 */
import type { Plugin } from 'vite';
import { buildChangelogs } from './build-changelogs';

export function changelogsPlugin(): Plugin {
  let ran = false;

  const run = async (root: string): Promise<void> => {
    try {
      const index = await buildChangelogs(root);
      console.log(`[changelogs] ${index.entries.length} 件のリリースノートを生成しました（除外: ${index.truncatedCount} 件）`);
    } catch (err) {
      console.error('[changelogs] 生成中にエラーが発生しました:', err);
    }
  };

  return {
    name: 'penano-changelogs',
    async buildStart() {
      if (ran) return;
      ran = true;
      await run(process.cwd());
    },
    async configureServer() {
      // 開発サーバー起動時にも一度生成しておく（public/changelogs/ を最新化）
      await run(process.cwd());
    },
  };
}

export default changelogsPlugin;
