"""Check recovered extension files against an actual active Shopify snapshot.

Offline only. Does not authenticate, publish, alter the snapshot or infer that
recompiled Wasm is byte-identical to the unavailable active Wasm binary.
"""
import argparse
import base64
import hashlib
import json
import re
import tomllib
from pathlib import Path

CLIENT_ID = '9640dd7a6907f0c73e7013ea8c24869b'
HANDLES = {'gravuru-storefront', 'gravuru-personalization-price'}
MODULES = {'app_home', 'data', 'branding', 'theme_app_extension', 'function', 'app_access', 'webhooks'}


def require(ok, message):
    if not ok:
        raise ValueError(message)


def regular(root, relative):
    path = root / relative
    require(path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(root.resolve()),
            'Missing or unsafe source: ' + relative)
    return path.read_bytes()


def verify(project, active):
    project = Path(project)
    modules = active.get('appModuleVersions', [])
    require(len(modules) == 7 and {m['type'] for m in modules} == MODULES, 'Active module inventory changed')
    configs = {m['type']: m['config'] for m in modules}
    config = tomllib.loads(regular(project, 'shopify.app.toml').decode())
    require(config['client_id'] == CLIENT_ID, 'Wrong app identity')
    require(config['application_url'] == configs['app_home']['app_url'] and
            config['embedded'] == configs['app_home']['embedded'], 'App home changed')
    require(config['name'] == configs['branding']['name'], 'Branding changed')
    require(config['webhooks'] == configs['webhooks'], 'Webhook configuration changed')
    require(config['access'] == configs['app_access']['access'], 'Access configuration changed')
    require(set(config['access_scopes']['scopes'].split(',')) == set(configs['app_access']['scopes'].split(',')), 'Scopes changed')
    require(config['access_scopes'].get('optional_scopes', []) == configs['app_access']['optional_scopes'], 'Optional scopes changed')
    require(config['auth']['redirect_urls'] == configs['app_access']['redirect_url_allowlist'], 'Redirects changed')
    require(config['product'] == configs['data']['product'], 'Product data definition changed')
    require(set(config) == {'client_id', 'name', 'application_url', 'embedded', 'webhooks', 'access', 'access_scopes', 'auth', 'product'}, 'Unexpected app configuration')
    extensions = [p for p in (project / 'extensions').iterdir() if p.is_dir()]
    require({p.name for p in extensions} == HANDLES, 'Missing or unexpected extension')
    receipts = []
    theme_root = project / 'extensions/gravuru-storefront'
    theme = configs['theme_app_extension']['theme_extension']['files']
    expected = {f'{folder}/{name}': meta for folder, files in theme.items() for name, meta in files.items()}
    actual = {p.relative_to(theme_root).as_posix() for p in theme_root.rglob('*') if p.is_file() and p.name != 'shopify.extension.toml'}
    require(actual == set(expected), 'Theme file inventory differs')
    for relative, meta in sorted(expected.items()):
        require(re.fullmatch(r'(assets|blocks|snippets|locales)/[^/]+', relative), 'Unsafe theme filename')
        data = regular(theme_root, relative)
        digest = hashlib.sha256(data).digest()
        if 'value' in meta:
            require(data == meta['value'].encode(), 'Changed theme text: ' + relative)
        else:
            require(len(data) == meta['size'] and digest == base64.b64decode(meta['sha256'], validate=True), 'Changed theme asset: ' + relative)
        receipts.append({'path': relative, 'bytes': len(data), 'sha256': digest.hex()})
    for folder in extensions:
        parsed = tomllib.loads(regular(folder, 'shopify.extension.toml').decode())
        entries = parsed.get('extensions')
        # Older theme extensions have flat configuration; functions use an array.
        extension = entries[0] if entries and len(entries) == 1 else parsed
        remote = next(m for m in modules if m.get('registrationTitle') == folder.name)
        require(extension.get('uid') == remote['registrationId'], 'Extension identity changed')
        if folder.name == 'gravuru-personalization-price':
            target = extension['targeting']
            require(len(target) == 1, 'Function target inventory changed')
            current = configs['function']
            require(parsed['api_version'] == current['api_version'] and extension['name'] == current['title'] and
                    extension['description'] == current['description'], 'Function configuration changed')
            require(target[0]['target'] == current['targets'][0]['handle'] and
                    target[0]['export'] == current['targets'][0]['export'], 'Function target changed')
            query = regular(folder, target[0]['input_query'])
            require(query.decode() == current['targets'][0]['input_query'], 'Function query changed')
            require(extension['ui']['paths'] == {'create': current['ui']['app_bridge']['create_path'], 'details': current['ui']['app_bridge']['details_path']}, 'Function UI changed')
            wasm = regular(folder, extension['build']['path'])
            require(wasm[:8] == b'\x00asm\x01\x00\x00\x00', 'Invalid Wasm binary')
            function = {'bytes': len(wasm), 'sha256': hashlib.sha256(wasm).hexdigest(),
                        'activeModuleId': current['module_id'], 'activeBinarySize': current['module_metadata']['module_wasm_size_bytes'],
                        'activeBinaryEqualityVerified': False}
    return {'schema': 'gravuru-extension-release-check/v1', 'activeRelease': active['id'],
            'clientId': CLIENT_ID, 'moduleCount': len(modules), 'themeFiles': receipts,
            'themeMatchesActive': True, 'function': function, 'released': False,
            'wholeApplicationReady': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project', required=True, type=Path)
    parser.add_argument('--active', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    result = verify(args.project, json.loads(args.active.read_text()))
    with args.output.open('x') as out:
        json.dump(result, out, indent=2)
        out.write('\n')
    print(json.dumps({'themeFiles': len(result['themeFiles']), 'themeMatchesActive': True,
                      'function': result['function'], 'released': False}))
