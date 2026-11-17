# Copies the arcade (page, relay, 3D libraries) into app/arcade so the app works offline.
# Run from source/app after ../build.sh.
import re, os, json, shutil
here = os.path.dirname(os.path.abspath(__file__)); os.chdir(here)
out = 'arcade'; shutil.rmtree(out, ignore_errors=True); os.makedirs(out + '/lib')
url = open('../exe/update-url.txt').read().strip() if os.path.exists('../exe/update-url.txt') else ''
r = open('../dist/arcade-relay.js').read()
assert r.count("const UPDATE_URL_BUILT_IN = '';") == 1
open(out + '/arcade-relay.js', 'w').write(r.replace("const UPDATE_URL_BUILT_IN = '';", "const UPDATE_URL_BUILT_IN = %s;" % json.dumps(url)))
h = open('../dist/index.html').read()
libs = {'three.min.js': 'node_modules/three/build/three.min.js', 'cannon.min.js': 'node_modules/cannon/build/cannon.min.js'}
h = h.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', 'lib/three.min.js').replace('https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js', 'lib/cannon.min.js')
for m in re.findall(r'https://cdn\.jsdelivr\.net/npm/three@0\.128\.0/examples/js/([\w/]+)\.js', h):
    k = m.split('/')[-1] + '.js'; libs[k] = 'node_modules/three/examples/js/' + m + '.js'
    h = h.replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/' + m + '.js', 'lib/' + k)
assert 'cdnjs' not in h and 'jsdelivr' not in h
open(out + '/index.html', 'w').write(h)
for k, v in libs.items(): shutil.copy(v, out + '/lib/' + k)
ver = re.search(r'<meta name="arcade-version" content="([\d.]+)"', h).group(1)
print('arcade', ver, '-', len(libs), 'libraries, update url:', url or '(none)')
