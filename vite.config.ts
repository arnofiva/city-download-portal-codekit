import { resolve, join } from "node:path";
import { vitePlugin as remix } from "@remix-run/dev";
import { UserConfig, defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";
import { copyFileSync } from "node:fs";

export default defineConfig(({ mode }) => {
  const base = mode === "development" ? "/" : "/city-download-portal/";

  return {
    base,
    ssr: {
      noExternal: [
        /@esri\/calcite-components/,
        /@esri\/calcite-components-react/,
        /@stencil\/core/,
      ],
    },
    optimizeDeps: {
      exclude: [
        "@esri/calcite-components",
        "@esri/calcite-components-react",
        "@arcgis/core",
      ],
    },
    plugins: [
      remix({
        ssr: false,
        basename: base,
        buildEnd(args) {
          if (!args.viteConfig.isProduction) return;
          // When deploying to GitHub Pages, if you navigate from / to another
          // route and refresh the tab, it will show the default GH Pages 404
          // page. This happens because GH Pages is not configured to send all
          // traffic to the index.html where we can load our client-side JS.
          // To fix this, we can create a 404.html file that contains the same
          // content as index.html. This way, when the user refreshes the page,
          // GH Pages will serve our 404.html and everything will work as
          //expected.
          const buildPath = args.viteConfig.build.outDir;
          copyFileSync(
            join(buildPath, "index.html"),
            join(buildPath, "404.html"),
          );
        },
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
        },
      }),
      tsconfigPaths(),
      viteStaticCopy({
        targets: [
          {
            src: resolve(
              "node_modules",
              "@esri",
              "calcite-components",
              "dist",
              "calcite",
              "assets",
            ),
            dest: ".",
          },
        ],
      }),
    ],
  } satisfies UserConfig;
});
