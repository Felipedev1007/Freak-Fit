import { ExternalLink, Flame, Heart, Medal, Quote, Sparkles } from "lucide-react";

const gabrielPhoto =
  "https://s2-ge.glbimg.com/RsaYsA5YCvmqRzR0ACAIouuo-Mk=/1919x0/filters:format(jpeg)/https://i.s3.glbimg.com/v1/AUTH_bc8228b6673f488aa253bbcb03c80ec5/internal_photos/bs/2026/F/K/pMxtUqQpAYUpp49AdnBQ/captura-de-tela-2026-05-24-154810.png";

const memorialDates = {
  birth: "20 de agosto de 2003",
  death: "23 de maio de 2026",
  age: "22 anos",
};

const gabrielQuote =
  "A vida não é sobre quem nasceu com mais talento... é sobre quem continua a lutar, mesmo cansado, mesmo desacreditado e mesmo diante das dificuldades.";

const values = [
  { icon: Flame, title: "Disciplina", text: "A constância de aparecer todos os dias, mesmo quando o processo era silencioso." },
  { icon: Medal, title: "Ambição", text: "O sonho grande de subir de nível, competir melhor e transformar potencial em palco." },
  { icon: Heart, title: "Comunidade", text: "A vontade de inspirar outras pessoas a treinarem, cuidarem do corpo e acreditarem em si." },
];

const timeline = [
  { label: "15 anos", text: "Início na musculação, ainda jovem, descobrindo no treino uma forma de direção." },
  { label: "19 anos", text: "Primeiras experiências no fisiculturismo competitivo e crescimento como atleta." },
  { label: "2026", text: "Preparação para voltar aos palcos, com o Musclecontest Brasil no horizonte." },
];

export default function Memorial() {
  return (
    <div className="min-h-screen pb-24 lg:pb-0" style={{ background: "var(--bg-dark)", color: "var(--text-primary)" }}>
      <section className="relative min-h-[72vh] overflow-hidden">
        <img
          src={gabrielPhoto}
          alt="Gabriel Ganley"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,15,0.98)_0%,rgba(10,10,15,0.78)_42%,rgba(10,10,15,0.28)_100%)]" />
        <div className="relative mx-auto grid min-h-[72vh] max-w-6xl items-end gap-8 px-5 py-12 lg:grid-cols-[1fr_360px] lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/70 backdrop-blur">
              <Heart size={14} className="text-[#00D4AA]" />
              Memorial FreakFit
            </div>
            <h1 className="text-4xl font-black leading-tight text-white md:text-6xl">
              Em memória de Gabriel Ganley
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/72">
              Este projeto carrega a inspiração de um atleta que mostrou que treino também é identidade:
              disciplina, presença, energia e vontade de evoluir. Gabriel Ganley viveu o fisiculturismo
              com intensidade e tocou uma comunidade inteira com sua rotina, seu carisma e seu sonho grande.
            </p>
            <blockquote className="mt-8 border-l-4 border-[#00D4AA] pl-5">
              <p className="text-2xl font-black leading-tight text-white md:text-3xl">
                "{gabrielQuote}"
              </p>
              <footer className="mt-4 text-sm font-bold text-[#00D4AA]">Gabriel Ganley</footer>
            </blockquote>
          </div>

          <aside className="overflow-hidden rounded-3xl border border-white/15 bg-black/45 shadow-2xl shadow-black/40 backdrop-blur-md">
            <div className="aspect-[4/5] overflow-hidden">
              <img
                src={gabrielPhoto}
                alt="Retrato de Gabriel Ganley"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#00D4AA]">Gabriel Ganley</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="text-[11px] uppercase tracking-wide text-white/45">Nascimento</p>
                  <p className="mt-1 text-sm font-bold text-white">{memorialDates.birth}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/45">Falecimento</p>
                    <p className="mt-1 text-sm font-bold text-white">{memorialDates.death}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/45">Idade</p>
                    <p className="mt-1 text-sm font-bold text-white">{memorialDates.age}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-5 px-5 py-8 lg:grid-cols-3 lg:px-8">
        {values.map((item) => (
          <article key={item.title} className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
            <item.icon size={22} className="mb-4" style={{ color: "var(--primary)" }} />
            <h2 className="text-base font-bold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{item.text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-4 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--primary)" }}>O legado</p>
          <h2 className="mt-3 text-3xl font-black leading-tight md:text-4xl">
            Um lembrete para treinar com coragem, mas também com cuidado.
          </h2>
          <p className="mt-5 text-sm leading-7" style={{ color: "var(--text-secondary)" }}>
            Gabriel ficou conhecido por compartilhar musculação, dieta, preparação e bastidores de atleta.
            Segundo o ge, ele tinha milhões de seguidores entre Instagram e TikTok e se preparava para
            competir novamente no fisiculturismo. Esta homenagem não transforma dor em espetáculo:
            ela preserva o motivo pelo qual o FreakFit existe, que é ajudar pessoas a criarem rotina,
            progresso e respeito pelo próprio corpo.
          </p>
        </div>

        <div className="rounded-2xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <Quote size={24} className="mb-4" style={{ color: "var(--primary)" }} />
          <p className="text-lg font-semibold leading-8">
            "{gabrielQuote}" Que cada plano gerado aqui carregue um pouco dessa mensagem:
            evoluir de verdade e buscar performance sem esquecer saúde, responsabilidade e humanidade.
          </p>
          <p className="mt-4 text-sm font-bold" style={{ color: "var(--primary)" }}>Gabriel Ganley</p>
          <div className="mt-6 h-px" style={{ background: "var(--border-color)" }} />
          <div className="mt-6 grid gap-3">
            {timeline.map((item) => (
              <div key={item.label} className="grid grid-cols-[74px_1fr] gap-3">
                <span className="text-sm font-bold" style={{ color: "var(--primary)" }}>{item.label}</span>
                <p className="text-sm leading-6" style={{ color: "var(--text-secondary)" }}>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 lg:px-8">
        <div className="rounded-2xl border p-5 md:p-6" style={{ background: "var(--bg-card)", borderColor: "var(--border-color)" }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <Sparkles size={17} style={{ color: "var(--primary)" }} />
                Projeto inspirado por Gabriel Ganley
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6" style={{ color: "var(--text-secondary)" }}>
                Foto: Wesley Felix/Reprodução, conforme publicado pelo ge. Informações biográficas resumidas a
                partir de reportagens públicas sobre sua trajetória no fisiculturismo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href="https://ge.globo.com/fisiculturismo/noticia/2026/05/25/gabriel-ganley-se-preparava-para-competicao-nacional-de-fisiculturismo.ghtml"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                ge <ExternalLink size={13} />
              </a>
              <a
                href="https://www.band.com.br/bandnews-fm/noticias/laudo-do-iml-aponta-problema-no-coracao-como-causa-da-morte-do-fisiculturista-gabriel-ganley-202605261111"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold"
                style={{ borderColor: "var(--border-color)", color: "var(--text-secondary)" }}
              >
                BandNews <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
