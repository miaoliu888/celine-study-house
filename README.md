# celine 的蓝兔学习屋 V1.0

> celine 专属学习工作台：每日计划、KET 听写、番茄专注、错题复习、成长记录、小金库
> 适配：手机 390×844、平板 820×1180
> 美乐蒂粉兔风格 · PWA 支持（可装到手机桌面）
> 永久云端 URL — 详见 [DEPLOY.md](./DEPLOY.md)

---

## 🚀 5 分钟上线

| 步骤 | 操作 |
|------|------|
| 1 | 注册 GitHub |
| 2 | 创建 repo `siven-study-house` |
| 3 | `git push` 整个项目 |
| 4 | repo Settings → Pages → 启用 |
| 5 | 拿到永久 URL，手机扫码/打开 |

**完整教程**：[DEPLOY.md](./DEPLOY.md)

---

## 🐰 快速开始（本地测试）

```bash
# 用 PowerShell 起一个本地服务
powershell -File serve.ps1

# 或双击 "打开蓝兔学习屋.bat"
```

打开浏览器 `http://localhost:8731/`。

---

## 📂 项目结构

```
siven-study-house/
├── index.html                # 入口
├── manifest.webmanifest      # PWA 配置
├── sw.js                     # Service Worker（离线）
├── serve.ps1                 # 本地服务器
├── qr.html                   # QR 码生成器
├── 打开蓝兔学习屋.bat         # 一键启动
├── DEPLOY.md                 # 部署指南
├── docs/
│   └── architecture.md       # 信息架构 + 数据模型
├── css/                      # 5 个 CSS 文件
├── js/
│   ├── main.js               # 入口
│   ├── store.js              # IndexedDB 封装
│   ├── ket-db.js             # KET 词库
│   ├── tts.js                # 浏览器发音
│   ├── scheduler.js          # 每日 20 词调度
│   ├── review.js             # 错词复习
│   ├── tasks.js              # 任务系统
│   ├── timer.js              # 番茄钟
│   ├── bunny.js              # 粉兔 SVG
│   ├── router.js             # hash 路由
│   ├── utils.js              # 工具
│   └── views/                # 13 个页面
└── assets/
    ├── pwa-icon.svg          # PWA 图标
    └── pwa-icon-maskable.svg # maskable 图标
```

---

## ✅ 核心功能

- 桌面：心情打卡、进度环、下一项推荐
- 今日计划：分学科任务、28 天晨读日历、stepper 调进度
- KET 英语：每日 20 词听写 + 错词复习、词库、学习统计
- 番茄钟：20+5 节奏、任务绑定
- 总结：完成率、学科、心情、文字记录
- 日历：月历视图，🐰 脚印
- 成长：身高折线
- 小金库：¥ 余额、流水、兑换
- 设置：昵称、奖励、专注时长、发音、任务管理、重置

---

## 🔌 部署后能干什么

部署到云端（GitHub Pages / Cloudflare Pages）后：

1. **任何手机都能访问**：永久 URL，分享给 celine 随时打开
2. **添加到主屏幕**：像 App 一样从桌面点开，没有浏览器地址栏
3. **离线可用**：Service Worker 缓存后断网也能用（基础功能）
4. **数据本地**：IndexedDB 存各人设备，跨设备不同步（V1 限制）

---

## 🛠️ 进一步可做

- 云端账号登录（手机/平板同步）
- 真正的 TTS 服务（替代浏览器）
- 推送通知（每日学习提醒）
- 数据导出/导入（JSON 备份）

详见 [DEPLOY.md](./DEPLOY.md)。
