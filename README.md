<p align="center">
  <img src="web/public/favicon.png" alt="MyKnot" width="120" />
</p>

<h1 align="center">MyKnot</h1>
<p align="center">属于我们的时光 — 情侣关系记录与关怀应用</p>

---

## 功能

- **纪念日倒数** — 记录在一起的日子，实时倒数周年纪念日
- **日历事件** — 公历/农历双支持，年度重复事件，多彩图标标记，节日自动显示
- **每周日程** — 可自定义的周课程表，双人共享
- **经期关怀** — 经期记录、周期预测与阶段分析，空间内共享
- **时光画廊** — 照片上传与管理，相册分类（创建/重命名/删除），瀑布流展示，照片备注
- **伴侣空间** — 邀请另一半加入，共享日历、经期、日程、画廊数据
- **现代化日期选择器** — 自定义日历面板，支持手动输入与快速年月切换
- **头像上传** — 自定义个人头像
- **账号系统** — 邮箱验证码注册 + 用户名/邮箱登录
- **推送通知** — Bark、Server酱、钉钉、企业微信、自定义 Webhook、邮件 6 种渠道，逐项开关，实时 + 定时推送
- **管理员后台** — 用户管理、数据统计、SMTP 邮件配置
- **深色主题** — 浅色/深色模式一键切换，全局适配
- **自定义背景** — 支持设置页面背景图片
- **底部导航编辑** — 自由配置底部导航按钮（最多 5 个，最少 1 个），支持排序和隐藏
- **数据备份** — 云端数据导出/导入，JSON 格式备份与恢复
- **服务端面板** — `http://localhost:3001` 可视化面板，查看服务状态、数据统计、用户管理

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| 后端 | Express 5 + TypeScript + Prisma ORM |
| 数据库 | MySQL |
| 认证 | JWT（用户名+密码 / 邮箱验证码） |
| 推送 | Bark / Server酱 / 钉钉 / 企业微信 / Webhook / SMTP |

## 项目结构

```
MyKnot/
├── server/              # Express API 服务端
│   └── src/
│       ├── routes/      # auth, profile, events, schedule, period, gallery, space, admin, upload, notifications, sync, dashboard
│       ├── middleware/   # JWT 认证、空间共享、管理员中间件
│       ├── utils/        # 邮件发送、推送通知、通知检查调度
│       └── db/           # Prisma ORM
├── web/                 # React SPA
│   └── src/
│       ├── pages/        # Login, Home, Calendar, PeriodTracker, Gallery, Schedule, Settings, AppSettings, Admin
│       ├── components/   # DatePicker, GlassCard, Modal, ConfirmModal, Toast, PhotoViewer, Skeleton, ErrorBoundary...
│       ├── context/      # ThemeContext (主题切换), NavContext (导航配置)
│       └── api/          # API 客户端
└── miniapp/             # 小程序端（规划中）
```

## 本地运行

```bash
# 服务端
cd server
npm install
cp .env.example .env      # 编辑 JWT_SECRET
npx prisma db push
npm run seed:admin        # 创建默认管理员 admin / admin
npm run dev               # → http://localhost:3001 (API + 面板)

# 前端
cd web
npm install
npm run dev               # → http://localhost:5173
```

开发环境下验证码默认为 `123456`。

## 页面导航

| 路径 | 说明 |
|------|------|
| `/` | 首页 — 纪念日倒数、快捷入口 |
| `/gallery` | 时光画廊 — 照片上传、相册管理、备注 |
| `/calendar` | 重要日子 — 日历事件、经期追踪 |
| `/schedule` | 日程 — 周课程表 |
| `/settings` | 我的 — 个人资料、伴侣空间、通知推送 |
| `/preferences` | 应用设置 — 主题切换、背景图、导航编辑、数据备份 |
| `/admin` | 管理员后台 — 用户管理、数据统计、SMTP 配置 |
| `:3001` | 服务端面板 — 运行状态、数据概览、用户管理 |

## 推送通知配置

在 **我的 → 通知推送** 中配置：

| 渠道 | 说明 | 配置方式 |
|------|------|---------|
| Bark | iOS 推送 | 粘贴 Bark App 中的完整链接 `https://api.day.app/KEY/` |
| Server酱 | 微信推送 | 输入 SendKey |
| 钉钉 | 钉钉机器人 | 输入 Webhook URL |
| 企业微信 | 企微机器人 | 输入 Webhook URL |
| 自定义 Webhook | HTTP POST | 输入回调 URL，body: `{ title, body, source }` |
| 邮件 | SMTP | 管理员在后台配置 SMTP 后可用 |

支持按事件类型（纪念日、经期预测、特殊日子）单独开关，可设置提前天数和每日定时推送时间。

## License

MIT
