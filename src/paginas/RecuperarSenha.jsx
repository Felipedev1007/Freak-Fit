import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Lock, Mail } from "lucide-react";
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

export default function RecuperarSenha() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [step, setStep] = useState("email");
  const [form, setForm] = useState({ email: "", code: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestReset(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await appClient.auth.requestPasswordReset(form.email);
      setMessage(`Código de recuperação: ${result.reset_code}`);
      setStep("reset");
    } catch (err) {
      setError(err.message || "Não foi possível enviar o código.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await appClient.auth.resetPassword(form);
      await checkUserAuth();
      navigate("/Painel", { replace: true });
    } catch (err) {
      setError(err.message || "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070a] px-5 py-8 text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,245,184,0.14),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_30%)]" />
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.055] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <img src="/LOGOTOURO-icon-64.png" alt="FreakFit AI" className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-bold">FreakFit AI</span>
        </Link>
        <h1 className="text-2xl font-black">Recuperar senha</h1>
        <p className="mt-1 text-sm text-white/50">Receba um código local para redefinir o acesso.</p>

        {step === "email" ? (
          <form onSubmit={requestReset} className="mt-6 space-y-3">
            <Field icon={Mail} type="email" placeholder="Seu e-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00f5b8] py-3 text-sm font-black text-black transition disabled:opacity-60">
              {loading ? "Gerando..." : "Gerar código"} <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword} className="mt-6 space-y-3">
            {message && <p className="rounded-2xl border border-[#00f5b8]/20 bg-[#00f5b8]/10 p-3 text-sm text-[#00f5b8]">{message}</p>}
            <Field icon={KeyRound} placeholder="Código de recuperação" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <Field icon={Lock} type="password" placeholder="Nova senha com 8+ caracteres" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            {error && <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#00f5b8] py-3 text-sm font-black text-black transition disabled:opacity-60">
              {loading ? "Salvando..." : "Redefinir senha"} <ArrowRight size={16} />
            </button>
          </form>
        )}
        <p className="mt-5 text-center text-sm text-white/55">
          Lembrou a senha? <Link to="/Login" className="font-semibold text-[#00f5b8]">Entrar</Link>
        </p>
      </motion.div>
    </div>
  );
}
