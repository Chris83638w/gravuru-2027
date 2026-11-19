# Lesefassung des F02-Testthemes

Dieses Dokument bewahrt den Adapter des unveröffentlichten Testthemes für die Codeprüfung. Er benutzt den Studio-Editor und dessen SVG-Funktionen. Er speichert Version 1 der Gestaltung direkt an der Shopify-Position. Die Datei im Testtheme kombiniert den Adapter mit dem Studio-Modul. Die hier wiedergegebene Fassung des Adapters erzeugt JPEG. Die frühere bezahlte Testbestellung benutzte PNG. Der exakte Produkt- und Variantenbezug kommt im Theme aus Shopify. Die Beispiele enthalten keine tatsächlichen Bestellungen oder Personalisierungsdaten.

## Herkunft und Umfang

| Lesefassung | Verwendung im Entwurf | SHA-256 der archivierten Eingabedatei |
| --- | --- | --- |
| `storefront-adapter.js` | Client-Ergänzung für `assets/gravuru-260-editor.js` | `03877163ba02b92ea4bd2c0ce57256585489bf3c1c231636688c1a4dc8900eba` |
| `product-editor.liquid` | `snippets/gravuru-260-product-editor.liquid` | `64a982a2e18a3f5840d9700851567cdc3119ac44cfd559553575639e64094b7e` |
| `line-image.liquid` | `snippets/gravuru-260-line-image.liquid` für Warenkorbseite und Schublade | `aeaad7b3d96609900d8fb872da43e01e1d570a348223a5746a9f6a1690e08f97` |

Die Prüffassung ersetzt im Bild-Snippet den mandantenspezifischen CDN-Pfad durch `TESTSHOP`. Die Prüfsummen beziehen sich auf die Originalbytes vor dieser Ersetzung und der Normalisierung der Zeilenenden. Die Theme-Erweiterung im Studio-Quellbaum beschreibt den separaten App-Proxy-Weg. [Theme-Erweiterung im geprüften Commit](https://github.com/Chris83638w/gravuru-2027/blob/cf36da609e6f904e1c9c316ee2d397de6bf4c975/app/personalisierungsstudio/extensions/studio/blocks/studio.liquid) · [Kaufbeleg im Issue](https://github.com/Chris83638w/gravuru-2027/issues/260#issuecomment-6986672776)

## storefront-adapter.js

~~~javascript
// The normal Studio element supplies the fields, template changes, motif placement and renderer.
// This draft-store adapter keeps the customer's changes on the purchased Shopify line.
const moreFaces = new Map();

function readImage(source) {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Das Vorschaubild konnte nicht erzeugt werden.'));
    im.src = source;
  });
}

