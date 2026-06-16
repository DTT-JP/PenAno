# =============================================================================
# rename-to-ts.ps1
# .js ファイルを .ts にリネームして tsc --noEmit を確認するスクリプト
#
# 使い方（プロジェクトルートから実行）:
#   .\tools\rename-to-ts.ps1 src/storage.js
#   .\tools\rename-to-ts.ps1 src/ui/labelList.js
# =============================================================================

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$FilePath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}
function Write-Ok([string]$msg) {
    Write-Host "    [OK] $msg" -ForegroundColor Green
}
function Write-Fail([string]$msg) {
    Write-Host "    [FAIL] $msg" -ForegroundColor Red
}

# ── パス解決 ──────────────────────────────────────────────────────────────

$FilePath = $FilePath -replace "/", "\"
$AbsPath  = if ([System.IO.Path]::IsPathRooted($FilePath)) {
    $FilePath
} else {
    Join-Path $Root $FilePath
}

Write-Step "対象ファイル: $AbsPath"

if (-not (Test-Path $AbsPath)) {
    Write-Fail "ファイルが見つかりません: $AbsPath"
    exit 1
}
if (-not $AbsPath.EndsWith(".js")) {
    Write-Fail "拡張子が .js ではありません: $AbsPath"
    exit 1
}

# ── リネーム ──────────────────────────────────────────────────────────────

Write-Step "リネーム実行"

$TsPath = $AbsPath -replace "\.js$", ".ts"

if (Test-Path $TsPath) {
    Write-Fail ".ts ファイルがすでに存在します: $TsPath"
    Write-Host "    上書きする場合は先に削除してください。" -ForegroundColor Yellow
    exit 1
}

Rename-Item -Path $AbsPath -NewName ([System.IO.Path]::GetFileName($TsPath))
Write-Ok "$([System.IO.Path]::GetFileName($AbsPath)) -> $([System.IO.Path]::GetFileName($TsPath)) リネーム完了"

# ── tsc --noEmit で確認 ────────────────────────────────────────────────

Write-Step "tsc --noEmit でエラー確認"

Write-Host ""
Write-Host "---- tsc 出力 ここから ----" -ForegroundColor DarkGray

$TscRaw    = & npx tsc --noEmit 2>&1
# 必ず配列として扱う
$TscLines  = @($TscRaw | ForEach-Object { "$_" })

$ErrorCount   = @($TscLines | Where-Object { $_ -match "error TS" }).Count
$RelTsPath    = $TsPath.Replace($Root + "\", "").Replace("\", "/")
$ThisErrCount = @($TscLines | Where-Object { $_ -match [regex]::Escape($RelTsPath) }).Count

if ($TscLines.Count -gt 0) {
    Write-Host ($TscLines -join "`n") -ForegroundColor DarkGray
} else {
    Write-Host "（出力なし）" -ForegroundColor DarkGray
}

Write-Host "---- tsc 出力 ここまで ----" -ForegroundColor DarkGray
Write-Host ""

# ── 結果サマリー ──────────────────────────────────────────────────────────

Write-Host "============================================" -ForegroundColor Cyan
Write-Host " リネーム完了: $([System.IO.Path]::GetFileName($TsPath))" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Ok "tsc エラー 0 件。このStepは完了です！"
} else {
    Write-Host "    tsc エラー総数   : $ErrorCount 件" -ForegroundColor Yellow
    Write-Host "    このファイル起因 : $ThisErrCount 件（目安）" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    残りエラーを修正後、再度 tsc --noEmit で確認してください:" -ForegroundColor White
    Write-Host "      npx tsc --noEmit" -ForegroundColor Green
}

Write-Host ""