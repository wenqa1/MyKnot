import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMe, setPassword, clearToken, type User } from "../api/client";
import { LogOut, Key, Shield } from "lucide-react";
import GlassCard from "../components/GlassCard";
import Modal from "../components/Modal";
import LoadingSpinner from "../components/LoadingSpinner";

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

  useEffect(() => {
    load();
  }, [load]);

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

  function handleLogout() {
    clearToken();
    navigate("/login", { replace: true });
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
          <div className="w-12 h-12 rounded-2xl bg-knot-rose-light flex items-center justify-center text-knot-rose text-lg font-bold">
            {(user?.name || user?.email || "?")[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-knot-dark">
              {user?.name || "未设置名字"}
            </p>
            <p className="text-xs text-knot-muted">{user?.email}</p>
          </div>
        </div>
      </GlassCard>

      {/* Password */}
      <GlassCard className="space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-knot-rose" />
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
        Knot · 属于我们的时光
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
    </div>
  );
}
