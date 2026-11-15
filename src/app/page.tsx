import { Hero } from '@/components/wedding/Hero';
import { Countdown } from '@/components/wedding/Countdown';
import { OurStory } from '@/components/wedding/OurStory';
import { EventDetails } from '@/components/wedding/EventDetails';
import { Messages } from '@/components/wedding/Messages';
import { Closing } from '@/components/wedding/Closing';
import { WeddingNavigation } from '@/components/wedding/WeddingNavigation';

/**
 * Página Inicial — Convite Público Completo
 *
 * Integra todas as seções do convite digital preservando o design do Google Stitch.
 * A navegação mobile é renderizada como componente client-side separado.
 */
export default function HomePage() {
	return (
		<>
			<main className="pb-16 md:pb-0">
				<Hero />
				<Countdown />
				<OurStory />
				<EventDetails />
				<Messages />
				<Closing />
			</main>
			<WeddingNavigation />
		</>
	);
}