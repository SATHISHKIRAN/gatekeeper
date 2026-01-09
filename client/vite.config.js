import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), basicSsl()],
    resolve: {
        alias: {
            // eslint-disable-next-line no-undef
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        host: true, // Allow Network Access (0.0.0.0)
        port: 5173,
        https: true, // Explicitly enable HTTPS
        hmr: {
            host: '10.160.140.145', // Force HMR to use the LAN IP
        },
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
                ws: true
            }
        }
    },
    preview: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true,
            }
        }
    }
})
