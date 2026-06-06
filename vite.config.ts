import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://stellar-vision-booking-api-production.up.railway.app',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      },
    },
  },
  build: {
    // Split heavy vendor libraries into their own chunks so they can be
    // cached independently and downloaded in parallel with the app code.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'gsap-vendor': ['gsap'],
          'framer-motion': ['framer-motion'],
          'lenis': ['lenis'],
        },
      },
    },
    // Raise the per-chunk warning ceiling — three.js alone is ~600 kB minified,
    // which is expected for a site that ships a 3D hero.
    chunkSizeWarningLimit: 700,
  },
});
