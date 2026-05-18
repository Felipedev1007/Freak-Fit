import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Chrome, Github, Lock, Mail, User } from "lucide-react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";

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

export default function Cadastro() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function finish() {
    await checkUserAuth();
    navigate("/BoasVindas", { replace: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await appClient.auth.register(form);
      await finish();
    } catch (err) {
      setError(err.message || "Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocial(provider) {
    setError("");
    setLoading(true);
    try {
      await appClient.auth.loginWithProvider(provider);
      await finish();
    } catch (err) {
      setError(err.message || "Falha no cadastro social.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#05070a] px-5 py-6 text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,245,184,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
      <Link to="/" className="mx-auto flex max-w-6xl items-center gap-3">
        <img src="/LOGOTOURO-icon-64.png" alt="FreakFit AI" className="h-10 w-10 rounded-xl" />
        <span className="text-lg font-bold">FreakFit AI</span>
      </Link>
      <div className="mx-auto grid max-w-6xl gap-10 py-12 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mb-3 text-sm font-semibold text-[#00f5b8]">Nova conta</p>
          <h1 className="max-w-2xl text-4xl font-black leading-tight md:text-6xl">Crie seu perfil e receba um plano feito por IA.</h1>
          <p className="mt-5 max-w-xl text-sm leading-6 text-white/60">Treinos, dietas, análise de pratos e acompanhamento em um dashboard futurista, responsivo e personalizado.</p>
          <div className="mt-8 grid max-w-xl gap-3 sm:grid-cols-3">
            {["Dados seguros", "IA personalizada", "Comece grátis"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm font-semibold text-white/75">{item}</div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <h2 className="text-2xl font-black">Cadastro</h2>
          <p className="mt-1 text-sm text-white/50">Leva menos de um minuto.</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button onClick={() => handleSocial("google")} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:bg-white/[0.08]">
              <Chrome size={16} /> Google
            </button>
            <button onClick={() => handleSocial("github")} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-semibold transition hover:bg-white/[0.08]">
              <Github size={16} /> GitHub
            </button>
          </div>
          <div className="my-5 h-px bg-white/10" />
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field icon={User} placeholder="Nome completo" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Field icon={Mail} type="email" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Field icon={Lock} type="password" placeholder="Senha com 8+ caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00f5b8] py-3 text-sm font-black text-black transition hover:shadow-[0_0_32px_rgba(0,245,184,0.35)] disabled:opacity-60">
              {loading ? "Criando..." : "Criar conta"} <ArrowRight size={16} />
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-white/55">
            Já tem conta? <Link to="/Login" className="font-semibold text-[#00f5b8]">Entrar</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
