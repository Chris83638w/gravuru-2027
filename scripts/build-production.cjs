// Produktionsbuild ohne --env-file (Next-Worker lehnen das in NODE_OPTIONS ab, siehe Issue 135 „Build-Falle“).
const path=require('node:path')
process.loadEnvFile(path.join(__dirname,'..','.env'))
process.env.NODE_ENV='production'
process.argv=[process.argv[0],require.resolve('next/dist/bin/next'),'build','--webpack']
require('next/dist/bin/next')
