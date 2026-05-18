import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, BrainCircuit, Camera, Check, ChevronRight, Dumbbell, Github,
  LineChart, ScanLine, ShieldCheck, Sparkles, Star, Target, Utensils, Zap
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 }
};

const features = [
  { icon: Dumbbell, title: "Treinos com IA", text: "Planos adaptados ao seu nível, rotina, equipamentos e objetivo físico." },
  { icon: Utensils, title: "Dietas personalizadas", text: "Refeições, calorias e macros calculados com base no seu perfil real." },
  { icon: Target, title: "Macros inteligentes", text: "Ajustes automáticos de proteínas, carboidratos e gorduras por dia." },
  { icon: Camera, title: "Análise por foto", text: "Envie uma foto do prato e receba estimativas nutricionais instantâneas." },
  { icon: LineChart, title: "Evolução corporal", text: "Acompanhe peso, medidas, metas e histórico em uma visão premium." },
  { icon: BrainCircuit, title: "Recomendações diárias", text: "Insights práticos para treinar melhor, comer melhor e evoluir sempre." },
];

const steps = [
  "Informe peso, altura, idade, rotina e objetivo.",
  "A IA cria treino e dieta sob medida em segundos.",
  "Envie fotos das refeições para análise nutricional.",
  "Acompanhe progresso, metas e ajustes contínuos.",
];

const testimonials = [
  { name: "Marina A.", role: "Atleta amadora", text: "A análise por foto virou meu atalho favorito. Consigo controlar os macros sem planilha." },
  { name: "Lucas M.", role: "Hipertrofia", text: "O treino ficou muito mais coerente com minha rotina. Parece consultoria premium no bolso." },
  { name: "Rafa C.", role: "Emagrecimento", text: "Perdi o medo da dieta. O app mostra o que fazer e acompanha a evolução sem complicar." },
];

const plans = [
  {
    name: "Free",
    price: "R$ 0",
    text: "Para começar a organizar treinos e refeições.",
    perks: ["Perfil fitness", "Plano inicial", "Registro de progresso"],
    cta: "Começar grátis",
  },
  {
    name: "Premium AI",
    price: "R$ 29",
    text: "IA completa para treino, dieta, fotos e evolução.",
    perks: ["Treinos ilimitados", "Dietas por objetivo", "Análise de pratos por IA", "Recomendações diárias", "Dashboard avançado"],
    cta: "Ativar Premium",
    featured: true,
  },
];

