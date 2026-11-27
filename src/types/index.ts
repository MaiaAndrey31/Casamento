/**
 * Contratos TypeScript — Casamento Andrey e Amanda
 *
 * Todos os tipos compartilhados entre frontend, backend e Firestore.
 * Timestamps utilizam Date serializável para compatibilidade com JSON/Firestore.
 */

// ============================================================================
// EVENTO
// ============================================================================

export interface WeddingEvent {
  id: string;
  coupleNames: string;
  eventDate: string; // ISO 8601 com timezone: "2025-10-11T16:30:00-03:00"
  timezone: string; // "America/Sao_Paulo"
  ceremonyTime: string; // "16:30"
  receptionTime: string; // "18:00"
  venueName: string;
  venueAddress: string;
  mapsUrl: string;
  wazeUrl: string;
  dressCode: string;
  rsvpDeadline: string; // ISO 8601
  rsvpEnabled: boolean;
  checkInEnabled: boolean;
  status: 'draft' | 'published' | 'archived';

  // Conteúdo editável
  heroMessage: string;
  heroVerse: string;
  heroVerseReference: string;
  closingMessage: string;
  closingVerse: string;
  closingVerseReference: string;
  closingSignature?: string;

  // Seção Nossa História
  storyTitle: string;
  storySubtitle: string;
  storyFullText: string;
  storyTimeline: StoryTimelineItem[];

  createdAt: string;
  updatedAt: string;
}

export interface StoryTimelineItem {
  year: string;
  label: string;
  title: string;
  description: string;
  imageStoragePath?: string; // Caminho no Firebase Storage
  order: number;
}

// ============================================================================
// CONVITE / TOKEN DE ACESSO
// ============================================================================

