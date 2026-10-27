import path from 'node:path';

// Only public device cutouts from this versioned catalog package may be served.
export const DOORBELL_IMAGE_PACKAGE='migrationen/funkklingeln-42x3-20261027/devices';
export const isDoorbellImagePath=value=>typeof value==='string'&&/^\/doorbell-assets\/[a-f0-9]{64}\.webp$/.test(value);

export function doorbellImageResource(pathname,katalogDirectory){
 if(!isDoorbellImagePath(pathname)||typeof katalogDirectory!=='string'||!katalogDirectory.trim())return null;
 return {base:path.join(katalogDirectory,DOORBELL_IMAGE_PACKAGE),relative:pathname.slice('/doorbell-assets/'.length)};
}

