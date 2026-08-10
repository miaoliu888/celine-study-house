# celine 的蓝兔学习屋 — 部署指南

> 让你的学习屋**永久运行**在云端，手机随时打开都能用。

---

## 三种部署方式对比

| 方式 | 永久 URL | 难度 | 费用 | 推荐度 |
|------|---------|------|------|--------|
| **GitHub Pages** | `https://<user>.github.io/siven-study-house` | ⭐ 简单 | 免费 | ⭐⭐⭐⭐⭐ |
| **Cloudflare Pages** | `https://siven-study-house.pages.dev` | ⭐⭐ 中等 | 免费 | ⭐⭐⭐⭐ |
| **Netlify Drop** | `https://<random-name>.netlify.app` | ⭐ 最简单 | 免费 | ⭐⭐⭐ |
| **Vercel** | `https://siven-study-house.vercel.app` | ⭐⭐ 中等 | 免费 | ⭐⭐⭐⭐ |

**推荐：GitHub Pages** —— 代码可以托管，永久免费，URL 稳定。

---

## 🟢 方案 1：GitHub Pages（最推荐）

### 步骤 1：注册 GitHub 账号
去 https://github.com 注册（如果还没有）。

### 步骤 2：创建新 repo
- 仓库名建议：`siven-study-house`
- 可见性：Public（免费 Pages 必须 public）
- 不勾选 "Add a README file"（我们已经有了）

### 步骤 3：把项目 push 上去

在项目根目录打开终端：

```bash
cd D:\6-6-minimax\siven-study-house

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<你的用户名>/siven-study-house.git
git push -u origin main
```

> 没有装 git？下载 https://git-scm.com/download/win

### 步骤 4：启用 Pages

1. 打开 repo → **Settings** → **Pages**
2. Source: `Deploy from a branch`
3. Branch: `main` / `/ (root)`
4. 点 **Save**
5. 等 1-2 分钟，会显示：
   ```
   Your site is live at https://<你的用户名>.github.io/siven-study-house
   ```

### 步骤 5：手机访问

1. 把这个 URL 加到手机浏览器书签
2. （可选）iOS Safari 打开 → 分享 → "添加到主屏幕"
3. （可选）Android Chrome 打开 → 菜单 → "添加到主屏幕"
4. 这样**图标就是粉兔头像**，从桌面点开就像 App 一样

---

## 🟣 方案 2：Cloudflare Pages（无需 GitHub）

### 步骤 1：注册 Cloudflare
去 https://dash.cloudflare.com/sign-up

### 步骤 2：创建 Pages 项目
1. 左侧菜单 **Workers & Pages** → **Create application** → **Pages** → **Upload assets**
2. 项目名：`siven-study-house`
3. 把整个项目文件夹（不是 zip）拖进上传区
4. 点 **Deploy site**

完成后会得到：`https://siven-study-house.pages.dev`

### 步骤 3：自定义域名（可选）
在 Pages 项目 → **Custom domains** 添加你自己的域名。

---

## 🟠 方案 3：Netlify Drop（最简单）

1. 打开 https://app.netlify.com/drop
2. **直接把 `D:\6-6-minimax\siven-study-house` 文件夹拖进浏览器**
3. 等 30 秒，自动部署完成
4. 拿到一个 `https://<random>.netlify.app` URL

> Netlify 这个方式最暴力，但有访问限制（流量大时会限速）。仅适合个人使用。

---

## 📱 把网页装到手机桌面

部署到任意云端后，手机浏览器打开 URL：

### iOS Safari
1. 点底部分享按钮 📤
2. 选 "**添加到主屏幕**"
3. 名字默认是"蓝兔学习"
4. 点"添加" → 桌面出现**粉兔图标**

### Android Chrome
1. 右上角菜单 ⋮
2. 选 "**添加到主屏幕**" 或 "**安装应用**"
3. 同上确认

之后从桌面点开 → **没有浏览器地址栏**，全屏显示，像原生 App 一样。

---

## 🔗 生成 QR 码（让手机扫码即用）

部署完拿到 URL 后，去下面任一工具生成 QR：

| 工具 | URL |
|------|-----|
| QR Server (推荐) | `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=<你的URL>` |
| 二维工坊 | https://www.2weima.com/ |
| 草料 | https://cli.im/ |

比如我的部署 URL 是 `https://celine.github.io/siven-study-house`，那 QR 码 URL 就是：

```
https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=https%3A%2F%2Fceline.github.io%2Fsiven-study-house
```

直接把上面这个 URL 在浏览器打开，就能看到 QR 码图片，**右键保存**后发给手机扫。

---

## 🔄 之后改代码怎么更新

### GitHub Pages
```bash
git add .
git commit -m "更新了 XXX"
git push
```
等 30 秒，URL 自动更新。

### Cloudflare Pages / Netlify
重新拖一次文件夹，或配 GitHub 自动部署。

---

## 💾 数据存在哪？

- **用户数据**（KET 进度、错词、金币、身高）存在**手机本地 IndexedDB**
- 换手机 = 数据丢失（除非登录云端账号 —— 未来扩展）
- 清浏览器缓存 = 数据丢失
- 建议每月导出备份（设置页可加"导出 JSON"功能，未来加）

---

## ⚠️ 注意事项

1. **HTTPS 必须**：PWA + Service Worker 必须在 HTTPS 下工作（GitHub Pages 自动是 HTTPS）
2. **首次访问需联网**：SW 缓存后可以离线用，但首次必须在线
3. **数据本地**：换设备/换浏览器数据不同步
4. **不要泄露 IDB 数据**：URL 是公开的，任何人都能访问，但 IDB 存在各人本地

---

## 🛠️ 我没做的（但 V1.0 之后可以考虑）

- [ ] 云端账号登录（手机/平板/电脑数据同步）
- [ ] 真正的 TTS 服务（用 Google Cloud TTS 替代浏览器 TTS）
- [ ] PWA 推送通知（每日学习提醒）
- [ ] 离线模式优化（IndexedDB 缓存当天 20 词）
- [ ] 数据导出/导入（JSON 备份）

---

## 一键命令（GitHub Pages 推送）

如果你之前没用过 git，可以这样：

```powershell
# 1. 安装 Git：https://git-scm.com/download/win
# 2. 在 D:\6-6-minimax\siven-study-house 文件夹空白处右键 → "Git Bash Here"
# 3. 依次执行：

git init
git config user.name "celine"
git config user.email "celine@example.com"
git add .
git commit -m "Siven 的蓝兔学习屋 V1.0"
git branch -M main
git remote add origin https://github.com/<你的用户名>/siven-study-house.git
git push -u origin main
```

然后在 GitHub repo 设置 Pages 即可。

---

**最后**：你也可以**用 localhost + 同一个 WiFi** 在手机上访问：

1. 电脑运行 `serve.ps1`
2. 电脑 IP 比如 `192.168.1.100`
3. 手机浏览器打开 `http://192.168.1.100:8731/`
4. 缺点：电脑关机就访问不到

**所以云端部署仍然是"长久"的最佳方案。**
