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

// 覆盖资产存储里残留的旧 index.html：首页统一跳到 /dashboard，
// 由 Worker 经 serveFrontend 下发 dashboard.html（含主题与自定义注入）。
// 否则 ASSETS 会直接拦截 / 并返回旧版 index.html。
fs.writeFileSync(indexHtmlPath, '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<meta http-equiv="refresh" content="0; url=/dashboard">\n<link rel="canonical" href="/dashboard">\n<title>Redirecting…</title>\n</head>\n<body>\n<script>location.replace("/dashboard");</script>\n</body>\n</html>\n');
console.log('Wrote index.html redirect → /dashboard');

console.log('Build complete!');
