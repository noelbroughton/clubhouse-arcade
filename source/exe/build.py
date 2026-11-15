import re,json,os,hashlib,shutil
r=open('../dist/arcade-relay.js').read()
url=open('update-url.txt').read().strip() if os.path.exists('update-url.txt') else ''
assert r.count("const UPDATE_URL_BUILT_IN = '';")==1
r=r.replace("const UPDATE_URL_BUILT_IN = '';","const UPDATE_URL_BUILT_IN = %s;"%json.dumps(url))
open('app.js','w').write(r)
h=open('../dist/index.html').read()
libs={'lib/three.min.js':'../test/node_modules/three/build/three.min.js','lib/cannon.min.js':'../test/node_modules/cannon/build/cannon.min.js'}
h2=h.replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js','lib/three.min.js').replace('https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js','lib/cannon.min.js')
for m in re.findall(r'https://cdn\.jsdelivr\.net/npm/three@0\.128\.0/examples/js/([\w/]+)\.js',h):
    k='lib/'+m.split('/')[-1]+'.js'; libs[k]='../test/node_modules/three/examples/js/'+m+'.js'; h2=h2.replace('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/'+m+'.js',k)
assert 'cdnjs' not in h2 and 'jsdelivr' not in h2
os.makedirs('www',exist_ok=True); open('www/index.html','w').write(h2)
ver=re.search(r'<meta name="arcade-version" content="([\d.]+)"',h2).group(1)
# the folder to host for automatic updates
os.makedirs('update',exist_ok=True); open('update/index.html','w').write(h2)
json.dump({'version':ver,'file':'index.html','sha256':hashlib.sha256(h2.encode()).hexdigest()},open('update/version.json','w'),indent=1)
assets={'index.html':'www/index.html'}
for k,v in libs.items():
    assert os.path.exists(v),v; assets[k]=v
json.dump({'main':'app.js','output':'sea.blob','disableExperimentalSEAWarning':True,'useCodeCache':False,'useSnapshot':False,'assets':assets},open('sea-config.json','w'),indent=1)
print('games',ver,'update url:',url or '(none)')
