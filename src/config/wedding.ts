/**
 * Configuração Centralizada do Casamento Andrey e Amanda
 *
 * Valores oficiais do evento. São consumidos por todas as seções do convite,
 * painel administrativo e cartões digitais.
 *
 * IMPORTANTE: Não inventar datas ou endereços fictícios como definitivos.
 */

export const WEDDING_CONFIG = {
	coupleNames: 'Andrey & Amanda',
	monogram: 'A & A',

	// Data do evento — ISO 8601 com timezone America/Sao_Paulo
	// 12 de dezembro de 2026 às 19h
	eventDate: '2026-12-12T19:00:00-03:00',
	timezone: 'America/Sao_Paulo',

	// Horários
	ceremonyTime: '19:00',
	receptionTime: null as string | null,

	// Local — será preenchido via painel admin
	venueName: null as string | null,
	venueAddress: null as string | null,
	mapsUrl: null as string | null,
	wazeUrl: null as string | null,

	// Dress code
	dressCode: null as string | null,

	// Prazo RSVP
	rsvpDeadline: null as string | null,
	rsvpEnabled: true,

	// Mensagens cristãs
	heroMessage: 'Deus escreveu a nossa história. Agora, diante d\'Ele, escolhemos viver o nosso para sempre.',
	heroVerse: 'E, sobre tudo isto, revesti-vos de amor, que é o vínculo da perfeição.',
	heroVerseReference: 'Colossenses 3:14',

	closingMessage: 'Até aqui o Senhor nos ajudou.',
	closingVerseReference: '1 Samuel 7:12',
	closingSignature: 'Com Deus à frente, o amor nos conduz.',

	// Seção Nossa História
	storyTitle: 'Nossa História',
	storySubtitle: 'Uma história escrita por Deus, vivida por nós.',

	storyTimeline: [
		{
			year: '2011',
			label: 'Os primeiros olhares',
			title: 'Onde tudo começou',
			description: 'Em meio à rotina de uma pequena loja no centro de Suzano e aos caminhos que o Andrey percorria todos os dias, nossos olhares começaram a se encontrar. Entre cumprimentos, sorrisos discretos e uma amizade sincera, algo bonito começava a nascer.',
			imageAsset: 'image.png',
		},
		{
			year: '2021',
			label: 'Nosso reencontro',
			title: 'Um simples "oi"',
			description: 'Dez anos depois, nossos caminhos se cruzaram novamente. O que parecia ser somente um reencontro se transformou em conversas, novos sorrisos, um pedido de namoro e no início de uma das partes mais bonitas das nossas vidas.',
			imageAsset: 'WhatsApp Image 2026-11-14 at 20.14.43.jpeg',
		},
		{
			year: '',
			label: 'Nossa caminhada',
			title: 'Amor que amadureceu',
			description: 'Encontramos um no outro acolhimento, companheirismo, compreensão e um amor que nos ajudou a crescer e a cuidar das feridas do passado. Em cada etapa, Deus foi nos ensinando que o verdadeiro amor se constrói na fé, na parceria e na decisão diária de cuidar um do outro.',
			imageAsset: 'bannerHero.png',
		},
		{
			year: '',
			label: 'Nossa aliança',
			title: 'Um novo capítulo',
			description: 'Hoje firmamos uma aliança diante de Deus, colocando Jesus Cristo no centro da nossa família e entregando a Ele todos os capítulos que ainda vamos escrever.',
			imageAsset: 'Abraço Romântico ao Pôr do Sol (1).png',
		},
	] as const,

	// Texto completo da história
	storyFullText: `Nossa história começou em 2011, de um jeito simples, daqueles que a gente nem imagina que um dia se transformarão em algo tão especial.

Em meio à rotina de uma pequena loja no centro de Suzano e aos caminhos que o Andrey percorria todos os dias, nossos olhares começaram a se encontrar. Entre cumprimentos, sorrisos discretos e uma amizade sincera, algo bonito começava a nascer. Naquele momento, não sabíamos o que o futuro nos reservava, muito menos que aqueles pequenos encontros fariam parte de uma história tão grande.

Mas a vida tinha outros caminhos para nós.

O tempo passou, seguimos direções diferentes, vivemos nossas próprias histórias, enfrentamos desafios, conhecemos alegrias e também atravessamos momentos difíceis. Foram anos de aprendizados, mudanças e amadurecimento.

Até que, dez anos depois, em 2021, nossos caminhos se cruzaram novamente.

E pensar que tudo começou com a intenção de dar apenas um simples "oi"...

O que parecia ser somente um reencontro se transformou em conversas, novos sorrisos, um pedido de namoro e, sem que percebêssemos, no início de uma das partes mais bonitas das nossas vidas.

Dessa vez, já não éramos as mesmas pessoas de 2011. Carregávamos experiências, algumas cicatrizes e muitos sonhos. Mas encontramos um no outro algo que talvez nem soubéssemos que precisávamos: acolhimento, companheirismo, compreensão e um amor que nos ajudou a crescer e a cuidar das feridas do passado.

Não foi uma caminhada sem desafios. Aprendemos que amar também é ter paciência, perdoar, compreender, escolher ficar e, principalmente, caminhar juntos, mesmo quando a estrada não é tão fácil.

E, em cada etapa, Deus foi nos ensinando que o verdadeiro amor não se constrói apenas nos dias felizes, mas também na fé, na parceria e na decisão diária de cuidar um do outro.

Hoje, quando olhamos para trás, conseguimos enxergar algo que antes não compreendíamos: Deus estava presente em cada detalhe da nossa história, mesmo quando ainda não conseguíamos perceber.

Ele conhecia nossos caminhos, nossas dores, nossos sonhos e tudo aquilo que ainda viveríamos. E, no tempo certo, permitiu que nossas vidas se encontrassem novamente.

Aquele olhar de 2011 continua aqui.

Mas agora ele carrega muito mais do que admiração. Carrega a certeza de um amor que amadureceu, de uma história que foi construída dia após dia e de dois corações que escolheram seguir na mesma direção.

E é por isso que estamos aqui.

Não apenas para celebrar o amor que sentimos, mas para firmar uma aliança diante de Deus, colocando Jesus Cristo no centro da nossa família e entregando a Ele todos os capítulos que ainda vamos escrever.

Porque, se aprendemos alguma coisa durante essa caminhada, é que o amor verdadeiro não é apenas encontrar alguém com quem dividir os dias, mas encontrar alguém com quem queremos viver os propósitos de Deus.

Nossa história começou com um olhar, ganhou um novo capítulo com um reencontro e agora se transforma em uma promessa para toda a vida.

E, se Deus nos permitiu chegar até aqui, é com Ele à frente que queremos continuar.`,
};

/**
 * Verifica se a data do evento está configurada.
 */
export function isEventDateConfigured(): boolean {
	return WEDDING_CONFIG.eventDate !== null && WEDDING_CONFIG.eventDate !== '';
}

/**
 * Retorna a data do evento como Date ou null se não configurada.
 */
export function getEventDate(): Date | null {
	if (!WEDDING_CONFIG.eventDate) return null;
	return new Date(WEDDING_CONFIG.eventDate);
}

/**
 * Mapeia nome do asset para caminho público.
 * As imagens devem estar em public/assets/ para serem servidas pelo Next.js.
 */
export function getAssetPath(assetName: string): string {
	return `/assets/${assetName}`;
}