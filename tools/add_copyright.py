import os

# ==========================================
# 設定（ここを書き換えてください）
# ==========================================
AUTHOR_NAME = "DTT-JP"   # あなたの名前・組織名
YEAR = "2026"
TARGET_DIR = "."         # 実行するディレクトリ（. は現在のディレクトリ）

# コピーライト文言 (MITライセンス用)
COPYRIGHT_TEXT = f"Copyright (c) {YEAR} {AUTHOR_NAME}. Released under the MIT license."

def get_header(ext):
    """拡張子に合わせてコメントの構文を返す"""
    if ext in ['.js', '.css']:
        return f"/* {COPYRIGHT_TEXT} */\n"
    elif ext in ['.html', '.md']:
        return f"<!-- {COPYRIGHT_TEXT} -->\n"
    return None

def process_file(filepath):
    _, ext = os.path.splitext(filepath)
    ext = ext.lower()
    
    # JSONは仕様上コメントを含めるとエラーになるためスキップ
    if ext == '.json':
        print(f"[Skip] JSON (コメント非対応): {filepath}")
        return
        
    header = get_header(ext)
    if not header:
        return
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # すでに "Copyright" という文字が含まれていたら二重挿入を防ぐためにスキップ
        if "Copyright" in content[:300]:
            print(f"[Skip] すでにコピーライトが存在します: {filepath}")
            return
            
        # 先頭にコピーライトを追加して保存
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(header + content)
        print(f"[Added] {filepath}")
        
    except Exception as e:
        print(f"[Error] {filepath} の処理中にエラー: {e}")

def main():
    # スキップしたいフォルダ（ライブラリ本体やgit管理フォルダなど）
    exclude_dirs = {'.git', 'node_modules', 'dist', 'build'}

    for root, dirs, files in os.walk(TARGET_DIR):
        # 除外ディレクトリを探索パスから外す
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in ['.js', '.css', '.html', '.md', '.json']:
                filepath = os.path.join(root, file)
                process_file(filepath)

if __name__ == "__main__":
    print("--- コピーライト挿入処理を開始します ---")
    main()
    print("--- 処理が完了しました ---")