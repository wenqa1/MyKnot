import { Router } from "express";
import os from "os";
import prisma from "../db/prisma.js";

const router = Router();
const startTime = Date.now();

function uptime() {
  const s = Math.floor((Date.now() - startTime) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${d}d ${h}h ${m}m ${sec}s`;
}

// GET /api/dashboard/info
router.get("/info", (_req, res) => {
  const mem = process.memoryUsage();
  res.json({
    uptime: uptime(),
    node: process.version,
    platform: `${os.platform()} ${os.arch()}`,
    hostname: os.hostname(),
    cpus: os.cpus().length,
    memory: {
      rss: `${(mem.rss / 1024 / 1024).toFixed(1)} MB`,
      heapUsed: `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`,
      heapTotal: `${(mem.heapTotal / 1024 / 1024).toFixed(1)} MB`,
    },
    pid: process.pid,
  });
});

// GET /api/dashboard/users — user list for dashboard
router.get("/users", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        role: true,
        disabled: true,
        spaceId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    console.error("dashboard users error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

// HTML for the root dashboard page
export function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#fb7185">
<title>MyKnot · 服务端面板</title>
<style>
  :root {
    --rose: #fb7185; --rose-light: #fecdd3; --purple: #c084fc;
    --amber: #fbbf24; --dark: #1e293b; --muted: #78716c;
    --surface: #faf7f5; --card: #fff; --border: #e8e8e8;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:"Inter","PingFang SC","Microsoft YaHei",sans-serif; background:var(--surface); color:var(--dark); min-height:100vh; }
  .container { max-width:880px; margin:0 auto; padding:28px 18px; }
  header { display:flex; align-items:center; gap:14px; margin-bottom:36px; }
  .logo { width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,var(--rose),var(--purple)); display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; font-weight:800; }
  h1 { font-family:"Comfortaa",cursive; font-size:23px; font-weight:800; }
  .subtitle { color:var(--muted); font-size:13px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:12px; margin-bottom:28px; }
  .stat { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:20px; transition:all .2s; }
  .stat:hover { border-color:var(--rose-light); box-shadow:0 4px 20px rgba(251,113,133,.08); }
  .stat-label { font-size:11px; color:var(--muted); text-transform:uppercase; letter-spacing:.5px; margin-bottom:8px; }
  .stat-value { font-size:30px; font-weight:800; }
  .c-rose { color:var(--rose); } .c-purple { color:var(--purple); } .c-amber { color:var(--amber); }
  .section { margin-bottom:28px; }
  .section-title { font-size:15px; font-weight:700; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
  .section-title::before { content:""; display:block; width:4px; height:18px; border-radius:2px; background:var(--rose); }
  .card { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:18px 22px; }
  .row { display:flex; justify-content:space-between; align-items:center; padding:7px 0; }
  .row+.row { border-top:1px solid #f5f5f5; }
  .row-label { font-size:13px; color:var(--muted); }
  .row-value { font-size:13px; font-weight:600; }
  .badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px; font-size:12px; font-weight:600; }
  .badge-ok { background:#dcfce7; color:#16a34a; }
  .dot { width:7px; height:7px; border-radius:50%; background:#16a34a; animation:pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
  .loading { text-align:center; color:var(--muted); padding:40px; font-size:14px; }
  .error { text-align:center; color:#ef4444; padding:40px; }
  footer { text-align:center; color:#ccc; font-size:12px; margin-top:44px; padding-bottom:24px; }
  .refresh { color:var(--muted); cursor:pointer; text-decoration:underline; }
  .refresh:hover { color:var(--rose); }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; padding:10px 12px; color:var(--muted); font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.5px; border-bottom:2px solid var(--border); }
  td { padding:10px 12px; border-bottom:1px solid #f5f5f5; }
  tr:hover td { background:#fafafa; }
  .user-avatar { width:28px; height:28px; border-radius:8px; background:var(--rose-light); display:inline-flex; align-items:center; justify-content:center; color:var(--rose); font-size:12px; font-weight:700; margin-right:8px; vertical-align:middle; }
  .role-badge { display:inline-block; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; }
  .role-admin { background:#fef3c7; color:#92400e; }
  .role-user { background:#e8e8e8; color:#555; }
  .status-disabled { color:#ef4444; font-weight:600; }
  .status-active { color:#16a34a; }
</style>
</head>
<body>
<div class="container">
  <header>
    <div class="logo">K</div>
    <div><h1>MyKnot 服务端</h1><p class="subtitle">运行状态 &middot; 数据概览</p></div>
  </header>

  <div class="section">
    <div class="section-title">服务状态</div>
    <div class="card" id="status"><div class="loading">加载中...</div></div>
  </div>

  <div class="section">
    <div class="section-title">数据统计</div>
    <div class="grid" id="stats"><div class="stat"><div class="stat-label">加载中...</div></div></div>
  </div>

  <div class="section">
    <div class="section-title">系统信息</div>
    <div class="card" id="sysinfo"><div class="loading">加载中...</div></div>
  </div>

  <div class="section">
    <div class="section-title">用户管理</div>
    <div class="card" style="padding:0;overflow-x:auto">
      <div id="usertable"><div class="loading">加载中...</div></div>
    </div>
  </div>

  <footer>MyKnot Server &middot; <span class="refresh" onclick="loadAll()">刷新数据</span> &middot; 每 30 秒自动刷新</footer>
</div>
<script>
async function loadAll(){
  try{
    const r=await fetch('/api/dashboard/info').then(x=>x.json());
    document.getElementById('status').innerHTML='<div class="row"><span class="row-label">状态</span><span class="badge badge-ok"><span class="dot"></span>运行中</span></div><div class="row"><span class="row-label">已运行</span><span class="row-value">'+r.uptime+'</span></div><div class="row"><span class="row-label">PID</span><span class="row-value">'+r.pid+'</span></div>';
    document.getElementById('sysinfo').innerHTML='<div class="row"><span class="row-label">Node</span><span class="row-value">'+r.node+'</span></div><div class="row"><span class="row-label">平台</span><span class="row-value">'+r.platform+'</span></div><div class="row"><span class="row-label">主机名</span><span class="row-value">'+r.hostname+'</span></div><div class="row"><span class="row-label">CPU 核心</span><span class="row-value">'+r.cpus+'</span></div><div class="row"><span class="row-label">内存 RSS</span><span class="row-value">'+r.memory.rss+'</span></div><div class="row"><span class="row-label">堆内存</span><span class="row-value">'+r.memory.heapUsed+' / '+r.memory.heapTotal+'</span></div>';
  }catch(e){
    document.getElementById('status').innerHTML='<div class="error">无法连接服务端</div>';
  }
  try{
    const s=await fetch('/api/admin/stats').then(x=>x.json());
    document.getElementById('stats').innerHTML='<div class="stat"><div class="stat-label">总用户数</div><div class="stat-value c-rose">'+(s.totalUsers||0)+'</div></div><div class="stat"><div class="stat-label">已设密码</div><div class="stat-value">'+(s.usersWithPassword||0)+'</div></div><div class="stat"><div class="stat-label">已配对</div><div class="stat-value c-purple">'+(s.usersWithSpace||0)+'</div></div><div class="stat"><div class="stat-label">纪念日事件</div><div class="stat-value c-amber">'+(s.totalEvents||0)+'</div></div><div class="stat"><div class="stat-label">照片数</div><div class="stat-value c-rose">'+(s.totalImages||0)+'</div></div>';
  }catch(e){
    document.getElementById('stats').innerHTML='<div class="stat"><div class="stat-label">错误</div><div class="stat-value">无法加载</div></div>';
  }
  try{
    const users=await fetch('/api/dashboard/users').then(x=>x.json());
    if(Array.isArray(users)){
      let h='<table><thead><tr><th>用户</th><th>邮箱</th><th>角色</th><th>状态</th><th>空间</th><th>注册时间</th></tr></thead><tbody>';
      users.forEach(u=>{
        const initial=(u.name||u.username||u.email||'?')[0].toUpperCase();
        const date=new Date(u.createdAt).toLocaleDateString('zh-CN');
        h+='<tr><td><span class="user-avatar">'+initial+'</span>'+(u.name||u.username||'--')+'</td><td style="font-size:12px;color:var(--muted)">'+u.email+'</td><td><span class="role-badge '+(u.role==='admin'?'role-admin':'role-user')+'">'+(u.role==='admin'?'管理员':'用户')+'</span></td><td><span class="'+(u.disabled?'status-disabled':'status-active')+'">'+(u.disabled?'已禁用':'正常')+'</span></td><td>'+(u.spaceId?'已配对':'--')+'</td><td>'+date+'</td></tr>';
      });
      h+='</tbody></table>';
      document.getElementById('usertable').innerHTML=h;
    }else{
      document.getElementById('usertable').innerHTML='<div class="error">加载用户数据失败</div>';
    }
  }catch(e){
    document.getElementById('usertable').innerHTML='<div class="error">无法加载用户列表</div>';
  }
}
loadAll();
setInterval(loadAll,30000);
</script>
</body>
</html>`;
}