function GlowButton({ children, to = "/Login", variant = "primary" }) {
  const primary = variant === "primary";
  return (
    <Link
      to={to}
      className={`group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-all ${
        primary
          ? "bg-[#00f5b8] text-black shadow-[0_0_28px_rgba(0,245,184,0.35)] hover:shadow-[0_0_42px_rgba(0,245,184,0.55)]"
          : "border border-white/15 bg-white/[0.04] text-white hover:border-cyan-300/40 hover:bg-white/[0.08]"
      }`}
    >
      {children}
      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="absolute inset-8 rounded-full bg-[#00f5b8]/15 blur-3xl" />
      <div className="relative rounded-[2.2rem] border border-white/15 bg-[#080b10]/90 p-3 shadow-2xl shadow-black/60">
        <div className="rounded-[1.7rem] border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-4">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/LOGOTOURO-icon-64.png" alt="FreakFit AI" className="h-8 w-8 rounded-xl" />
              <span className="text-sm font-bold text-white">FreakFit AI</span>
            </div>
            <span className="rounded-full bg-[#00f5b8]/15 px-2.5 py-1 text-[10px] font-semibold text-[#00f5b8]">LIVE</span>
          </div>
          <div className="rounded-2xl border border-[#00f5b8]/20 bg-[#00f5b8]/10 p-4">
            <p className="text-xs text-white/55">Treino de hoje</p>
            <p className="mt-1 text-lg font-bold text-white">Push + Core</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["5 ex.", "48 min", "Alta"].map((item) => (
                <div key={item} className="rounded-xl bg-black/30 p-2 text-center text-xs text-white/75">{item}</div>
              ))}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] text-white/50">Calorias</p>
              <p className="text-xl font-bold text-white">2.340</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[10px] text-white/50">Proteínas</p>
              <p className="text-xl font-bold text-cyan-300">168g</p>
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-white/60">Evolução</p>
              <p className="text-xs text-[#00f5b8]">+18%</p>
            </div>
            <div className="flex h-20 items-end gap-2">
              {[30, 45, 38, 58, 70, 64, 86].map((h, i) => (
                <motion.div
                  key={i}
                  initial={{ height: 8 }}
                  animate={{ height: h }}
                  transition={{ duration: 1, delay: i * 0.08, repeat: Infinity, repeatType: "mirror", repeatDelay: 1.5 }}
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-cyan-400 to-[#00f5b8]"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FoodScanner() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
      <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-4">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-[radial-gradient(circle_at_center,#242a34,#090b10_70%)]">
          <div className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-gradient-to-br from-amber-200 via-emerald-200 to-rose-200 p-4 shadow-[0_0_50px_rgba(0,245,184,0.18)]">
            <div className="h-full w-full rounded-full bg-[#f6f0df] p-5">
              <div className="grid h-full grid-cols-2 gap-3">
                <div className="rounded-full bg-emerald-500/70" />
                <div className="rounded-full bg-orange-500/80" />
                <div className="rounded-full bg-white shadow-inner" />
                <div className="rounded-full bg-red-500/75" />
              </div>
            </div>
          </div>
          <motion.div
            animate={{ y: ["8%", "82%", "8%"] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute left-6 right-6 h-px bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.9)]"
          />
          <div className="absolute inset-6 rounded-2xl border border-[#00f5b8]/35" />
          <ScanLine className="absolute right-8 top-8 text-[#00f5b8]" size={28} />
        </div>
      </div>
      <div className="space-y-3">
        {[
          ["Calorias", "612 kcal", "#00f5b8"],
          ["Proteínas", "42g", "#67e8f9"],
          ["Carboidratos", "58g", "#fbbf24"],
          ["Gorduras", "19g", "#fb7185"],
        ].map(([label, value, color], index) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className="rounded-2xl border border-white/10 bg-white/[0.05] p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">{label}</span>
              <span className="text-xl font-bold" style={{ color }}>{value}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#05070a] text-white">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,245,184,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.14),transparent_32%),linear-gradient(180deg,#05070a,#0a0d12)]" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
        <Link to="/" className="flex items-center gap-3">
          <img src="/LOGOTOURO-icon-64.png" alt="FreakFit AI" className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-bold tracking-tight">FreakFit AI</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-white/65 md:flex">
          <a href="#recursos" className="hover:text-white">Recursos</a>
          <a href="#como-funciona" className="hover:text-white">Como funciona</a>
          <a href="#planos" className="hover:text-white">Planos</a>
        </nav>
        <Link to="/Login" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10">
          Entrar
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-20 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-20">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.7 }}>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#00f5b8]/25 bg-[#00f5b8]/10 px-3 py-1 text-xs font-semibold text-[#00f5b8]">
              <Sparkles size={14} /> Fitness premium com inteligência artificial
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-white md:text-7xl">
              Seu corpo no próximo nível com Inteligência Artificial
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/65 md:text-lg">
              A plataforma cria treinos, dietas e análises nutricionais personalizadas em segundos, usando dados reais do seu corpo, rotina e objetivos.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <GlowButton>Começar Agora</GlowButton>
              <GlowButton to="#demo" variant="secondary">Ver Demonstração</GlowButton>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl">
              {["+10 mil usuários", "97% satisfação", "4.9/5 estrelas"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center text-sm font-semibold text-white/80">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }}>
            <PhoneMockup />
          </motion.div>
        </section>

        <section id="recursos" className="mx-auto max-w-7xl px-5 py-16">
          <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#00f5b8]">Recursos</p>
              <h2 className="text-3xl font-bold md:text-5xl">IA para cada decisão fitness</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-white/55">Da primeira avaliação ao prato fotografado, cada módulo foi desenhado para performance, clareza e evolução contínua.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.04 }}
                className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-[#00f5b8]/35 hover:bg-white/[0.07]"
              >
                <feature.icon className="mb-5 text-[#00f5b8]" size={28} />
                <h3 className="text-lg font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/55">{feature.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="demo" className="mx-auto max-w-7xl px-5 py-16">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 shadow-2xl shadow-black/30 md:p-10">
            <div className="mb-8 max-w-2xl">
              <p className="mb-2 text-sm font-semibold text-cyan-300">Análise nutricional por imagem</p>
              <h2 className="text-3xl font-bold md:text-5xl">Aponte a câmera. A IA calcula o prato.</h2>
              <p className="mt-4 text-sm leading-6 text-white/55">Identifique alimentos, calorias, proteínas, carboidratos e gorduras com uma experiência visual de scanner inteligente.</p>
            </div>
            <FoodScanner />
          </div>
        </section>

        <section id="como-funciona" className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="mb-2 text-sm font-semibold text-[#00f5b8]">Como funciona</p>
              <h2 className="text-3xl font-bold md:text-5xl">Quatro passos até um plano inteligente</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {steps.map((step, index) => (
                <div key={step} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00f5b8] font-black text-black">0{index + 1}</span>
                  <p className="text-lg font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16">
          <div className="grid gap-4 md:grid-cols-4">
            {["+10 mil usuários", "97% de satisfação", "2.8M macros calculados", "5 estrelas"].map((stat) => (
              <div key={stat} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-6 text-center">
                <p className="text-2xl font-black text-white">{stat}</p>
                <div className="mt-3 flex justify-center gap-1 text-[#00f5b8]">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {testimonials.map((item) => (
              <div key={item.name} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                <div className="mb-4 flex gap-1 text-[#00f5b8]">
                  {[0, 1, 2, 3, 4].map((i) => <Star key={i} size={14} fill="currentColor" />)}
                </div>
                <p className="text-sm leading-6 text-white/70">"{item.text}"</p>
                <p className="mt-5 font-bold">{item.name}</p>
                <p className="text-xs text-white/45">{item.role}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-5xl px-5 py-16">
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-semibold text-[#00f5b8]">Planos</p>
            <h2 className="text-3xl font-bold md:text-5xl">Comece grátis. Evolua com IA.</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-[2rem] border p-6 ${
                  plan.featured
                    ? "border-[#00f5b8]/45 bg-[#00f5b8]/10 shadow-[0_0_48px_rgba(0,245,184,0.18)]"
                    : "border-white/10 bg-white/[0.04]"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-2xl font-black">{plan.name}</h3>
                    <p className="mt-2 text-sm text-white/55">{plan.text}</p>
                  </div>
                  {plan.featured && <Zap className="text-[#00f5b8]" />}
                </div>
                <p className="mt-6 text-4xl font-black">{plan.price}<span className="text-sm font-medium text-white/45">/mês</span></p>
                <div className="mt-6 space-y-3">
                  {plan.perks.map((perk) => (
                    <div key={perk} className="flex items-center gap-2 text-sm text-white/75">
                      <Check size={16} className="text-[#00f5b8]" /> {perk}
                    </div>
                  ))}
                </div>
                <Link to="/Login" className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition ${
                  plan.featured ? "bg-[#00f5b8] text-black hover:scale-[1.02]" : "border border-white/15 text-white hover:bg-white/10"
                }`}>
                  {plan.cta} <ChevronRight size={16} />
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#00f5b8]/16 to-cyan-400/12 p-8 text-center md:p-12">
            <ShieldCheck className="mx-auto mb-5 text-[#00f5b8]" size={36} />
            <h2 className="text-3xl font-black md:text-5xl">Pronto para treinar com uma IA no seu time?</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">Crie sua conta gratuitamente e receba uma experiência fitness premium feita para performance real.</p>
            <div className="mt-8">
              <GlowButton>Começar gratuitamente</GlowButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <img src="/LOGOTOURO-icon-64.png" alt="FreakFit AI" className="h-9 w-9 rounded-xl" />
            <div>
              <p className="font-bold">FreakFit AI</p>
              <p className="text-xs text-white/45">Performance, dados e inteligência artificial.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/55">
            <a href="#recursos">Recursos</a>
            <a href="#planos">Planos</a>
            <a href="#privacidade">Privacidade</a>
            <a href="#termos">Termos</a>
            <Github size={18} />
          </div>
        </div>
      </footer>
    </div>
  );
}
