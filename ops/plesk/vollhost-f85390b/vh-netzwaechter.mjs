// Vorlademodul nur für den isolierten Vollhost-Test (node --import): begrenzt ausgehende Verbindungen des Testprozesses
// und seiner Worker auf Loopback und lokale Sockets. Jeder andere Verbindungsversuch wird abgelehnt und als Ereignis
// (nur Zielname und Port) auf stderr gezählt. Keine Änderung an App-Dateien, keine fachliche Sperre.
import net from 'node:net';
const erlaubt=new Set(['127.0.0.1','::1','localhost','::ffff:127.0.0.1']);
const original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
 let o=args[0];if(Array.isArray(o))o=o[0];
 let host,port,lokal=false;
 if(o&&typeof o==='object'){host=o.host;port=o.port;lokal=typeof o.path==='string';}
 else if(typeof o==='string'&&!/^\d+$/.test(o))lokal=true;
 else{port=o;host=typeof args[1]==='string'?args[1]:undefined;}
 if(lokal||host===undefined||host===null||erlaubt.has(String(host)))return original.apply(this,args);
 try{process.stderr.write(JSON.stringify({event:'vh_netz_blockiert',host:String(host).slice(0,80),port:Number(port)||null})+'\n');}catch{}
 const fehler=Object.assign(new Error('Isolierter Test: Netzausgang gesperrt'),{code:'ECONNREFUSED',syscall:'connect'});
 process.nextTick(()=>this.destroy(fehler));
 return this;
};
