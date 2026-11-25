/**
 * Schemas Zod — Validação de RSVP e Convites
 *
 * Utilizados tanto no frontend (React Hook Form) quanto no backend (Server Actions).
 */

import { z } from 'zod';

// ============================================================================
// VALIDAÇÃO DE TELEFONE BRASILEIRO
// ============================================================================

/**
 * Valida e normaliza telefone brasileiro.
 * Aceita: celular (11 dígitos com DDD) e fixo (10 dígitos com DDD).
 * Com ou sem código do país 55.
 * Transforma removendo todos os caracteres não numéricos antes da validação.
 * O valor final após transform é apenas dígitos (ex: "18997519440").
 */
const phoneValidation = z.string()
	.min(10, 'Telefone é obrigatório')
	.transform(val => val.replace(/\D/g, ''))
	.refine(
		val => {
			if (val.startsWith('55')) {
				return val.length === 12 || val.length === 13;
			}
			return val.length === 10 || val.length === 11;
		},
		{ message: 'Telefone inválido. Use o formato (DD) 9XXXX-XXXX para celular ou (DD) XXXX-XXXX para fixo.' },
	);

// ============================================================================
// RSVP PÚBLICO
// ============================================================================

export const rsvpFormSchema = z.object({
	invitationId: z.string().min(1, 'Identificação do convite é obrigatória'),
	fullName: z.string()
		.min(3, 'Nome deve ter pelo menos 3 caracteres')
		.max(200, 'Nome muito longo')
		.trim(),
	phone: phoneValidation,
	attendanceStatus: z.enum(['confirmed', 'declined'], {
		required_error: 'Selecione uma opção',
	}),
	companions: z.array(z.object({
		name: z.string().min(2, 'Nome do acompanhante é obrigatório').max(200),
		isMinor: z.boolean().default(false),
		age: z.number().int().positive().optional(),
		// Identidade persistente: preservada quando o cliente a reenvia.
		// A geração/atribuição é feita no servidor, na camada de persistência.
		participantId: z.string()
			.regex(/^[a-zA-Z0-9_-]{8,64}$/, 'Identificador de acompanhante inválido')
			.optional()
			.or(z.literal('')),
	})).max(10, 'Limite de acompanhantes excedido').default([]),
	dietaryRestrictions: z.array(z.string()).default([]),
	songSuggestion: z.string().max(300, 'Máximo de 300 caracteres').optional().default(''),
	personalMessage: z.string().max(1000, 'Mensagem muito longa (máx. 1000 caracteres)').optional().default(''),
});

export type RSVPFormData = z.infer<typeof rsvpFormSchema>;

// Schema refinado com validações condicionais
export const rsvpFormRefinedSchema = rsvpFormSchema.refine(
	(data) => {
		if (data.attendanceStatus === 'declined') return true;
		// Se confirmado, pelo menos o titular deve estar presente
		return data.fullName.length >= 3;
	},
	{
		message: 'Informe seu nome completo para confirmar presença',
		path: ['fullName'],
	}
);

// ============================================================================
// CONVITE PERSONALIZADO (TOKEN)
// ============================================================================

export const invitationTokenSchema = z.object({
	token: z.string()
		.min(16, 'Token inválido')
		.max(128, 'Token inválido')
		.regex(/^[a-zA-Z0-9_-]+$/, 'Token contém caracteres inválidos'),
});

export type InvitationTokenData = z.infer<typeof invitationTokenSchema>;

// ============================================================================
// MENSAGEM / RECADOS
// ============================================================================

export const messageFormSchema = z.object({
	authorName: z.string()
		.min(2, 'Nome é obrigatório')
		.max(100, 'Nome muito longo')
		.trim(),
	message: z.string()
		.min(10, 'Mensagem deve ter pelo menos 10 caracteres')
		.max(2000, 'Mensagem muito longa (máx. 2000 caracteres)')
		.trim(),
	invitationId: z.string().optional(),
});

export type MessageFormData = z.infer<typeof messageFormSchema>;

// ============================================================================
// ADMIN — CADASTRO DE CONVIDADO
// ============================================================================

export const guestCreateSchema = z.object({
	fullName: z.string().min(2).max(200).trim(),
	phone: phoneValidation,
	category: z.enum(['familia_noiva', 'familia_noivo', 'padrinhos', 'amigos', 'colegas']),
	maxCompanions: z.number().int().min(0).max(20).default(0),
	isPrimaryGuest: z.boolean().default(true),
	invitationId: z.string().optional(),
});

export type GuestCreateData = z.infer<typeof guestCreateSchema>;

// ============================================================================
// ADMIN — CONFIGURAÇÕES DO EVENTO
// ============================================================================

export const eventSettingsSchema = z.object({
	coupleNames: z.string().min(2).max(200),
	eventDate: z.string().datetime({ message: 'Data inválida. Use formato ISO 8601' }).or(z.literal('')).default(''),
	timezone: z.string().default('America/Sao_Paulo'),
	ceremonyTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use formato HH:mm'),
	receptionTime: z.string().regex(/^\d{2}:\d{2}$/, 'Use formato HH:mm').optional().or(z.literal('')).default(''),
	venueName: z.string().max(300).optional().or(z.literal('')).default(''),
	venueAddress: z.string().max(500).optional().or(z.literal('')).default(''),
	mapsUrl: z.string().url('URL inválida').optional().or(z.literal('')),
	wazeUrl: z.string().url('URL inválida').optional().or(z.literal('')),
	dressCode: z.string().max(500).optional().default(''),
	rsvpDeadline: z.string().datetime({ message: 'Data inválida' }).optional().or(z.literal('')).default(''),
	rsvpEnabled: z.boolean().default(true),
	checkInEnabled: z.boolean().default(false),
	heroMessage: z.string().max(500).optional().default(''),
	heroVerse: z.string().max(500).optional().default(''),
	heroVerseReference: z.string().max(100).optional().default(''),
	closingMessage: z.string().max(500).optional().default(''),
	closingVerse: z.string().max(500).optional().default(''),
	closingVerseReference: z.string().max(100).optional().default(''),
});

export type EventSettingsData = z.infer<typeof eventSettingsSchema>;

// ============================================================================
// CHECK-IN
// ============================================================================

export const checkInSchema = z.object({
	qrCodeData: z.string().min(1, 'QR Code não lido'),
	checkedInBy: z.string().min(1, 'Usuário não autenticado'),
});

export type CheckInData = z.infer<typeof checkInSchema>;