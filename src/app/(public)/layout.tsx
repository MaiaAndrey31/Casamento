import { DesktopNav } from '@/components/wedding/DesktopNav';

/**
 * Layout do Grupo Público — (public)
 *
 * Renderiza o DesktopNav (header sticky com navegação desktop)
 * apenas nas rotas públicas do convite.
 * Rotas /admin/* NÃO herdam este layout.
 */
export default function PublicLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
 <>
 <DesktopNav />
 {children}
 </>
	);
}