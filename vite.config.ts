import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    // outDir: "../mocktalkback/src/main/resources/static/front",
    // emptyOutDir: true,
  },
  server: {
    // Vite proxy 설정
    proxy: {
      // 프론트에서 /api 로 보내면 → 백엔드 8081으로 중계
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
});
