# MyKnot

属于我们的时光 — 情侣关系记录与关怀应用。

## 功能

- **纪念日倒数** — 记录在一起的日子，实时倒数周年纪念日
- **日历事件** — 支持公历/农历，年度重复事件（生日、纪念日等）
- **每周日程** — 可自定义的周课程表/日程表
- **经期关怀** — 经期记录与周期预测
- **时光画廊** — 照片上传与管理，瀑布流展示
- **账号系统** — 邮箱验证码登录，支持设置密码，多设备同步

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| 后端 | Express 5 + TypeScript + Prisma ORM |
| 数据库 | SQLite (开发) / MySQL (生产) |
| 认证 | JWT (邮箱验证码 / 密码登录) |

## 项目结构

```
MyKnot/
├── server/          # Express API 服务端
│   └── src/
│       ├── routes/      # auth, profile, events, schedule, period, gallery
│       ├── middleware/  # JWT 认证中间件
│       └── db/          # Prisma 数据库
├── web/             # React 移动端 SPA
│   └── src/
│       ├── pages/       # 页面组件
│       ├── components/  # 通用组件
│       └── api/         # API 客户端
└── miniapp/         # 小程序端（待开发）
```

## 本地运行

```bash
# 服务端
cd server
npm install
npx prisma db push
npm run dev        # → http://localhost:3001

# 前端
cd web
npm install
npm run dev        # → http://localhost:5173
```

开发环境下验证码默认为 `123456`。

## License

MIT
