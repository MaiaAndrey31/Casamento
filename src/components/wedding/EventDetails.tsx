
'use client';

import {
    Calendar,
    Clock,
    MapPin,
    Shirt,
    Navigation,
    ArrowUpRight,
    Sparkles,
    Heart,
} from 'lucide-react';

import { WEDDING_CONFIG } from '@/config/wedding';

interface EventDetailsProps {
    eventDate?: string | null;
    timezone?: string | null;
    ceremonyTime?: string | null;
    receptionTime?: string | null;
    venueName?: string | null;
    venueAddress?: string | null;
    mapsUrl?: string | null;
    wazeUrl?: string | null;
    dressCode?: string | null;
    mode?: 'public' | 'invitation';
}

export function EventDetails(props: EventDetailsProps) {
    // Dados dinâmicos com fallback para configuração estática
    const eventDate = props.eventDate || WEDDING_CONFIG.eventDate;
    const timezone = props.timezone || WEDDING_CONFIG.timezone;
    const ceremonyTime = props.ceremonyTime || WEDDING_CONFIG.ceremonyTime;
    const receptionTime =
        props.receptionTime ?? WEDDING_CONFIG.receptionTime;
    const venueName = props.venueName || WEDDING_CONFIG.venueName;
    const venueAddress = props.venueAddress || WEDDING_CONFIG.venueAddress;
    const mapsUrl = props.mapsUrl || WEDDING_CONFIG.mapsUrl;
    const wazeUrl = props.wazeUrl || WEDDING_CONFIG.wazeUrl;
    const dressCode = props.dressCode || WEDDING_CONFIG.dressCode;

    const mode = props.mode || 'invitation';
    const isPublic = mode === 'public';

    const hasVenueInfo = !!(venueName || venueAddress);
    const hasDate = eventDate !== null && eventDate !== '';
    const hasTime = ceremonyTime !== null && ceremonyTime !== '';
    const hasDressCode = dressCode !== null && dressCode !== '';

    // Endereço e navegação somente no convite individual
    const encodedAddress =
        !isPublic && venueAddress
            ? encodeURIComponent(venueAddress)
            : null;

    const fallbackMapsUrl = encodedAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`
        : null;

    const fallbackWazeUrl = encodedAddress
        ? `https://waze.com/ul?q=${encodedAddress}&navigate=yes`
        : null;

    const effectiveMapsUrl = !isPublic
        ? mapsUrl || fallbackMapsUrl
        : null;

    const effectiveWazeUrl = !isPublic
        ? wazeUrl || fallbackWazeUrl
        : null;

    const dateOptions = {
        timeZone: timezone || 'America/Sao_Paulo',
    };

    return (
        <section
            id="detalhes"
            className="relative overflow-hidden bg-[#17231D] px-gutter py-14 text-[#F5EFE3] md:py-16 lg:py-20"
        >
            {/* Textura discreta */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.045]"
                style={{
                    backgroundImage:
                        'radial-gradient(#E5C58D 0.6px, transparent 0.6px)',
                    backgroundSize: '28px 28px',
                }}
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-40 top-10 h-[400px] w-[400px] rounded-full bg-[#E5C58D]/[0.035] blur-[110px]"
            />

            <div className="relative mx-auto max-w-[1100px]">

                {/* Cabeçalho */}
                <header
                    data-details-title
                    className="mb-9 text-center md:mb-11"
                >
                    <span className="inline-flex items-center gap-3 text-[9px] font-semibold uppercase tracking-[0.35em] text-[#E5C58D] md:text-[10px]">
                        <span className="h-px w-7 bg-[#E5C58D]/60" />
                        Um momento especial
                        <span className="h-px w-7 bg-[#E5C58D]/60" />
                    </span>

                    <h2 className="mt-4 font-serif text-3xl font-normal leading-tight text-[#F5EFE3] sm:text-4xl md:text-5xl lg:text-6xl">
                        Detalhes do Grande Dia
                        <span className="text-[#E5C58D]">.</span>
                    </h2>

                    <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#B5B0A3] md:text-sm">
                        Preparamos cada detalhe com carinho para compartilhar
                        esse momento tão especial com você.
                    </p>

                    <div className="mx-auto mt-5 flex max-w-[130px] items-center gap-3">
                        <span className="h-px flex-1 bg-[#E5C58D]/35" />
                        <Sparkles
                            size={13}
                            strokeWidth={1.3}
                            className="text-[#E5C58D]"
                        />
                        <span className="h-px flex-1 bg-[#E5C58D]/35" />
                    </div>
                </header>

                {/* Data e programação */}
                <div
                    data-details-card
                    className="overflow-hidden rounded-2xl border border-[#E5C58D]/15 bg-[#1E2F26] shadow-[0_15px_45px_rgba(0,0,0,0.12)]"
                >
                    <div className="grid grid-cols-1 md:grid-cols-[1.15fr_0.85fr]">

                        {/* Data */}
                        <div className="relative flex flex-col justify-center overflow-hidden px-6 py-8 sm:px-10 md:px-12 md:py-10">
                            <div
                                aria-hidden="true"
                                className="pointer-events-none absolute -right-3 top-1/2 -translate-y-1/2 font-serif text-[190px] leading-none text-white/[0.025] md:text-[230px]"
                            >
                                12
                            </div>

                            <span className="relative flex items-center gap-2.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#E5C58D]">
                                <Calendar size={14} strokeWidth={1.5} />
                                Reserve esta data
                            </span>

                            {hasDate ? (
                                <div className="relative mt-5">
                                    <p className="font-serif text-6xl font-normal leading-none tracking-tight text-[#F5EFE3] sm:text-7xl md:text-8xl">
                                        {new Date(eventDate!).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                day: '2-digit',
                                                ...dateOptions,
                                            }
                                        )}
                                    </p>

                                    <p className="mt-3 font-serif text-2xl font-normal capitalize text-[#E5C58D] sm:text-3xl md:text-4xl">
                                        {new Date(eventDate!).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                month: 'long',
                                                year: 'numeric',
                                                ...dateOptions,
                                            }
                                        )}
                                    </p>

                                    <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.2em] text-[#B5B0A3]">
                                        {new Date(eventDate!).toLocaleDateString(
                                            'pt-BR',
                                            {
                                                weekday: 'long',
                                                ...dateOptions,
                                            }
                                        )}
                                    </p>
                                </div>
                            ) : (
                                <p className="relative mt-5 font-serif text-2xl text-[#F5EFE3]">
                                    Data a ser confirmada
                                </p>
                            )}
                        </div>

                        {/* Horários */}
                        <div className="flex flex-col justify-center border-t border-[#E5C58D]/15 bg-[#203329] px-6 py-7 sm:px-10 md:border-l md:border-t-0 md:px-10">
                            <span className="flex items-center gap-2.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#E5C58D]">
                                <Clock size={14} strokeWidth={1.5} />
                                Programação
                            </span>

                            {hasTime ? (
                                <div className="mt-5 space-y-5">
                                    <div>
                                        <span className="text-[9px] uppercase tracking-[0.2em] text-[#B5B0A3]">
                                            Início da cerimônia
                                        </span>

                                        <p className="mt-1 font-serif text-4xl text-[#F5EFE3] sm:text-5xl">
                                            {ceremonyTime}
                                        </p>
                                    </div>

                                    {receptionTime && (
                                        <div className="border-t border-[#E5C58D]/15 pt-4">
                                            <span className="text-[9px] uppercase tracking-[0.2em] text-[#B5B0A3]">
                                                Recepção
                                            </span>

                                            <p className="mt-1 font-serif text-3xl text-[#E5C58D] sm:text-4xl">
                                                {receptionTime}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-5 font-serif text-xl text-[#F5EFE3]">
                                    Horário a ser confirmado
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Local e dress code */}
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-12">

                    {/* Local */}
                    <div
                        data-details-card
                        className="relative overflow-hidden rounded-2xl border border-[#E5C58D]/15 bg-[#1E2F26] p-6 sm:p-8 md:col-span-7"
                    >
                        <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#E5C58D]">
                                <MapPin size={15} strokeWidth={1.5} />
                                Onde estaremos
                            </span>

                            <span className="font-serif text-2xl text-[#E5C58D]/35">
                                01
                            </span>
                        </div>

                        <h3 className="mt-5 font-serif text-2xl font-normal text-[#F5EFE3] sm:text-3xl">
                            Local da Cerimônia
                        </h3>

                        <div className="my-4 h-px w-10 bg-[#E5C58D]/60" />

                        {isPublic ? (
                            <div className="space-y-2">
                                <p className="font-serif text-xl text-[#E5C58D]">
                                    Espaço particular
                                </p>

                                <p className="max-w-md text-xs leading-6 text-[#B5B0A3] sm:text-sm">
                                    O endereço completo e as orientações de
                                    chegada estão disponíveis no seu convite
                                    individual.
                                </p>
                            </div>
                        ) : hasVenueInfo ? (
                            <div className="space-y-2">
                                {venueName && (
                                    <p className="font-serif text-xl text-[#E5C58D]">
                                        {venueName}
                                    </p>
                                )}

                                {venueAddress && (
                                    <p className="whitespace-pre-line text-xs leading-6 text-[#B5B0A3] sm:text-sm">
                                        {venueAddress}
                                    </p>
                                )}

                                {(effectiveMapsUrl || effectiveWazeUrl) && (
                                    <div className="mt-5 flex flex-wrap gap-2.5">
                                        {effectiveMapsUrl && (
                                            <a
                                                href={effectiveMapsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#E5C58D] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#17231D] transition-colors hover:bg-[#F0D7A8] focus:outline-none focus:ring-2 focus:ring-[#E5C58D] focus:ring-offset-2 focus:ring-offset-[#1E2F26]"
                                            >
                                                <Navigation size={14} />
                                                Google Maps
                                                <ArrowUpRight
                                                    size={13}
                                                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                                                />
                                            </a>
                                        )}

                                        {effectiveWazeUrl && (
                                            <a
                                                href={effectiveWazeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#E5C58D]/35 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#E5C58D] transition-colors hover:border-[#E5C58D] hover:bg-white/[0.04] focus:outline-none focus:ring-2 focus:ring-[#E5C58D] focus:ring-offset-2 focus:ring-offset-[#1E2F26]"
                                            >
                                                <Navigation size={14} />
                                                Abrir no Waze
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs italic leading-6 text-[#B5B0A3]">
                                Local a ser confirmado
                            </p>
                        )}
                    </div>

                    {/* Dress code */}
                    {hasDressCode && (
                        <div
                            data-details-card
                            className="relative flex flex-col overflow-hidden rounded-2xl border border-[#E5C58D]/15 bg-[#203329] p-6 sm:p-8 md:col-span-5"
                        >
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-2.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#E5C58D]">
                                    <Shirt size={15} strokeWidth={1.5} />
                                    Para a ocasião
                                </span>

                                <span className="font-serif text-2xl text-[#E5C58D]/35">
                                    02
                                </span>
                            </div>

                            <h3 className="mt-5 font-serif text-2xl font-normal text-[#F5EFE3] sm:text-3xl">
                                Dress Code
                            </h3>

                            <div className="my-4 h-px w-10 bg-[#E5C58D]/60" />

                            <p className="text-sm leading-7 text-[#E5C58D]">
                                {dressCode}
                            </p>

                            <div className="mt-auto pt-6">
                                <p className="font-serif text-base italic text-[#B5B0A3]">
                                    Vista-se para celebrar.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Encerramento */}
                <footer className="mt-10 text-center md:mt-12">
                    <Heart
                        size={15}
                        strokeWidth={1.2}
                        className="mx-auto text-[#E5C58D]"
                    />

                    <p className="mt-3 font-serif text-lg italic text-[#B5B0A3] md:text-xl">
                        Será uma alegria ter você conosco.
                    </p>
                </footer>
            </div>
        </section>
    );
}
