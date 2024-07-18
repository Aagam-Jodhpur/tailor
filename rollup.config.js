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

//=========================<  Dynamic config properties  >======================
let plugins = [typescript()]
if (!isDev) plugins.push(terser())

//===================================<  Config  >===============================
export default [
  // Main library
  {
    input,
    plugins,
    output: {
      file: pkg.main,
      format: 'esm',
    },
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
