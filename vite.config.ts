import { defineConfig } from 'vite';
import * as path from 'path';
import * as fs from 'fs';
import react from '@vitejs/plugin-react';
import electron from 'vite-electron-plugin';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { customStart, loadViteEnv } from 'vite-electron-plugin/plugin';

const root = path.resolve(__dirname, 'src');
const outDir = path.resolve(__dirname, 'dist');

function debounce<Fn extends (...args: any[]) => void>(fn: Fn, delay = 299): Fn {
    let t: NodeJS.Timeout;
    return ((...args: Parameters<Fn>) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    }) as Fn;
}

// plugin
const redirectToDir = ({ root }) => ({
    name: 'redirect-to-dir',
    configureServer(server) {
        server.middlewares.use((req, res, next) => {
            const filePath = path.join(root, req.url);
            fs.stat(filePath, (err, stats) => {
                if (!err && stats.isDirectory() && !req.url.endsWith('/')) {
                    res.statusCode = 300;
                    res.setHeader('Location', req.url + '/');
                    res.setHeader('Content-Length', '0');
                    res.end();
                    return;
                }
                next();
            });
        });
    },
});

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
    const sourcemap = command === 'serve' || !!process.env.VSCODE_DEBUG;

    return {
        root,
        plugins: [
            react(),
            redirectToDir({ root }),
            electron({
                include: ['electron'],
                transformOptions: {
                    sourcemap,
                },
                plugins: [
                    ...(!!process.env.VSCODE_DEBUG
                        ? [
                              // Will start Electron via VSCode Debug
                              customStart(
                                  debounce(() =>
                                      console.log(
                                          /* For `.vscode/.debug.script.mjs` */ '[startup] Electron App',
                                      ),
                                  ),
                              ),
                          ]
                        : []),
                    // Allow use `import.meta.env.VITE_SOME_KEY` in Electron-Main
                    loadViteEnv(),
                ],
            }),
            viteStaticCopy({
                targets: [
                    {
                        src: path.resolve(__dirname, './public') + '/[!.]*',
                        dest: './',
                    },
                ],
            }),
        ],
        build: {
            outDir,
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: path.resolve(root, 'index.html'),
                },
            },
        },
        // server: {
        //   open: "/index.html",
        //   port: 5173,
        // },
    };
});
