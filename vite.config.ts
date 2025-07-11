import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      usePolling: true,
      interval: 1000,
      followSymlinks: false
    },
    hmr: {
      overlay: true,
      port: 24678,
      host: 'localhost'
    },
    // 필요시 proxy 설정 추가 가능
    // proxy: {
    //   '/api': 'http://localhost:8080',
    // },
  },
  optimizeDeps: {
    include: ['chart.js', 'chartjs-plugin-datalabels', 'react-chartjs-2']
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'react-chartjs-2']
        }
      }
    }
  }
}); 