'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Animações GSAP para todas as seções do convite público.
 *
 * Hero: revelação cinematográfica com parallax discreto.
 * Countdown: entrada suave dos números.
 * EventDetails: cards revelados progressivamente.
 * Messages: formulário e título com fade-in.
 * Closing: revelação emocional final.
 *
 * Respeita prefers-reduced-motion: desativa todas as animações.
 */
export function SectionAnimations() {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) return;

		const ctx = gsap.context(() => {
			// ── HERO ──────────────────────────────────────────────────────
			const heroImage = document.querySelector('[data-hero-image]');
			const heroLogo = document.querySelector('[data-hero-logo]');
			const heroDate = document.querySelector('[data-hero-date]');
			const heroMessage = document.querySelector('[data-hero-message]');
			const heroVerse = document.querySelector('[data-hero-verse]');
			const heroCta = document.querySelector('[data-hero-cta]');
			const heroScrollIndicator = document.querySelector('[data-hero-scroll]');

			if (heroImage) {
				gsap.from(heroImage, {
					scale: 1.15,
					opacity: 0,
					duration: 1.8,
					ease: 'power2.out',
				});
				// Parallax sutil durante o scroll
				gsap.to(heroImage, {
					yPercent: 15,
					ease: 'none',
					scrollTrigger: {
						trigger: heroImage,
						start: 'top top',
						end: 'bottom top',
						scrub: 1,
					},
				});
			}

			if (heroLogo) {
				gsap.from(heroLogo, {
					y: 30,
					opacity: 0,
					duration: 1.4,
					delay: 0.2,
					ease: 'power3.out',
				});
			}

			if (heroDate) {
				gsap.from(heroDate, {
					y: 25,
					opacity: 0,
					duration: 1,
					delay: 0.6,
					ease: 'power3.out',
				});
			}

			if (heroMessage) {
				gsap.from(heroMessage, {
					y: 20,
					opacity: 0,
					duration: 1,
					delay: 0.9,
					ease: 'power3.out',
				});
			}

			if (heroVerse) {
				gsap.from(heroVerse, {
					y: 15,
					opacity: 0,
					duration: 1,
					delay: 1.1,
					ease: 'power3.out',
				});
			}

			if (heroCta) {
				gsap.from(heroCta, {
					y: 15,
					opacity: 0,
					duration: 0.8,
					delay: 1.4,
					ease: 'power3.out',
				});
			}

			if (heroScrollIndicator) {
				gsap.from(heroScrollIndicator, {
					opacity: 0,
					duration: 1,
					delay: 1.8,
					ease: 'power2.out',
				});
			}

			// ── COUNTDOWN ─────────────────────────────────────────────────
			const countdownTitle = document.querySelector('[data-countdown-title]');
			const countdownCards = document.querySelectorAll('[data-countdown-card]');

			if (countdownTitle) {
				gsap.from(countdownTitle, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: countdownTitle,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			countdownCards.forEach((card, i) => {
				gsap.from(card, {
					y: 40,
					opacity: 0,
					duration: 0.7,
					delay: i * 0.1,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: card,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			});

			// ── EVENT DETAILS ─────────────────────────────────────────────
			const detailsTitle = document.querySelector('[data-details-title]');
			const detailsCards = document.querySelectorAll('[data-details-card]');

			if (detailsTitle) {
				gsap.from(detailsTitle, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: detailsTitle,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			detailsCards.forEach((card, i) => {
				gsap.from(card, {
					y: 50,
					opacity: 0,
					duration: 0.8,
					delay: i * 0.15,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: card,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			});

			// ── MESSAGES ──────────────────────────────────────────────────
			const messagesTitle = document.querySelector('[data-messages-title]');
			const messagesForm = document.querySelector('[data-messages-form]');

			if (messagesTitle) {
				gsap.from(messagesTitle, {
					y: 30,
					opacity: 0,
					duration: 0.8,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: messagesTitle,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			if (messagesForm) {
				gsap.from(messagesForm, {
					y: 40,
					opacity: 0,
					duration: 1,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: messagesForm,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			// ── CLOSING ───────────────────────────────────────────────────
			const closingVerse = document.querySelector('[data-closing-verse]');
			const closingPhoto = document.querySelector('[data-closing-photo]');
			const closingNames = document.querySelector('[data-closing-names]');
			const closingSignature = document.querySelector('[data-closing-signature]');
			const closingGratitude = document.querySelector('[data-closing-gratitude]');

			if (closingVerse) {
				gsap.from(closingVerse, {
					y: 30,
					opacity: 0,
					duration: 1,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: closingVerse,
						start: 'top 85%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			if (closingPhoto) {
				gsap.from(closingPhoto, {
					scale: 0.8,
					opacity: 0,
					duration: 1.2,
					ease: 'back.out(1.4)',
					scrollTrigger: {
						trigger: closingPhoto,
						start: 'top 80%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			if (closingNames) {
				gsap.from(closingNames, {
					y: 20,
					opacity: 0,
					duration: 0.8,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: closingNames,
						start: 'top 90%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			if (closingSignature) {
				gsap.from(closingSignature, {
					y: 15,
					opacity: 0,
					duration: 0.8,
					delay: 0.2,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: closingSignature,
						start: 'top 90%',
						toggleActions: 'play none none reverse',
					},
				});
			}

			if (closingGratitude) {
				gsap.from(closingGratitude, {
					y: 15,
					opacity: 0,
					duration: 0.8,
					delay: 0.4,
					ease: 'power3.out',
					scrollTrigger: {
						trigger: closingGratitude,
						start: 'top 90%',
						toggleActions: 'play none none reverse',
					},
				});
			}
		}, containerRef);

		return () => {
			ctx.revert();
		};
	}, []);

	return <div ref={containerRef} className="contents" />;
}