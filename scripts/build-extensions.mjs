import { buildSync } from "esbuild";
import { readdirSync } from "fs";
import { join } from "path";

const srcDir = "src/extensions/countdown-bar";
const outDir = "extensions/countdown-bar/assets";

const jsFiles = readdirSync(srcDir).filter((f) => f.endsWith(".js"));

for (const file of jsFiles) {
  const result = buildSync({
    entryPoints: [join(srcDir, file)],
    outfile: join(outDir, file),
    bundle: false,
    minify: true,
    target: ["es2015"],
    charset: "utf8",
    legalComments: "none",
    allowOverwrite: true,
  });

  if (result.errors.length > 0) {
    console.error(`Failed to build ${file}:`, result.errors);
    process.exit(1);
  }
}

for (const file of jsFiles) {
  const { statSync } = await import("fs");
  const size = statSync(join(outDir, file)).size;
  const status = size > 10000 ? " [OVER 10KB]" : "";
  console.log(`  ${file}: ${size} bytes${status}`);
}
