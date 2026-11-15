import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	// Otimizações de imagem
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'firebasestorage.googleapis.com',
			},
			{
				protocol: 'https',
				hostname: '*.googleusercontent.com',
			},
		],
		formats: ['image/avif', 'image/webp'],
		deviceSizes: [375, 430, 768, 1024, 1440, 1920],
		imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
	},

	// Headers de segurança
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'X-Frame-Options', value: 'DENY' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains; preload',
					},
				],
			},
		];
	},

	// TypeScript strict mode já configurado no tsconfig.json
	typescript: {
		ignoreBuildErrors: false,
	},

	// ESLint
	eslint: {
		ignoreDuringBuilds: false,
	},
};

export default nextConfig;