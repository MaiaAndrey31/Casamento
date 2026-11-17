
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CheckCircle, XCircle, Heart, ShieldCheck } from 'lucide-react';
import { validateInvitation } from '@/app/actions/validate-invitation.action';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';
import type { RSVP } from '@/types';

/**
 * Página de Recuperação do Cartão Digital — /confirmacao/[token]
 *
 * Permite que o convidado recupere seu cartão digital usando o token de acesso
 * ao convite (mesmo token da URL /convite/[token]).
 *
 * IMPORTANTE: O checkInToken NÃO pode ser recuperado (hash é unidirecional).
 * Esta página exibe o cartão digital SEM o QR Code se o convidado perdeu o token original.
 * Para obter um novo QR Code, o admin deve regenerar via painel administrativo.
 */

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function ConfirmationPage({ params }: PageProps) {
    const { token } = await params;
    const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

    // Validar token de acesso ao convite
    const result = await validateInvitation(eventId, token);

    if (!result.success || !result.data) {
        notFound();
    }

    const { invitation } = result.data;

    // Buscar RSVP existente para este convite
    let rsvp: RSVP | null = null;

    try {
        const { adminDb } = await import('@/lib/firebase/admin');
        const doc = await adminDb
            .collection('events')
            .doc(eventId)
            .collection('rsvps')
            .doc(invitation.id)
            .get();

        if (doc.exists) {
            rsvp = { id: doc.id, ...doc.data() } as RSVP;
        }
    } catch {
        // Se Admin SDK não estiver configurado, tentar Client SDK
        try {
            const { db } = await import('@/lib/firebase/client');
            const { doc, getDoc } = await import('firebase/firestore');

            const docRef = doc(db, 'events', eventId, 'rsvps', invitation.id);
            const snapshot = await getDoc(docRef);

            if (snapshot.exists()) {
                rsvp = { id: snapshot.id, ...snapshot.data() } as RSVP;
            }
        } catch {
            // Ignorar — exibir estado sem RSVP
        }
    }

    // Estado sem confirmação encontrada
    if (!rsvp) {
        return (
            <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#14251D] px-5 py-10 sm:px-8">
                <div className="pointer-events-none absolute inset-0">
                    <div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#D6A45B]/[0.06] blur-[90px]" />
                    <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#D6A45B]/[0.05] blur-[90px]" />
                </div>

                <div className="relative z-10 w-full max-w-md rounded-2xl border border-[#D6A45B]/20 bg-[#1B2D23] p-7 text-center shadow-2xl sm:p-9">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#D6A45B]/20 bg-[#D6A45B]/[0.08]">
                        <XCircle size={26} className="text-[#D6A45B]" />
                    </div>

                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.3em] text-[#D6A45B]">
                        Cartão digital
                    </p>

                    <h1 className="font-serif text-2xl text-[#F5EFE3] sm:text-3xl">
                        Confirmação não encontrada
                    </h1>

                    <p className="mt-3 text-sm leading-7 text-[#B5B0A3]">
                        Não encontramos uma confirmação de presença para{' '}
                        <strong className="font-medium text-[#E5C58D]">
                            {invitation.displayName}
                        </strong>.
                    </p>

                    <Link
                        href={`/convite/${token}`}
                        className="mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#D6A45B] px-7 py-3.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14251D] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E5C58D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E5C58D] focus:ring-offset-2 focus:ring-offset-[#1B2D23]"
                    >
                        Voltar ao Convite
                    </Link>
                </div>
            </main>
        );
    }

    const isConfirmed = rsvp.attendanceStatus === 'confirmed';

    const confirmedNames = [
        ...(rsvp.confirmedGuestIds?.length ? [] : [invitation.displayName]),
        ...(rsvp.companions?.map((c) => c.name) || []),
    ].filter(Boolean);

    return (
        <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#14251D] px-5 py-8 sm:px-8 sm:py-10">
            {/* Fundo */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-[#D6A45B]/[0.055] blur-[110px]" />
                <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-[#D6A45B]/[0.045] blur-[110px]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(229,197,141,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(229,197,141,0.018)_1px,transparent_1px)] bg-[size:48px_48px]" />
            </div>

            <div className="relative z-10 grid w-full max-w-5xl items-center gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">

                {/* Coluna esquerda — apresentação e aviso */}
                <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
                    {/* Foto do casal */}
                    <div className="relative mb-5 h-16 w-16 overflow-hidden rounded-full border border-[#D6A45B]/50 shadow-[0_0_30px_rgba(214,164,91,0.12)] ring-4 ring-[#D6A45B]/[0.05]">
                        <Image
                            src={getAssetPath('abraco-romantico.webp')}
                            alt="Andrey e Amanda"
                            fill
                            sizes="64px"
                            className="object-cover"
                        />
                    </div>

                    <p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.32em] text-[#D6A45B]">
                        Um momento especial
                    </p>

                    <h1 className="font-serif text-3xl leading-tight text-[#F5EFE3] sm:text-4xl">
                        Seu cartão
                        <span className="block italic text-[#E5C58D]">
                            Digital
                        </span>
                    </h1>

                    <div className="my-4 flex items-center gap-3">
                        <span className="h-px w-9 bg-[#D6A45B]/40" />
                        <Heart size={12} className="fill-[#D6A45B] text-[#D6A45B]" />
                        <span className="h-px w-9 bg-[#D6A45B]/40" />
                    </div>

                    <p className="max-w-md text-sm leading-7 text-[#C4C5B9]">
                        Este é o seu cartão digital de confirmação para o casamento de{' '}
                        <strong className="font-medium text-[#E5C58D]">
                            {WEDDING_CONFIG.coupleNames}
                        </strong>.
                    </p>

                    {/* Aviso de segurança */}
                    {isConfirmed && (
                        <div className="mt-6 w-full max-w-md rounded-xl border border-[#D6A45B]/20 bg-[#1B2D23]/80 p-4 text-left">
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D6A45B]/[0.09]">
                                    <ShieldCheck size={18} className="text-[#E5C58D]" />
                                </div>

                                <div>
                                    <p className="text-sm font-medium text-[#E5C58D]">
                                        Sobre o QR Code
                                    </p>
                                    <p className="mt-1 text-xs leading-6 text-[#B5B0A3]">
                                        O QR Code original foi exibido apenas no momento
                                        da confirmação por questões de segurança. Caso
                                        precise de um novo para o dia do evento, entre
                                        em contato com os noivos.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assinatura */}
                    <p className="mt-6 text-[11px] text-[#B5B0A3]/70">
                        Com amor,{' '}
                        <strong className="font-medium text-[#E5C58D]">
                            {WEDDING_CONFIG.coupleNames}
                        </strong>
                    </p>
                </section>

                {/* Coluna direita — cartão digital */}
                <section className="mx-auto w-full max-w-md">
                    <div className="overflow-hidden rounded-2xl border border-[#D6A45B]/35 bg-[#F5EFE3] shadow-[0_24px_70px_rgba(0,0,0,0.3)]">

                        {/* Header com foto */}
                        <div className="relative h-36 overflow-hidden sm:h-40">
                            <Image
                                src={getAssetPath('abraco-romantico.webp')}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, 448px"
                            />

                            <div className="absolute inset-0 bg-gradient-to-b from-[#14251D]/30 via-[#14251D]/35 to-[#14251D]/90" />

                            <div className="absolute inset-x-0 bottom-4 text-center">
                                <p className="text-[9px] font-semibold uppercase tracking-[0.35em] text-[#E5C58D]">
                                    Passe Digital
                                </p>
                                <h2 className="mt-1 font-serif text-2xl text-[#F5EFE3]">
                                    {WEDDING_CONFIG.coupleNames}
                                </h2>
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="space-y-5 p-5 text-center sm:p-7">

                            {/* Status */}
                            <div
                                className={`mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[9px] font-semibold uppercase tracking-[0.17em] ${
                                    isConfirmed
                                        ? 'border-[#54745B]/25 bg-[#54745B]/10 text-[#34583B]'
                                        : 'border-[#A65C4E]/25 bg-[#A65C4E]/10 text-[#914D42]'
                                }`}
                            >
                                {isConfirmed ? (
                                    <CheckCircle size={14} />
                                ) : (
                                    <XCircle size={14} />
                                )}

                                {isConfirmed
                                    ? 'Presença Confirmada'
                                    : 'Não Poderei Comparecer'}
                            </div>

                            {/* Nome do convidado */}
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8C806D]">
                                    Convidado
                                </p>
                                <p className="mt-1 font-serif text-2xl leading-tight text-[#26382D]">
                                    {invitation.displayName}
                                </p>
                            </div>

                            {/* Separador */}
                            <div className="mx-auto flex items-center justify-center gap-3">
                                <span className="h-px w-10 bg-[#C6A15B]/40" />
                                <Heart size={11} className="fill-[#C6A15B] text-[#C6A15B]" />
                                <span className="h-px w-10 bg-[#C6A15B]/40" />
                            </div>

                            {/* Casamento */}
                            <div>
                                <p className="text-[9px] font-semibold uppercase tracking-[0.25em] text-[#8C806D]">
                                    Casamento
                                </p>
                                <p className="mt-1 font-serif text-lg text-[#526B55]">
                                    {WEDDING_CONFIG.coupleNames}
                                </p>
                            </div>

                            {/* Data e local */}
                            <div className="space-y-1">
                                {WEDDING_CONFIG.eventDate && (
                                    <p className="text-sm font-medium text-[#463F34]">
                                        {new Date(WEDDING_CONFIG.eventDate).toLocaleDateString('pt-BR', {
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            timeZone: WEDDING_CONFIG.timezone,
                                        })}
                                    </p>
                                )}

                                {WEDDING_CONFIG.venueName && (
                                    <p className="text-xs text-[#8C806D]">
                                        {WEDDING_CONFIG.venueName}
                                    </p>
                                )}
                            </div>

                            {/* Convidados confirmados */}
                            {isConfirmed && confirmedNames.length > 0 && (
                                <div className="rounded-xl border border-[#C6A15B]/20 bg-[#EDE5D6] p-4">
                                    <p className="text-[9px] font-semibold uppercase tracking-[0.23em] text-[#8C806D]">
                                        Confirmados
                                    </p>

                                    <ul className="mt-2 space-y-1">
                                        {confirmedNames.map((name, i) => (
                                            <li
                                                key={i}
                                                className="text-sm text-[#463F34]"
                                            >
                                                {name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Agradecimento */}
                            <div className="border-t border-[#C6A15B]/25 pt-4">
                                <p className="font-serif text-sm italic leading-relaxed text-[#746B5D]">
                                    {isConfirmed
                                        ? 'Estamos ansiosos para celebrar este momento especial com você!'
                                        : 'Sentiremos sua falta. Agradecemos por nos avisar.'}
                                </p>

                                <p className="mt-3 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#A8864E]">
                                    {WEDDING_CONFIG.closingSignature}
                                </p>
                            </div>
                        </div>

                        {/* Rodapé decorativo */}
                        <div className="flex items-center justify-center gap-2 border-t border-[#C6A15B]/20 bg-[#EDE5D6] px-4 py-3">
                            <Heart size={10} className="fill-[#C6A15B] text-[#C6A15B]" />
                            <span className="text-[8px] font-medium uppercase tracking-[0.25em] text-[#8C806D]">
                                Um dia para celebrar o amor
                            </span>
                            <Heart size={10} className="fill-[#C6A15B] text-[#C6A15B]" />
                        </div>
                    </div>

                    {/* Voltar ao convite */}
                    <div className="mt-5 text-center">
                        <Link
                            href={`/convite/${token}`}
                            className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D6A45B] underline decoration-[#D6A45B]/40 underline-offset-4 transition-colors hover:text-[#E5C58D] hover:decoration-[#E5C58D]"
                        >
                            Voltar ao convite
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
