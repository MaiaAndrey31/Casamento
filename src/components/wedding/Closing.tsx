
import Image from 'next/image';
import { Heart, Sparkles } from 'lucide-react';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

interface ClosingProps {
    coupleNames?: string | null;
    closingMessage?: string | null;
    closingVerseReference?: string | null;
    closingSignature?: string | null;
}

export function Closing(props: ClosingProps) {
    const coupleNames = props.coupleNames || WEDDING_CONFIG.coupleNames;
    const closingMessage = props.closingMessage || WEDDING_CONFIG.closingMessage;
    const closingVerseReference =
        props.closingVerseReference || WEDDING_CONFIG.closingVerseReference;
    const closingSignature =
        props.closingSignature || WEDDING_CONFIG.closingSignature;

    const couplePhoto = getAssetPath('beijo.webp');

    return (
        <section
            id="encerramento"
            className="relative isolate overflow-hidden bg-[#211D1A] px-gutter py-12 md:py-16 lg:py-20"
        >
            {/* Atmosfera de fundo */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10"
            >
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(197,168,120,0.09),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_20%,rgba(197,168,120,0.05),transparent_45%)]" />
            </div>

            <div className="mx-auto max-w-6xl">
                {/* Identificação da seção */}
                <div className="mb-10 flex items-center justify-center gap-4 md:mb-12">
                    <span className="h-px w-8 bg-[#C5A878]/50" />

                    <span className="text-center text-[9px] font-medium uppercase tracking-[0.35em] text-[#C5A878] md:text-[10px]">
                        Até sempre em nossos corações
                    </span>

                    <span className="h-px w-8 bg-[#C5A878]/50" />
                </div>

                {/* Composição em duas colunas */}
                <div className="grid items-center gap-10 md:grid-cols-[0.95fr_1.05fr] md:gap-12 lg:gap-20">

                    {/* Coluna esquerda — Fotografia e nomes */}
                    <div className="mx-auto w-full max-w-[420px] text-center">
                        <div
                            data-closing-photo
                            className="relative mx-auto aspect-[4/5] w-full max-w-[340px] border border-[#C5A878]/40 p-2 md:max-w-[380px] lg:max-w-[410px]"
                        >
                            <div className="relative h-full w-full overflow-hidden">
                                <Image
                                    src={couplePhoto}
                                    alt="Andrey e Amanda"
                                    fill
                                    unoptimized
                                    sizes="(max-width: 768px) 82vw, (max-width: 1200px) 38vw, 410px"
                                    className="object-cover object-center"
                                />

                                <div className="absolute inset-0 bg-gradient-to-t from-[#211D1A]/20 via-transparent to-transparent" />
                            </div>

                            <span
                                aria-hidden="true"
                                className="absolute -left-1 -top-1 h-8 w-8 border-l border-t border-[#D4B98C]"
                            />

                            <span
                                aria-hidden="true"
                                className="absolute -bottom-1 -right-1 h-8 w-8 border-b border-r border-[#D4B98C]"
                            />
                        </div>

                        <div className="mt-7">
                            <p className="mb-3 text-[9px] uppercase tracking-[0.35em] text-[#B9AEA0]">
                                Com amor e gratidão
                            </p>

                            <h2
                                data-closing-names
                                className="font-serif text-4xl font-normal leading-tight tracking-[-0.04em] text-[#F2EBDD] md:text-4xl lg:text-5xl"
                            >
                                {coupleNames}
                            </h2>

                            <div className="mt-5 flex items-center justify-center gap-3">
                                <span className="h-px w-8 bg-[#C5A878]/40" />

                                <Heart
                                    size={15}
                                    strokeWidth={1.2}
                                    className="text-[#C5A878]"
                                />

                                <span className="h-px w-8 bg-[#C5A878]/40" />
                            </div>
                        </div>
                    </div>

                    {/* Coluna direita — Mensagem e gratidão */}
                    <div className="flex flex-col items-center text-center md:items-start md:text-left">
                        <Sparkles
                            size={19}
                            strokeWidth={1.2}
                            className="mb-7 text-[#C5A878]"
                        />

                        <span className="mb-5 text-[9px] font-medium uppercase tracking-[0.3em] text-[#C5A878]">
                            Uma palavra para levar no coração
                        </span>

                        <p
                            data-closing-verse
                            className="font-serif text-3xl font-normal italic leading-snug tracking-[-0.025em] text-[#F2EBDD] md:text-3xl lg:text-4xl"
                        >
                            “{closingMessage}”
                        </p>

                        <div className="mt-6 flex items-center gap-3">
                            <span className="h-px w-7 bg-[#C5A878]/40" />

                            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-[#C5A878]">
                                {closingVerseReference}
                            </p>
                        </div>

                        <div className="my-9 h-px w-full max-w-md bg-[#C5A878]/20 md:my-10" />

                        <p
                            data-closing-signature
                            className="font-serif text-xl italic leading-relaxed text-[#D0B88F] md:text-2xl"
                        >
                            “{closingSignature}”
                        </p>

                        <div
                            data-closing-gratitude
                            className="mt-9 w-full border-l border-[#C5A878]/50 bg-[#C5A878]/[0.045] px-6 py-6 md:mt-10 md:px-7"
                        >
                            <p className="mb-3 text-[9px] font-medium uppercase tracking-[0.3em] text-[#C5A878]">
                                Nossa gratidão
                            </p>

                            <p className="font-serif text-base leading-relaxed text-[#E4D9C9] md:text-lg">
                                Agradecemos por fazer parte da nossa história.
                                Sua presença é o maior presente que podemos
                                receber neste dia tão especial.
                            </p>

                            <p className="mt-5 text-[9px] uppercase tracking-[0.25em] text-[#B99A6A]">
                                Com carinho, {coupleNames}
                            </p>
                        </div>

                        <div className="mt-8 flex items-center gap-3">
                            <Heart
                                size={14}
                                strokeWidth={1.2}
                                className="text-[#C5A878]/70"
                            />

                            <span className="text-[9px] uppercase tracking-[0.3em] text-[#A99B8B]">
                                Uma história que continua
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
