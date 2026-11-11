#!/usr/bin/env python3
"""Install the hardened native Java classes and manifest settings into fresh Capacitor output."""
from pathlib import Path
import shutil
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ANDROID = ROOT / 'android'
MANIFEST = ANDROID / 'app/src/main/AndroidManifest.xml'
APP_ID = 'ir.sitemanager.app'
ANDROID_NS = 'http://schemas.android.com/apk/res/android'
ET.register_namespace('android', ANDROID_NS)
A = f'{{{ANDROID_NS}}}'

if not MANIFEST.is_file():
    raise SystemExit(f'AndroidManifest.xml not found: {MANIFEST}')

java_src = ROOT / 'native'
java_dst = ANDROID / 'app/src/main/java' / Path(*APP_ID.split('.'))
java_dst.mkdir(parents=True, exist_ok=True)
for name in ('MainActivity.java', 'AdminPlugin.java', 'AdminActivity.java'):
    src = java_src / name
    if not src.is_file():
        raise SystemExit(f'Missing native source: {src}')
    shutil.copy2(src, java_dst / name)

res = ANDROID / 'app/src/main/res/xml'
res.mkdir(parents=True, exist_ok=True)
for name in ('network_security_config.xml', 'data_extraction_rules.xml'):
    src = java_src / name
    if not src.is_file():
        raise SystemExit(f'Missing Android security resource: {src}')
    shutil.copy2(src, res / name)

tree = ET.parse(MANIFEST)
manifest = tree.getroot()
application = manifest.find('application')
if application is None:
    raise SystemExit('Android manifest does not contain <application>')

# The app intentionally supports optional, user-confirmed HTTP sites; HTTPS remains the default.
application.set(A + 'usesCleartextTraffic', 'true')
application.set(A + 'allowBackup', 'false')
application.set(A + 'networkSecurityConfig', '@xml/network_security_config')
application.set(A + 'dataExtractionRules', '@xml/data_extraction_rules')

permission = 'android.permission.POST_NOTIFICATIONS'
if not any(x.tag == 'uses-permission' and x.get(A + 'name') == permission for x in manifest):
    el = ET.Element('uses-permission')
    el.set(A + 'name', permission)
    # Android manifest permissions belong before <application>.
    children = list(manifest)
    manifest.insert(children.index(application), el)

main_activity = None
for activity in application.findall('activity'):
    name = activity.get(A + 'name', '')
    if name.endswith('.MainActivity') or name == 'MainActivity':
        main_activity = activity
        break
if main_activity is None:
    raise SystemExit('Capacitor MainActivity declaration was not found')

# Add the Android Share action only once.
share_exists = False
for intent in main_activity.findall('intent-filter'):
    actions = {x.get(A + 'name') for x in intent.findall('action')}
    data_types = {x.get(A + 'mimeType') for x in intent.findall('data')}
    if 'android.intent.action.SEND' in actions and 'text/plain' in data_types:
        share_exists = True
        break
if not share_exists:
    intent = ET.SubElement(main_activity, 'intent-filter')
    ET.SubElement(intent, 'action', {A + 'name': 'android.intent.action.SEND'})
    ET.SubElement(intent, 'category', {A + 'name': 'android.intent.category.DEFAULT'})
    ET.SubElement(intent, 'data', {A + 'mimeType': 'text/plain'})

admin_name = '.AdminActivity'
if not any(x.tag == 'activity' and x.get(A + 'name') == admin_name for x in application):
    ET.SubElement(application, 'activity', {
        A + 'name': admin_name,
        A + 'exported': 'false',
        A + 'configChanges': 'orientation|screenSize|keyboardHidden',
        A + 'windowSoftInputMode': 'adjustResize',
    })

ET.indent(tree, space='    ')
tree.write(MANIFEST, encoding='utf-8', xml_declaration=True)

# Fail immediately if a required security attribute was lost during XML transformation.
check = ET.parse(MANIFEST).getroot().find('application')
for key, value in {
    'usesCleartextTraffic': 'true',
    'allowBackup': 'false',
    'networkSecurityConfig': '@xml/network_security_config',
    'dataExtractionRules': '@xml/data_extraction_rules',
}.items():
    if check.get(A + key) != value:
        raise SystemExit(f'Android manifest verification failed: {key}')
if not (java_dst / 'AdminPlugin.java').is_file() or not (res / 'network_security_config.xml').is_file():
    raise SystemExit('Native Android source/resource verification failed')
print('Prepared Android manifest, native secure storage, share receiver and admin activity.')
