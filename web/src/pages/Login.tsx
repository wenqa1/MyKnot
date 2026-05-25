import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { sendCode, register, login, getToken } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");

  // Login fields
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCode, setRegCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);

  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getToken()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function resetForm() {
    setError("");
    setAccount("");
    setPassword("");
    setRegUsername("");
    setRegPassword("");
    setRegEmail("");
    setRegCode("");
    setCodeSent(false);
  }

  async function handleSendCode() {
    setError("");
    if (!isValidEmail(regEmail)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    try {
      await sendCode(regEmail);
      setCodeSent(true);
      setCountdown(60);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "发送失败";
      if (msg.includes("429")) {
        setError("请等待 60 秒后再请求");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!account || !password) {
      setError("请输入账号和密码");
      return;
    }

    setLoading(true);
    try {
      const { user } = await login(account, password);
      navigate("/", { replace: true });
    } catch {
      setError("账号或密码错误");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!regUsername || regUsername.length < 3) {
      setError("账号至少 3 个字符");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(regUsername)) {
      setError("账号只能包含字母、数字和下划线");
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    if (!isValidEmail(regEmail)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (!regCode || regCode.length !== 6) {
      setError("请输入 6 位验证码");
      return;
    }

    setLoading(true);
    try {
      const { user } = await register(regUsername, regPassword, regEmail, regCode);
      navigate("/", { replace: true });
    } catch {
      setError("注册失败，请检查信息或验证码是否正确");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="bg-blobs">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-knot-rose/10 text-knot-rose mb-3">
            <Heart className="w-8 h-8" fill="currentColor" />
          </div>
          <h1
            className="text-4xl font-black text-knot-dark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            MyKnot
          </h1>
          <p className="text-knot-muted text-sm mt-2">属于我们的时光</p>
        </div>

        {/* Mode tabs */}
        <div className="flex bg-stone-100 rounded-xl p-1 mb-4 animate-fade-in-up">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              resetForm();
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "login"
                ? "bg-white text-knot-dark shadow-sm"
                : "text-knot-muted"
            }`}
          >
            登录
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              resetForm();
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              mode === "register"
                ? "bg-white text-knot-dark shadow-sm"
                : "text-knot-muted"
            }`}
          >
            注册
          </button>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="animate-fade-in-up">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  账号
                </span>
                <input
                  type="text"
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="用户名或邮箱"
                  autoFocus
                  autoComplete="username"
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  密码
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  autoComplete="current-password"
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              {error && (
                <p className="text-red-400 text-xs font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !account || !password}
                className="w-full py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? "登录中..." : "登录"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="animate-fade-in-up">
            <div className="glass-card rounded-3xl p-6 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  账号
                </span>
                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="3-20个字符"
                  autoFocus
                  autoComplete="username"
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  密码
                </span>
                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="至少 6 位"
                  autoComplete="new-password"
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  邮箱
                </span>
                <div className="flex gap-2 mt-1.5">
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={loading || countdown > 0 || !isValidEmail(regEmail)}
                    className="px-4 py-3 bg-knot-rose text-white rounded-xl text-sm font-semibold hover:bg-rose-500 disabled:opacity-40 transition-all whitespace-nowrap"
                  >
                    {countdown > 0 ? `${countdown}s` : "发送验证码"}
                  </button>
                </div>
              </label>

              {codeSent && (
                <label className="block">
                  <span className="text-sm font-medium text-knot-dark">
                    验证码
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={regCode}
                    onChange={(e) =>
                      setRegCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="6 位验证码"
                    className="mt-1.5 w-full px-4 py-3 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-white/40 dark:border-slate-700/40 text-knot-dark dark:text-slate-200 placeholder:text-stone-300 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all tracking-widest text-center text-lg"
                  />
                </label>
              )}

              {error && (
                <p className="text-red-400 text-xs font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={
                  loading ||
                  !regUsername ||
                  !regPassword ||
                  !regEmail ||
                  !regCode
                }
                className="w-full py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? "注册中..." : "注册"}
              </button>
            </div>
          </form>
        )}

        <p className="text-center text-stone-300 dark:text-slate-500 text-xs mt-6 animate-fade-in">
          注册即表示同意服务条款
        </p>
      </div>
    </div>
  );
}