async function previewFile(editor, shape, reference) {
  const artwork = new Blob([svg(shape, {contour: false})], {type: 'image/svg+xml;charset=utf-8'});
  const url = URL.createObjectURL(artwork);
  try {
    const [surface, drawing] = await Promise.all([readImage(editor.dataset.surface), readImage(url)]);
    const canvas = document.createElement('canvas');
    canvas.width = 900;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(surface, 0, 0, canvas.width, canvas.height);
    ctx.drawImage(drawing, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob) throw new Error('Die Vorschau konnte nicht gespeichert werden.');
    const extension = blob.type === 'image/jpeg' ? '.jpg' : '.png';
    return new File([blob], 'gravuru-' + reference + extension, {type: blob.type});
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fieldsForLine(editor, draft, design) {
  const payload = {version: 1, revision: editor.catalog.revision, design: design.id,
    edits: draft.edits, motifs: draft.motifs};
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const encoded = btoa(Array.from(bytes, v => String.fromCharCode(v)).join(''));
  const chunks = encoded.match(/.{1,176}/g);
  const values = {Vorlage: design.name, Personalisierung: design.objects
    .filter(o => o.type === 'text').map(o => draft.edits[o.key] ?? o.text).filter(Boolean).join(' · ').slice(0,200),
    _gravuru_ref: draft.request, _gravuru_parts: String(chunks.length)};
  chunks.forEach((chunk, i) => { values['_gravuru_data_' + i] = chunk; });
  return values;
}

class F02StorefrontEditor extends GravuruStudio {
  async connectedCallback() {
    if (this.started || this.booting) return;
    this.booting = true;
    try {
      const seed = await request(this.dataset.source);
      if (!this.isConnected) return;
      if (seed.catalog.product !== this.dataset.product || seed.catalog.variant !== this.dataset.variant)
        throw new Error('Diese Vorlagen sind einer anderen Variante zugeordnet.');
      this.previewData = seed;
      this.dataset.surface = seed.surface;
      super.connectedCallback();
    } catch (error) {
      this.textContent = error.message;
    } finally {
      this.booting = false;
    }
  }

  async load(variant) {
    const seed = this.previewData;
    this.asset = async key => {
      if (Object.hasOwn(seed.assets, key)) return seed.assets[key];
      const filename = seed.extra[key];
      if (!filename) throw new Error('Die Vorlage ist unvollständig.');
      const url = new URL(filename, new URL(this.dataset.source, location.href)).href;
      if (!moreFaces.has(url)) moreFaces.set(url, request(url).catch(error => { moreFaces.delete(url); throw error; }));
      return moreFaces.get(url);
    };
    if (variant !== seed.catalog.variant) {
      this.current = null;
      this.q('.gs-add').disabled = true;
      this.status('Für diese Variante liegt keine Testvorlage vor.');
      return;
    }
    await super.load(variant);
  }

  async add() {
    if (this.busy || !this.current || this.q('.gs-add').disabled) return;
    const quantity = this.q('.gs-qty');
    if (!quantity.reportValidity() || this.actualVariant() !== this.variant) return;
    const draft = this.draft, current = this.current;
    const properties = fieldsForLine(this, draft, current.design);
    const inspect = async () => (await request(this.dataset.cartJson, {cache:'no-store'})).items
      .find(line => String(line.variant_id) === this.variant && line.properties?._gravuru_ref === draft.request);
    const valid = line => line && line.properties.Vorschaubild &&
      Object.entries(properties).every(([key, value]) => line.properties[key] === value);
    this.busy = true;
    this.q('.gs-controls').inert = true;
    this.q('.gs-add').disabled = true;
    this.status('Deine Gestaltung wird in den Warenkorb gelegt …');
    try {
      if (draft.uncertain) {
        const previous = await inspect();
        if (valid(previous)) { location.assign(this.dataset.cart); return; }
        if (previous) throw new Error('Die vorhandene Position ist unvollständig. Bitte im Warenkorb prüfen.');
      }
      const shape = scene(current.design, current.fonts, draft.edits, null, draft.motifs);
      const file = await previewFile(this, shape, draft.request);
      const data = new FormData();
      data.set('id', this.variant);
      data.set('quantity', quantity.value);
      for (const [key, value] of Object.entries(properties)) data.set('properties[' + key + ']', value);
      data.set('properties[Vorschaubild]', file, file.name);
      draft.uncertain = true;
      const response = await request(this.dataset.add, {method:'POST', body:data, headers:{Accept:'application/json'}});
      const added = response.items?.[0] || response;
      if (!valid(added)) {
        const saved = await inspect();
        if (!valid(saved)) throw new Error('Shopify hat die Gestaltung noch nicht vollständig bestätigt.');
      }
      location.assign(this.dataset.cart);
    } catch (error) {
      this.status(error.message + ' Deine Eingaben sind erhalten.');
    } finally {
      this.busy = false;
      this.q('.gs-controls').inert = false;
      this.q('.gs-add').disabled = !this.current;
    }
  }
}

customElements.define('gravuru-f02-editor', F02StorefrontEditor);
~~~

## product-editor.liquid

~~~liquid
{% doc %}
  Couples the two approved steel designs to the existing Shopify item.
  @param {product} product - Current product.
  @param {block} block - Theme purchase block.
{% enddoc %}
{{ 'gravuru-260-editor.css' | asset_url | stylesheet_tag }}
<gravuru-f02-editor
  {{ block.shopify_attributes }}
  data-product="{{ product.id }}" data-variant="{{ product.selected_or_first_available_variant.id }}"
  data-source="{{ 'gravuru-260-katalog.json' | asset_url | escape }}"
  data-add="{{ routes.cart_add_url }}.js" data-cart="{{ routes.cart_url }}" data-cart-json="{{ routes.cart_url }}.js">
  <p role="status">Gestaltung wird geöffnet …</p>
</gravuru-f02-editor>
<script type="module" src="{{ 'gravuru-260-editor.js' | asset_url }}"></script>
~~~

## line-image.liquid

~~~liquid
{% doc %}
  Shows the preview stored on this line of the isolated steel test product.
  @param {line_item} item - Shopify cart line.
{% enddoc %}
{%- liquid
  assign personal = false
  assign url = item.properties['Vorschaubild'] | default: '' | strip
  assign cdn = 'https://cdn.shopify.com/s/files/TESTSHOP/'
  assign local_upload = '/uploads/'
  assign cdn_start = url | slice: 0, cdn.size
  assign upload_start = url | slice: 0, local_upload.size
  if item.product.tags contains 'vergleich-260' and url != blank
    if cdn_start == cdn or upload_start == local_upload
      assign path = url | split: '?' | first | downcase
      assign suffix = path | slice: -4, 4
      if suffix == '.png' or suffix == '.jpg' or suffix == 'webp' or suffix == 'jpeg'
        assign personal = true
      endif
    endif
  endif
-%}
{%- if personal -%}
  <img class="cart-item__image" src="{{ url | escape }}" alt="Deine Gestaltung – {{ item.properties['Personalisierung'] | default: item.properties['Familienname'] | escape }}" loading="eager" width="150" height="100" data-gravuru-vorschau>
{%- elsif item.image -%}
  <img class="cart-item__image" src="{{ item.image | image_url: width: 300 }}" alt="{{ item.image.alt | escape }}" loading="lazy" width="150" height="{{ 150 | divided_by: item.image.aspect_ratio | ceil }}">
{%- endif -%}
~~~
