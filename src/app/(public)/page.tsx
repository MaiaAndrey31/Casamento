import { HeroWithContext } from '@/components/wedding/HeroWithContext';
import { Countdown } from '@/components/wedding/Countdown';
import { StoryAnimations } from '@/components/wedding/StoryAnimations';
import { EventDetails } from '@/components/wedding/EventDetails';
import { Messages } from '@/components/wedding/Messages';
import { Closing } from '@/components/wedding/Closing';
import { WeddingNavigation } from '@/components/wedding/WeddingNavigation';
import { SectionAnimations } from '@/components/wedding/SectionAnimations';
import { getActiveEvent } from '@/lib/repositories/event.repository';

/**
 * Página Inicial — Convite Público Completo
 *
 * Integra todas as seções do convite digital preservando o design do Google Stitch.
 * Carrega dados do Firestore e repassa como props aos componentes.
 * NOTA: Esta é uma página PÚBLICA. O endereço completo NÃO é exibido aqui
 * por questões de privacidade (espaço particular/residencial).
 * O endereço completo aparece apenas no convite individual /convite/[token].
 */
export default async function HomePage() {
	const event = await getActiveEvent();

	return (
		<>
			<SectionAnimations />
			<main className="pb-16 md:pb-0">
				<HeroWithContext
					heroMessage={event?.heroMessage}
					heroVerse={event?.heroVerse}
					heroVerseReference={event?.heroVerseReference}
					eventDate={event?.eventDate}
					timezone={event?.timezone}
				/>
				<Countdown
					eventDate={event?.eventDate}
					timezone={event?.timezone}
				/>
				<StoryAnimations />
				<EventDetails
					eventDate={event?.eventDate}
					timezone={event?.timezone}
					ceremonyTime={event?.ceremonyTime}
					receptionTime={event?.receptionTime}
					venueName={event?.venueName}
					venueAddress={event?.venueAddress}
					mapsUrl={event?.mapsUrl}
					wazeUrl={event?.wazeUrl}
					dressCode={event?.dressCode}
					mode="public"
				/>
				<Messages />
				<Closing
					coupleNames={event?.coupleNames}
					closingMessage={event?.closingMessage}
					closingVerseReference={event?.closingVerseReference}
					closingSignature={event?.closingSignature}
				/>
			</main>
			<WeddingNavigation />
		</>
	);
}