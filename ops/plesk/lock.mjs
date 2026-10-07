import path from 'node:path';
import {spawn} from 'node:child_process';

// Linux advisory lock: released by the OS after crashes; never delete/reuse a PID file.
export function lockTestData(config){
  return new Promise((resolve,reject)=>{
    const child=spawn(config.python,['-u','-c',"import fcntl,sys; f=open(sys.argv[1],'a'); fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB); print('ready',flush=True); sys.stdin.buffer.read()",path.join(config.data,'.runtime.lock')],{stdio:['pipe','pipe','ignore']});
    let ready=false,output='';
    const timeout=setTimeout(()=>{child.kill();reject(Error('Private Testablage konnte nicht exklusiv gesperrt werden.'));},5000);
    child.on('error',()=>{clearTimeout(timeout);reject(Error('Python-Sperre der Testablage nicht verfügbar.'));});
    child.once('exit',()=>{clearTimeout(timeout);if(!ready)reject(Error('Testablage bereits geöffnet. Genau einen App-Prozess für diesen Testbereich verwenden.'));});
    child.stdout.on('data',bytes=>{output+=bytes.toString();if(!ready&&output==='ready\n'){ready=true;clearTimeout(timeout);resolve(child);}});
    child.stdin.on('error',()=>{});
  });
}
