// Plesk Passenger adapter. Keep the private internal loopback server out of auto-install.
if(typeof PhusionPassenger!=='undefined')PhusionPassenger.configure({autoInstall:false});
(async()=>{
  const passenger=typeof PhusionPassenger!=='undefined',port=Number(process.env.GRAVURU_TEST_PORT||8963);
  if(!passenger&&(!Number.isInteger(port)||port<1024||port>65535))throw Error('Testport ungültig.');
  const {createPrivateTestRuntime}=await import('./runtime.mjs');
  const server=await createPrivateTestRuntime(process.env);
  server.on('error',()=>{console.error('Privater Teststart fehlgeschlagen. plesk:check ausführen.');process.exitCode=1;server.close();});
  if(passenger)server.listen('passenger');
  else server.listen(port,'127.0.0.1');
  for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close();server.closeAllConnections();});
})().catch(()=>{console.error('Privater Teststart gesperrt. Konfiguration mit plesk:check prüfen; keine Zugangsdaten ausgeben.');process.exitCode=1;});
