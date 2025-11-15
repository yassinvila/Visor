import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, 'components'),
      '@overlay': path.resolve(__dirname, 'overlay'),
      '@chat': path.resolve(__dirname, 'chatbox')
    }
  },
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '..', 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        overlay: path.resolve(__dirname, 'overlay/index.html'),
        chat: path.resolve(__dirname, 'chatbox/chat.html')
      }
    }
  }
});
