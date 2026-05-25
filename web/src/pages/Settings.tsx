import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, setPassword, clearToken, createSpace, joinSpace, getSpaceInfo, leaveSpace, uploadAvatar, getNotificationConfig, updateNotificationConfig, triggerNotificationCheck, getNotificationLogs, testNotification, type User, type SpaceInfo, type NotificationConfig as NotifConfig, type NotificationLog } from "../api/client";
import { LogOut, Key, Shield, Heart, Copy, Link, LogIn, Camera, Bell, BellRing, Check, Send, Play } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Modal from "../components/Modal";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmModal from "../components/ConfirmModal";

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPasswordVal] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Space state
  const [space, setSpace] = useState<SpaceInfo | null>(null);
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [spaceError, setSpaceError] = useState("");

  // Avatar state
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm leave space
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifConfig, setNotifConfig] = useState<NotifConfig | null>(null);
  const [notifForm, setNotifForm] = useState<NotifConfig>({
    id: 0, userId: 0,
    emailEnabled: false, barkToken: "", barkEnabled: false,
    serverChanKey: "", serverChanEnabled: false,
    webhookUrl: "", webhookEnabled: false,
    dingTalkUrl: "", dingTalkEnabled: false,
    weComUrl: "", weComEnabled: false,
    notifyOnEvent: true, notifyOnPeriod: true, notifyOnAnniversary: true,
    advanceDays: 1, notifyTime: "08:00",
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState("");
  const [notifErr, setNotifErr] = useState("");
  const [notifChecking, setNotifChecking] = useState(false);
  const [notifLogs, setNotifLogs] = useState<NotificationLog[]>([]);
  const [notifShowLogs, setNotifShowLogs] = useState(false);

  const load = useCallback(async () => {
    try {
      const u = await getMe();
      setUser(u);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSpace = useCallback(async () => {
    try {
      const info = await getSpaceInfo();
      setSpace(info);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (user) loadSpace();
  }, [user, loadSpace]);

  async function handleSetPassword() {
    setError("");
    setSuccess("");

    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setError("两次密码不一致");
      return;
    }

    setSaving(true);
    try {
      await setPassword(password);
      setSuccess("密码设置成功");
      setPasswordVal("");
      setConfirmPassword("");
      setShowPassword(false);
      setUser((prev) => prev ? { ...prev, hasPassword: true } : null);
    } catch {
      setError("设置失败，请重试");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSpace() {
    setSpaceLoading(true);
    try {
      const result = await createSpace();
      setUser((prev) => prev ? { ...prev, spaceId: result.spaceId } : null);
      await loadSpace();
    } catch {
      // ignore
    } finally {
      setSpaceLoading(false);
    }
  }

  async function handleJoinSpace() {
    if (!inviteCode.trim()) {
      setSpaceError("请输入邀请码");
      return;
    }
    setSpaceLoading(true);
    setSpaceError("");
    try {
      await joinSpace(inviteCode.trim());
      setUser((prev) => prev ? { ...prev, spaceId: 0 } : null);
      setShowJoin(false);
      setInviteCode("");
      await loadSpace();
    } catch {
      setSpaceError("邀请码无效或空间已满");
    } finally {
      setSpaceLoading(false);
    }
  }

  async function handleLeaveSpace() {
    setSpaceLoading(true);
    try {
      await leaveSpace();
      setUser((prev) => prev ? { ...prev, spaceId: null } : null);
      setSpace(null);
    } catch {
      // ignore
    } finally {
      setSpaceLoading(false);
    }
  }

  async function handleCopyInviteCode() {
    if (space?.inviteCode) {
      await navigator.clipboard.writeText(space.inviteCode);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setError("头像文件不能超过 2MB");
      return;
    }

    setAvatarUploading(true);
    try {
      const result = await uploadAvatar(file);
      setUser((prev) => prev ? { ...prev, avatar: result.avatar } : null);
    } catch {
      setError("头像上传失败");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
  }

  // Notification handlers
  async function loadNotifConfig() {
    try {
      const config = await getNotificationConfig();
      setNotifConfig(config);
      setNotifForm({ ...config });
    } catch { /* ignore */ }
  }

  async function handleSaveNotif() {
    setNotifSaving(true);
    setNotifErr("");
    setNotifMsg("");
    try {
      const result = await updateNotificationConfig(notifForm);
      setNotifConfig(result);
      setNotifForm({ ...result });
      setNotifMsg("通知配置已保存");
    } catch {
      setNotifErr("保存失败");
    } finally {
      setNotifSaving(false);
    }
  }

  async function handleCheckNotif() {
    setNotifChecking(true);
    setNotifErr("");
    setNotifMsg("");
    try {
      const result = await triggerNotificationCheck();
      setNotifMsg(`检查完成，发送了 ${result.sent} 条通知`);
      if (result.sent > 0) {
        const logs = await getNotificationLogs();
        setNotifLogs(logs);
      }
    } catch {
      setNotifErr("检查失败");
    } finally {
      setNotifChecking(false);
    }
  }

  async function handleLoadNotifLogs() {
    try {
      const logs = await getNotificationLogs();
      setNotifLogs(logs);
      setNotifShowLogs(!notifShowLogs);
    } catch { /* ignore */ }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <div className="page-enter space-y-5">
      <h1
        className="text-2xl font-black text-knot-dark"
        style={{ fontFamily: "var(--font-display)" }}
      >
        设置
      </h1>

      {/* User Info */}
      <GlassCard>
        <div className="flex items-center gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="relative group flex-shrink-0"
            disabled={avatarUploading}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="头像"
                className="w-14 h-14 rounded-2xl object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-knot-rose-light flex items-center justify-center text-knot-rose text-lg font-bold">
                {(user?.name || user?.username || user?.email || "?")[0].toUpperCase()}
              </div>
            )}
            <div className="absolute inset-0 rounded-2xl bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            {avatarUploading && (
              <div className="absolute inset-0 rounded-2xl bg-white/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-knot-rose border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <div>
            <p className="font-semibold text-knot-dark">
              {user?.name || "未设置名字"}
            </p>
            <p className="text-xs text-knot-muted">{user?.email}</p>
          </div>
        </div>
      </GlassCard>

      {/* Partner Space */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-knot-rose" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-knot-dark">伴侣空间</p>
            {space ? (
              <p className="text-xs text-knot-muted">
                {space.partner
                  ? `与 ${space.partner.name || space.partner.email} 共享中`
                  : "等待伴侣加入"}
              </p>
            ) : (
              <p className="text-xs text-knot-muted">邀请伴侣共享数据</p>
            )}
          </div>
        </div>

        {space ? (
          <div className="space-y-2">
            {!space.partner && (
              <div className="flex items-center gap-2 bg-knot-rose/5 rounded-xl px-3 py-2">
                <span className="text-xs text-knot-muted">邀请码</span>
                <span className="text-sm font-mono font-bold text-knot-dark tracking-wider">
                  {space.inviteCode}
                </span>
                <button
                  onClick={handleCopyInviteCode}
                  className="ml-auto text-xs text-knot-rose font-semibold hover:underline flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  复制
                </button>
              </div>
            )}
            {space.partner && (
              <div className="flex items-center gap-3 bg-stone-50 rounded-xl px-3 py-2">
                <div className="flex items-center -space-x-2">
                  <div className="relative z-10 w-9 h-9 rounded-full ring-2 ring-white overflow-hidden flex-shrink-0">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-knot-rose-light flex items-center justify-center text-knot-rose text-xs font-bold">
                        {(user?.name || user?.username || "?")[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="w-9 h-9 rounded-full ring-2 ring-white overflow-hidden flex-shrink-0">
                    {space.partner.avatar ? (
                      <img
                        src={`/uploads/avatars/${space.partner.avatar}`}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-knot-rose-light flex items-center justify-center text-knot-rose text-xs font-bold">
                        {(space.partner.name || space.partner.email)[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-knot-dark">
                    {space.partner.name || "未设置名字"}
                  </p>
                  <p className="text-xs text-knot-muted">
                    {space.partner.email}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="text-xs text-red-400 hover:text-red-500 font-medium"
            >
              离开空间
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCreateSpace}
              disabled={spaceLoading}
              className="flex-1 py-2.5 bg-knot-rose text-white rounded-xl text-sm font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            >
              <Link className="w-4 h-4" />
              {spaceLoading ? "创建中..." : "创建空间"}
            </button>
            <button
              onClick={() => {
                setShowJoin(true);
                setSpaceError("");
                setInviteCode("");
              }}
              disabled={spaceLoading}
              className="flex-1 py-2.5 bg-stone-100 text-knot-dark rounded-xl text-sm font-semibold hover:bg-stone-200 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              加入空间
            </button>
          </div>
        )}
      </GlassCard>

      {/* Password */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-3">
          <Key className="w-5 h-5 text-knot-rose" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-knot-dark">登录密码</p>
            <p className="text-xs text-knot-muted">
              {user?.hasPassword
                ? "已设置，可使用密码登录"
                : "未设置，仅支持验证码登录"}
            </p>
          </div>
          <button
            onClick={() => setShowPassword(true)}
            className="text-xs text-knot-rose font-semibold hover:underline"
          >
            {user?.hasPassword ? "修改" : "设置"}
          </button>
        </div>
      </GlassCard>

      {/* Notification Settings */}
      <GlassCard className="space-y-0 p-0 overflow-hidden">
        <button
          onClick={() => {
            setNotifOpen(!notifOpen);
            if (!notifOpen) { loadNotifConfig(); }
          }}
          className="w-full p-5 flex items-center gap-3 hover:bg-stone-50/50 transition-colors"
        >
          <Bell className="w-5 h-5 text-knot-rose" />
          <div className="flex-1 text-left">
            <p className="font-semibold text-sm text-knot-dark">通知推送</p>
            <p className="text-xs text-knot-muted">
              {notifConfig ? "已配置" : "纪念日、经期、特殊日期推送"}
            </p>
          </div>
          <span className={`text-xs text-knot-muted transition-transform ${notifOpen ? "rotate-180" : ""}`}>
            ▼
          </span>
        </button>
        {notifOpen && (
          <div className="px-5 pb-5 space-y-4 border-t border-stone-50 pt-4">
            {/* Channels */}
            <p className="text-xs font-semibold text-knot-muted tracking-wide uppercase">推送渠道</p>

            {/* Email */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifForm.emailEnabled}
                  onChange={(e) => setNotifForm({ ...notifForm, emailEnabled: e.target.checked })}
                  className="w-4 h-4 rounded accent-knot-rose"
                />
                <span className="text-sm text-knot-dark font-medium">邮件通知</span>
              </label>
            </div>

            {/* Bark */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.barkEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, barkEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-knot-rose"
                  />
                  <span className="text-sm text-knot-dark font-medium">Bark (iOS 推送)</span>
                </label>
              </div>
              {notifForm.barkEnabled && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={notifForm.barkToken}
                    onChange={(e) => setNotifForm({ ...notifForm, barkToken: e.target.value })}
                    placeholder="https://api.day.app/你的设备Key"
                    className="flex-1 px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!notifForm.barkToken) return;
                      // Save first, then test
                      try {
                        await updateNotificationConfig(notifForm);
                        const result = await testNotification("bark");
                        setNotifMsg(result.message);
                      } catch {
                        setNotifErr("Bark 测试发送失败，请检查链接是否正确");
                      }
                    }}
                    className="px-3 py-2 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-900 transition-all flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    测试
                  </button>
                </div>
              )}
            </div>

            {/* ServerChan */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.serverChanEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, serverChanEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-knot-rose"
                  />
                  <span className="text-sm text-knot-dark font-medium">Server酱 (微信推送)</span>
                </label>
              </div>
              {notifForm.serverChanEnabled && (
                <input
                  type="text"
                  value={notifForm.serverChanKey}
                  onChange={(e) => setNotifForm({ ...notifForm, serverChanKey: e.target.value })}
                  placeholder="ServerChan SendKey"
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                />
              )}
            </div>

            {/* DingTalk */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.dingTalkEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, dingTalkEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-knot-rose"
                  />
                  <span className="text-sm text-knot-dark font-medium">钉钉机器人</span>
                </label>
              </div>
              {notifForm.dingTalkEnabled && (
                <input
                  type="text"
                  value={notifForm.dingTalkUrl}
                  onChange={(e) => setNotifForm({ ...notifForm, dingTalkUrl: e.target.value })}
                  placeholder="钉钉 Webhook URL"
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                />
              )}
            </div>

            {/* WeCom */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.weComEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, weComEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-knot-rose"
                  />
                  <span className="text-sm text-knot-dark font-medium">企业微信机器人</span>
                </label>
              </div>
              {notifForm.weComEnabled && (
                <input
                  type="text"
                  value={notifForm.weComUrl}
                  onChange={(e) => setNotifForm({ ...notifForm, weComUrl: e.target.value })}
                  placeholder="企业微信 Webhook URL"
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                />
              )}
            </div>

            {/* Webhook */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifForm.webhookEnabled}
                    onChange={(e) => setNotifForm({ ...notifForm, webhookEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-knot-rose"
                  />
                  <span className="text-sm text-knot-dark font-medium">自定义推送 (Webhook)</span>
                </label>
              </div>
              {notifForm.webhookEnabled && (
                <input
                  type="text"
                  value={notifForm.webhookUrl}
                  onChange={(e) => setNotifForm({ ...notifForm, webhookUrl: e.target.value })}
                  placeholder="https://your-webhook-url"
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                />
              )}
            </div>

            <hr className="border-stone-100" />

            {/* Event type toggles */}
            <p className="text-xs font-semibold text-knot-muted tracking-wide uppercase">通知内容</p>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifForm.notifyOnEvent}
                  onChange={(e) => setNotifForm({ ...notifForm, notifyOnEvent: e.target.checked })}
                  className="w-4 h-4 rounded accent-knot-rose"
                />
                <span className="text-sm text-knot-dark">特殊日子 / 纪念日事件</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifForm.notifyOnPeriod}
                  onChange={(e) => setNotifForm({ ...notifForm, notifyOnPeriod: e.target.checked })}
                  className="w-4 h-4 rounded accent-knot-rose"
                />
                <span className="text-sm text-knot-dark">经期预测</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifForm.notifyOnAnniversary}
                  onChange={(e) => setNotifForm({ ...notifForm, notifyOnAnniversary: e.target.checked })}
                  className="w-4 h-4 rounded accent-knot-rose"
                />
                <span className="text-sm text-knot-dark">周年纪念日</span>
              </label>
            </div>

            <hr className="border-stone-100" />

            {/* Timing */}
            <p className="text-xs font-semibold text-knot-muted tracking-wide uppercase">推送时间</p>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <span className="text-xs text-knot-muted block mb-1">提前天数</span>
                <select
                  value={notifForm.advanceDays}
                  onChange={(e) => setNotifForm({ ...notifForm, advanceDays: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                >
                  {[1, 2, 3, 5, 7].map((d) => (
                    <option key={d} value={d}>{d} 天前</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <span className="text-xs text-knot-muted block mb-1">定时时间</span>
                <input
                  type="time"
                  value={notifForm.notifyTime}
                  onChange={(e) => setNotifForm({ ...notifForm, notifyTime: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 rounded-lg border border-stone-100 text-sm text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40"
                />
              </div>
            </div>

            {notifMsg && <p className="text-green-500 text-xs font-medium">{notifMsg}</p>}
            {notifErr && <p className="text-red-400 text-xs font-medium">{notifErr}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveNotif}
                disabled={notifSaving}
                className="flex-1 py-2.5 bg-knot-rose text-white rounded-xl text-sm font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                {notifSaving ? "保存中..." : "保存配置"}
              </button>
              <button
                onClick={handleCheckNotif}
                disabled={notifChecking}
                className="px-4 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-semibold hover:bg-stone-900 disabled:opacity-40 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                {notifChecking ? "检查中..." : "手动检查"}
              </button>
            </div>

            {/* Recent logs */}
            <button
              onClick={handleLoadNotifLogs}
              className="text-xs text-knot-rose font-medium hover:underline"
            >
              {notifShowLogs ? "收起通知记录" : "查看最近通知记录"}
            </button>
            {notifShowLogs && notifLogs.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {notifLogs.map((log) => (
                  <div key={log.id} className="text-xs text-knot-muted bg-stone-50 rounded-lg px-3 py-2">
                    <p className="font-medium text-knot-dark truncate">{log.title}</p>
                    <p className="truncate">{new Date(log.createdAt).toLocaleString("zh-CN")}</p>
                  </div>
                ))}
              </div>
            )}
            {notifShowLogs && notifLogs.length === 0 && (
              <p className="text-xs text-knot-muted">暂无通知记录</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* Admin */}
      {user?.role === "admin" && (
        <GlassCard>
          <button
            onClick={() => navigate("/admin")}
            className="w-full flex items-center gap-3 text-knot-dark hover:text-knot-rose transition-colors"
          >
            <Shield className="w-5 h-5 text-knot-rose" />
            <span className="font-semibold text-sm">管理面板</span>
          </button>
        </GlassCard>
      )}

      {/* Logout */}
      <GlassCard>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 text-red-400 hover:text-red-500 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold text-sm">退出登录</span>
        </button>
      </GlassCard>

      <p className="text-center text-stone-300 text-xs pt-8">
        MyKnot · 属于我们的时光
      </p>

      {/* Password Modal */}
      <Modal
        open={showPassword}
        onClose={() => {
          setShowPassword(false);
          setError("");
          setSuccess("");
        }}
        title={user?.hasPassword ? "修改密码" : "设置密码"}
      >
        <div className="space-y-4">
          {success ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">✓</div>
              <p className="text-knot-dark font-semibold">{success}</p>
              <button
                onClick={() => {
                  setShowPassword(false);
                  setSuccess("");
                }}
                className="mt-4 px-6 py-2 bg-knot-rose text-white rounded-full text-sm font-semibold"
              >
                完成
              </button>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  新密码
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPasswordVal(e.target.value)}
                  placeholder="至少 6 位"
                  className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                  autoFocus
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  确认密码
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="再次输入密码"
                  className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              {error && (
                <p className="text-red-400 text-xs font-medium">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowPassword(false);
                    setError("");
                  }}
                  className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSetPassword}
                  disabled={saving || !password}
                  className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all active:scale-[0.98]"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Leave Space Confirm */}
      <ConfirmModal
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={async () => {
          setShowLeaveConfirm(false);
          await handleLeaveSpace();
        }}
        title="离开空间"
        message="确定要离开伴侣空间吗？离开后将无法查看对方的经期数据、事件和日程。"
        confirmText="离开"
        danger
      />

      {/* Join Space Modal */}
      <Modal
        open={showJoin}
        onClose={() => {
          setShowJoin(false);
          setSpaceError("");
        }}
        title="加入伴侣空间"
      >
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-knot-dark">邀请码</span>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="输入 8 位邀请码"
              maxLength={8}
              className="mt-1.5 w-full px-4 py-3 bg-stone-50 rounded-xl border border-stone-100 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all font-mono tracking-wider text-center"
              autoFocus
            />
          </label>

          {spaceError && (
            <p className="text-red-400 text-xs font-medium">{spaceError}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowJoin(false);
                setSpaceError("");
              }}
              className="flex-1 py-3 bg-stone-100 text-knot-muted rounded-xl font-semibold hover:bg-stone-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleJoinSpace}
              disabled={spaceLoading || inviteCode.length < 8}
              className="flex-1 py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all active:scale-[0.98]"
            >
              {spaceLoading ? "加入中..." : "加入"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
