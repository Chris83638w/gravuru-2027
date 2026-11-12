"""Compare the same 16 product projections read before and after execution."""
import json
from pathlib import Path

root = Path(__file__).resolve().parent
before = json.loads((root / 'protected16-before.json').read_text(encoding='utf-8-sig'))
after = json.loads((root / 'protected16-after.json').read_text(encoding='utf-8-sig'))

def protected(product):
    result = {k: v for k, v in product.items() if k != 'totalInventory'}
    result['variants'] = sorted(
        [{k: v for k, v in variant.items() if k != 'inventoryQuantity'}
         for variant in product['variants']], key=lambda item: item['id'])
    result['tags'] = sorted(product['tags'])
    return result

old = {product['id']: product for product in before['products']}
new = {product['id']: product for product in after['products']}
checks = []
for product_id in sorted(set(old) | set(new)):
    a, b = old.get(product_id), new.get(product_id)
    pa, pb = protected(a) if a else {}, protected(b) if b else {}
    changed = [key for key in sorted(set(pa) | set(pb)) if pa.get(key) != pb.get(key)]
    checks.append({'id': product_id, 'sameProtectedProjection': a is not None and b is not None and not changed,
                   'changedFields': changed, 'beforeStatus': a.get('status') if a else None,
                   'afterStatus': b.get('status') if b else None})

result = {
    'readOnly': True, 'beforeObservedFrom': before.get('observedFrom'),
    'afterObservedFrom': after.get('observedFrom'), 'afterObservedTo': after.get('observedTo'),
    'countBefore': len(old), 'countAfter': len(new),
    'scope': 'Only get_product fields actually returned. Inventory quantities excluded because live orders can change them. No claim about unqueried metafields.',
    'allPassed': len(old) == len(new) == 16 and all(item['sameProtectedProjection'] and item['afterStatus'] == 'ACTIVE' for item in checks),
    'products': checks,
}
(root / 'protected16-comparison.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'allPassed': result['allPassed'], 'count': len(checks), 'differences': [item for item in checks if not item['sameProtectedProjection']]}, ensure_ascii=False))
raise SystemExit(0 if result['allPassed'] else 1)
