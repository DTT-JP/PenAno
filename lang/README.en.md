# PenAno

> **日本語版:** [README.md](./README.md)

A web-based annotation tool designed for tablet devices. Open images in your browser and create, edit, and export rectangle annotations in LabelMe format. No installation required. PWA support available.

---

## Features

- Batch image loading from a folder or ZIP file
- Draw, move, resize, and delete rectangle annotations
- Save and export in LabelMe JSON format
- Customizable label colors
- Session management (auto-saved to LocalStorage)
- Pinch zoom and pan (tablet / Apple Pencil support)
- PWA support (offline operation, installable to home screen)

---

## Supported Environments

| Environment | Notes |
|-------------|-------|
| Chrome / Edge (latest) | Recommended |
| Safari (iOS 16+) | Tablet / iPhone |
| Firefox (latest) | Verified working |

No internet connection required after the initial load (offline capable).

---

## Live Version

**https://penano.dttjp.com**

Open the URL above in your browser — no installation needed.

---

## How to Use

### 1. Open the App

Open the live version (https://penano.dttjp.com) or your self-hosted URL in a browser.

### 2. Load Images

On the load screen, choose one of the following:

- **Select Folder** — Select a folder containing images
- **Select ZIP** — Select a ZIP file containing images

Supported formats: `jpg` / `jpeg` / `png` / `bmp` / `webp` / `gif`

If `.json` files with matching names exist in the folder, they will be loaded as existing annotations.

### 3. Create Annotations

| Action | How |
|--------|-----|
| Switch mode | "Select" / "Add" buttons at the top |
| Draw rectangle | Drag in Add mode (mouse / Apple Pencil) |
| Select rectangle | Tap in Select mode |
| Move | Drag after selecting |
| Resize | Drag handles after selecting |
| Delete | Tap "×" in the object list |
| Zoom | Pinch gesture or zoom panel |

### 4. Manage Labels

- Select a label from the label list to assign it to an annotation
- Tap "+" to add a new label
- Tap the color swatch to change the label color
- Tap "×" to delete a label and all associated annotations

### 5. Export

Go to the "Other" menu → "Download ZIP" to download all annotation JSONs as a ZIP file.

---

## File Structure

```
PenAno/
├── index.html                  # Entry point
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── package.json
├── src/
│   ├── main.ts                 # Main application logic
│   ├── canvas.ts               # Image display & annotation rendering
│   ├── data.ts                 # File loading & JSON management
│   ├── storage.ts              # LocalStorage persistence
│   ├── state.ts                # Application state variables
│   ├── settings.ts             # Settings panel
│   ├── version.ts              # Version definition
│   ├── style.css               # Styles
│   ├── vite-env.d.ts           # Vite / PWA type declarations
│   ├── types/
│   │   ├── app.ts              # Shared app type definitions
│   │   ├── labelme.ts          # LabelMe JSON type definitions
│   │   └── storage.ts          # Storage type definitions
│   └── ui/
│       ├── confirm.ts          # Confirm button
│       ├── labelList.ts        # Label list UI
│       ├── loadScreen.ts       # Load screen
│       ├── objectList.ts       # Object list UI
│       ├── progress.ts         # Progress display
│       └── zoom.ts             # Zoom controls
├── tasks/
│   └── types/                  # Original type definitions (copied to src/types/)
├── tools/
│   ├── setup-phase3.ps1        # TypeScript migration setup script
│   └── rename-to-ts.ps1        # .js → .ts rename script
├── public/
│   └── CHANGELOG/
└── icons/
```

---

## Developer Setup

### Requirements

- Node.js 18+
- npm 9+
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/DTT-JP/PenAno.git
cd PenAno

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

Build output is placed in the `dist/` folder.

---

## Deploy to Cloudflare Pages

Automatic deployment via GitHub integration.

### 1. Create a GitHub repository and push

Create a new repository on GitHub and push your code:

```bash
git remote add origin https://github.com/<username>/<repository>.git
git branch -M main
git push -u origin main
```

### 2. Log in to Cloudflare

Go to [https://dash.cloudflare.com](https://dash.cloudflare.com) and log in.

### 3. Create a new project

1. Select **Workers & Pages** from the left menu
2. Click **Create application** → select the **Pages** tab
3. Click **Connect to Git**
4. Connect your GitHub account, select the target repository, and click **Begin setup**

### 4. Configure build settings

| Setting | Value |
|---------|-------|
| Production branch | `main` |
| Framework preset | `None` (manual) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | (leave blank) |

**No environment variables are required.**

### 5. Deploy

Click **Save and Deploy**. Once the build completes, your app will be available at `https://<project-name>.pages.dev`.

### 6. Automatic deployment

Every push to the `main` branch triggers an automatic build and deployment.

```bash
git add .
git commit -m "description of changes"
git push
```

---

## License

MIT License — Copyright (c) 2026 DTT-JP

See [LICENSE](./LICENSE) for details.

Third-party library licenses are listed in [THIRD-PARTY-NOTICES.txt](./THIRD-PARTY-NOTICES.txt).