'use client';

import { useState } from 'react';
import { Send, Heart } from 'lucide-react';

/**
 * Recados e Orações — Formulário de mensagens dos convidados.
 *
 * ESTADO ATUAL: Backend não configurado.
 * O formulário exibe mensagem clara de indisponibilidade temporária
 * sem simular envio bem-sucedido ou persistência fictícia.
 *
 * TODO: Integrar com Firebase Firestore quando credenciais estiverem configuradas.
 */
export function Messages() {
	const [formData, setFormData] = useState({ authorName: '', message: '' });
	const [status, setStatus] = useState<'idle' | 'unavailable'>('idle');

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Backend não disponível — exibir estado claro de indisponibilidade
		setStatus('unavailable');
	};

	return (
		<section id="recados" className="bg-surface py-space-2xl px-gutter">
			<div className="mx-auto max-w-2xl">
				{/* Título */}
				<div data-messages-title className="mb-space-xl text-center">
					<div className="mx-auto mb-space-md flex h-12 w-12 items-center justify-center rounded-full bg-tertiary-fixed/20">
						<Heart size={24} className="text-primary-container" />
					</div>
					<h2 className="text-headline-lg-mobile text-primary md:text-headline-lg">
						Deixe uma bênção para nossa nova caminhada
					</h2>
					<p className="mt-space-sm text-body-md text-on-surface-variant">
						Suas palavras de carinho e orações são o maior presente que podemos receber.
					</p>
				</div>

				{/* Formulário */}
				{status === 'unavailable' ? (
					<div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-space-lg text-center shadow-sm">
						<p className="text-body-lg text-on-surface">
							O livro de recados estará disponível em breve.
						</p>
						<p className="mt-space-sm text-body-md text-on-surface-variant">
							Estamos preparando tudo com muito carinho para receber suas mensagens.
							Volte em breve!
						</p>
						<button
							onClick={() => {
								setStatus('idle');
								setFormData({ authorName: '', message: '' });
							}}
							className="mt-space-md text-label-md uppercase tracking-widest text-primary underline decoration-tertiary-fixed-dim underline-offset-4 transition-colors hover:text-secondary"
						>
							Tentar novamente
						</button>
					</div>
				) : (
					<form data-messages-form onSubmit={handleSubmit} className="space-y-space-md">
						{/* Nome */}
						<div>
							<label htmlFor="authorName" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Seu nome
							</label>
							<input
								id="authorName"
								type="text"
								required
								minLength={2}
								maxLength={100}
								value={formData.authorName}
								onChange={(e) => setFormData(prev => ({ ...prev, authorName: e.target.value }))}
								placeholder="Como você gostaria de assinar?"
								className="w-full rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>

						{/* Mensagem */}
						<div>
							<label htmlFor="message" className="mb-space-xs block text-label-md uppercase tracking-widest text-on-surface-variant">
								Sua mensagem ou oração
							</label>
							<textarea
								id="message"
								required
								minLength={10}
								maxLength={2000}
								rows={5}
								value={formData.message}
								onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
								placeholder="Escreva uma mensagem de carinho, uma oração ou seus votos para o casal..."
								className="w-full resize-y rounded-md border border-outline-variant/30 bg-surface-container-lowest px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:border-tertiary-fixed-dim focus:outline-none focus:ring-1 focus:ring-tertiary-fixed-dim transition-colors"
							/>
						</div>

						{/* Botão de envio */}
						<button
							type="submit"
							className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary-container px-8 py-4 text-label-md uppercase tracking-widest text-tertiary-fixed shadow-md transition-all hover:bg-secondary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-tertiary-fixed-dim focus:ring-offset-2 focus:ring-offset-surface md:w-auto"
						>
							<Send size={16} />
							Enviar mensagem
						</button>

						<p className="text-center text-body-sm text-on-surface-variant">
							Sua mensagem será enviada aos noivos com todo carinho.
						</p>
					</form>
				)}
			</div>
		</section>
	);
}