import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
  Eye,
  EyeOff,
  HelpCircle,
  HeadphonesIcon,
  LogIn,
  Lock,
  User,
  Package,
  MapPin,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

const FEATURES = [
  { icon: Package, label: "Manajemen distribusi LPG end-to-end" },
  { icon: MapPin, label: "Monitoring armada & rute real-time" },
  { icon: TrendingUp, label: "Laporan & analitik bisnis terpadu" },
  { icon: ShieldCheck, label: "Keamanan data berlapis, standar enterprise" },
];

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(`Email atau kata sandi tidak valid. Silakan coba lagi.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-container-lowest">
      {/* ── LEFT HERO PANEL ── */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden flex-col justify-between p-12"
        style={{
          background:
            "linear-gradient(150deg, #002f5e 0%, #004d99 45%, #1565c0 100%)",
        }}
      >
        {/* Dot grid texture */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Decorative concentric rings — bottom-right */}
        <div className="absolute -bottom-40 -right-40 w-[560px] h-[560px] rounded-full border border-white/[0.07] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[380px] h-[380px] rounded-full border border-white/[0.10] pointer-events-none" />
        <div className="absolute -bottom-4  -right-4  w-[220px] h-[220px] rounded-full border border-white/[0.13] pointer-events-none" />
        {/* Glow blob */}
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full opacity-20 pointer-events-none"
          style={{
            background: "radial-gradient(circle, #60a5fa 0%, transparent 70%)",
            transform: "translate(30%, -30%)",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="text-white text-2xl font-extrabold tracking-tighter">
            SiDistrib
          </div>
          <div className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase mt-0.5">
            Logistik Indonesia
          </div>
        </div>

        {/* Main copy + features */}
        <div className="relative z-10 space-y-10">
          <div>
            <h2 className="text-white text-[2.4rem] font-extrabold leading-[1.15] tracking-tight mb-4">
              Kelola Distribusi
              <br />
              Lebih Cerdas
            </h2>
            <p className="text-white/60 text-[0.95rem] leading-relaxed max-w-xs">
              Platform manajemen distribusi LPG terpadu untuk jaringan logistik
              Indonesia yang lebih efisien dan terukur.
            </p>
          </div>

          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3.5">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <Icon size={15} className="text-white" />
                </div>
                <span className="text-white/75 text-sm font-medium">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="relative z-10 flex items-center gap-1.5 text-white/30 text-xs">
          <ShieldCheck size={12} />
          <span>
            © 2024 SiDistrib · Kebijakan Privasi · Syarat &amp; Ketentuan
          </span>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-surface-container-lowest">
        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-10">
          <div className="text-2xl font-extrabold tracking-tighter text-sid-primary">
            SiDistrib
          </div>
          <div className="text-on-surface-variant text-[10px] font-bold tracking-[0.2em] uppercase mt-1">
            Logistik Indonesia
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-[1.65rem] font-bold text-on-surface tracking-tight leading-tight mb-2">
              Selamat Datang Kembali
            </h1>
            <p className="text-on-surface-variant text-sm">
              Masuk ke akun SiDistrib Anda untuk melanjutkan.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant"
              >
                Email / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <User size={16} />
                </div>
                <input
                  id="email"
                  type="email"
                  placeholder="Masukkan email atau username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full pl-10 pr-4 py-3 bg-surface-container-highest border border-outline-variant/50 focus:border-sid-primary focus:ring-2 focus:ring-sid-primary/10 focus:outline-none transition-all text-sm text-on-surface placeholder:text-outline rounded-lg"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant"
              >
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
                  <Lock size={16} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan kata sandi"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full pl-10 pr-10 py-3 bg-surface-container-highest border border-outline-variant/50 focus:border-sid-primary focus:ring-2 focus:ring-sid-primary/10 focus:outline-none transition-all text-sm text-on-surface placeholder:text-outline rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-outline hover:text-sid-primary transition-colors"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Remember me + forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer gap-2 group">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-outline-variant text-sid-primary focus:ring-sid-primary/20"
                />
                <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                  Ingat Saya
                </span>
              </label>
              <a
                href="#"
                className="text-sm font-semibold text-sid-primary hover:underline transition-colors"
              >
                Lupa Password?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 text-sm text-sid-error bg-red-50 border border-red-100 px-4 py-3 rounded-lg">
                <span className="flex-shrink-0 font-bold mt-px">!</span>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-lg font-bold tracking-wide text-white text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-[0_8px_28px_rgba(0,77,153,0.30)] hover:scale-[1.015] active:scale-[0.985] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: "linear-gradient(135deg, #004d99 0%, #1565c0 100%)",
              }}
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  MASUK KE DASHBOARD
                  <LogIn size={16} />
                </>
              )}
            </button>
          </form>

          {/* Help links */}
          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <a
              href="#"
              className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-sid-primary transition-colors"
            >
              <HelpCircle size={13} /> Bantuan
            </a>
            <span className="text-outline-variant text-xs">·</span>
            <a
              href="#"
              className="flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-sid-primary transition-colors"
            >
              <HeadphonesIcon size={13} /> Kontak Admin
            </a>
            <span className="text-outline-variant text-xs">·</span>
            <a
              href="#"
              className="text-xs text-on-surface-variant hover:text-sid-primary transition-colors"
            >
              Privasi
            </a>
            <span className="text-outline-variant text-xs">·</span>
            <a
              href="#"
              className="text-xs text-on-surface-variant hover:text-sid-primary transition-colors"
            >
              Syarat &amp; Ketentuan
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
