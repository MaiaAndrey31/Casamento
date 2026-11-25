import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		environment: 'node',
		// Importações dinâmicas com mocks são sensíveis à contenção de CPU.
		testTimeout: 20000,
		maxWorkers: 4,
		minWorkers: 1,
		globals: true,
		include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
		exclude: ['node_modules/**', '.next/**'],
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});