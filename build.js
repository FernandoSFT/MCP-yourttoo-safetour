import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts', 'src/config.ts', 'src/server.ts', 'src/api/yourttooClient.ts', 'src/tools/getInventory.ts', 'src/tools/searchPrograms.ts', 'src/tools/getProgramDetail.ts', 'src/tools/checkAvailability.ts', 'src/tools/getBooking.ts'],
  bundle: false,
  platform: 'node',
  target: 'node20',
  outdir: 'dist',
  format: 'esm',
  sourcemap: true,
  splitting: false,
  minify: false,
});

console.log('✅ Build completed');