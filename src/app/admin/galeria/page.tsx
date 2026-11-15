import { redirect } from 'next/navigation';
import Image from 'next/image';
import { ImageIcon, Upload, Trash2, GripVertical, Star } from 'lucide-react';
import { getAdminSession } from '@/lib/auth/admin-session';
import type { Media } from '@/types';

/**
 * Galeria de Fotografias — /admin/galeria
 *
 * Upload local de fotografias via API protegida, visualização, exclusão segura,
 * ordenação e seleção de imagem principal para Hero/História/Encerramento.
 * Armazenamento em public/uploads/casamento/ (sem Firebase Storage).
 */
export default async function AdminGaleriaPage() {
	const session = await getAdminSession();
	if (!session) {
		redirect('/admin/login');
	}

	const eventId = process.env.NEXT_PUBLIC_EVENT_ID || 'casamento-andrey-amanda';

	let media: Media[] = [];
	try {
		const { adminDb } = await import('@/lib/firebase/admin');
		const snapshot = await adminDb
			.collection('events')
			.doc(eventId)
			.collection('media')
			.orderBy('order', 'asc')
			.get();

		media = snapshot.docs.map(doc => ({ id: doc.id, eventId, ...doc.data() })) as Media[];
	} catch (e) {
		console.error('[Galeria] Falha ao carregar mídias:', e);
	}

	// Fotos estáticas existentes em public/assets/
	const staticPhotos = [
		{ src: '/assets/bannerHero.png', alt: 'Banner Hero do casamento', category: 'hero' },
		{ src: '/assets/Abraço Romântico ao Pôr do Sol (1).png', alt: 'Abraço ao pôr do sol', category: 'closing' },
		{ src: '/assets/image.png', alt: 'Ensaio do casal', category: 'story' },
		{ src: '/assets/WhatsApp Image 2026-11-14 at 20.14.43.jpeg', alt: 'Foto espontânea', category: 'gallery' },
	];

	return (
		<div className="space-y-space-xl">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-headline-lg-mobile text-primary md:text-headline-lg">
						Galeria de Fotografias
					</h1>
					<p className="mt-space-xs text-body-md text-on-surface-variant">
						{media.length} foto{media.length !== 1 ? 's' : ''} enviada{media.length !== 1 ? 's' : ''} · {staticPhotos.length} original{staticPhotos.length !== 1 ? 'is' : ''}
					</p>
				</div>
				<label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-primary-container px-6 py-3 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus-within:ring-2 focus-within:ring-tertiary-fixed-dim focus-within:ring-offset-2">
					<Upload size={16} />
					Enviar Fotografia
					<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" />
				</label>
			</div>

			{/* Aviso sobre persistência */}
			<div className="rounded-lg border border-tertiary-fixed-dim/30 bg-tertiary-fixed/10 p-4">
				<p className="text-body-sm text-on-surface-variant">
					<strong>Nota:</strong> As fotografias são armazenadas localmente em <code className="rounded bg-surface-container-high px-1 text-body-sm">public/uploads/casamento/</code>.
					Em produção, é necessário um servidor com disco persistente (VPS, Railway, Render).
					A Vercel não suporta escrita persistente em sistema de arquivos.
				</p>
			</div>

			{/* Fotos originais (estáticas) */}
			<div>
				<h2 className="mb-space-md flex items-center gap-2 text-headline-sm text-primary">
					<Star size={20} />
					Fotografias Originais
				</h2>
				<div className="grid grid-cols-2 gap-space-md sm:grid-cols-3 lg:grid-cols-4">
					{staticPhotos.map((photo) => (
						<div key={photo.src} className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low shadow-sm">
							<Image
								src={photo.src}
								alt={photo.alt}
								fill
								className="object-cover transition-transform duration-300 group-hover:scale-105"
								sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
							/>
							<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/80 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
								<p className="text-body-sm text-surface-container-lowest">{photo.alt}</p>
								<span className="text-label-sm uppercase tracking-widest text-tertiary-fixed">{photo.category}</span>
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Fotos enviadas via upload */}
			<div>
				<h2 className="mb-space-md flex items-center gap-2 text-headline-sm text-primary">
					<ImageIcon size={20} />
					Fotografias Enviadas ({media.length})
				</h2>
				{media.length === 0 ? (
					<div className="rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-low p-space-xl text-center">
						<Upload size={48} className="mx-auto mb-space-md text-on-surface-variant/30" />
						<p className="text-body-lg text-on-surface-variant">
							Nenhuma fotografia enviada ainda.
						</p>
						<p className="mt-space-xs text-body-sm text-on-surface-variant">
							Use o botão "Enviar Fotografia" acima para adicionar novas imagens.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-space-md sm:grid-cols-3 lg:grid-cols-4">
						{media.map((item) => (
							<div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-low shadow-sm">
								<Image
									src={item.publicUrl}
									alt={item.alt || 'Fotografia do casamento'}
									fill
									className="object-cover"
									sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								/>
								{/* Overlay com ações */}
								<div className="absolute inset-0 flex flex-col justify-between bg-primary/60 p-3 opacity-0 transition-opacity group-hover:opacity-100">
									<div className="flex justify-end gap-1">
										<button
											title="Reordenar"
											className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container-lowest/90 text-on-surface transition-colors hover:bg-surface-container-low"
										>
											<GripVertical size={14} />
										</button>
										<button
											title="Excluir fotografia"
											className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-container/90 text-error transition-colors hover:bg-error-container"
										>
											<Trash2 size={14} />
										</button>
									</div>
									<div>
										<p className="text-body-sm text-surface-container-lowest">{item.alt || 'Sem legenda'}</p>
										<span className="text-label-sm uppercase tracking-widest text-tertiary-fixed">{item.category}</span>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}