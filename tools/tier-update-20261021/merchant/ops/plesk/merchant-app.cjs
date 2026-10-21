const {startupDiagnostic} = require('./diagnostics.cjs');
if (typeof PhusionPassenger !== 'undefined') PhusionPassenger.configure({autoInstall: false});
(async () => {
  const passenger = typeof PhusionPassenger !== 'undefined', port = Number(process.env.GRAVURU_SHOPIFY_TEST_PORT || 8964);
  if (!passenger && (!Number.isInteger(port) || port < 1024 || port > 65535)) throw Error();
  const {createMerchantRuntime} = await import('./merchant-runtime.mjs');
  const server = await createMerchantRuntime(process.env);
  server.on('error', error => {console.error('Shopify-Händlerstart fehlgeschlagen.', JSON.stringify(startupDiagnostic(error))); process.exitCode = 1; server.close();});
  if (passenger) server.listen('passenger'); else server.listen(port, '127.0.0.1');
  for (const signal of ['SIGTERM', 'SIGINT']) process.once(signal, () => {server.close(); server.closeAllConnections();});
})().catch(error => {console.error('Shopify-Händlerstart gesperrt.', JSON.stringify(startupDiagnostic(error))); process.exitCode = 1;});
