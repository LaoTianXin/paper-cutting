import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// import { ViteImageOptimizer } from "vite-plugin-image-optimizer";

// https://vite.dev/config/
export default defineConfig(() => ({
  base: '/paper-cutting/',
  plugins: [
    react(),
    // 图片优化插件 - 在打包时压缩图片
    // ViteImageOptimizer({
    //   /* 传递sharp选项给优化器 */
    //   png: {
    //     // https://sharp.pixelplumbing.com/api-output#png
    //     quality: 85,
    //     compressionLevel: 9,
    //   },
    //   jpeg: {
    //     // https://sharp.pixelplumbing.com/api-output#jpeg
    //     quality: 85,
    //     progressive: true,
    //   },
    //   jpg: {
    //     // https://sharp.pixelplumbing.com/api-output#jpeg
    //     quality: 85,
    //     progressive: true,
    //   },
    //   webp: {
    //     // https://sharp.pixelplumbing.com/api-output#webp
    //     quality: 85,
    //   },
    //   avif: {
    //     // https://sharp.pixelplumbing.com/api-output#avif
    //     quality: 65,
    //   },
    //   // svg优化配置
    //   svg: {
    //     multipass: true,
    //     plugins: [
    //       {
    //         name: 'preset-default',
    //         params: {
    //           overrides: {
    //             cleanupNumericValues: false,
    //             removeViewBox: false, // 保留viewBox便于响应式
    //           },
    //           cleanupIDs: {
    //             minify: false,
    //           },
    //         },
    //       },
    //     ],
    //   },
    // }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
}));
