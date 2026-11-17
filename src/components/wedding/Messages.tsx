
'use client';

import { useState } from 'react';
import { Send, Heart, Feather, Sparkles } from 'lucide-react';

export function Messages() {
    const [formData, setFormData] = useState({
        authorName: '',
        message: '',
    });

    const [status, setStatus] = useState<'idle' | 'unavailable'>('idle');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Backend ainda não configurado: não simular envio.
        setStatus('unavailable');
    };

    return (
        <section
            id="recados"
            className="relative overflow-hidden bg-[#211D1A] px-gutter py-24 md:py-32"
        >
            {/* Textura e elementos decorativos */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 opacity-[0.035]"
                
            />

            <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-40 top-20 h-96 w-96 rounded-full bg-[#B99A6A]/[0.06] blur-[100px]"
            />

            <div className="relative mx-auto max-w-6xl">
                {/* Cabeçalho editorial */}
                <div
                    data-messages-title
                    className="mx-auto mb-16 max-w-3xl text-center md:mb-20"
                >
                    <div className="mb-7 flex items-center justify-center gap-4">
                        <span className="h-px w-10 bg-[#B99A6A]/50" />
                        <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-[#C5A878]">
                            Palavras que ficam
                        </span>
                        <span className="h-px w-10 bg-[#B99A6A]/50" />
                    </div>

                    <div className="mb-6 flex justify-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#B99A6A]/30 text-[#C5A878]">
                            <Heart size={23} strokeWidth={1.2} />
                        </div>
                    </div>

                    <h2 className="font-serif text-4xl font-normal leading-tight tracking-[-0.035em] text-[#F2EBDD] md:text-6xl">
                        Uma palavra
                        <span className="block italic text-[#C5A878]">
                            para guardar.
                        </span>
                    </h2>

                    <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#B9AEA0] md:text-base">
                        Existem momentos que merecem ser lembrados por toda a
                        vida. Deixe aqui uma mensagem, uma oração ou um desejo
                        especial para o início da nossa caminhada.
                    </p>
                </div>

                {/* Composição principal */}
                <div
                    data-messages-card
                    className="mx-auto grid max-w-5xl overflow-hidden border border-[#C5A878]/20 bg-[#29231F] md:grid-cols-[0.8fr_1.2fr]"
                >
                    {/* Painel lateral */}
                    <div className="relative flex min-h-[260px] flex-col justify-between overflow-hidden border-b border-[#C5A878]/20 p-8 md:min-h-[540px] md:border-b-0 md:border-r md:p-10 lg:p-12">
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full border border-[#C5A878]/10"
                        />
                        <div
                            aria-hidden="true"
                            className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full border border-[#C5A878]/10"
                        />

                        <div className="relative">
                            <Sparkles
                                size={19}
                                strokeWidth={1.2}
                                className="mb-8 text-[#C5A878]"
                            />

                            <p className="font-serif text-2xl leading-relaxed text-[#F2EBDD] md:text-3xl">
                                “O amor se torna ainda mais bonito quando é
                                compartilhado.”
                            </p>

                            <div className="mt-7 h-px w-12 bg-[#B99A6A]/60" />
                        </div>

                        <div className="relative mt-10 flex items-center gap-3">
                            <Feather
                                size={17}
                                strokeWidth={1.2}
                                className="text-[#C5A878]"
                            />
                            <span className="text-[10px] uppercase tracking-[0.25em] text-[#B9AEA0]">
                                Andrey & Amanda
                            </span>
                        </div>

                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute bottom-16 right-8 font-serif text-8xl italic text-[#C5A878]/[0.06] md:bottom-20 md:right-10 md:text-9xl"
                        >
                            &“
                        </span>
                    </div>

                    {/* Formulário / indisponibilidade */}
                    <div className="p-7 md:p-10 lg:p-12">
                        {status === 'unavailable' ? (
                            <div className="flex min-h-[400px] flex-col items-center justify-center text-center md:min-h-[440px]">
                                <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-full border border-[#C5A878]/30 text-[#C5A878]">
                                    <Heart size={25} strokeWidth={1.2} />
                                </div>

                                <span className="mb-4 text-[10px] uppercase tracking-[0.3em] text-[#C5A878]">
                                    Livro de mensagens
                                </span>

                                <h3 className="font-serif text-3xl text-[#F2EBDD] md:text-4xl">
                                    Em breve.
                                </h3>

                                <p className="mt-5 max-w-sm text-sm leading-7 text-[#B9AEA0]">
                                    Estamos preparando este espaço com muito
                                    carinho para receber suas palavras. O envio
                                    de mensagens estará disponível em breve.
                                </p>

                                <button
                                    onClick={() => {
                                        setStatus('idle');
                                        setFormData({
                                            authorName: '',
                                            message: '',
                                        });
                                    }}
                                    className="mt-9 border-b border-[#C5A878]/60 pb-1 text-[10px] uppercase tracking-[0.25em] text-[#C5A878] transition-colors hover:border-[#F2EBDD] hover:text-[#F2EBDD]"
                                >
                                    Voltar ao formulário
                                </button>
                            </div>
                        ) : (
                            <form
                                data-messages-form
                                onSubmit={handleSubmit}
                                className="flex flex-col gap-7"
                            >
                                <div>
                                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#C5A878]">
                                        Seu carinho em palavras
                                    </span>

                                    <h3 className="mt-3 font-serif text-2xl text-[#F2EBDD] md:text-3xl">
                                        Escreva para nós
                                    </h3>

                                    <p className="mt-3 text-sm leading-6 text-[#B9AEA0]">
                                        Cada mensagem representa um pedacinho
                                        especial deste dia.
                                    </p>
                                </div>

                                <div>
                                    <label
                                        htmlFor="authorName"
                                        className="mb-3 block text-[10px] font-medium uppercase tracking-[0.2em] text-[#C5A878]"
                                    >
                                        Seu nome
                                    </label>

                                    <input
                                        id="authorName"
                                        type="text"
                                        required
                                        minLength={2}
                                        maxLength={100}
                                        value={formData.authorName}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                authorName: e.target.value,
                                            }))
                                        }
                                        placeholder="Como gostaria de assinar?"
                                        className="w-full border-b border-[#C5A878]/30 bg-transparent px-0 py-3 text-sm text-[#F2EBDD] outline-none transition-colors placeholder:text-[#A99B8B]/50 focus:border-[#C5A878]"
                                    />
                                </div>

                                <div>
                                    <label
                                        htmlFor="message"
                                        className="mb-3 block text-[10px] font-medium uppercase tracking-[0.2em] text-[#C5A878]"
                                    >
                                        Sua mensagem ou oração
                                    </label>

                                    <textarea
                                        id="message"
                                        required
                                        minLength={10}
                                        maxLength={2000}
                                        rows={5}
                                        value={formData.message}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                message: e.target.value,
                                            }))
                                        }
                                        placeholder="Escreva uma mensagem de carinho, uma oração ou seus votos para o casal..."
                                        className="w-full resize-y border-b border-[#C5A878]/30 bg-transparent px-0 py-3 text-sm leading-7 text-[#F2EBDD] outline-none transition-colors placeholder:text-[#A99B8B]/50 focus:border-[#C5A878]"
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        className="group inline-flex w-full items-center justify-center gap-3 bg-[#B99A6A] px-7 py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#211D1A] transition-all duration-300 hover:bg-[#D0B88F] focus:outline-none focus:ring-2 focus:ring-[#D0B88F] focus:ring-offset-2 focus:ring-offset-[#29231F] sm:w-auto"
                                    >
                                        <Send
                                            size={15}
                                            strokeWidth={1.8}
                                            className="transition-transform duration-300 group-hover:translate-x-1"
                                        />
                                        Enviar mensagem
                                    </button>

                                    <p className="mt-5 text-xs leading-5 text-[#A99B8B]/70">
                                        Suas palavras serão recebidas com todo
                                        o carinho que este momento merece.
                                    </p>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Assinatura inferior */}
                <div className="mt-12 flex items-center justify-center gap-4">
                    <span className="h-px w-8 bg-[#C5A878]/30" />
                    <Heart
                        size={12}
                        strokeWidth={1.2}
                        className="text-[#C5A878]/70"
                    />
                    <span className="h-px w-8 bg-[#C5A878]/30" />
                </div>
            </div>
        </section>
    );
}
