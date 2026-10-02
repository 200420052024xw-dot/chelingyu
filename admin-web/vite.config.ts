import { defineConfig } from "vite";
import path from "node:path";
export default defineConfig({ root: path.resolve(__dirname), base: "/admin/", build: { outDir: "dist", emptyOutDir: true }, server: { port: 5173, proxy: { "/api": "http://localhost:3000" } } });
