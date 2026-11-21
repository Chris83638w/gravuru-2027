// Nicht gegen das Paket geprüft (kein Netz beim Vorbereiten): Modulpfad des Ziels und Name der globalen Schnittstelle
// vor der Installation mit `npm install && npm run check` bestätigen und bei Abweichung nur diese Datei anpassen.
import type {Api} from '@shopify/ui-extensions/admin.order-details.block.render';
declare module '@shopify/ui-extensions/admin' { interface ShopifyGlobal extends Api {} }
