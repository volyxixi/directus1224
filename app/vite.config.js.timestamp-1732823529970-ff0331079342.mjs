// vite.config.js
import { APP_SHARED_DEPS } from "file:///C:/cong%20viec/anh%20hai/directus/packages/extensions/dist/index.js";
import { generateExtensionsEntrypoint, resolveFsExtensions, resolveModuleExtensions } from "file:///C:/cong%20viec/anh%20hai/directus/packages/extensions/dist/node.js";
import yaml from "file:///C:/cong%20viec/anh%20hai/directus/node_modules/.pnpm/@rollup+plugin-yaml@4.1.2_rollup@4.21.2/node_modules/@rollup/plugin-yaml/dist/es/index.js";
import UnheadVite from "file:///C:/cong%20viec/anh%20hai/directus/node_modules/.pnpm/@unhead+addons@1.11.7_rollup@4.21.2/node_modules/@unhead/addons/dist/vite.mjs";
import vue from "file:///C:/cong%20viec/anh%20hai/directus/node_modules/.pnpm/@vitejs+plugin-vue@5.1.4_vite@5.2.11_@types+node@22.7.5_sass@1.79.4_terser@5.31.6__vue@3.5.11_typescript@5.6.3_/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import fs from "node:fs";
import path from "node:path";
import { searchForWorkspaceRoot } from "file:///C:/cong%20viec/anh%20hai/directus/node_modules/.pnpm/vite@5.2.11_@types+node@22.7.5_sass@1.79.4_terser@5.31.6/node_modules/vite/dist/node/index.js";
import { defineConfig } from "file:///C:/cong%20viec/anh%20hai/directus/node_modules/.pnpm/vitest@2.1.2_@types+node@22.7.5_happy-dom@15.7.4_jsdom@20.0.3_sass@1.79.4_terser@5.31.6/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "C:\\cong viec\\anh hai\\directus\\app";
var API_PATH = path.join("..", "api");
var EXTENSIONS_PATH = path.join(API_PATH, "extensions");
var extensionsPathExists = fs.existsSync(EXTENSIONS_PATH);
var vite_config_default = defineConfig({
  plugins: [
    directusExtensions(),
    vue(),
    UnheadVite(),
    yaml({
      transform(data) {
        return data === null ? {} : void 0;
      }
    }),
    {
      name: "watch-directus-dependencies",
      configureServer: (server) => {
        server.watcher.options = {
          ...server.watcher.options,
          ignored: [/node_modules\/(?!@directus\/).*/, "**/.git/**"]
        };
      }
    }
  ],
  define: {
    __VUE_I18N_LEGACY_API__: false
  },
  resolve: {
    alias: [{ find: "@", replacement: path.resolve(__vite_injected_original_dirname, "src") }]
  },
  base: process.env.NODE_ENV === "production" ? "" : "/admin",
  ...!process.env.HISTOIRE && {
    server: {
      port: 8080,
      proxy: {
        "^/(?!admin)": {
          target: process.env.API_URL ? process.env.API_URL : "http://127.0.0.1:8055/",
          changeOrigin: true
        },
        "/websocket/logs": {
          target: process.env.API_URL ? process.env.API_URL : "ws://127.0.0.1:8055/",
          changeOrigin: true
        }
      },
      fs: {
        allow: [searchForWorkspaceRoot(process.cwd()), ...getExtensionsRealPaths()]
      }
    }
  },
  test: {
    environment: "happy-dom",
    deps: {
      optimizer: {
        web: {
          exclude: ["pinia", "url"]
        }
      }
    }
  }
});
function getExtensionsRealPaths() {
  return extensionsPathExists ? fs.readdirSync(EXTENSIONS_PATH).flatMap((typeDir) => {
    const extensionTypeDir = path.join(EXTENSIONS_PATH, typeDir);
    if (!fs.statSync(extensionTypeDir).isDirectory())
      return;
    return fs.readdirSync(extensionTypeDir).map((dir) => fs.realpathSync(path.join(extensionTypeDir, dir)));
  }).filter((v) => v) : [];
}
function directusExtensions() {
  const virtualExtensionsId = "@directus-extensions";
  let extensionsEntrypoint = null;
  return [
    {
      name: "directus-extensions-serve",
      apply: "serve",
      config: () => ({
        optimizeDeps: {
          include: APP_SHARED_DEPS
        }
      }),
      async buildStart() {
        await loadExtensions();
      },
      resolveId(id) {
        if (id === virtualExtensionsId) {
          return id;
        }
      },
      load(id) {
        if (id === virtualExtensionsId) {
          return extensionsEntrypoint;
        }
      }
    },
    {
      name: "directus-extensions-build",
      apply: "build",
      config: () => ({
        build: {
          rollupOptions: {
            input: {
              index: path.resolve(__vite_injected_original_dirname, "index.html"),
              ...APP_SHARED_DEPS.reduce((acc, dep) => ({ ...acc, [dep.replace(/\//g, "_")]: dep }), {})
            },
            output: {
              entryFileNames: "assets/[name].[hash].entry.js"
            },
            external: [virtualExtensionsId],
            preserveEntrySignatures: "exports-only"
          }
        }
      })
    }
  ];
  async function loadExtensions() {
    const localExtensions = extensionsPathExists ? await resolveFsExtensions(EXTENSIONS_PATH) : /* @__PURE__ */ new Map();
    const moduleExtensions = await resolveModuleExtensions(API_PATH);
    const registryExtensions = extensionsPathExists ? await resolveFsExtensions(path.join(EXTENSIONS_PATH, ".registry")) : /* @__PURE__ */ new Map();
    const mockSetting = (source, folder, extension) => {
      const settings = [
        {
          id: extension.name,
          enabled: true,
          folder,
          bundle: null,
          source
        }
      ];
      if (extension.type === "bundle") {
        settings.push(
          ...extension.entries.map((entry) => ({
            enabled: true,
            folder: entry.name,
            bundle: extension.name,
            source
          }))
        );
      }
      return settings;
    };
    const extensionSettings = [
      ...Array.from(localExtensions.entries()).flatMap(
        ([folder, extension]) => mockSetting("local", folder, extension)
      ),
      ...Array.from(moduleExtensions.entries()).flatMap(
        ([folder, extension]) => mockSetting("module", folder, extension)
      ),
      ...Array.from(registryExtensions.entries()).flatMap(
        ([folder, extension]) => mockSetting("registry", folder, extension)
      )
    ];
    extensionsEntrypoint = generateExtensionsEntrypoint(
      { module: moduleExtensions, local: localExtensions, registry: registryExtensions },
      extensionSettings
    );
  }
}
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxjb25nIHZpZWNcXFxcYW5oIGhhaVxcXFxkaXJlY3R1c1xcXFxhcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXGNvbmcgdmllY1xcXFxhbmggaGFpXFxcXGRpcmVjdHVzXFxcXGFwcFxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovY29uZyUyMHZpZWMvYW5oJTIwaGFpL2RpcmVjdHVzL2FwcC92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCB7IEFQUF9TSEFSRURfREVQUyB9IGZyb20gJ0BkaXJlY3R1cy9leHRlbnNpb25zJztcclxuaW1wb3J0IHsgZ2VuZXJhdGVFeHRlbnNpb25zRW50cnlwb2ludCwgcmVzb2x2ZUZzRXh0ZW5zaW9ucywgcmVzb2x2ZU1vZHVsZUV4dGVuc2lvbnMgfSBmcm9tICdAZGlyZWN0dXMvZXh0ZW5zaW9ucy9ub2RlJztcclxuaW1wb3J0IHlhbWwgZnJvbSAnQHJvbGx1cC9wbHVnaW4teWFtbCc7XHJcbmltcG9ydCBVbmhlYWRWaXRlIGZyb20gJ0B1bmhlYWQvYWRkb25zL3ZpdGUnO1xyXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XHJcbmltcG9ydCBmcyBmcm9tICdub2RlOmZzJztcclxuaW1wb3J0IHBhdGggZnJvbSAnbm9kZTpwYXRoJztcclxuaW1wb3J0IHsgc2VhcmNoRm9yV29ya3NwYWNlUm9vdCB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcclxuXHJcbmNvbnN0IEFQSV9QQVRIID0gcGF0aC5qb2luKCcuLicsICdhcGknKTtcclxuXHJcbi8qXHJcbiAqIEBUT0RPIFRoaXMgZXh0ZW5zaW9uIHBhdGggaXMgaGFyZGNvZGVkIHRvIHRoZSBlbnYgZGVmYXVsdCAoLi9leHRlbnNpb25zKS4gVGhpcyB3b24ndCB3b3JrXHJcbiAqIGFzIGV4cGVjdGVkIHdoZW4gZXh0ZW5zaW9ucyBhcmUgcmVhZCBmcm9tIGEgZGlmZmVyZW50IGxvY2F0aW9uIGxvY2FsbHkgdGhyb3VnaCB0aGVcclxuICogRVhURU5TSU9OU19MT0NBVElPTiBlbnYgdmFyXHJcbiAqL1xyXG5jb25zdCBFWFRFTlNJT05TX1BBVEggPSBwYXRoLmpvaW4oQVBJX1BBVEgsICdleHRlbnNpb25zJyk7XHJcblxyXG5jb25zdCBleHRlbnNpb25zUGF0aEV4aXN0cyA9IGZzLmV4aXN0c1N5bmMoRVhURU5TSU9OU19QQVRIKTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcblx0cGx1Z2luczogW1xyXG5cdFx0ZGlyZWN0dXNFeHRlbnNpb25zKCksXHJcblx0XHR2dWUoKSxcclxuXHRcdFVuaGVhZFZpdGUoKSxcclxuXHRcdHlhbWwoe1xyXG5cdFx0XHR0cmFuc2Zvcm0oZGF0YSkge1xyXG5cdFx0XHRcdHJldHVybiBkYXRhID09PSBudWxsID8ge30gOiB1bmRlZmluZWQ7XHJcblx0XHRcdH0sXHJcblx0XHR9KSxcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ3dhdGNoLWRpcmVjdHVzLWRlcGVuZGVuY2llcycsXHJcblx0XHRcdGNvbmZpZ3VyZVNlcnZlcjogKHNlcnZlcikgPT4ge1xyXG5cdFx0XHRcdHNlcnZlci53YXRjaGVyLm9wdGlvbnMgPSB7XHJcblx0XHRcdFx0XHQuLi5zZXJ2ZXIud2F0Y2hlci5vcHRpb25zLFxyXG5cdFx0XHRcdFx0aWdub3JlZDogWy9ub2RlX21vZHVsZXNcXC8oPyFAZGlyZWN0dXNcXC8pLiovLCAnKiovLmdpdC8qKiddLFxyXG5cdFx0XHRcdH07XHJcblx0XHRcdH0sXHJcblx0XHR9LFxyXG5cdF0sXHJcblx0ZGVmaW5lOiB7XHJcblx0XHRfX1ZVRV9JMThOX0xFR0FDWV9BUElfXzogZmFsc2UsXHJcblx0fSxcclxuXHRyZXNvbHZlOiB7XHJcblx0XHRhbGlhczogW3sgZmluZDogJ0AnLCByZXBsYWNlbWVudDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpIH1dLFxyXG5cdH0sXHJcblx0YmFzZTogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyA/ICcnIDogJy9hZG1pbicsXHJcblx0Li4uKCFwcm9jZXNzLmVudi5ISVNUT0lSRSAmJiB7XHJcblx0XHRzZXJ2ZXI6IHtcclxuXHRcdFx0cG9ydDogODA4MCxcclxuXHRcdFx0cHJveHk6IHtcclxuXHRcdFx0XHQnXi8oPyFhZG1pbiknOiB7XHJcblx0XHRcdFx0XHR0YXJnZXQ6IHByb2Nlc3MuZW52LkFQSV9VUkwgPyBwcm9jZXNzLmVudi5BUElfVVJMIDogJ2h0dHA6Ly8xMjcuMC4wLjE6ODA1NS8nLFxyXG5cdFx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdFx0Jy93ZWJzb2NrZXQvbG9ncyc6IHtcclxuXHRcdFx0XHRcdHRhcmdldDogcHJvY2Vzcy5lbnYuQVBJX1VSTCA/IHByb2Nlc3MuZW52LkFQSV9VUkwgOiAnd3M6Ly8xMjcuMC4wLjE6ODA1NS8nLFxyXG5cdFx0XHRcdFx0Y2hhbmdlT3JpZ2luOiB0cnVlLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0sXHJcblx0XHRcdGZzOiB7XHJcblx0XHRcdFx0YWxsb3c6IFtzZWFyY2hGb3JXb3Jrc3BhY2VSb290KHByb2Nlc3MuY3dkKCkpLCAuLi5nZXRFeHRlbnNpb25zUmVhbFBhdGhzKCldLFxyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHR9KSxcclxuXHR0ZXN0OiB7XHJcblx0XHRlbnZpcm9ubWVudDogJ2hhcHB5LWRvbScsXHJcblx0XHRkZXBzOiB7XHJcblx0XHRcdG9wdGltaXplcjoge1xyXG5cdFx0XHRcdHdlYjoge1xyXG5cdFx0XHRcdFx0ZXhjbHVkZTogWydwaW5pYScsICd1cmwnXSxcclxuXHRcdFx0XHR9LFxyXG5cdFx0XHR9LFxyXG5cdFx0fSxcclxuXHR9LFxyXG59KTtcclxuXHJcbmZ1bmN0aW9uIGdldEV4dGVuc2lvbnNSZWFsUGF0aHMoKSB7XHJcblx0cmV0dXJuIGV4dGVuc2lvbnNQYXRoRXhpc3RzXHJcblx0XHQ/IGZzXHJcblx0XHRcdFx0LnJlYWRkaXJTeW5jKEVYVEVOU0lPTlNfUEFUSClcclxuXHRcdFx0XHQuZmxhdE1hcCgodHlwZURpcikgPT4ge1xyXG5cdFx0XHRcdFx0Y29uc3QgZXh0ZW5zaW9uVHlwZURpciA9IHBhdGguam9pbihFWFRFTlNJT05TX1BBVEgsIHR5cGVEaXIpO1xyXG5cdFx0XHRcdFx0aWYgKCFmcy5zdGF0U3luYyhleHRlbnNpb25UeXBlRGlyKS5pc0RpcmVjdG9yeSgpKSByZXR1cm47XHJcblx0XHRcdFx0XHRyZXR1cm4gZnMucmVhZGRpclN5bmMoZXh0ZW5zaW9uVHlwZURpcikubWFwKChkaXIpID0+IGZzLnJlYWxwYXRoU3luYyhwYXRoLmpvaW4oZXh0ZW5zaW9uVHlwZURpciwgZGlyKSkpO1xyXG5cdFx0XHRcdH0pXHJcblx0XHRcdFx0LmZpbHRlcigodikgPT4gdilcclxuXHRcdDogW107XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGRpcmVjdHVzRXh0ZW5zaW9ucygpIHtcclxuXHRjb25zdCB2aXJ0dWFsRXh0ZW5zaW9uc0lkID0gJ0BkaXJlY3R1cy1leHRlbnNpb25zJztcclxuXHJcblx0bGV0IGV4dGVuc2lvbnNFbnRyeXBvaW50ID0gbnVsbDtcclxuXHJcblx0cmV0dXJuIFtcclxuXHRcdHtcclxuXHRcdFx0bmFtZTogJ2RpcmVjdHVzLWV4dGVuc2lvbnMtc2VydmUnLFxyXG5cdFx0XHRhcHBseTogJ3NlcnZlJyxcclxuXHRcdFx0Y29uZmlnOiAoKSA9PiAoe1xyXG5cdFx0XHRcdG9wdGltaXplRGVwczoge1xyXG5cdFx0XHRcdFx0aW5jbHVkZTogQVBQX1NIQVJFRF9ERVBTLFxyXG5cdFx0XHRcdH0sXHJcblx0XHRcdH0pLFxyXG5cdFx0XHRhc3luYyBidWlsZFN0YXJ0KCkge1xyXG5cdFx0XHRcdGF3YWl0IGxvYWRFeHRlbnNpb25zKCk7XHJcblx0XHRcdH0sXHJcblx0XHRcdHJlc29sdmVJZChpZCkge1xyXG5cdFx0XHRcdGlmIChpZCA9PT0gdmlydHVhbEV4dGVuc2lvbnNJZCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGlkO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdFx0bG9hZChpZCkge1xyXG5cdFx0XHRcdGlmIChpZCA9PT0gdmlydHVhbEV4dGVuc2lvbnNJZCkge1xyXG5cdFx0XHRcdFx0cmV0dXJuIGV4dGVuc2lvbnNFbnRyeXBvaW50O1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fSxcclxuXHRcdH0sXHJcblx0XHR7XHJcblx0XHRcdG5hbWU6ICdkaXJlY3R1cy1leHRlbnNpb25zLWJ1aWxkJyxcclxuXHRcdFx0YXBwbHk6ICdidWlsZCcsXHJcblx0XHRcdGNvbmZpZzogKCkgPT4gKHtcclxuXHRcdFx0XHRidWlsZDoge1xyXG5cdFx0XHRcdFx0cm9sbHVwT3B0aW9uczoge1xyXG5cdFx0XHRcdFx0XHRpbnB1dDoge1xyXG5cdFx0XHRcdFx0XHRcdGluZGV4OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpLFxyXG5cdFx0XHRcdFx0XHRcdC4uLkFQUF9TSEFSRURfREVQUy5yZWR1Y2UoKGFjYywgZGVwKSA9PiAoeyAuLi5hY2MsIFtkZXAucmVwbGFjZSgvXFwvL2csICdfJyldOiBkZXAgfSksIHt9KSxcclxuXHRcdFx0XHRcdFx0fSxcclxuXHRcdFx0XHRcdFx0b3V0cHV0OiB7XHJcblx0XHRcdFx0XHRcdFx0ZW50cnlGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLltoYXNoXS5lbnRyeS5qcycsXHJcblx0XHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0XHRcdGV4dGVybmFsOiBbdmlydHVhbEV4dGVuc2lvbnNJZF0sXHJcblx0XHRcdFx0XHRcdHByZXNlcnZlRW50cnlTaWduYXR1cmVzOiAnZXhwb3J0cy1vbmx5JyxcclxuXHRcdFx0XHRcdH0sXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0fSksXHJcblx0XHR9LFxyXG5cdF07XHJcblxyXG5cdGFzeW5jIGZ1bmN0aW9uIGxvYWRFeHRlbnNpb25zKCkge1xyXG5cdFx0Y29uc3QgbG9jYWxFeHRlbnNpb25zID0gZXh0ZW5zaW9uc1BhdGhFeGlzdHMgPyBhd2FpdCByZXNvbHZlRnNFeHRlbnNpb25zKEVYVEVOU0lPTlNfUEFUSCkgOiBuZXcgTWFwKCk7XHJcblx0XHRjb25zdCBtb2R1bGVFeHRlbnNpb25zID0gYXdhaXQgcmVzb2x2ZU1vZHVsZUV4dGVuc2lvbnMoQVBJX1BBVEgpO1xyXG5cclxuXHRcdGNvbnN0IHJlZ2lzdHJ5RXh0ZW5zaW9ucyA9IGV4dGVuc2lvbnNQYXRoRXhpc3RzXHJcblx0XHRcdD8gYXdhaXQgcmVzb2x2ZUZzRXh0ZW5zaW9ucyhwYXRoLmpvaW4oRVhURU5TSU9OU19QQVRILCAnLnJlZ2lzdHJ5JykpXHJcblx0XHRcdDogbmV3IE1hcCgpO1xyXG5cclxuXHRcdGNvbnN0IG1vY2tTZXR0aW5nID0gKHNvdXJjZSwgZm9sZGVyLCBleHRlbnNpb24pID0+IHtcclxuXHRcdFx0Y29uc3Qgc2V0dGluZ3MgPSBbXHJcblx0XHRcdFx0e1xyXG5cdFx0XHRcdFx0aWQ6IGV4dGVuc2lvbi5uYW1lLFxyXG5cdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdGZvbGRlcjogZm9sZGVyLFxyXG5cdFx0XHRcdFx0YnVuZGxlOiBudWxsLFxyXG5cdFx0XHRcdFx0c291cmNlOiBzb3VyY2UsXHJcblx0XHRcdFx0fSxcclxuXHRcdFx0XTtcclxuXHJcblx0XHRcdGlmIChleHRlbnNpb24udHlwZSA9PT0gJ2J1bmRsZScpIHtcclxuXHRcdFx0XHRzZXR0aW5ncy5wdXNoKFxyXG5cdFx0XHRcdFx0Li4uZXh0ZW5zaW9uLmVudHJpZXMubWFwKChlbnRyeSkgPT4gKHtcclxuXHRcdFx0XHRcdFx0ZW5hYmxlZDogdHJ1ZSxcclxuXHRcdFx0XHRcdFx0Zm9sZGVyOiBlbnRyeS5uYW1lLFxyXG5cdFx0XHRcdFx0XHRidW5kbGU6IGV4dGVuc2lvbi5uYW1lLFxyXG5cdFx0XHRcdFx0XHRzb3VyY2U6IHNvdXJjZSxcclxuXHRcdFx0XHRcdH0pKSxcclxuXHRcdFx0XHQpO1xyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRyZXR1cm4gc2V0dGluZ3M7XHJcblx0XHR9O1xyXG5cclxuXHRcdC8vIGRlZmF1bHQgdG8gZW5hYmxlZCBmb3IgYXBwIGV4dGVuc2lvbiBpbiBkZXZlbG9wZXIgbW9kZVxyXG5cdFx0Y29uc3QgZXh0ZW5zaW9uU2V0dGluZ3MgPSBbXHJcblx0XHRcdC4uLkFycmF5LmZyb20obG9jYWxFeHRlbnNpb25zLmVudHJpZXMoKSkuZmxhdE1hcCgoW2ZvbGRlciwgZXh0ZW5zaW9uXSkgPT5cclxuXHRcdFx0XHRtb2NrU2V0dGluZygnbG9jYWwnLCBmb2xkZXIsIGV4dGVuc2lvbiksXHJcblx0XHRcdCksXHJcblx0XHRcdC4uLkFycmF5LmZyb20obW9kdWxlRXh0ZW5zaW9ucy5lbnRyaWVzKCkpLmZsYXRNYXAoKFtmb2xkZXIsIGV4dGVuc2lvbl0pID0+XHJcblx0XHRcdFx0bW9ja1NldHRpbmcoJ21vZHVsZScsIGZvbGRlciwgZXh0ZW5zaW9uKSxcclxuXHRcdFx0KSxcclxuXHRcdFx0Li4uQXJyYXkuZnJvbShyZWdpc3RyeUV4dGVuc2lvbnMuZW50cmllcygpKS5mbGF0TWFwKChbZm9sZGVyLCBleHRlbnNpb25dKSA9PlxyXG5cdFx0XHRcdG1vY2tTZXR0aW5nKCdyZWdpc3RyeScsIGZvbGRlciwgZXh0ZW5zaW9uKSxcclxuXHRcdFx0KSxcclxuXHRcdF07XHJcblxyXG5cdFx0ZXh0ZW5zaW9uc0VudHJ5cG9pbnQgPSBnZW5lcmF0ZUV4dGVuc2lvbnNFbnRyeXBvaW50KFxyXG5cdFx0XHR7IG1vZHVsZTogbW9kdWxlRXh0ZW5zaW9ucywgbG9jYWw6IGxvY2FsRXh0ZW5zaW9ucywgcmVnaXN0cnk6IHJlZ2lzdHJ5RXh0ZW5zaW9ucyB9LFxyXG5cdFx0XHRleHRlbnNpb25TZXR0aW5ncyxcclxuXHRcdCk7XHJcblx0fVxyXG59XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVMsU0FBUyx1QkFBdUI7QUFDblUsU0FBUyw4QkFBOEIscUJBQXFCLCtCQUErQjtBQUMzRixPQUFPLFVBQVU7QUFDakIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sUUFBUTtBQUNmLE9BQU8sVUFBVTtBQUNqQixTQUFTLDhCQUE4QjtBQUN2QyxTQUFTLG9CQUFvQjtBQVI3QixJQUFNLG1DQUFtQztBQVV6QyxJQUFNLFdBQVcsS0FBSyxLQUFLLE1BQU0sS0FBSztBQU90QyxJQUFNLGtCQUFrQixLQUFLLEtBQUssVUFBVSxZQUFZO0FBRXhELElBQU0sdUJBQXVCLEdBQUcsV0FBVyxlQUFlO0FBRzFELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzNCLFNBQVM7QUFBQSxJQUNSLG1CQUFtQjtBQUFBLElBQ25CLElBQUk7QUFBQSxJQUNKLFdBQVc7QUFBQSxJQUNYLEtBQUs7QUFBQSxNQUNKLFVBQVUsTUFBTTtBQUNmLGVBQU8sU0FBUyxPQUFPLENBQUMsSUFBSTtBQUFBLE1BQzdCO0FBQUEsSUFDRCxDQUFDO0FBQUEsSUFDRDtBQUFBLE1BQ0MsTUFBTTtBQUFBLE1BQ04saUJBQWlCLENBQUMsV0FBVztBQUM1QixlQUFPLFFBQVEsVUFBVTtBQUFBLFVBQ3hCLEdBQUcsT0FBTyxRQUFRO0FBQUEsVUFDbEIsU0FBUyxDQUFDLG1DQUFtQyxZQUFZO0FBQUEsUUFDMUQ7QUFBQSxNQUNEO0FBQUEsSUFDRDtBQUFBLEVBQ0Q7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNQLHlCQUF5QjtBQUFBLEVBQzFCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUixPQUFPLENBQUMsRUFBRSxNQUFNLEtBQUssYUFBYSxLQUFLLFFBQVEsa0NBQVcs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
