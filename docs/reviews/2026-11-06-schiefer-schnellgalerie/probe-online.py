#!/usr/bin/env python3
"""Read-only HTTP evidence for the installed private Schiefer review instance.

Python 3.11 standard library. Credentials stay in memory and are sent only over
verified HTTPS to EXPECTED_ORIGIN. Redirects are never followed. POST probes use
an unknown ID; the additional 422 probe also has an invalid field. No valid
comment or product write is submitted. Reports contain no response bodies,
credentials, CSRF values, or exception messages.
"""
import argparse
import base64
from datetime import datetime, timezone
import hashlib
import http.client
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import ssl
import stat
from urllib.parse import parse_qs, urlsplit
import xml.etree.ElementTree as ET

EXPECTED_ORIGIN = 'https://test-2027.gravuru-designwerkstatt.de'
D5_ID = 'GT-S-30x20-D5'
D5_REVISION = 1
D5_TEXT_SHA256 = 'abbeced9b6288927477832c57c05a83879489c0c9b57fa3c184fdcdfa0cd9125'
UNKNOWN_ID = '__slate_nonexistent_probe_20261106__'
MAX_RESPONSE_BYTES = 32 * 1024 * 1024


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical_hash(value):
    return digest(json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8'))


def configuration(filename):
    file = Path(filename).absolute()
    for part in (file, *file.parents):
        if part.is_symlink():
            raise ValueError('configuration_path')
    fd = os.open(file, os.O_RDONLY | getattr(os, 'O_NOFOLLOW', 0))
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > 16384:
            raise ValueError('configuration_file')
        if os.name == 'posix' and (info.st_mode & 0o077 or info.st_uid != os.getuid()):
            raise ValueError('configuration_permissions')
        with os.fdopen(fd, 'r', encoding='utf-8', closefd=False) as stream:
            record = json.load(stream)
    finally:
        os.close(fd)
    if record.get('schema') != 1 or record.get('purpose') != 'private-test-runtime':
        raise ValueError('configuration_schema')
    values = record['values']
    if values.get('GRAVURU_TEST_ORIGIN') != EXPECTED_ORIGIN:
        raise ValueError('configuration_origin')
    user, password = values['GRAVURU_TEST_USERNAME'], values['GRAVURU_TEST_PASSWORD']
    if not isinstance(user, str) or not isinstance(password, str) or not user or not password or ':' in user:
        raise ValueError('configuration_auth')
    return 'Basic ' + base64.b64encode((user + ':' + password).encode('utf-8')).decode('ascii')


class Gallery(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.cards, self.categories, self.token, self.current = {}, [], None, None

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'meta' and attrs.get('name') == 'slate-review-csrf':
            self.token = attrs.get('content')
        if tag == 'section' and 'data-category-section' in attrs:
            self.categories.append(attrs['data-category-section'])
        if tag == 'article' and 'data-design-card' in attrs:
            identifier = attrs.get('id', '')
            if not identifier.startswith('design-') or identifier[7:] in self.cards:
                raise ValueError('gallery_identifiers')
            self.current = {'id': identifier[7:]}
            self.cards[self.current['id']] = self.current
        if self.current is not None:
            if tag == 'img' and 'data-preview' in attrs:
                self.current.update(preview=attrs.get('src'), label=attrs.get('alt', ''))
            if tag == 'a' and 'data-edit-link' in attrs:
                self.current['editor'] = attrs.get('href')

    def handle_endtag(self, tag):
        if tag == 'article':
            self.current = None


class Probe:
    def __init__(self, authorization):
        self.authorization = authorization
        self.context = ssl.create_default_context()
        self.results = []

    def request(self, route, *, authenticated=True, method='GET', payload=None,
                csrf=None, origin=None, limit=MAX_RESPONSE_BYTES):
        connection = None
        try:
            parsed = urlsplit(route)
            if parsed.scheme or parsed.netloc or parsed.fragment or not route.startswith('/') or route.startswith('//') or '\\' in route or any(ord(char) < 32 for char in route):
                raise ValueError('route_not_relative')
            target = urlsplit(EXPECTED_ORIGIN)
            # http.client performs no redirect/proxy handling. Every connection
            # is opened to this one pinned hostname with normal TLS verification.
            connection = http.client.HTTPSConnection(target.hostname, 443, timeout=90, context=self.context)
            headers = {'Accept': '*/*', 'User-Agent': 'Gravuru-Schiefer-ReadOnly-Probe/1'}
            if authenticated:
                headers['Authorization'] = self.authorization
            if csrf is not None:
                headers['X-Slate-Review-CSRF'] = csrf
            if origin is not None:
                headers['Origin'] = origin
            body = None
            if payload is not None:
                body = json.dumps(payload).encode('utf-8')
                headers['Content-Type'] = 'application/json'
            connection.request(method, route, body=body, headers=headers)
            response = connection.getresponse()
            data = response.read(limit + 1)
            return {'status': response.status, 'type': response.getheader('Content-Type', ''),
                    'body': data, 'tooLarge': len(data) > limit}
        except Exception as error:
            # Never serialize an exception message, request, headers, or URL.
            return {'status': None, 'type': '', 'body': b'', 'tooLarge': False,
                    'errorType': type(error).__name__}
        finally:
            if connection is not None:
                connection.close()

    def check(self, name, response, statuses, *, empty=False, content_type=None, extra=None):
        ok = response['status'] in statuses and not response['tooLarge']
        if empty:
            ok = ok and not response['body']
        if content_type:
            ok = ok and response['type'].lower().startswith(content_type)
        result = {'name': name, 'ok': bool(ok), 'status': response['status'], 'bodyBytes': len(response['body'])}
        if response.get('errorType'):
            result['errorType'] = response['errorType']
        if extra:
            result.update(extra)
        self.results.append(result)
        return result

    def json_body(self, response):
        if response['status'] != 200 or response['tooLarge']:
            return None
        try:
            return json.loads(response['body'])
        except (ValueError, UnicodeError):
            return None

    def run(self):
        self.check('anonymous_gallery', self.request('/originale/', authenticated=False), [401])
        self.check('anonymous_comments', self.request('/originale/comments', authenticated=False), [401])
        health = self.request('/__test/health')
        self.check('authenticated_health', health, [200], content_type='application/json')
        gallery_response = self.request('/originale/')
        gallery_result = self.check('authenticated_gallery', gallery_response, [200], content_type='text/html')
        gallery = Gallery()
        try:
            gallery.feed(gallery_response['body'].decode('utf-8'))
        except (ValueError, UnicodeError):
            gallery_result['ok'] = False
        editable = sum(bool(card.get('preview') and card.get('editor')) for card in gallery.cards.values())
        counts = {'originals': len(gallery.cards), 'editableOriginals': editable,
                  'unpreparedOriginals': len(gallery.cards) - editable, 'categories': len(gallery.categories)}
        self.results.append({'name': 'gallery_counts', 'ok': counts['originals'] == 325 and editable == 233 and counts['unpreparedOriginals'] == 92, **counts})
        for route, content_type in [('/originale/gallery.css', 'text/css'), ('/originale/gallery.js', 'text/javascript'), ('/originale/comments.js', 'text/javascript')]:
            self.check('static_' + route.rsplit('/', 1)[-1], self.request(route), [200], content_type=content_type)
        for identifier, label in [(D5_ID, '30 × 20 cm'), ('TRE-S-10x10-D12', '10 × 10 cm'), ('TQ-S-20x20-D15', '20 × 20 cm')]:
            card = gallery.cards.get(identifier, {})
            preview, editor = card.get('preview'), card.get('editor')
            expected_design = 'katalog-' + identifier
            valid = bool(preview and editor and label in card.get('label', '')
                         and preview.startswith('/api/workshop/products/')
                         and urlsplit(preview).path.endswith('/preview.svg')
                         and parse_qs(urlsplit(preview).query).get('designId') == [expected_design]
                         and urlsplit(editor).path == '/werkstatt/'
                         and parse_qs(urlsplit(editor).query).get('design') == [expected_design])
            self.results.append({'name': 'gallery_links_' + identifier, 'ok': valid})
            if not valid:
                continue
            svg = self.request(preview)
            checked = self.check('native_preview_' + identifier, svg, [200], content_type='image/svg+xml')
            try:
                checked['ok'] = checked['ok'] and ET.fromstring(svg['body']).tag == '{http://www.w3.org/2000/svg}svg'
                checked['sha256'] = digest(svg['body']) if checked['ok'] else None
            except ET.ParseError:
                checked['ok'] = False
            self.check('editor_' + identifier, self.request(editor), [200], content_type='text/html')
        before_response = self.request('/originale/comments')
        self.check('comments_get', before_response, [200], content_type='application/json')
        before = self.json_body(before_response)
        comments = before.get('comments', {}) if isinstance(before, dict) else {}
        d5 = comments.get(D5_ID, {})
        d5_hash = digest(d5.get('text', '').encode('utf-8')) if isinstance(d5.get('text'), str) else None
        self.results.append({'name': 'snapshot_D5_comment', 'ok': d5_hash == D5_TEXT_SHA256 and d5.get('revision') == D5_REVISION,
                             'textSha256': d5_hash, 'revision': d5.get('revision'), 'expectedRevision': D5_REVISION})
        can_probe = bool(gallery.token and UNKNOWN_ID not in gallery.cards and UNKNOWN_ID not in comments)
        self.results.append({'name': 'safe_invalid_write_probe_ready', 'ok': can_probe})
        if can_probe:
            payload = {'designId': UNKNOWN_ID, 'text': '', 'expectedRevision': 0}
            self.check('valid_csrf_unknown_design', self.request('/originale/comments', method='POST', payload=payload, csrf=gallery.token, origin=EXPECTED_ORIGIN), [404])
            self.check('valid_csrf_invalid_payload', self.request('/originale/comments', method='POST', payload={**payload, 'probeOnly': True}, csrf=gallery.token, origin=EXPECTED_ORIGIN), [422])
            self.check('missing_csrf', self.request('/originale/comments', method='POST', payload=payload, origin=EXPECTED_ORIGIN), [403])
            self.check('foreign_origin', self.request('/originale/comments', method='POST', payload=payload, csrf=gallery.token, origin='https://probe.invalid'), [403])
        after_response = self.request('/originale/comments')
        after = self.json_body(after_response)
        unchanged = isinstance(before, dict) and isinstance(after, dict) and before == after
        self.results.append({'name': 'all_comments_unchanged', 'ok': unchanged,
                             'beforeSha256': canonical_hash(before) if before is not None else None,
                             'afterSha256': canonical_hash(after) if after is not None else None})
        for index, route in enumerate([
            '/workshop.sqlite', '/design-assets.sqlite', '/profiles.sqlite', '/review-comments.sqlite',
            '/local-review-import.json', '/private/slate-review-data-20261106/workshop.sqlite',
            '/private/gravuru-2027-schiefer-review-20261106-config.json',
            '/originale/files/manifest.json', '/originale/files/originals/GT-S-30x20-D5/design.json',
        ], 1):
            self.check('private_data_blocked_' + str(index), self.request(route, limit=1024), [403, 404], empty=True)
        return {'scope': 'private-slate-http-probe', 'origin': EXPECTED_ORIGIN,
                'checkedAt': datetime.now(timezone.utc).isoformat(),
                'passed': all(result['ok'] for result in self.results), 'checks': self.results,
                'validWritesSubmitted': 0, 'redirectsFollowed': 0, 'browserVerified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    os.umask(0o077)
    output = Path(args.output).absolute()
    # Reserve output before reading credentials or issuing any request.
    fd = os.open(output, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        try:
            report = Probe(configuration(args.config)).run()
        except Exception as error:
            report = {'scope': 'private-slate-http-probe', 'passed': False,
                      'error': 'probe_setup_or_parse_failed', 'errorType': type(error).__name__}
        with os.fdopen(fd, 'w', encoding='utf-8', closefd=False) as stream:
            json.dump(report, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
    finally:
        os.close(fd)
    print(json.dumps({'passed': report['passed'], 'checks': len(report.get('checks', []))}))
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    try:
        code = main()
    except Exception as error:
        print(json.dumps({'passed': False, 'error': 'output_unavailable', 'errorType': type(error).__name__}))
        code = 2
    raise SystemExit(code)
