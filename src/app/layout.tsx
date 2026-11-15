import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import '@/styles/globals.css';

const playfairDisplay = Playfair_Display({
	subsets: ['latin'],
	variable: '--font-display-hero',
	display: 'swap',
});

const dmSans = DM_Sans({
	subsets: ['latin'],
	variable: '--font-body',
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'Casamento Andrey & Amanda',
	description:
		'Convite digital do casamento de Andrey e Amanda. Uma história escrita por Deus, vivida com amor e fé.',
	openGraph: {
		title: 'Casamento Andrey & Amanda',
		description:
			'Você é nosso convidado especial! Confira os detalhes e confirme sua presença.',
		type: 'website',
		locale: 'pt_BR',
	},
};

/**
 * Layout Raiz — Compartilhado por TODAS as rotas (públicas e admin).
 *
 * Contém apenas: HTML shell, fontes Google, CSS global.
 * NÃO contém DesktopNav — esse está no layout do grupo (public).
 * Rotas /admin/* herdam APENAS este layout + admin/layout.tsx.
 */
export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="pt-BR" className={`${playfairDisplay.variable} ${dmSans.variable}`}>
			<body className="bg-surface text-on-surface antialiased">
				{children}
			</body>
		</html>
	);
}