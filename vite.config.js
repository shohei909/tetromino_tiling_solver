import htmlMinify from 'vite-plugin-html-minify';
import { resolve } from "node:path";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	base: "./",
	root: "src",
	publicDir: resolve(__dirname, "public"),
	build: {
		// distフォルダに出力
		outDir: resolve(__dirname, "docs"),
		// 存在しないときはフォルダを作成する
		emptyOutDir: true,
		copyPublicDir: true,
		rollupOptions: {
			// entry pointがあるindex.htmlのパス
			input: {
				main: resolve(__dirname, "src/index.html"),
				presets: resolve(__dirname, "src/presets.html"),
			},
			// bundle.jsを差し替えする
			output: {
				entryFileNames: "assets/bundle.js",
				assetFileNames: (assetInfo) => {
					if (assetInfo.names != null && assetInfo.names.length > 0 && assetInfo.names[0] && assetInfo.names[0].endsWith('.css')) {
						return 'assets/style.css';
					}
					return 'assets/[name][extname]';
				},
			},
		},
	},
	server: {
		port: 8080,
		headers: {
		'Cross-Origin-Opener-Policy': 'same-origin',
		'Cross-Origin-Embedder-Policy': 'require-corp'
		}
	},
	plugins: [
		htmlMinify()
	],
});