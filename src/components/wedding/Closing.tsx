import Image from 'next/image';
import { WEDDING_CONFIG, getAssetPath } from '@/config/wedding';

interface ClosingProps {
	coupleNames?: string | null;
	closingMessage?: string | null;
	closingVerseReference?: string | null;
	closingSignature?: string | null;
}

/**
 * Encerramento — Seção final com mensagem de gratidão e fé.
 * Recebe dados via props (Firestore) com fallback para WEDDING_CONFIG estático.
 * Utiliza fotografia real do casal e versículo bíblico.
 */
export function Closing(props: ClosingProps) {
	const coupleNames = props.coupleNames || WEDDING_CONFIG.coupleNames;
	const closingMessage = props.closingMessage || WEDDING_CONFIG.closingMessage;
	const closingVerseReference = props.closingVerseReference || WEDDING_CONFIG.closingVerseReference;
	const closingSignature = props.closingSignature || WEDDING_CONFIG.closingSignature;
	return (
		<section id="encerramento" className="relative overflow-hidden bg-primary-container py-space-2xl px-gutter">
			{/* Background sutil */}
			<div className="absolute inset-0 opacity-10">
				<Image
					src={getAssetPath('Abraço Romântico ao Pôr do Sol (1).png')}
					alt=""
					fill
					className="object-cover grayscale"
					sizes="100vw"
				/>
			</div>

			<div className="relative z-10 mx-auto max-w-2xl text-center">
				{/* Versículo de encerramento */}
				<p data-closing-verse className="text-headline-lg-mobile italic text-tertiary-fixed md:text-headline-lg">
					&ldquo;{closingMessage}&rdquo;
				</p>
				<p className="mt-space-sm text-label-md uppercase tracking-widest text-tertiary-fixed-dim/80">
					{closingVerseReference}
				</p>

				{/* Separador decorativo */}
				<div className="mx-auto my-space-xl h-px w-24 bg-tertiary-fixed-dim/30" />

				{/* Fotografia do casal */}
				<div data-closing-photo className="mx-auto mb-space-xl relative aspect-square w-48 overflow-hidden rounded-full border-4 border-tertiary-fixed-dim/20 shadow-2xl md:w-64">
					<Image
						src={getAssetPath('Abraço Romântico ao Pôr do Sol (1).png')}
						alt="Andrey e Amanda"
						fill
						className="object-cover"
						sizes="(max-width: 768px) 192px, 256px"
					/>
				</div>

				{/* Assinatura */}
				<h2 data-closing-names className="text-display-hero-mobile text-surface-container-lowest md:text-headline-lg">
					{coupleNames}
				</h2>
				<p data-closing-signature className="mt-space-md text-body-lg italic text-tertiary-fixed/90">
					&ldquo;{closingSignature}&rdquo;
				</p>

				{/* Mensagem final aos convidados */}
				<div data-closing-gratitude className="mt-space-2xl rounded-xl border border-tertiary-fixed-dim/10 bg-surface-container-lowest/5 p-space-lg backdrop-blur-sm">
					<p className="text-body-md text-surface-container-low/90">
						Agradecemos por fazer parte da nossa história. Sua presença é o maior presente que podemos receber neste dia tão especial.
					</p>
				</div>
			</div>
		</section>
	);
}