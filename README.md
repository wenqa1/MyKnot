# MyKnot

属于我们的时光 — 情侣关系记录与关怀应用。

## 功能

- **纪念日倒数** — 记录在一起的日子，实时倒数周年纪念日
- **日历事件** — 支持公历/农历，年度重复事件（生日、纪念日等）
- **每周日程** — 可自定义的周课程表/日程表
- **经期关怀** — 经期记录与周期预测，空间内数据共享
- **时光画廊** — 照片上传与管理，瀑布流展示
- **伴侣空间** — 邀请另一半加入空间，共享日历、经期、日程等数据
- **头像上传** — 自定义个人头像，空间内显示双方头像
- **账号系统** — 用户名+密码+邮箱验证码注册，支持登录名或邮箱登录
- **推送通知** — 支持 Bark、Server酱、钉钉、企业微信、Webhook、邮件等多种渠道推送纪念日、经期等提醒（可逐项开关）
- **管理员后台** — 用户管理、统计面板、SMTP 邮件配置

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| 后端 | Express 5 + TypeScript + Prisma ORM |
| 数据库 | SQLite (开发) / MySQL (生产) |
| 认证 | JWT (用户名+密码 / 邮箱验证码) |
| 推送 | Bark / Server酱 / 钉钉 / 企业微信 / Webhook / SMTP 邮件 |

## 项目结构

```
MyKnot/
├── server/          # Express API 服务端
│   └── src/
│       ├── routes/        # auth, profile, events, schedule, period, gallery, space, admin, upload, notifications
│       ├── middleware/    # JWT 认证、管理员、空间共享中间件
│       ├── utils/         # 邮件发送、推送通知、通知检查
│       └── db/            # Prisma 数据库
├── web/             # React 移动端 SPA
│   └── src/
│       ├── pages/        # 页面组件 (Login, Home, Calendar, Period, Gallery, Settings, Admin)
│       ├── components/   # 通用组件 (GlassCard, Modal, Toast, ErrorBoundary, Skeleton, ConfirmModal)
│       └── api/          # API 客户端
└── miniapp/         # 小程序端（待开发）
```

## 本地运行

```bash
# 服务端
cd server
npm install
cp .env.example .env    # 编辑 JWT_SECRET
npx prisma db push
npm run seed:admin      # 创建默认管理员 admin/admin
npm run dev              # → http://localhost:3001

# 前端
cd web
npm install
npm run dev              # → http://localhost:5173
```

开发环境下验证码默认为 `123456`。

## 推送通知配置

在设置页 → 通知推送中配置：

| 渠道 | 说明 | 配置方式 |
|------|------|---------|
| Bark | iOS 推送 | 粘贴 Bark App 中的完整推送链接 |
| Server酱 | 微信推送 | 输入 SendKey |
| 钉钉 | 钉钉机器人 | 输入 Webhook URL |
| 企业微信 | 企微机器人 | 输入 Webhook URL |
| 自定义 Webhook | HTTP POST | 输入自定义回调 URL |
| 邮件 | SMTP 邮件 | 需要管理员先配置 SMTP |

支持按事件类型（纪念日、经期预测、特殊日子）单独开关，可设置提前通知天数和定时推送时间。

## License

MIT
