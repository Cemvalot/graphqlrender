import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    proxy: {
      "/api": {
        target: "https://platform.zone01.gr",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        profile: "profile.html"
      }
    }
  }
});


