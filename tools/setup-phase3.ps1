# =============================================================================
# setup-phase3.ps1
# Phase 3 事前準備スクリプト
# 実行場所: プロジェクトルート
#   .\tools\setup-phase3.ps1
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$Root = (Get-Location).Path
$SrcDir   = Join-Path $Root "src"
$TasksDir = Join-Path $Root "tasks"

# ── ヘルパー ─────────────────────────────────────────────────────────────────

function Write-Step([string]$msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Ok([string]$msg) {
    Write-Host "    [OK] $msg" -ForegroundColor Green
}

function Write-Warn([string]$msg) {
    Write-Host "    [WARN] $msg" -ForegroundColor Yellow
}

function Write-Fail([string]$msg) {
    Write-Host "    [FAIL] $msg" -ForegroundColor Red
}

# ── 1. 前提チェック ────────────────────────────────────────────────────────

Write-Step "前提チェック"

if (-not (Test-Path (Join-Path $Root "package.json"))) {
    Write-Fail "package.json が見つかりません。プロジェクトルートから実行してください。"
    exit 1
}
Write-Ok "package.json 確認"

if (-not (Test-Path (Join-Path $Root "vite.config.js"))) {
    Write-Warn "vite.config.js が見つかりません（すでに .ts 化済みかもしれません）"
} else {
    Write-Ok "vite.config.js 確認"
}

if (-not (Test-Path (Join-Path $TasksDir "types"))) {
    Write-Fail "tasks/types/ が見つかりません。"
    exit 1
}
Write-Ok "tasks/types/ 確認"

# ── 2. TypeScript インストール ────────────────────────────────────────────

Write-Step "TypeScript インストール (npm install -D typescript)"

npm install -D typescript
if ($LASTEXITCODE -ne 0) {
    Write-Fail "npm install に失敗しました。"
    exit 1
}
Write-Ok "typescript インストール完了"

# ── 3. tsconfig.json 生成 ─────────────────────────────────────────────────

Write-Step "tsconfig.json 生成"

$TsconfigPath = Join-Path $Root "tsconfig.json"

if (Test-Path $TsconfigPath) {
    Write-Warn "tsconfig.json がすでに存在します。上書きします。"
}

# tasks/types への相対パスを計算（プロジェクトルート基準）
$TsConfigContent = @'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@types/*": ["tasks/types/*"]
    }
  },
  "include": [
    "src/**/*",
    "tasks/types/**/*",
    "vite.config.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
'@

Set-Content -Path $TsconfigPath -Value $TsConfigContent -Encoding UTF8
Write-Ok "tsconfig.json を生成しました"

# ── 4. vite.config.js → vite.config.ts ──────────────────────────────────

Write-Step "vite.config.js → vite.config.ts リネーム"

$ViteJs = Join-Path $Root "vite.config.js"
$ViteTs = Join-Path $Root "vite.config.ts"

if (Test-Path $ViteTs) {
    Write-Warn "vite.config.ts がすでに存在します。スキップします。"
} elseif (Test-Path $ViteJs) {
    Rename-Item -Path $ViteJs -NewName "vite.config.ts"
    Write-Ok "vite.config.js → vite.config.ts リネーム完了"
} else {
    Write-Warn "vite.config.js が見つかりません。スキップします。"
}

# ── 5. tsc --noEmit で初期エラー確認 ─────────────────────────────────────

Write-Step "tsc --noEmit で初期エラー確認"

Write-Host ""
Write-Host "---- tsc 出力 ここから ----" -ForegroundColor DarkGray

$TscOutput = & npx tsc --noEmit 2>&1
$ErrorCount = ($TscOutput | Where-Object { $_ -match "error TS" }).Count

Write-Host ($TscOutput -join "`n") -ForegroundColor DarkGray
Write-Host "---- tsc 出力 ここまで ----" -ForegroundColor DarkGray
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Ok "エラー 0 件。事前準備完了です！"
} else {
    Write-Host "    初期エラー数: $ErrorCount 件" -ForegroundColor Yellow
    Write-Host "    ※ これから各 Step で解消していきます。" -ForegroundColor Yellow
}

# ── 完了メッセージ ─────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " Phase 3 事前準備 完了" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " 次のステップ:" -ForegroundColor White
Write-Host "   各 .js ファイルの型付け作業を始めてください。" -ForegroundColor White
Write-Host "   型付け後は以下で .ts にリネームします:" -ForegroundColor White
Write-Host "     .\tools\rename-to-ts.ps1 src/storage.js" -ForegroundColor Green
Write-Host ""