// Explicit public presentation assets; tests and arbitrary files are not served.
const assets=new Set(['shop-shell.mjs','review-shell.mjs','demo.mjs','demo.css','shopping-cart.svg',
 'text-editor.mjs','edge-resize.mjs','motif-size-limit.mjs','small-motif-controls.mjs',
 'text-selection-dismiss.mjs','desktop-selection.mjs','options-navigation.mjs',
 'overlap-review.mjs','overlap-consent.mjs','contour-placement.mjs','product-return.mjs','preview-action.mjs']);
export const isPrioPresentationAsset=pathname=>typeof pathname==='string'&&pathname.startsWith('/configurator/mobile-demo/')&&assets.has(pathname.slice('/configurator/mobile-demo/'.length));
