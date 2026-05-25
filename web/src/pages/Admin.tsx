import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, getAdminUsers, getAdminStats, updateAdminUser, getSmtpConfig, updateSmtpConfig, testSmtp, clearToken, type User, type AdminUser, type AdminStats, type SmtpConfig } from "../api/client";
import { Shield, ArrowLeft, LogOut, Users, Key, Link, Image, CalendarDays, Mail, Save, Send } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner";

export default function Admin() {
  const navigate = useNavigate();
  const [me, setMe] = useState<User | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  // SMTP state
  const [smtp, setSmtp] = useState<SmtpConfig | null>(null);
  const [smtpForm, setSmtpForm] = useState<SmtpConfig>({
    id: 0, host: "", port: 587, user: "", pass: "",
    fromEmail: "", fromName: "MyKnot", secure: false,
  });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpMsg, setSmtpMsg] = useState("");
  const [smtpErr, setSmtpErr] = useState("");
  const [showSmtp, setShowSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [showTestInput, setShowTestInput] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await getMe();
      setMe(u);
      if (u.role !== "admin") return;
      const [usersData, statsData, smtpData] = await Promise.all([
        getAdminUsers(),
        getAdminStats(),
        getSmtpConfig().catch(() => null),
      ]);
      setUsers(usersData);
      setStats(statsData);
      if (smtpData) {
        setSmtp(smtpData);
        setSmtpForm(smtpData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSaveSmtp() {
    setSmtpSaving(true);
    setSmtpErr("");
    setSmtpMsg("");
    try {
      const result = await updateSmtpConfig(smtpForm);
      setSmtp(result);
      setSmtpForm(result);
      setSmtpMsg("SMTP 配置已保存");
    } catch {
      setSmtpErr("保存失败");
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleTestSmtp() {
    setTesting(true);
    setSmtpErr("");
    setSmtpMsg("");
    try {
      await testSmtp(testEmail);
      setSmtpMsg(`测试邮件已发送至 ${testEmail}`);
      setShowTestInput(false);
      setTestEmail("");
    } catch {
      setSmtpErr("发送失败，请检查 SMTP 配置");
    } finally {
      setTesting(false);
    }
  }

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggleRole(user: AdminUser) {
    const newRole = user.role === "admin" ? "user" : "admin";
    await updateAdminUser(user.id, { role: newRole });
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
    );
  }

  async function handleToggleDisabled(user: AdminUser) {
    await updateAdminUser(user.id, { disabled: !user.disabled });
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, disabled: !u.disabled } : u
      )
    );
  }

  if (loading) return <LoadingSpinner />;

  if (!me || me.role !== "admin") {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <Shield className="w-16 h-16 text-stone-300 dark:text-slate-500 mb-4" />
        <h1 className="text-xl font-bold text-knot-dark mb-2">无访问权限</h1>
        <p className="text-knot-muted text-sm mb-6">需要管理员权限</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 bg-knot-rose text-white rounded-xl font-semibold"
        >
          返回主页
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-stone-50 dark:bg-slate-800">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-stone-100 dark:border-slate-700 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/settings")}
            className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-slate-700 flex items-center justify-center text-knot-muted hover:bg-stone-200 dark:hover:bg-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Shield className="w-5 h-5 text-knot-rose" />
          <h1 className="text-lg font-bold text-knot-dark flex-1">管理面板</h1>
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-slate-700 flex items-center justify-center text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-5">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users} label="总用户" value={stats.totalUsers} />
            <StatCard icon={Key} label="已设密码" value={stats.usersWithPassword} />
            <StatCard icon={Link} label="已配对" value={stats.usersWithSpace} />
            <StatCard icon={CalendarDays} label="事件数" value={stats.totalEvents} />
            <StatCard icon={Image} label="照片数" value={stats.totalImages} />
          </div>
        )}

        {/* SMTP Configuration */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-stone-100 dark:border-slate-700 overflow-hidden">
          <button
            onClick={() => setShowSmtp(!showSmtp)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-stone-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Mail className="w-5 h-5 text-knot-rose" />
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-knot-dark">SMTP 邮件配置</p>
              <p className="text-xs text-knot-muted">
                {smtp?.host ? `${smtp.host}:${smtp.port}` : "未配置"}
              </p>
            </div>
            <span className={`text-xs text-knot-muted transition-transform ${showSmtp ? "rotate-180" : ""}`}>
              ▼
            </span>
          </button>
          {showSmtp && (
            <div className="px-4 py-4 border-t border-stone-50 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <label className="col-span-2 block">
                  <span className="text-xs font-medium text-knot-dark">Host</span>
                  <input
                    type="text"
                    value={smtpForm.host}
                    onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                    placeholder="smtp.example.com"
                    className="mt-1 w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-knot-dark">Port</span>
                  <input
                    type="number"
                    value={smtpForm.port}
                    onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 587 })}
                    className="mt-1 w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-medium text-knot-dark">User</span>
                  <input
                    type="text"
                    value={smtpForm.user}
                    onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                    placeholder="user@example.com"
                    className="mt-1 w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-knot-dark">Password</span>
                  <input
                    type="password"
                    value={smtpForm.pass}
                    onChange={(e) => setSmtpForm({ ...smtpForm, pass: e.target.value })}
                    placeholder="授权码"
                    className="mt-1 w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-medium text-knot-dark">From Email</span>
                  <input
                    type="email"
                    value={smtpForm.fromEmail}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                    placeholder="noreply@example.com"
                    className="mt-1 w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-knot-dark">From Name</span>
                  <input
                    type="text"
                    value={smtpForm.fromName}
                    onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                    placeholder="MyKnot"
                    className="mt-1 w-full px-3 py-2 bg-stone-50 dark:bg-slate-800 rounded-lg border border-stone-100 dark:border-slate-700 text-sm text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                </label>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={smtpForm.secure}
                  onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                  className="w-4 h-4 rounded accent-knot-rose"
                />
                <span className="text-xs font-medium text-knot-dark">使用 SSL/TLS (Secure)</span>
              </label>

              {smtpMsg && <p className="text-green-500 text-xs font-medium">{smtpMsg}</p>}
              {smtpErr && <p className="text-red-400 text-xs font-medium">{smtpErr}</p>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSaveSmtp}
                  disabled={smtpSaving}
                  className="flex-1 py-2.5 bg-knot-rose text-white rounded-xl text-sm font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {smtpSaving ? "保存中..." : "保存配置"}
                </button>
                {showTestInput ? (
                  <div className="flex-[2] flex gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="测试邮箱地址"
                      className="flex-1 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                      autoFocus
                    />
                    <button
                      onClick={handleTestSmtp}
                      disabled={testing || !testEmail}
                      className="px-4 py-2 bg-stone-800 dark:bg-slate-700 text-white rounded-lg text-sm font-semibold hover:bg-stone-900 dark:hover:bg-slate-500 disabled:opacity-40 transition-all whitespace-nowrap"
                    >
                      {testing ? "..." : "发送"}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setShowTestInput(true);
                      setSmtpErr("");
                      setSmtpMsg("");
                    }}
                    className="flex-1 py-2.5 bg-stone-800 dark:bg-slate-700 text-white rounded-xl text-sm font-semibold hover:bg-stone-900 dark:hover:bg-slate-500 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    测试邮件
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User List */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-stone-100 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-50">
            <p className="text-sm font-semibold text-knot-dark">
              用户列表 ({users.length})
            </p>
          </div>
          <div className="divide-y divide-stone-50 dark:divide-slate-700">
            {users.map((user) => (
              <div key={user.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-knot-dark truncate">
                        {user.name || user.username || user.email}
                      </span>
                      {user.role === "admin" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-knot-rose/10 text-knot-rose font-semibold">
                          管理员
                        </span>
                      )}
                      {user.disabled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-500 font-semibold">
                          已禁用
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-knot-muted mt-0.5">
                      {user.username ? `@${user.username} · ` : ""}{user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => handleToggleRole(user)}
                      className="text-xs px-2 py-1 rounded-lg bg-stone-100 text-knot-muted hover:bg-stone-200 transition-colors"
                    >
                      {user.role === "admin" ? "降级" : "升权"}
                    </button>
                    <button
                      onClick={() => handleToggleDisabled(user)}
                      className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                        user.disabled
                          ? "bg-green-50 text-green-500 hover:bg-green-100"
                          : "bg-red-50 text-red-400 hover:bg-red-100"
                      }`}
                    >
                      {user.disabled ? "启用" : "禁用"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-stone-100 dark:border-slate-700 p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-knot-rose/10 flex items-center justify-center text-knot-rose">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-knot-dark">{value}</p>
        <p className="text-xs text-knot-muted">{label}</p>
      </div>
    </div>
  );
}
