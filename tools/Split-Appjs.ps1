# Split-AppJs.ps1
# app.js を複数ファイルに分割し、index.html に script タグを追加する
#
# 使い方:
#   1. このスクリプトをプロジェクトのルートディレクトリに置く
#   2. PowerShell で実行する
#      .\Split-AppJs.ps1
#   3. 確認後、元の app.js を削除するかどうか聞かれる
#
# 注意:
#   - app.js と index.html がスクリプトと同じディレクトリにあること
#   - 実行前に git commit など、バックアップを取ること

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# ─── パス設定 ────────────────────────────────────────────────────────────────
$Root      = Split-Path -Parent $PSScriptRoot
$AppJs     = Join-Path $Root 'app.js'
$IndexHtml = Join-Path $Root 'index.html'
$UiDir     = Join-Path $Root 'ui'

# ─── 前提確認 ────────────────────────────────────────────────────────────────
if (-not (Test-Path $AppJs)) {
    Write-Error "app.js が見つかりません: $AppJs"
    exit 1
}
if (-not (Test-Path $IndexHtml)) {
    Write-Error "index.html が見つかりません: $IndexHtml"
    exit 1
}

Write-Host "`n=== PenAno app.js 分割スクリプト ===" -ForegroundColor Cyan
Write-Host "対象: $AppJs`n"

# ─── app.js を読み込む ───────────────────────────────────────────────────────
$src = Get-Content $AppJs -Raw -Encoding UTF8

# ─── ヘルパー関数 ────────────────────────────────────────────────────────────

# 関数名のリストを受け取り、app.js から該当ブロックを抽出して返す
# 対応パターン:
#   function foo(...) { ... }          通常関数
#   async function foo(...) { ... }    async関数
#   const FOO = { ... };              オブジェクト定数
#   let _foo = ...;                   let変数（1行 or 複数行）
function Extract-Blocks {
    param(
        [string]$Source,
        [string[]]$Names
    )

    $result = [System.Collections.Generic.List[string]]::new()

    foreach ($name in $Names) {
        $found = $false

        # ── パターン1: function / async function ─────────────────────────────
        $patterns = @(
            "(?:async\s+)?function\s+$name\s*\(",
            "function\s+$name\s*\("
        )

        foreach ($pat in $patterns) {
            $m = [regex]::Match($Source, $pat)
            if (-not $m.Success) { continue }

            # 関数開始位置から { を探して対応する } を見つける
            $startIdx = $m.Index
            $braceStart = $Source.IndexOf('{', $startIdx)
            if ($braceStart -lt 0) { continue }

            $depth = 0
            $endIdx = $braceStart
            for ($i = $braceStart; $i -lt $Source.Length; $i++) {
                if ($Source[$i] -eq '{') { $depth++ }
                elseif ($Source[$i] -eq '}') {
                    $depth--
                    if ($depth -eq 0) { $endIdx = $i; break }
                }
            }

            # 行頭のコメントも含める（直前の空白行まで遡る）
            $block = $Source.Substring($startIdx, $endIdx - $startIdx + 1)
            $result.Add($block)
            $found = $true
            break
        }
        if ($found) { continue }

        # ── パターン2: const NAME = { ... }; オブジェクト定数 ──────────────
        $m = [regex]::Match($Source, "const\s+$name\s*=\s*\{")
        if ($m.Success) {
            $startIdx = $m.Index
            $braceStart = $Source.IndexOf('{', $startIdx)
            $depth = 0
            $endIdx = $braceStart
            for ($i = $braceStart; $i -lt $Source.Length; $i++) {
                if ($Source[$i] -eq '{') { $depth++ }
                elseif ($Source[$i] -eq '}') {
                    $depth--
                    if ($depth -eq 0) { $endIdx = $i; break }
                }
            }
            # セミコロンまで含める
            $semi = $Source.IndexOf(';', $endIdx)
            if ($semi -gt $endIdx -and ($semi - $endIdx) -lt 5) { $endIdx = $semi }
            $block = $Source.Substring($startIdx, $endIdx - $startIdx + 1)
            $result.Add($block)
            $found = $true
        }
        if ($found) { continue }

        # ── パターン3: let _name = ...; 変数宣言（1行）──────────────────────
        $m = [regex]::Match($Source, "let\s+$name\s*=\s*[^\n]+;")
        if ($m.Success) {
            $result.Add($m.Value)
            $found = $true
        }
        if ($found) { continue }

        Write-Warning "  [$name] が app.js 内で見つかりませんでした"
    }

    return $result -join "`n`n"
}

