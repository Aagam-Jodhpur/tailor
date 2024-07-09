//===========================<  Environment variables  >========================
import dotenv from 'dotenv'
dotenv.config()
const isDev = process.env.NODE_ENV === 'dev'

//==================================<  Imports  >===============================
import pkg from './package.json' assert { type: 'json' }
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'
import dts from 'rollup-plugin-dts'

//===================================<  Files  >================================
const input = 'src/index.ts'
const umdGlobalName = 'Tailor'
const umdOutput = pkg.main.slice(0, -2) + 'umd.js'

//=========================<  Dynamic config properties  >======================
let plugins = [typescript()]
if (!isDev) plugins.push(terser())

//===================================<  Config  >===============================
export default [
  // Main library
  {
    input,
    plugins,
    output: [
      {
        file: pkg.main,
        format: 'esm',
      },
      {
        name: umdGlobalName,
        file: umdOutput,
        format: 'umd',
      },
    ],
  },
  // Type declarations
  {
    input,
    plugins: [
      dts({
        // TODO: This is temporary, remove this later
        compilerOptions: { strict: false },
      }),
    ],
    output: { file: pkg.types },
  },
]
