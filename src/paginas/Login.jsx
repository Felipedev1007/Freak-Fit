import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Mail, Lock, Chrome, ArrowRight } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";

function AuthShell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-[#05070a] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,245,184,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
      <div className="mx-auto grid min-h-screen max-w-6xl px-5 py-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <div className="flex flex-col">
          <Link to="/" className="mb-12 flex items-center gap-3">
            <img src="/LOGOTOURO-icon-64.png" alt="FreakFit AI" className="h-10 w-10 rounded-xl" />
            <span className="text-lg font-bold">FreakFit AI</span>
          </Link>
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="my-auto">
            <p className="mb-3 text-sm font-semibold text-[#00f5b8]">Acesso premium</p>
            <h1 className="max-w-xl text-4xl font-black leading-tight md:text-6xl">{title}</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/60">{subtitle}</p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex items-center justify-between text-sm">
                <span className="text-white/60">Plano inteligente</span>
                <span className="text-[#00f5b8]">Online</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {["Treino IA", "Dieta IA", "Foto IA"].map((item) => (
                  <div key={item} className="rounded-2xl bg-black/30 p-3 text-center text-xs font-semibold text-white/75">{item}</div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
        <div className="flex items-center justify-center py-8">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, ...props }) {
  return (
    <label className="relative block">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35" size={17} />
      <input
        {...props}
        className="w-full rounded-2xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#00f5b8]/60"
      />
    </label>
  );
}

function SocialButtons({ onSocial }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button onClick={() => onSocial("google")} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:bg-white/[0.08]">
        <Chrome size={16} /> Google
      </button>
      <button onClick={() => onSocial("github")} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:bg-white/[0.08]">
        <Github size={16} /> GitHub
      </button>
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { checkUserAuth, isAuthenticated, user, logout } = useAuth();
  const registeredEmail = location.state?.accountCreated ? location.state?.email || "" : "";
  const [form, setForm] = useState({ email: registeredEmail, password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const next = params.get("next") || "/Painel";

  async function finish(user) {
    await checkUserAuth();
    navigate(user ? next : "/Painel", { replace: true });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await appClient.auth.login(form);
      await finish(user);
    } catch (err) {
      setError(err.message || "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider) {
    setError("");
    setLoading(true);
    try {
      const user = await appClient.auth.loginWithProvider(provider);
      await finish(user);
    } catch (err) {
      setError(err.message || "Falha no login social.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Entre no seu centro de performance." subtitle="Acesse treinos, dietas, progresso e análise nutricional por imagem em um único dashboard.">
      <h2 className="text-2xl font-black">Login</h2>
      <p className="mt-1 text-sm text-white/50">
        Use e-mail e senha. Se ainda não tiver registro, crie sua conta pelo link abaixo.
      </p>
      {location.state?.accountCreated && (
        <p className="mt-5 rounded-2xl border border-[#00f5b8]/20 bg-[#00f5b8]/10 p-3 text-sm text-[#00f5b8]">
          Conta criada com sucesso. Entre com seu e-mail e senha para continuar.
        </p>
      )}
      {isAuthenticated && (
        <div className="mt-5 rounded-2xl border border-[#00f5b8]/20 bg-[#00f5b8]/10 p-4">
          <p className="text-sm font-semibold text-[#00f5b8]">Sessão ativa</p>
          <p className="mt-1 text-xs leading-5 text-white/60">
            Você está logado como {user?.full_name || user?.email}. Pode continuar para o painel ou sair para entrar com outra conta.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => navigate("/Painel")}
              className="rounded-xl bg-[#00f5b8] px-3 py-2 text-xs font-bold text-black"
            >
              Continuar
            </button>
            <button
              type="button"
              onClick={() => logout("/Login")}
              className="rounded-xl border border-white/15 px-3 py-2 text-xs font-bold text-white"
            >
              Sair
            </button>
          </div>
        </div>
      )}
      <div className="mt-6">
        <SocialButtons onSocial={handleSocial} />
      </div>
      <div className="my-5 h-px bg-white/10" />
      <form onSubmit={handleLogin} className="space-y-3">
        <Field icon={Mail} type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <Field icon={Lock} type="password" placeholder="Senha" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00f5b8] py-3 text-sm font-black text-black transition hover:shadow-[0_0_32px_rgba(0,245,184,0.35)] disabled:opacity-60">
          {loading ? "Entrando..." : "Entrar"} <ArrowRight size={16} />
        </button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm text-white/55">
        <Link to="/RecuperarSenha" className="hover:text-white">Esqueci minha senha</Link>
        <Link to="/Cadastro" className="font-semibold text-[#00f5b8]">Criar conta</Link>
      </div>
    </AuthShell>
  );
}
