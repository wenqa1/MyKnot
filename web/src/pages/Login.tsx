import { useState, useRef, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";
import { sendCode, verifyCode, loginWithPassword, getToken } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [step, setStep] = useState<"email" | "code">("email");
  const [loginMode, setLoginMode] = useState<"code" | "password">("code");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect if already logged in
  useEffect(() => {
    if (getToken()) {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  async function handleSendCode(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setLoading(true);
    try {
      await sendCode(email);
      setStep("code");
      setCountdown(60);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "发送失败，请稍后重试";
      if (msg.includes("429")) {
        setError("请等待 60 秒后再请求");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }
    if (!password) {
      setError("请输入密码");
      return;
    }

    setLoading(true);
    try {
      await loginWithPassword(email, password);
      navigate("/", { replace: true });
    } catch {
      setError("密码错误或账号未设置密码");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5) {
      const fullCode = newCode.join("") + value;
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(codeStr?: string) {
    const fullCode = codeStr || code.join("");
    if (fullCode.length !== 6) return;

    setLoading(true);
    setError("");
    try {
      await verifyCode(email, fullCode);
      navigate("/", { replace: true });
    } catch {
      setError("验证码错误或已过期");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleCodeSubmit(e: FormEvent) {
    e.preventDefault();
    handleVerify();
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background */}
      <div className="bg-blobs">
        <div className="bg-blob bg-blob-1" />
        <div className="bg-blob bg-blob-2" />
        <div className="bg-blob bg-blob-3" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-knot-rose/10 text-knot-rose mb-3">
            <Heart className="w-8 h-8" fill="currentColor" />
          </div>
          <h1
            className="text-4xl font-black text-knot-dark"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Knot
          </h1>
          <p className="text-knot-muted text-sm mt-2">属于我们的时光</p>
        </div>

        {step === "email" ? (
          <form
            onSubmit={
              loginMode === "password" ? handlePasswordLogin : handleSendCode
            }
            className="animate-fade-in-up"
          >
            <div className="glass-card rounded-3xl p-6 space-y-4">
              {/* Mode toggle */}
              <div className="flex bg-stone-100 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("code");
                    setError("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    loginMode === "code"
                      ? "bg-white text-knot-dark shadow-sm"
                      : "text-knot-muted"
                  }`}
                >
                  验证码登录
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMode("password");
                    setError("");
                  }}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                    loginMode === "password"
                      ? "bg-white text-knot-dark shadow-sm"
                      : "text-knot-muted"
                  }`}
                >
                  密码登录
                </button>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-knot-dark">
                  邮箱地址
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  autoFocus
                  className="mt-1.5 w-full px-4 py-3 bg-white/60 rounded-xl border border-white/40 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                />
              </label>

              {loginMode === "password" && (
                <label className="block">
                  <span className="text-sm font-medium text-knot-dark">
                    密码
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="输入密码"
                    className="mt-1.5 w-full px-4 py-3 bg-white/60 rounded-xl border border-white/40 text-knot-dark placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
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
                  !isValidEmail(email) ||
                  (loginMode === "password" && !password)
                }
                className="w-full py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading
                  ? loginMode === "password"
                    ? "登录中..."
                    : "发送中..."
                  : loginMode === "password"
                    ? "登录"
                    : "发送验证码"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCodeSubmit} className="animate-fade-in-up">
            <div className="glass-card rounded-3xl p-6 space-y-5">
              <div className="text-center">
                <p className="text-sm text-knot-muted">
                  验证码已发送至
                </p>
                <p className="text-knot-dark font-medium mt-0.5">{email}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="text-xs text-knot-rose mt-1 hover:underline"
                >
                  修改邮箱
                </button>
              </div>

              {/* Code inputs */}
              <div className="flex justify-center gap-2">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="w-11 h-14 text-center text-xl font-bold bg-white/60 rounded-xl border border-white/40 text-knot-dark focus:outline-none focus:ring-2 focus:ring-knot-rose/40 transition-all"
                  />
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-xs font-medium text-center">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.some((d) => !d)}
                className="w-full py-3 bg-knot-rose text-white rounded-xl font-semibold hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? "验证中..." : "验证"}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  disabled={countdown > 0}
                  onClick={() => {
                    setCode(["", "", "", "", "", ""]);
                    handleSendCode(
                      new Event("submit") as unknown as FormEvent
                    );
                  }}
                  className="text-xs text-knot-muted hover:text-knot-rose disabled:opacity-40 transition-colors"
                >
                  {countdown > 0
                    ? `${countdown}s 后重新发送`
                    : "重新发送验证码"}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-stone-300 text-xs mt-8 animate-fade-in">
          首次登录自动创建账号
        </p>
      </div>
    </div>
  );
}
