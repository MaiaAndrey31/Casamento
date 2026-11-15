import Link from 'next/link';
import { Heart, Mail, CheckCircle } from 'lucide-react';
import { WEDDING_CONFIG } from '@/config/wedding';

/**
 * Página Pública de Confirmação de Presença — /confirmar-presenca
 *
 * Esta página NÃO permite confirmar presença diretamente.
 * A confirmação é realizada exclusivamente através do convite personalizado
 * enviado aos convidados, que contém um token seguro de acesso.
 *
 * Objetivo: orientar visitantes que acessaram esta rota sem um link válido,
 * mantendo a segurança do fluxo de RSVP e a identidade visual do casamento.
 */
export default function ConfirmarPresencaPage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-surface px-gutter py-space-2xl">
			<div className="w-full max-w-lg space-y-space-xl text-center">
				{/* Monograma */}
				<div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-tertiary-fixed-dim/30 bg-primary-container shadow-md">
					<span className="text-headline-md text-tertiary-fixed-dim">
						{WEDDING_CONFIG.monogram}
					</span>
				</div>

				{/* Título */}
				<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
					Confirmação de Presença
				</h1>

				{/* Mensagem principal */}
				<p className="text-body-lg leading-relaxed text-on-surface-variant">
					A confirmação de presença para o casamento de{' '}
					<strong className="text-primary-container">{WEDDING_CONFIG.coupleNames}</strong>{' '}
					é realizada exclusivamente através do <strong>convite personalizado</strong> enviado a cada convidado.
				</p>

				{/* Card informativo */}
				<div className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-space-lg shadow-sm text-left">
					<div className="mb-space-md flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container/50">
							<CheckCircle size={20} className="text-primary-container" />
						</div>
						<div>
							<h3 className="text-title-md text-primary">Como confirmar sua presença?</h3>
							<p className="mt-space-xs text-body-md text-on-surface-variant">
								Localize a mensagem que enviamos pelo WhatsApp ou e-mail com o seu convite personalizado.
								O link exclusivo contém um código seguro que identifica você e sua família.
							</p>
						</div>
					</div>

					<div className="mb-space-md flex items-start gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container/50">
							<Mail size={20} className="text-primary-container" />
						</div>
						<div>
							<h3 className="text-title-md text-primary">Não recebeu seu convite?</h3>
							<p className="mt-space-xs text-body-md text-on-surface-variant">
								Entre em contato conosco para que possamos enviar o seu link personalizado.
								Cada convite é único e não pode ser compartilhado.
							</p>
						</div>
					</div>
				</div>

				{/* Versículo */}
				<div className="space-y-space-xs">
					<p className="text-body-md italic text-secondary">
						&ldquo;{WEDDING_CONFIG.heroVerse}&rdquo;
					</p>
					<p className="text-label-md uppercase tracking-widest text-on-surface-variant">
						{WEDDING_CONFIG.heroVerseReference}
					</p>
				</div>

				{/* CTA para voltar ao início */}
				<Link
					href="/"
					className="inline-flex items-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-surface"
				>
					<Heart size={16} />
					Voltar ao Início
				</Link>

				{/* Assinatura */}
				<p className="text-body-sm text-on-surface-variant">
					Com amor, <strong className="text-primary-container">{WEDDING_CONFIG.coupleNames}</strong>
				</p>
			</div>
		</main>
	);
}