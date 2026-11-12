// Resolve only the configured bundled runtime. No installation or dependency mutation.
// Junction creation is denied in this Windows session; use Node's public package resolver.
import {createRequire} from 'node:module';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const modules=process.env.GRAVURU_ARTIFACT_NODE_MODULES || "C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1111-574-0_26.1111.574.0_x64__3k8sg7r9htsxt/dependencies/node/node_modules";
if(!modules)throw Error('GRAVURU_ARTIFACT_NODE_MODULES must be the bundled path from load_workspace_dependencies');
const entry=createRequire(import.meta.url).resolve('@oai/artifact-tool',{paths:[path.dirname(path.resolve(modules))]});
export const {Workbook,SpreadsheetFile,FileBlob}=await import(pathToFileURL(entry).href);
