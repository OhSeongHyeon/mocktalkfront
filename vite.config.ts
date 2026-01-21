import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    // outDir: "../mocktalkback/src/main/resources/static/front",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return undefined;
          }
          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'editor';
          }
          if (id.includes('dompurify')) {
            return 'vendor-sanitize';
          }
          if (id.includes('vue')) {
            return 'vendor-vue';
          }
          return 'vendor';
        },
      },
    },
  },
  server: {
    // Vite proxy 설정
    proxy: {
      // 프론트에서 /api 로 보내면 → 백엔드 port로 중계
      '/api': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:8082',
        changeOrigin: true,
      },
    },
  },
});
