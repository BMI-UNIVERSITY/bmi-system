import { defineConfig } from 'vitest/config'; 
import react from '@vitejs/plugin-react'; 
export default defineConfig({ 
  plugins: [react()], 
  test: { 
    globals: true, 
    environment: 'happy-dom', 
    setupFiles: ['./src/test/setup.ts'], 
    coverage: { 
      provider: 'v8', 
      reporter: ['text', 'lcov', 'html'], 
      thresholds: { lines: 60, functions: 60, branches: 50 }, 
      include: ['src/services/importService.ts', 'src/stores/authStore.ts', 'src/stores/uiStore.ts', 'src/components/StatCard.tsx']
    }, 
    include: ['src/**/*.test.{ts,tsx}'] 
  } 
}); 
