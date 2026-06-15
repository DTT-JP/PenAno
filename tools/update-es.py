#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_es_migration.py

es-files/ 内の新ファイルをVite移行用のプロジェクト構成へ配置する。

実行場所: PenAno のリポジトリルート (package.json と同じ階層)
実行方法: python script/apply_es_migration.py
          (リポジトリルートから実行することを推奨)
"""

import shutil
import sys
from pathlib import Path

SRC = Path("es-files")
DEST_SRC = Path("src")
DEST_UI = DEST_SRC / "ui"

ROOT_MODULES = [
    "canvas.js",
    "data.js",
    "main.js",
    "settings.js",
    "state.js",
    "storage.js",
    "version.js",
]

UI_MODULES = [
    "confirm.js",
    "labelList.js",
    "loadScreen.js",
    "objectList.js",
    "progress.js",
    "zoom.js",
]

ROOT_FILES = [
    ("index.html", "index.html"),
    ("vite.config.js", "vite.config.js"),
]

OLD_FILES_TO_REMOVE = [
    "sw.js",
    "manifest.json",
]

OLD_DIRS_TO_REMOVE = [
    "lib",
    "ui",
]


def move(src: Path, dest: Path, overwrite: bool = False) -> None:
    if not src.exists():
        print(f"  [SKIP] {src} が見つかりません")
        return
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists():
        if overwrite:
            if dest.is_dir():
                shutil.rmtree(dest)
            else:
                dest.unlink()
        else:
            print(f"  [SKIP] {dest} は既に存在します（上書きしません）")
            return
    shutil.move(str(src), str(dest))
    print(f"  {src} -> {dest}")


def remove_file(path: Path) -> None:
    if path.exists() and path.is_file():
        path.unlink()
        print(f"  {path} を削除しました")
    else:
        print(f"  [SKIP] {path} は存在しません")


def remove_dir(path: Path) -> None:
    if path.exists() and path.is_dir():
        shutil.rmtree(path)
        print(f"  {path}/ を削除しました")
    else:
        print(f"  [SKIP] {path}/ は存在しません")


def main() -> int:
    if not SRC.exists():
        print(f'[ERROR] "{SRC}" フォルダが見つかりません。リポジトリのルートで実行してください。')
        return 1

    print("--- src/ ディレクトリを作成します ---")
    DEST_SRC.mkdir(exist_ok=True)
    DEST_UI.mkdir(parents=True, exist_ok=True)

    print()
    print("--- ルートファイルを移動します ---")
    for filename, dest_name in ROOT_FILES:
        move(SRC / filename, Path(dest_name), overwrite=True)

    print()
    print("--- src/ へ移動します ---")
    for filename in ROOT_MODULES:
        move(SRC / filename, DEST_SRC / filename, overwrite=True)

    print()
    print("--- src/ui/ へ移動します ---")
    for filename in UI_MODULES:
        move(SRC / filename, DEST_UI / filename, overwrite=True)

    print()
    print("--- 旧ファイル/フォルダの削除（不要参照の整理） ---")
    for filename in OLD_FILES_TO_REMOVE:
        remove_file(Path(filename))

    # 旧ルート直下の重複モジュール（src/ に移動済みのもの）を削除
    for filename in ROOT_MODULES:
        path = Path(filename)
        if path.exists() and path.is_file():
            remove_file(path)

    for dirname in OLD_DIRS_TO_REMOVE:
        remove_dir(Path(dirname))

    print()
    print("--- 残存ファイルの確認 ---")
    remaining = list(SRC.iterdir()) if SRC.exists() else []
    if remaining:
        print(f"  [WARNING] {SRC}/ に未処理のファイルが残っています:")
        for p in remaining:
            print(f"    - {p}")
    elif SRC.exists():
        SRC.rmdir()
        print(f"  {SRC}/ は空のため削除しました")

    print()
    print("=" * 60)
    print(" 完了しました。")
    print(" 次のステップ:")
    print("   npm install")
    print("   npm run dev")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())