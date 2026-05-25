# MyKnot 宝塔面板部署指南

## 环境要求

- 服务器：Linux (CentOS 7+ / Ubuntu 18+ / Debian 10+)
- 宝塔面板：已安装
- Node.js：18+
- MySQL：5.7+ 或 8.0

---

## 1. 宝塔面板安装软件

在宝塔「软件商店」中安装以下软件：

| 软件 | 说明 |
|------|------|
| MySQL 8.0 | 数据库 |
| Node.js 版本管理器 | 安装 Node 18+ |
| Nginx | 反向代理（如已安装可跳过） |

### 安装 Node.js

宝塔「软件商店」→ 搜索「Node.js 版本管理器」→ 安装，然后在管理器中选择 **Node 18.x**（或 20.x），点击安装。

---

## 2. 创建数据库

打开宝塔「数据库」→ 点击「添加数据库」：

| 字段 | 值 |
|------|-----|
| 数据库名 | `cc` |
| 用户名 | `cc` |
| 密码 | `cc` |
| 访问权限 | 本地服务器 |

> 或者改为你自己需要的数据库名、用户、密码，后续环境变量保持一致即可。

点击「提交」创建。

---

## 3. 上传项目到服务器

### 方式一：Git 克隆（推荐）

```bash
cd /www/wwwroot
git clone https://github.com/wenqa1/MyKnot.git
cd MyKnot/server
```

### 方式二：宝塔文件上传

将项目打包为 `.zip`，在宝塔「文件」中上传到 `/www/wwwroot/`，然后解压。

---

## 4. 配置服务端

### 4.1 创建环境变量文件

```bash
cd /www/wwwroot/MyKnot/server
cp .env.example .env
```

编辑 `.env` 文件（宝塔文件管理器直接双击编辑）：

```env
PORT=3001
HOST=0.0.0.0
JWT_SECRET=生成一个随机字符串
NODE_ENV=production

# MySQL 连接字符串
DATABASE_URL=mysql://cc:cc@127.0.0.1:3306/cc
```

> 注意：`DATABASE_URL` 中的用户名、密码、数据库名要和第 2 步创建的一致。
>
> 如果需要允许外部连接，将 `127.0.0.1` 改为服务器内网 IP 或公网 IP，并在宝塔「安全」中放行 3306 端口。

### 4.2 JWT_SECRET 生成

SSH 终端中执行：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

把输出的随机字符串填入 `.env` 的 `JWT_SECRET`。

### 4.3 安装依赖并建表

在宝塔「终端」或 SSH 中进入项目目录：

```bash
cd /www/wwwroot/MyKnot/server
npm install
npx prisma db push
npm run seed:admin
```

> `prisma db push` 会在 MySQL 中自动创建所有表。
>
> `seed:admin` 创建默认管理员账号：`admin` / `admin`，邮箱为 `.env` 中 `ADMIN_EMAIL` 的值。

---

## 5. 启动后端服务

### 方式一：PM2 进程守护（推荐）

```bash
# 全局安装 PM2
npm install -g pm2

# 启动服务
cd /www/wwwroot/MyKnot/server
npm run build
pm2 start dist/index.js --name myknot-server

# 设置开机自启
pm2 startup
pm2 save
```

### 方式二：宝塔 Node 项目

1. 宝塔「网站」→「Node 项目」→「添加 Node 项目」
2. 填写以下信息：

| 字段 | 值 |
|------|-----|
| 项目目录 | `/www/wwwroot/MyKnot/server` |
| 启动文件 | `dist/index.js` |
| 项目名称 | MyKnot |
| 端口 | 3001 |
| 绑定域名 | 先不填 |
| 运行用户 | root |

3. 先执行 `npm run build` 编译，再点击启动。

---

## 6. 配置 Nginx 反向代理（可选）

如果你想用域名访问 API，在宝塔「网站」中添加站点，然后在「站点设置」→「反向代理」中添加：

| 字段 | 值 |
|------|-----|
| 代理名称 | myknot-api |
| 目标 URL | `http://127.0.0.1:3001` |
| 发送域名 | $host |

### 或者手动配置 Nginx：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /gallery/files/ {
    proxy_pass http://127.0.0.1:3001;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:3001;
}
```

---

## 7. 部署前端（可选）

如果需要部署前端静态文件：

```bash
cd /www/wwwroot/MyKnot/web
npm install
npm run build
```

生成的 `dist/` 目录就是前端静态文件。在宝塔「网站」中添加站点，将站点目录指向 `/www/wwwroot/MyKnot/web/dist`。

**重要：前端 API 地址配置**

前端默认请求 `/api` 相对路径，需要通过 Nginx 代理到后端。如果前后端不同域名：

修改 `web/src/api/client.ts` 中的请求基础路径，或在 Vite 构建时设置：

```bash
VITE_API_BASE=https://your-domain.com npm run build
```

---

## 8. 放行端口

在宝塔「安全」中放行以下端口：

| 端口 | 用途 |
|------|------|
| 3001 | 后端 API + 服务端面板 |
| 80/443 | 前端（通过 Nginx） |

---

## 9. 验证部署

1. **API 健康检查**：访问 `http://你的IP:3001/api/health`，应返回 `{"ok":true}`
2. **服务端面板**：访问 `http://你的IP:3001`，应显示 MyKnot 服务端面板
3. **用户注册**：访问前端页面，测试注册和登录

---

## 10. 常用维护命令

```bash
# PM2 相关
pm2 status                 # 查看进程状态
pm2 logs myknot-server     # 查看日志
pm2 restart myknot-server  # 重启服务
pm2 stop myknot-server     # 停止服务

# 更新代码后
cd /www/wwwroot/MyKnot
git pull
cd server
npm install
npx prisma db push
npm run build
pm2 restart myknot-server
```

---

## 数据库备份

在宝塔「计划任务」中添加定期备份：

- 任务类型：备份数据库
- 数据库：cc
- 备份时间：每天凌晨 3:00
- 备份保留：最近 7 份
