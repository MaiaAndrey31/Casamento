'use client';

import { Hero } from './Hero';
import { useInvitationContext } from '@/hooks/useInvitationContext';

interface HeroWithContextProps {
	heroMessage?: string | null;
	heroVerse?: string | null;
	heroVerseReference?: string | null;
	eventDate?: string | null;
	timezone?: string | null;
}

/**
 * Wrapper client do Hero que injeta automaticamente o contexto do convite.
 *
 * A página pública (Server Component) não pode usar hooks diretamente.
 * Este componente bridge lê o token persistido em sessionStorage via
 * useInvitationContext e repassa invitationUrl ao Hero, garantindo que
 * o CTA "Confirmar Presença" redirecione ao convite individual correto
 * mesmo quando o usuário navegou para outras seções do site.
 */
export function HeroWithContext(props: HeroWithContextProps) {
	const { invitationUrl } = useInvitationContext();

	return (
		<Hero
			heroMessage={props.heroMessage}
			heroVerse={props.heroVerse}
			heroVerseReference={props.heroVerseReference}
			eventDate={props.eventDate}
			timezone={props.timezone}
			invitationUrl={invitationUrl}
		/>
	);
}