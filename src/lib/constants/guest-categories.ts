/**
 * Fonte Única de Verdade — Categorias de Convidados
 *
 * Todos os formulários, schemas Zod, repositories e Server Actions
 * DEVEM importar estas constantes. Nunca definir categorias inline.
 *
 * IMPORTANTE: Se adicionar uma nova categoria aqui, adicione também
 * no generateInvitationSchema em generate-invitation.action.ts.
 */

export const GUEST_CATEGORIES = [
	{ value: 'familia_noiva', label: 'Família da Noiva' },
	{ value: 'familia_noivo', label: 'Família do Noivo' },
	{ value: 'amigos_noiva', label: 'Amigos da Noiva' },
	{ value: 'amigos_noivo', label: 'Amigos do Noivo' },
	{ value: 'casal', label: 'Casal (Amigos/Família)' },
	{ value: 'padrinhos', label: 'Padrinhos / Madrinhas' },
	{ value: 'trabalho', label: 'Trabalho' },
	{ value: 'igreja', label: 'Igreja / Comunidade' },
	{ value: 'colegas', label: 'Colegas' },
	{ value: 'outros', label: 'Outros' },
] as const;

/** Array de valores válidos para uso em z.enum() */
export const GUEST_CATEGORY_VALUES = GUEST_CATEGORIES.map(c => c.value) as [string, ...string[]];

/** Tipo TypeScript derivado da fonte única */
export type GuestCategory = typeof GUEST_CATEGORIES[number]['value'];

/**
 * Labels para exibição em badges e listagens.
 * Mapeia valor → label formatado.
 */
export const GUEST_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
	GUEST_CATEGORIES.map(c => [c.value, c.label]),
);