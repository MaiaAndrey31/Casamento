import { Hero } from '@/components/wedding/Hero';
import { Countdown } from '@/components/wedding/Countdown';
import { StoryAnimations } from '@/components/wedding/StoryAnimations';
import { EventDetails } from '@/components/wedding/EventDetails';
import { Messages } from '@/components/wedding/Messages';
import { Closing } from '@/components/wedding/Closing';
import { WeddingNavigation } from '@/components/wedding/WeddingNavigation';
import { SectionAnimations } from '@/components/wedding/SectionAnimations';

/**
 * Página Inicial — Convite Público Completo
 *
 * Integra todas as seções do convite digital preservando o design do Google Stitch.
 * Animações GSAP são aplicadas via componentes client-side separados.
 * A navegação mobile é renderizada como componente client-side separado.
 */
export default function HomePage() {
	return (
 <>
 <SectionAnimations />
 <main className="pb-16 md:pb-0">
 <Hero />
 <Countdown />
 <StoryAnimations />
 <EventDetails />
 <Messages />
 <Closing />
 </main>
 <WeddingNavigation />
 </>
	);
}