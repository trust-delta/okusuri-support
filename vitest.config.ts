import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }), // React component testing support
  ],
  test: {
    // Test environment and globals
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    
    // E2Eテストファイルを除外（PlaywrightがE2Eテストを実行）
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/e2e/**',
      '**/*.e2e.test.{js,ts,jsx,tsx}',
      '**/*.spec.ts',
    ],
    
    // Process management improvements
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      }
    },
    
    // Coverage configuration
    coverage: {
      enabled: false, // Disabled by default, enable with --coverage flag
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      clean: true,
      include: [
        'src/**/*.{js,ts,jsx,tsx}',
        'app/**/*.{js,ts,jsx,tsx}'
      ],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/__mocks__/**',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/*.stories.{js,ts,jsx,tsx}',
        '**/stories/**',
        '**/index.ts',
        '**/*.stories.tsx',
      ],
      thresholds: {
        // Target coverage thresholds as defined in docs/rules/typescript-testing.md
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
    
    // File watching
    watch: false, // Disable watch mode for test runs
  },
  
  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/app': path.resolve(__dirname, './app'),
      src: path.resolve(__dirname, './src'),
      // React module alias for stable resolution
      'react': path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, 'node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(__dirname, 'node_modules/react/jsx-dev-runtime'),
    },
  },
  
  // ESBuild configuration for TypeScript
  esbuild: {
    target: 'es2022',
    jsx: 'automatic',
  },
  
  // Cache directory for Vite
  cacheDir: '.vite-cache',
})