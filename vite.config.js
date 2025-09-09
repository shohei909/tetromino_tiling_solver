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
				"": resolve(__dirname, "src/index.html"),
			},
			// bundle.jsを差し替えする
			output: {
				entryFileNames: "assets/bundle.js",
			},
		},
	},
	server: {
		port: 8080
	}
});