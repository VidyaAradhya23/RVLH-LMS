import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    hmr: {
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    exclude: []
  },
  plugins: [
    {
      name: 'skip-import-analysis-main',
      enforce: 'pre',
      transform(code, id) {
        if (id.includes('main.js')) {
          return { code, map: null };
        }
      }
    }
  ]
});
