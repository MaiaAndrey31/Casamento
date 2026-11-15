/**
 * Fonte única de conteúdo da história de Andrey & Amanda.
 *
 * Esta é a versão canônica da narrativa. Todos os componentes que renderizam
 * a seção "Nossa História" (home e página completa) devem consumir estes dados.
 *
 * NÃO altere o texto sem autorização explícita dos noivos.
 * As imagens referenciadas devem existir em public/assets/.
 */

export interface StoryChapter {
	id: string;
	year: string | null;
	title: string;
	paragraphs: string[];
	image: string;
	imageAlt: string;
	imagePosition: 'left' | 'right';
}

export interface OurStoryContent {
	subtitle: string;
	intro: string;
	chapters: StoryChapter[];
	closingQuote: string;
	closingVerse: string;
	closingVerseReference: string;
	signature: string;
}

/**
 * Mapeamento de fotografias reais por capítulo.
 * Todas as 7 fotos de public/assets/ são utilizadas ao menos uma vez.
 *
 * Home timeline (resumo): 001.jpeg, 005.jpeg, 010.jpeg
 * Página completa: todas as 7 distribuídas entre capítulos e galeria
 */
export const OUR_STORY: OurStoryContent = {
	subtitle: 'Uma história escrita por Deus, vivida por nós.',
	intro: '',

	chapters: [
		{
			id: 'onde-tudo-comecou',
			year: '2011',
			title: 'Onde tudo começou',
			paragraphs: [
				'Existem histórias que começam com grandes acontecimentos. A nossa começou de uma maneira muito mais simples: com olhares.',
				'Em 2011, nossos caminhos se cruzavam perto de uma pequena loja no centro de Suzano, em São Paulo. Em meio à rotina, aos cumprimentos sinceros e aos olhares que se encontravam, algo bonito começava a surgir, mesmo que ainda não soubéssemos o que aquilo significaria no futuro.',
				'Não tivemos um encontro, não começamos a namorar e nem imaginávamos que um dia estaríamos contando essa história juntos.',
				'Eram apenas dois caminhos que se cruzavam, dois olhares e uma lembrança que, de alguma maneira, permaneceria guardada.',
				'Naquele momento, não sabíamos, mas nossa história ainda teria muitos capítulos.',
			],
			image: '001.jpeg',
			imageAlt: 'Andrey e Amanda em 2011 — os primeiros olhares em Suzano',
			imagePosition: 'right',
		},
		{
			id: 'caminhos-da-vida',
			year: null,
			title: 'Os caminhos que a vida nos fez percorrer',
			paragraphs: [
				'O tempo passou e a vida nos levou por direções diferentes.',
				'Cada um seguiu sua jornada, construiu experiências, viveu outros relacionamentos e enfrentou suas próprias batalhas.',
				'Nem todos os dias foram fáceis. Houve momentos de dificuldade, de aprendizado, de recomeço e de transformação.',
				'Vivemos situações que nos ensinaram sobre a vida, sobre o amor e, principalmente, sobre quem estávamos nos tornando.',
				'Naquela época, não compreendíamos todos os caminhos que precisávamos percorrer.',
				'Hoje, olhando para trás, conseguimos enxergar que cada experiência fez parte da nossa caminhada.',
			],
			image: '002.jpeg',
			imageAlt: 'Andrey e Amanda — caminhos da vida e amadurecimento',
			imagePosition: 'left',
		},
		{
			id: 'reencontro',
			year: '2021',
			title: 'Quando nossos caminhos se encontraram novamente',
			paragraphs: [
				'Dez anos depois daqueles primeiros olhares, a vida nos surpreendeu.',
				'Em 2021, nossos caminhos se cruzaram novamente.',
				'E tudo recomeçou com algo tão simples quanto havia começado: um "oi".',
				'Dessa vez, porém, éramos pessoas diferentes. Trazíamos conosco histórias, experiências, aprendizados e marcas de tudo aquilo que havíamos vivido.',
				'O que começou como uma conversa foi se transformando em aproximação, carinho e, aos poucos, em um sentimento que crescia.',
				'A amizade deu espaço a algo maior, e chegou o momento em que decidimos começar nosso namoro.',
				'Aqueles dois caminhos que haviam se cruzado tantos anos antes finalmente começaram a seguir na mesma direção.',
			],
			image: '003.jpeg',
			imageAlt: 'Andrey e Amanda em 2021 — o reencontro que mudou tudo',
			imagePosition: 'right',
		},
		{
			id: 'amor-que-amadureceu',
			year: null,
			title: 'Um amor que nos ensinou a crescer',
			paragraphs: [
				'Nossa caminhada juntos não foi construída apenas de momentos felizes.',
				'Também enfrentamos desafios, aprendemos a compreender nossas diferenças e descobrimos que amar vai muito além de compartilhar os dias bons.',
				'Aprendemos sobre paciência, respeito, perdão, companheirismo e sobre a importância de permanecer lado a lado.',
				'Encontramos um no outro acolhimento e a oportunidade de construir uma história diferente, com mais maturidade e cuidado.',
				'Crescemos como pessoas e como casal.',
				'A cada etapa, fomos descobrindo que o amor verdadeiro não é apenas um sentimento bonito, mas também uma escolha diária: a escolha de cuidar, respeitar, apoiar e continuar caminhando juntos.',
				'E, acima de tudo, aprendemos a colocar nossa história nas mãos de Deus.',
			],
			image: '005.jpeg',
			imageAlt: 'Andrey e Amanda — amor que amadureceu com fé e parceria',
			imagePosition: 'left',
		},
		{
			id: 'deus-cuidou',
			year: null,
			title: 'Deus cuidou de cada detalhe',
			paragraphs: [
				'Quando olhamos para tudo o que vivemos, percebemos que nossa história é muito maior do que aquele primeiro olhar em 2011 ou o reencontro em 2021.',
				'Ela também é feita de tudo o que aprendemos enquanto estávamos separados e de tudo o que construímos desde que decidimos ficar juntos.',
				'Nem sempre entendemos o tempo de Deus.',
				'Às vezes, queremos respostas imediatas, mas existem histórias que precisam de tempo para amadurecer.',
				'Hoje, somos gratos por cada capítulo que nos trouxe até aqui.',
				'Por cada recomeço, por cada aprendizado, por cada oração e por cada oportunidade de escolher o amor novamente.',
				'Nossa fé nos lembra que não queremos apenas compartilhar uma vida, mas construir uma família firmada nos princípios de Cristo.',
			],
			image: '008.jpeg',
			imageAlt: 'Andrey e Amanda — gratidão e fé na caminhada',
			imagePosition: 'right',
		},
		{
			id: 'para-sempre',
			year: '2026',
			title: 'O nosso para sempre',
			paragraphs: [
				'E agora chegamos a um dos capítulos mais importantes da nossa história.',
				'No dia 12 de dezembro de 2026, às 19h, estaremos diante de Deus para celebrar nossa união.',
				'Será o momento de transformar em aliança tudo aquilo que construímos ao longo desses anos.',
				'Não estamos celebrando uma história perfeita. Estamos celebrando uma história real, marcada por aprendizados, superações, recomeços, amor e fé.',
				'Queremos continuar crescendo juntos, compartilhando sonhos, enfrentando desafios e construindo um lar onde Jesus Cristo esteja sempre no centro.',
				'Aqueles olhares de 2011, que pareciam tão simples, hoje fazem parte de algo que jamais poderíamos imaginar naquela época.',
				'E o mais bonito é saber que nossa história não termina no casamento.',
				'Na verdade, um novo capítulo está apenas começando.',
				'Porque Deus escreveu a nossa história. E agora, diante d\'Ele, escolhemos viver o nosso para sempre.',
			],
			image: '010.jpeg',
			imageAlt: 'Andrey e Amanda — aliança diante de Deus, 12 de dezembro de 2026',
			imagePosition: 'left',
		},
	],

	closingQuote: 'Assim, eles já não são dois, mas sim uma só carne. Portanto, o que Deus uniu, ninguém separe.',
	closingVerse: 'Marcos 10:8–9',
	closingVerseReference: 'Marcos 10:8–9',
	signature: 'Andrey & Amanda',
};

