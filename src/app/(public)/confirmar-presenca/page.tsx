
import Link from 'next/link';
import { Heart, Mail, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

export default function ConfirmarPresencaPage() {
	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#14251D] px-5 pt-32 pb-8 sm:px-8 sm:py-8">
			{/* Fundo */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-[#D6A45B]/[0.06] blur-[90px]" />
				<div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#D6A45B]/[0.05] blur-[90px]" />
				<div className="absolute inset-0 bg-[linear-gradient(rgba(229,197,141,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(229,197,141,0.02)_1px,transparent_1px)] bg-[size:48px_48px]" />
			</div>

			<div className="relative z-10 grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
				{/* Coluna esquerda */}
				<section className="flex flex-col items-center text-center lg:items-start lg:text-left">
					{/* Foto do casal */}
					<div className="mb-5 relative h-16 w-16 overflow-hidden rounded-full border border-[#D6A45B]/50 bg-[#1E3026] shadow-[0_0_30px_rgba(214,164,91,0.12)] ring-4 ring-[#D6A45B]/[0.05]">
						<Image
							src={getAssetPath('005.jpeg')}
							alt="Andrey e Amanda"
							width={64}
							height={64}
							sizes="64px"
							className="h-full w-full object-cover"
							unoptimized
						/>
					</div>
					<p className="mb-2 text-[9px] font-semibold uppercase tracking-[0.32em] text-[#D6A45B]">
						Um momento especial
					</p>

					<h1 className="font-serif text-3xl leading-tight text-[#F5EFE3] sm:text-4xl xl:text-5xl">
						Confirmação de
						<span className="block italic text-[#E5C58D]">
							Presença
						</span>
					</h1>

					<div className="my-4 flex items-center gap-3">
						<span className="h-px w-9 bg-[#D6A45B]/40" />
						<Heart size={12} className="fill-[#D6A45B] text-[#D6A45B]" />
						<span className="h-px w-9 bg-[#D6A45B]/40" />
					</div>

					<p className="max-w-md text-sm leading-7 text-[#C4C5B9]">
						A confirmação de presença para o casamento de{' '}
						<strong className="font-medium text-[#E5C58D]">
							{WEDDING_CONFIG.coupleNames}
						</strong>{' '}
						é realizada exclusivamente através do convite personalizado
						enviado a cada convidado.
					</p>

					{/* Versículo */}
					<div className="mt-6 border-l border-[#D6A45B]/40 pl-4 text-left">
						<p className="font-serif text-base italic leading-relaxed text-[#E5C58D]">
							&ldquo;{WEDDING_CONFIG.heroVerse}&rdquo;
						</p>
						<p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-[#B5B0A3]/70">
							{WEDDING_CONFIG.heroVerseReference}
						</p>
					</div>

					{/* Botão */}
					<Link
						href="/"
						className="group mt-7 inline-flex items-center justify-center gap-2 rounded-full bg-[#D6A45B] px-7 py-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#14251D] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#E5C58D] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#E5C58D] focus:ring-offset-2 focus:ring-offset-[#14251D]"
					>
						<Heart size={14} className="transition-transform group-hover:scale-110" />
						Voltar ao Início
					</Link>

					<p className="mt-5 text-[11px] text-[#B5B0A3]/70">
						Com amor,{' '}
						<strong className="font-medium text-[#E5C58D]">
							{WEDDING_CONFIG.coupleNames}
						</strong>
					</p>
				</section>

				{/* Coluna direita */}
				<section className="rounded-2xl border border-[#D6A45B]/20 bg-[#1B2D23]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.2)] sm:p-7">
					<div className="mb-6">
						<p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-[#D6A45B]">
							Informações importantes
						</p>
						<h2 className="mt-1 font-serif text-2xl text-[#F5EFE3]">
							Sobre seu convite
						</h2>
					</div>

					{/* Como confirmar */}
					<div className="flex items-start gap-4">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D6A45B]/20 bg-[#D6A45B]/[0.09]">
							<CheckCircle size={20} className="text-[#E5C58D]" />
						</div>

						<div>
							<h3 className="font-serif text-lg text-[#F5EFE3]">
								Como confirmar sua presença?
							</h3>
							<p className="mt-2 text-sm leading-6 text-[#B5B0A3]">
								Localize a mensagem que enviamos pelo WhatsApp ou e-mail
								com o seu convite personalizado. O link exclusivo contém
								um código seguro que identifica você e sua família.
							</p>
						</div>
					</div>

					<div className="my-6 h-px bg-[#D6A45B]/15" />

					{/* Não recebeu */}
					<div className="flex items-start gap-4">
						<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D6A45B]/20 bg-[#D6A45B]/[0.09]">
							<Mail size={20} className="text-[#E5C58D]" />
						</div>

						<div>
							<h3 className="font-serif text-lg text-[#F5EFE3]">
								Não recebeu seu convite?
							</h3>
							<p className="mt-2 text-sm leading-6 text-[#B5B0A3]">
								Entre em contato conosco para que possamos enviar seu
								link personalizado. Cada convite é único e não pode
								ser compartilhado.
							</p>
						</div>
					</div>

					<div className="mt-7 rounded-xl border border-[#D6A45B]/15 bg-[#14251D]/50 px-4 py-3">
						<p className="text-center text-xs leading-5 text-[#B5B0A3]">
							<span className="font-medium text-[#E5C58D]">
								Importante:
							</span>{' '}
							esta página não realiza confirmações. É necessário utilizar
							o link exclusivo recebido no convite.
						</p>
					</div>
				</section>
			</div>
		</main>
	);
}
