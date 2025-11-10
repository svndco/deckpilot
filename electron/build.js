// Simple build script for Electron main and preload
import { build } from 'esbuild'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

async function buildElectron() {
  try {
    // Build main process
    await build({
      entryPoints: [join(rootDir, 'electron/main.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: join(rootDir, 'dist-electron/main.cjs'),
      external: ['electron'],
      format: 'cjs'
    })

    // Build preload script
    await build({
      entryPoints: [join(rootDir, 'electron/preload.ts')],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outfile: join(rootDir, 'dist-electron/preload.cjs'),
      external: ['electron'],
      format: 'cjs'
    })

    console.log('✓ Electron built successfully')
  } catch (error) {
    console.error('Build failed:', error)
    process.exit(1)
  }
}

buildElectron()
