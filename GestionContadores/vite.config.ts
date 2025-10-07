import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

import fs from 'fs';

// Buscar todos los archivos .tsx y .html en src para entradas dinámicas
const srcDir = resolve(__dirname, 'src');
const entries = {};
fs.readdirSync(srcDir).forEach(file => {
    if (file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.jsx')) {
        const name = file.replace(/\.(tsx|jsx|html)$/, '');
        entries[name] = resolve(srcDir, file);
    }
});

export default defineConfig({
    plugins: [react()],
    root: './src',
    build: {
        outDir: resolve(__dirname, 'app'),
        emptyOutDir: false,
        rollupOptions: {
            input: entries,
            output: {
                entryFileNames: 'main.js',
                chunkFileNames: 'chunks/[name].js',
                assetFileNames: 'assets/[name][extname]'
            }
        }
    }
});
