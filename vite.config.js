import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Required for GitHub Pages: assets are served from /oral-english-web/
  base: '/oral-english-web/',
});
