import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { requireAdminSession } from '@/lib/auth/admin-session';
import type { ApiResponse, MediaCategory } from '@/types';

// Configuração
const UPLOAD_BASE_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads', 'casamento');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_CATEGORIES: MediaCategory[] = ['hero', 'story', 'gallery', 'closing', 'profile'];

/**
 * POST /api/admin/uploads
 *
 * Upload de fotografias protegido por autenticação administrativa.
 * Processa imagem com sharp (WebP otimizado), salva localmente e registra metadados no Firestore.
 */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
	try {
		// 1. Verificar sessão administrativa
		const session = await requireAdminSession();

		// 2. Parsear FormData
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const category = formData.get('category') as string | null;

		if (!file) {
			return NextResponse.json(
				{ success: false, error: 'Nenhum arquivo enviado.' },
				{ status: 400 },
			);
		}

		// 3. Validar categoria
		if (!category || !ALLOWED_CATEGORIES.includes(category as MediaCategory)) {
			return NextResponse.json(
				{ success: false, error: `Categoria inválida. Permitidas: ${ALLOWED_CATEGORIES.join(', ')}` },
				{ status: 400 },
			);
		}

		// 4. Validar tamanho
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{ success: false, error: `Arquivo muito grande. Máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
				{ status: 400 },
			);
		}

		// 5. Validar tipo MIME real (não confiar apenas no Content-Type)
		const buffer = Buffer.from(await file.arrayBuffer());
		const metadata = await sharp(buffer).metadata();

		if (!metadata.format || !ALLOWED_MIME_TYPES.includes(`image/${metadata.format}`)) {
			return NextResponse.json(
				{ success: false, error: 'Formato de imagem não suportado. Use JPEG, PNG, WebP ou AVIF.' },
				{ status: 400 },
			);
		}

		// 6. Gerar nome seguro e único
		const uuid = randomUUID();
		const outputFilename = `${uuid}.webp`;
		const categoryDir = path.join(UPLOAD_BASE_DIR, category);
		const outputPath = path.join(categoryDir, outputFilename);

		// 7. Prevenir path traversal
		const resolvedOutput = path.resolve(outputPath);
		const resolvedBase = path.resolve(UPLOAD_BASE_DIR);
		if (!resolvedOutput.startsWith(resolvedBase)) {
			return NextResponse.json(
				{ success: false, error: 'Caminho de arquivo inválido.' },
				{ status: 400 },
			);
		}

		// 8. Garantir que o diretório existe
		await fs.mkdir(categoryDir, { recursive: true });

		// 9. Processar e otimizar imagem com sharp
		const processed = await sharp(buffer)
			.rotate() // Auto-orient based on EXIF
			.resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
			.webp({ quality: 85, effort: 4 })
			.toBuffer();

		// 10. Salvar arquivo processado
		await fs.writeFile(outputPath, processed);

		// 11. Obter dimensões finais
		const finalMetadata = await sharp(processed).metadata();

		// 12. Registrar metadados no Firestore
		const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';
		const publicUrl = `/uploads/casamento/${category}/${outputFilename}`;

		try {
			const { adminDb } = await import('@/lib/firebase/admin');
			const { FieldValue } = await import('firebase-admin/firestore');

			await adminDb.collection('events').doc(eventId).collection('media').add({
				eventId,
				storagePath: outputPath,
				publicUrl,
				category: category as MediaCategory,
				alt: formData.get('alt') as string || '',
				width: finalMetadata.width || 0,
				height: finalMetadata.height || 0,
				order: 0,
				uploadedBy: session.uid,
				createdAt: FieldValue.serverTimestamp(),
			});
		} catch (dbError) {
			// Se falhar ao salvar no Firestore, remover o arquivo salvo
			await fs.unlink(outputPath).catch(() => {});
			console.error('[Upload API] Falha ao registrar metadados:', dbError);
			return NextResponse.json(
				{ success: false, error: 'Imagem salva mas falha ao registrar no banco de dados.' },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			data: {
				url: publicUrl,
				filename: outputFilename,
				category,
				width: finalMetadata.width,
				height: finalMetadata.height,
			},
			message: 'Fotografia enviada com sucesso.',
		});

	} catch (error) {
		if (error instanceof Error && error.message.startsWith('UNAUTHORIZED')) {
			return NextResponse.json(
				{ success: false, error: 'Acesso negado. Faça login para continuar.' },
				{ status: 401 },
			);
		}

		console.error('[Upload API] Erro inesperado:', error);
		return NextResponse.json(
			{ success: false, error: 'Erro interno ao processar upload.' },
			{ status: 500 },
		);
	}
}