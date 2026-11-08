import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Operator-selected local executable configuration, never request data. No
// default filename, environment discovery, credential read or remote import.
export async function loadSlateManagementConfig(filename,context){
 if(filename===undefined)return {};
 if(typeof filename!=='string'||!path.isAbsolute(filename)||path.extname(filename)!=='.mjs')throw Error('--management-config requires an absolute local .mjs path.');
 const module=await import(pathToFileURL(filename).href);
 if(typeof module.configureGalleryManagement!=='function')throw Error('The server configuration must export configureGalleryManagement.');
 const options=await module.configureGalleryManagement(Object.freeze({...context}));
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(key=>!['connect','synchronizer','filename','assignmentCatalogue'].includes(key)))throw Error('Invalid server-side gallery management configuration.');
 if((typeof options.connect==='function')===(typeof options.synchronizer==='function'))throw Error('Configure exactly one gallery management factory.');
 return options;
}
