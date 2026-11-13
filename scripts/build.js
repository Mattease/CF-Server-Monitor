#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const distDir = path.join(rootDir, 'dist');

console.log('Cleaning dist directory...');
if (fs.existsSync(distDir)) {
  fs.removeSync(distDir);
}

console.log('Building frontend...');
execSync('npx vite build', { cwd: rootDir, stdio: 'inherit' });

console.log('Copying static assets...');
if (fs.existsSync(publicDir)) {
  fs.copySync(publicDir, distDir, { overwrite: false });
  console.log('Copied all static assets');
}

// 重命名为 dashboard.html，避免 ASSETS 直接拦截首页
const indexHtmlPath = path.join(distDir, 'index.html');
const dashboardHtmlPath = path.join(distDir, 'dashboard.html');
if (fs.existsSync(indexHtmlPath)) {
  fs.renameSync(indexHtmlPath, dashboardHtmlPath);
  console.log('Renamed index.html → dashboard.html');
}

// SAO 主题首页注入：SAO 是独立前端（theme_url 配在面板里），
// 其 index.html 由 ASSETS 直接提供给 /。构建时从 GitHub 拉取 SAO
// index.html，把重置倒计时注入脚本插到 </body> 前，写成 dist/index.html。
// 这样首页走 SAO 主题，同时卡片流量旁显示“X天后重置”。
// （只改部署产物，不动 SAO 仓库；换主题时改下面的 URL 即可。）
const SAO_THEME_INDEX_URL = 'https://raw.githubusercontent.com/WAOR/CFSM-SAO/6a1d652576212fbdae80496b92a6e290e881b46c/index.html';
const INJECT_SCRIPT_PATH = path.join(rootDir, 'scripts', 'reset-countdown-inject.js');

async function writeSaoIndexWithInjection() {
  try {
    const res = await fetch(SAO_THEME_INDEX_URL, { headers: { 'User-Agent': 'cfsm-build' } });
    if (!res.ok) {
      console.log(`[WARN] SAO index.html fetch failed: HTTP ${res.status}, keep previous dist/index.html if any`);
      return;
    }
    let html = await res.text();
    const injectJs = fs.readFileSync(INJECT_SCRIPT_PATH, 'utf-8');
    const tag = `<script>\n${injectJs}\n</script>\n`;
    if (html.includes('</body>')) {
      html = html.replace('</body>', `${tag}</body>`);
    } else {
      html += tag;
    }
    fs.writeFileSync(indexHtmlPath, html);
    console.log('Wrote SAO index.html + reset countdown injection → dist/index.html');
  } catch (e) {
    console.log(`[WARN] SAO index.html fetch failed: ${e.message}, keep previous dist/index.html if any`);
  }
}

await writeSaoIndexWithInjection();

console.log('Build complete!');
