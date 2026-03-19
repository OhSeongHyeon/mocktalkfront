import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';

const normalizePath = (value: string) => value.replaceAll('\\', '/');
const MERMAID_PACKAGES = new Set([
  'mermaid',
  '@mermaid-js/parser',
  'langium',
  'chevrotain',
  'vscode-jsonrpc',
  'vscode-languageserver-protocol',
  'vscode-languageserver-types',
  'vscode-languageserver-textdocument',
  'vscode-uri',
  'katex',
  'marked',
  'dayjs',
  'stylis',
  'ts-dedent',
  '@iconify/utils',
  'uuid',
  'khroma',
  '@braintree/sanitize-url',
  'roughjs',
  'layout-base',
  'cose-base',
  'cytoscape',
  'cytoscape-fcose',
  'cytoscape-cose-bilkent',
  'dagre-d3-es',
  'lodash-es',
  '@upsetjs/venn.js',
  'internmap',
  'delaunator',
  'robust-predicates',
]);

const getPackageName = (id: string) => {
  const normalized = normalizePath(id);
  const marker = '/node_modules/';
  const markerIndex = normalized.lastIndexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  const packagePath = normalized.slice(markerIndex + marker.length);
  const segments = packagePath.split('/');
  if (segments[0]?.startsWith('@')) {
    return segments.slice(0, 2).join('/');
  }
  return segments[0] ?? null;
};

const resolveManualChunk = (id: string) => {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  const packageName = getPackageName(id);
  if (!packageName) {
    return 'vendor';
  }

  if (packageName === 'vue' || packageName === 'vue-router' || packageName.startsWith('@vue/')) {
    return 'vendor-vue';
  }

  if (packageName.startsWith('@tiptap/') || packageName.startsWith('prosemirror-') || packageName === 'orderedmap') {
    return 'editor';
  }

  if (packageName === 'lowlight' || packageName === 'highlight.js') {
    return 'editor-code';
  }

  if (packageName === 'turndown' || packageName === 'turndown-plugin-gfm') {
    return 'editor-markdown';
  }

  if (MERMAID_PACKAGES.has(packageName) || packageName.startsWith('d3-')) {
    return undefined;
  }

  if (packageName === 'dompurify') {
    return 'vendor-sanitize';
  }

  return 'vendor';
};

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  build: {
    // outDir: "../mocktalkback/src/main/resources/static/front",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: resolveManualChunk,
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
      '/storage': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/storage/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('authorization');
            proxyReq.removeHeader('cookie');
          });
        },
      },
    },
  },
});
