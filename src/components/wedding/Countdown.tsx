
'use client';

import { useCountdown } from '@/hooks/useCountdown';
import { WEDDING_CONFIG } from '@/config/wedding';

/**
 * Contagem Regressiva — Nossa Aliança
 * Identidade visual: verde floresta, champagne e dourado.
 * Mantém toda a lógica original do countdown.
 */

export function Countdown() {
  const {
    days,
    hours,
    minutes,
    seconds,
    isExpired,
    isConfigured,
  } = useCountdown(
    WEDDING_CONFIG.eventDate,
    WEDDING_CONFIG.timezone,
  );

  const sectionClass = `
    relative overflow-hidden
    bg-[#17231D]
    px-gutter
    py-20 sm:py-24 md:py-28
  `;

  // DATA NÃO CONFIGURADA

  if (!isConfigured) {
    return (
      <section id="countdown" className={sectionClass}>
        <div className="relative z-10 mx-auto max-w-2xl text-center">

          <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6A15B] sm:text-xs">
            Nossa aliança
          </p>

          <h2 className="font-serif text-2xl font-normal text-[#E5C58D] sm:text-3xl md:text-4xl">
            Contagem Regressiva
          </h2>

          <div className="mx-auto my-7 flex max-w-[220px] items-center gap-4">
            <span className="h-px flex-1 bg-[#C6A15B]/50" />
            <span className="text-sm text-[#D9B56F]">✧</span>
            <span className="h-px flex-1 bg-[#C6A15B]/50" />
          </div>

          <p className="text-sm leading-relaxed text-[#E9DFD0]/80 sm:text-base">
            A data do nosso grande dia será anunciada em breve.
          </p>

          <p className="mt-6 font-serif text-sm italic leading-relaxed text-[#E5C58D]/90 sm:text-base">
            &ldquo;Tudo tem o seu tempo determinado, e há tempo para todo propósito debaixo do céu.&rdquo;
          </p>

          <p className="mt-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C6A15B]">
            Eclesiastes 3:1
          </p>

        </div>
      </section>
    );
  }

  // CASAMENTO JÁ REALIZADO

  if (isExpired) {
    return (
      <section id="countdown" className={sectionClass}>
        <div className="relative z-10 mx-auto max-w-2xl text-center">

          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#C6A15B]/40 bg-[#203329]">
            <span className="text-2xl">💍</span>
          </div>

          <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C6A15B] sm:text-xs">
            Para sempre
          </p>

          <h2 className="font-serif text-3xl font-normal text-[#E5C58D] sm:text-4xl">
            O grande dia chegou!
          </h2>

          <div className="mx-auto my-7 flex max-w-[220px] items-center gap-4">
            <span className="h-px flex-1 bg-[#C6A15B]/50" />
            <span className="text-sm text-[#D9B56F]">✧</span>
            <span className="h-px flex-1 bg-[#C6A15B]/50" />
          </div>

          <p className="text-sm leading-relaxed text-[#E9DFD0]/80 sm:text-base">
            Hoje celebramos nossa aliança diante de Deus.
          </p>

          <p className="mt-6 font-serif text-base italic leading-relaxed text-[#E5C58D] sm:text-lg">
            &ldquo;{WEDDING_CONFIG.closingMessage}&rdquo;
          </p>

          <p className="mt-3 font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C6A15B]">
            {WEDDING_CONFIG.closingVerseReference}
          </p>

        </div>
      </section>
    );
  }

  // CONTAGEM REGRESSIVA

  const units = [
    { value: days, label: 'Dias' },
    { value: hours, label: 'Horas' },
    { value: minutes, label: 'Minutos' },
    { value: seconds, label: 'Segundos' },
  ];

  return (
    <section
      id="countdown"
      className={sectionClass}
    >

      {/* DETALHES DECORATIVOS DE FUNDO */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-[#C6A15B]/[0.035] blur-[100px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-[#87906C]/[0.06] blur-[100px]"
      />

      {/* CONTEÚDO */}

      <div className="relative z-10 mx-auto max-w-4xl text-center">

        {/* IDENTIFICAÇÃO */}

        <p className="mb-4 font-sans text-[10px] font-semibold uppercase tracking-[0.32em] text-[#C6A15B] sm:text-xs">
          Está chegando o grande dia
        </p>

        {/* TÍTULO */}

        <h2
          data-countdown-title
          className="
            font-serif font-normal
            text-[#F5EFE3]
            text-3xl
            sm:text-4xl
            md:text-5xl
          "
        >
          Contagem Regressiva
        </h2>

        {/* ORNAMENTO */}

        <div className="mx-auto mb-10 mt-6 flex max-w-[240px] items-center justify-center gap-4 sm:mb-12">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#C6A15B]/70" />

          <span className="font-serif text-lg text-[#D9B56F]">
            ✧
          </span>

          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#C6A15B]/70" />
        </div>

        {/* CONTADORES */}

        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4 md:gap-6">

          {units.map((unit) => (
            <div
              data-countdown-card
              key={unit.label}
              className="
                group relative
                flex flex-col items-center justify-center

                rounded-xl
                border border-[#C6A15B]/20
                bg-[#203329]/75

                px-3 py-7
                shadow-[0_10px_35px_rgba(0,0,0,0.12)]

                transition-all duration-300

                hover:border-[#C6A15B]/50
                hover:bg-[#25392E]

                sm:py-9
                md:py-10
              "
            >

              {/* DETALHE SUPERIOR */}

              <span className="absolute left-1/2 top-0 h-px w-10 -translate-x-1/2 bg-[#D9B56F]/60 transition-all duration-300 group-hover:w-16" />

              {/* VALOR */}

              <span
                className="
                  font-serif font-normal
                  tabular-nums leading-none
                  text-[#E5C58D]

                  text-[clamp(2.8rem,8vw,4.5rem)]
                  drop-shadow-[0_2px_8px_rgba(0,0,0,0.2)]
                "
              >
                {String(unit.value).padStart(2, '0')}
              </span>

              {/* UNIDADE */}

              <span
                className="
                  mt-4
                  font-sans font-semibold
                  uppercase tracking-[0.22em]
                  text-[#D8CBB5]/75

                  text-[9px]
                  sm:text-[10px]
                "
              >
                {unit.label}
              </span>

            </div>
          ))}

        </div>

        {/* TEXTO FINAL */}

        <p className="mt-9 font-serif text-sm italic text-[#E9DFD0]/75 sm:mt-10 sm:text-base">
          Cada segundo nos aproxima do nosso para sempre.
        </p>

        <p className="mt-3 font-sans text-[9px] font-semibold uppercase tracking-[0.25em] text-[#C6A15B]/80">
          12 de dezembro de 2026
        </p>

      </div>
    </section>
  );
}