/**
 * Fotografias da galeria complementar na página /nossa-historia.
 * Inclui fotos não usadas nos capítulos principais + bannerHero como foto destaque.
 */
export const GALLERY_PHOTOS = [
	{ src: '0001.png', alt: 'Andrey e Amanda — momento especial' },
	{ src: 'bannerHero.png', alt: 'Andrey e Amanda — banner do casal' },
	{ src: 'Abraço Romântico ao Pôr do Sol (1).png', alt: 'Abraço romântico ao pôr do sol' },
	{ src: 'WhatsApp Image 2026-11-14 at 20.14.43.jpeg', alt: 'Andrey e Amanda — foto espontânea' },
] as const;

/**
 * Resumo da história para exibição na home (seção Nossa História).
 * Contém apenas os 3 blocos da timeline resumida.
 */
export const HOME_TIMELINE_SUMMARY = [
	{
		year: '2011',
		label: 'Os primeiros olhares',
		title: 'Onde tudo começou',
		description:
			'Em meio à rotina de uma pequena loja no centro de Suzano, nossos olhares começaram a se encontrar. Entre cumprimentos, sorrisos discretos e uma amizade sincera, algo bonito começava a nascer.',
		imageAsset: '001.jpeg',
	},
	{
		year: '',
		label: 'Nossa caminhada',
		title: 'Amor que amadureceu',
		description:
			'Encontramos um no outro acolhimento, companheirismo, compreensão e um amor que nos ajudou a crescer. Em cada etapa, Deus foi nos ensinando que o verdadeiro amor se constrói na fé, na parceria e na decisão diária de cuidar um do outro.',
		imageAsset: '005.jpeg',
	},
	{
		year: '',
		label: 'Nossa aliança',
		title: 'Um novo capítulo',
		description:
			'Hoje firmamos uma aliança diante de Deus, colocando Jesus Cristo no centro da nossa família e entregando a Ele todos os capítulos que ainda vamos escrever.',
		imageAsset: '010.jpeg',
	},
] as const;