export interface Invitation {
  id: string;
  eventId: string;
  displayName: string; // "Família Silva" ou "Maria Santos"
  guestIds: string[]; // IDs dos convidados vinculados
  maxCompanions: number;
  invitationStatus: 'active' | 'revoked' | 'expired';
  tokenHash: string; // SHA-256 do token de acesso (nunca armazenar token em claro)
  encryptedToken?: string; // AES-256-GCM do token original (para recuperação admin)
  tokenExpiresAt: string; // ISO 8601
  category: string; // Valores definidos em src/lib/constants/guest-categories.ts
  regeneratedAt?: string; // Timestamp da última regeneração
  regeneratedBy?: string; // UID do admin que regenerou
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CONVIDADO
// ============================================================================

export interface Guest {
  id: string;
  eventId: string;
  fullName: string;
  normalizedName: string; // lowercase, sem acentos, para busca
  phone: string; // "+5511987654321"
  invitationId: string;
  category: string;
  isPrimaryGuest: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// RSVP / CONFIRMAÇÃO DE PRESENÇA
// ============================================================================

export type AttendanceStatus = 'confirmed' | 'declined' | 'pending';

export interface RSVP {
  id: string; // Mesmo ID do invitationId para evitar duplicidade
  eventId: string;
  invitationId: string;
  attendanceStatus: AttendanceStatus;
  confirmedGuestIds: string[]; // IDs dos guests confirmados
  companions: CompanionInfo[];
  dietaryRestrictions: string[];
  songSuggestion: string;
  personalMessage: string;
  submittedAt: string;
  updatedAt: string;
  revision: number; // Controle de concorrência otimista
}

export interface CompanionInfo {
  name: string;
  isMinor: boolean;
  age?: number;
  /** Identidade persistente. Presente em todo companion gravado pela regra central. */
  participantId?: string;
}

// ============================================================================
// MENSAGENS / RECADOS
// ============================================================================

export type ModerationStatus = 'pending' | 'approved' | 'rejected';

export interface Message {
  id: string;
  eventId: string;
  authorName: string;
  message: string;
  invitationId?: string; // Vinculado ao convite se enviado por convidado identificado
  moderationStatus: ModerationStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string; // UID do admin que aprovou
}

// ============================================================================
// CHECK-IN
// ============================================================================

export interface CheckIn {
  id: string;
  eventId: string;
  invitationId: string;
  guestId: string;
  checkedInAt: string;
  checkedInBy: string; // UID do admin ou dispositivo
  status: 'valid' | 'duplicate' | 'invalid';
}

// ============================================================================
// MÍDIA / FOTOGRAFIAS
// ============================================================================

export type MediaCategory = 'hero' | 'story' | 'gallery' | 'closing' | 'profile';

export interface Media {
  id: string;
  eventId: string;
  storagePath: string; // Caminho no Firebase Storage
  publicUrl: string; // URL assinada ou pública
  category: MediaCategory;
  alt: string;
  width: number;
  height: number;
  order: number;
  createdAt: string;
}

// ============================================================================
// AUDIT LOG
// ============================================================================

export interface AuditLog {
  id: string;
  eventId: string;
  action: string; // "rsvp.created", "message.approved", "guest.updated", etc.
  actorId: string; // UID do admin ou "anonymous"
  targetId: string; // ID do recurso afetado
  targetType: string; // "invitation", "guest", "rsvp", "message", etc.
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// ADMIN
// ============================================================================

export type AdminRole = 'owner' | 'editor' | 'viewer' | 'checkin_operator';
export type AccountType = 'admin' | 'validator';

export interface Admin {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  type: AccountType;
  active: boolean;
  createdAt: string;
}

// ============================================================================
// CHECK-IN PARTICIPANTE
// ============================================================================

/**
 * Participante individual de um convite para fins de check-in.
 * O participantId é imutável e persistente:
 * - Titular: usa o guestId existente
 * - Acompanhante: UUID gerado uma única vez na migração ou criação
 */
export interface CheckInParticipant {
  participantId: string;
  name: string;
  type: 'titular' | 'companion';
  isMinor: boolean;
  age?: number;
  checkedIn: boolean;
  checkedInAt?: string;
  checkedInBy?: string;
  tableName?: string; // Nome da mesa atribuída (consulta read-only do módulo de mesas)
}

/**
 * Companion com ID persistente armazenado no RSVP.
 * Substitui CompanionInfo legado gradualmente via migração idempotente.
 */
export interface CompanionWithId {
  participantId: string;
  name: string;
  isMinor: boolean;
  age?: number;
}

// ============================================================================
// PARTICIPANTES ESPECIAIS (Noivos, Filhos, Familiares)
// ============================================================================

export type SpecialParticipantCategory = 'groom' | 'bride' | 'child' | 'family' | 'other';

export interface SpecialParticipant {
  id: string;
  eventId: string;
  fullName: string;
  normalizedName: string; // lowercase, sem acentos, para busca
  category: SpecialParticipantCategory;
  active: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// ORGANIZAÇÃO DE MESAS
// ============================================================================

export interface Table {
  id: string;
  eventId: string;
  name: string; // Identificação única da mesa (ex: "Mesa 01", "Família")
  capacity: number; // Quantidade de lugares
  createdAt: string;
  updatedAt: string;
  createdBy: string; // UID do admin que criou
}

export type ParticipantSource = 'rsvp' | 'special';

/**
 * Participante elegível para distribuição em mesas.
 * Fonte única de verdade compartilhada por repositórios, actions e client.
 */
export interface AvailableParticipant {
  participantId: string;
  participantName: string;
  participantType: 'titular' | 'companion' | 'special';
  invitationId: string; // '' para especiais; placeholder não é invitationId real
  rsvpStatus?: string;
  alreadyAssigned?: boolean;
  participantSource?: ParticipantSource;
  specialCategory?: SpecialParticipantCategory;
  /** Companion legado sem ID: visível para diagnóstico, não selecionável. */
  pendingReconciliation?: boolean;
}

export interface TableAssignment {
  id: string;
  eventId: string;
  tableId: string;
  invitationId?: string; // Opcional — ausente quando source === 'special'
  participantId: string; // guestId (titular), UUID (acompanhante) ou specialParticipantId
  participantName: string; // Denormalizado para performance em listas
  participantType: 'titular' | 'companion' | 'special';
  participantSource?: ParticipantSource; // 'rsvp' (padrão retrocompatível) ou 'special'
  specialCategory?: SpecialParticipantCategory; // Presente apenas quando source === 'special'
  assignedAt: string;
  assignedBy: string; // UID do admin que atribuiu
}

export interface TableWithOccupancy extends Table {
  occupiedSeats: number;
  availableSeats: number;
  assignments: TableAssignment[];
}

export interface TablesDashboardStats {
  totalTables: number;
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  guestsWithoutTable: number;
  /** Contagens derivadas da população elegível (mesma regra do modal). */
  eligibleParticipants?: number;
  participantsWithTable?: number;
  participantsWithoutTable?: number;
  /** Diagnóstico explícito — nunca removido automaticamente. */
  orphanAssignments?: number;
  duplicateAssignments?: number;
}

// ============================================================================
// TIPOS DE RESPOSTA DA API
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================================================
// CONFIGURAÇÕES DO PAINEL ADMIN
// ============================================================================

export interface AdminSettings {
  eventId: string;
  siteTitle: string;
  metaDescription: string;
  musicEnabled: boolean;
  musicUrl?: string; // Storage path
  galleryEnabled: boolean;
  messagesEnabled: boolean;
  countdownEnabled: boolean;
  customCss?: string;
  updatedAt: string;
  updatedBy: string;
}