# ファイルに書き込む（UTF-8 BOMなし）
function Write-Utf8 {
    param([string]$Path, [string]$Content)
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    [System.IO.File]::WriteAllText($Path, $Content, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  作成: $Path" -ForegroundColor Green
}

# ─── 分割定義 ────────────────────────────────────────────────────────────────
# [出力パス, 切り出す名前のリスト]
$splits = @(
    @{
        Path  = Join-Path $Root 'state.js'
        Names = @('_labels', '_labelColors', '_activeLabel')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* state.js - アプリケーション状態変数 */`n"
    },
    @{
        Path  = Join-Path $UiDir 'loadScreen.js'
        Names = @('onFolderSelected', 'onZipSelected', 'showProgress', 'updateProgress', 'hideProgress', 'onDataLoaded', 'showLoadScreen')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/loadScreen.js - ロード画面処理 */`n"
    },
    @{
        Path  = Join-Path $UiDir 'labelList.js'
        Names = @('renderLabelList', 'onLabelItemClick', 'onAddLabel', 'deleteLabel')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/labelList.js - ラベルリスト UI */`n"
    },
    @{
        Path  = Join-Path $UiDir 'objectList.js'
        Names = @('renderObjectList', 'deleteObject')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/objectList.js - オブジェクトリスト UI */`n"
    },
    @{
        Path  = Join-Path $UiDir 'flyout.js'
        Names = @('FLYOUTS', '_activeFlyout', 'initFlyouts', 'openFlyout', 'closeFlyout')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/flyout.js - フライアウトパネル開閉 */`n"
    },
    @{
        Path  = Join-Path $UiDir 'zoom.js'
        Names = @('updateZoomDisplay', 'onZoomInputChange')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/zoom.js - ズーム表示・操作 */`n"
    },
    @{
        Path  = Join-Path $UiDir 'progress.js'
        Names = @('updateProgressStats')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/progress.js - 進捗表示 */`n"
    },
    @{
        Path  = Join-Path $UiDir 'confirm.js'
        Names = @('toggleConfirm', 'updateConfirmButton')
        Header = "/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */`n/* ui/confirm.js - 確認ボタン処理 */`n"
    }
)

# ─── 各ファイルを生成 ────────────────────────────────────────────────────────
Write-Host "--- ファイル生成 ---" -ForegroundColor Yellow

foreach ($s in $splits) {
    $body = Extract-Blocks -Source $src -Names $s.Names
    $content = $s.Header + "`n" + $body + "`n"
    Write-Utf8 -Path $s.Path -Content $content
}

# ─── main.js を生成（app.js のコピー、ファイル名コメントのみ変更）──────────
$mainContent = $src -replace '(?m)^/\*\*\s*\r?\n\s*\* app\.js', "/**`n * main.js"
$mainContent = $mainContent -replace '(?m)^/\*\*\s*\r?\n\s*\* app\.js[^\r\n]*\r?\n\s*\*/', "/**`n * main.js - メインアプリケーション初期化・イベントバインド`n */"
Write-Utf8 -Path (Join-Path $Root 'main.js') -Content $mainContent

# ─── index.html に script タグを追加 ────────────────────────────────────────
Write-Host "`n--- index.html 更新 ---" -ForegroundColor Yellow

$html = Get-Content $IndexHtml -Raw -Encoding UTF8

# 追加する script タグ（app.js の直前に挿入）
$newScripts = @"
  <script src="state.js"></script>
  <script src="ui/loadScreen.js"></script>
  <script src="ui/labelList.js"></script>
  <script src="ui/objectList.js"></script>
  <script src="ui/flyout.js"></script>
  <script src="ui/zoom.js"></script>
  <script src="ui/progress.js"></script>
  <script src="ui/confirm.js"></script>
"@

# app.js の script タグを main.js に変更し、直前に新しいタグを挿入
if ($html -match '<script src="app\.js"></script>') {
    $html = $html -replace '(\s*)<script src="app\.js"></script>', "$newScripts`n  <script src=""main.js""></script>"
    [System.IO.File]::WriteAllText($IndexHtml, $html, [System.Text.UTF8Encoding]::new($false))
    Write-Host "  更新: $IndexHtml" -ForegroundColor Green
} else {
    Write-Warning "index.html に <script src=""app.js""></script> が見つかりませんでした。`n  手動で以下を追加してください:`n$newScripts`n  <script src=""main.js""></script>"
}

# ─── 完了 ────────────────────────────────────────────────────────────────────
Write-Host "`n=== 完了 ===" -ForegroundColor Cyan
Write-Host @"

生成されたファイル:
  state.js
  ui/loadScreen.js
  ui/labelList.js
  ui/objectList.js
  ui/flyout.js
  ui/zoom.js
  ui/progress.js
  ui/confirm.js
  main.js

次のステップ:
  1. ブラウザで動作確認（ラベル追加・削除・フライアウト開閉・ZIP読み込み）
  2. 問題なければ app.js を削除:
       Remove-Item app.js

注意:
  - 各ファイルの内容は app.js からの抽出のみです
  - グローバル変数参照はそのままです（import/export は別途対応）
  - app.js はまだ残っています（確認後に手動削除してください）
"@