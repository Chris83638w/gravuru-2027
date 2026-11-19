import path from 'node:path';
import {isDoorbellImagePath} from '../platform/sources/app/shared/models/doorbell-image-paths.mjs';

// Only public device cutouts from this versioned catalog package may be served.
export const DOORBELL_IMAGE_PACKAGE='migrationen/funkklingeln-42x3-20261027/devices';
export {isDoorbellImagePath};

export function doorbellImageResource(pathname,katalogDirectory){
 if(!isDoorbellImagePath(pathname)||typeof katalogDirectory!=='string'||!katalogDirectory.trim())return null;
 return {base:path.join(katalogDirectory,DOORBELL_IMAGE_PACKAGE),relative:pathname.slice('/doorbell-assets/'.length)};
}

