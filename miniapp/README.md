# Knot 小程序

## 架构说明

小程序端与 Web 端共享 `server/` 后端 API。

## 登录流程

1. 调用 `wx.login()` 获取 code
2. 将 code 发送至 `POST /api/auth/wechat-login`
3. 服务端交换 code 获得 openid，自动创建/查找用户，返回 JWT
4. 后续请求携带 `Authorization: Bearer <token>`

## 待实现

- [ ] 微信小程序项目初始化
- [ ] 登录页面 (自动 wx.login)
- [ ] 主页 (纪念日倒计时)
- [ ] 日历 (重要日子)
- [ ] 画廊 (照片墙)
- [ ] 关怀 (经期追踪)
- [ ] 日程 (周日程表)

## API 服务地址

开发环境需在微信公众平台配置 request 合法域名为服务器地址。
