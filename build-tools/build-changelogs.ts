/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/**
 * build-tools/build-changelogs.ts
 *
 * changelogs/<lang>/<version>.md を読み込み、
 *   - 個別 HTML ファイル（public/changelogs/<version>.<lang>.html）
 *   - まとめインデックス（public/changelogs/index.json）
 * の両方を生成する。
 *
 * 「何を・どこから・どこへ・何件」変換するかは changelog-config.ts に集約されており、
 * このファイルは設定を読み取って実行するだけの役割に留める。
 * 多言語対応の追加や保持件数の変更など、運用上の変更は config 側の編集のみで完結させる。
 */
import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import { changelogConfig, type ChangelogConfig } from './changelog-config';
import type { ChangelogEntry, ChangelogIndex } from '../src/types/changelog';

/** Markdown 内の最初の `# 見出し` をタイトルとして抽出する。見つからなければバージョン文字列を使う。 */
function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  return fallback;
}

/** ディレクトリが存在しなければ作成する。 */
async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/** 指定言語ディレクトリ内の .md ファイル一覧（バージョン名のみ、拡張子なし）を取得する。 */
async function listVersionsForLang(root: string, config: ChangelogConfig, lang: string): Promise<string[]> {
  const langDir = path.join(root, config.sourceDir, lang);
  let files: string[];
  try {
    files = await fs.readdir(langDir);
  } catch {
    // 言語ディレクトリが存在しない場合は空扱い（多言語対応の段階導入を許容する）
    return [];
  }
  return files
    .filter(f => f.toLowerCase().endsWith('.md'))
    .map(f => f.replace(/\.md$/i, ''));
}

interface RawEntry {
  version: string;
  lang: string;
  filePath: string;
  mtimeMs: number;
}

/**
 * changelogs/ 以下を走査して全エントリのメタ情報（未変換）を集める。
 */
async function collectRawEntries(root: string, config: ChangelogConfig): Promise<RawEntry[]> {
  const result: RawEntry[] = [];
  for (const lang of config.languages) {
    const versions = await listVersionsForLang(root, config, lang);
    for (const version of versions) {
      const filePath = path.join(root, config.sourceDir, lang, `${version}.md`);
      const stat = await fs.stat(filePath);
      result.push({ version, lang, filePath, mtimeMs: stat.mtimeMs });
    }
  }
  return result;
}

/**
 * maxVersions の設定に従い、出力対象バージョンを絞り込む。
 * 言語をまたいで「バージョン」単位で新しい順に判定し、上限を超えたバージョンは
 * 全言語分まとめて除外する（言語によって出力されるバージョンの集合がズレないようにするため）。
 */
function applyVersionLimit(entries: RawEntry[], config: ChangelogConfig): { kept: RawEntry[]; truncatedCount: number } {
  if (config.maxVersions == null) {
    return { kept: entries, truncatedCount: 0 };
  }

  // バージョンごとの最新更新時刻（複数言語がある場合は最大値）でソート用キーを作る
  const latestByVersion = new Map<string, number>();
  for (const e of entries) {
    const cur = latestByVersion.get(e.version);
    if (cur === undefined || e.mtimeMs > cur) latestByVersion.set(e.version, e.mtimeMs);
  }

  const sortedVersions = [...latestByVersion.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([version]) => version);

  const keepSet = new Set(sortedVersions.slice(0, config.maxVersions));
  const truncatedCount = sortedVersions.length - keepSet.size;

  return { kept: entries.filter(e => keepSet.has(e.version)), truncatedCount };
}

/** 1件分のMarkdownを読み込み、HTML化してChangelogEntryを構築する。 */
async function buildEntry(raw: RawEntry, config: ChangelogConfig): Promise<ChangelogEntry> {
  const markdown = await fs.readFile(raw.filePath, 'utf-8');
  const html = await marked.parse(markdown);
  const title = extractTitle(markdown, raw.version);
  const htmlFileName = config.buildHtmlFileName(raw.version, raw.lang);

  return {
    version: raw.version,
    lang: raw.lang,
    html,
    htmlPath: `/${config.outputDir.replace(/^public\//, '')}/${htmlFileName}`,
    updatedAt: raw.mtimeMs,
    title,
  };
}

/**
 * changelog のビルドを実行する。
 * @param root プロジェクトルートの絶対パス
 */
export async function buildChangelogs(root: string, config: ChangelogConfig = changelogConfig): Promise<ChangelogIndex> {
  const rawEntries = await collectRawEntries(root, config);
  const { kept, truncatedCount } = applyVersionLimit(rawEntries, config);

  const outputDirAbs = path.join(root, config.outputDir);
  await ensureDir(outputDirAbs);

  const entries: ChangelogEntry[] = [];
  for (const raw of kept) {
    const entry = await buildEntry(raw, config);
    entries.push(entry);

    const htmlFileName = config.buildHtmlFileName(raw.version, raw.lang);
    await fs.writeFile(path.join(outputDirAbs, htmlFileName), entry.html, 'utf-8');
  }

  // 新しい順に並べる
  entries.sort((a, b) => b.updatedAt - a.updatedAt);

  const index: ChangelogIndex = {
    generatedAt: Date.now(),
    languages: config.languages,
    defaultLang: config.languages[0],
    entries,
    truncatedCount,
  };

  await fs.writeFile(
    path.join(outputDirAbs, config.indexFileName),
    JSON.stringify(index, null, 2),
    'utf-8',
  );

  return index;
}

export default buildChangelogs;
