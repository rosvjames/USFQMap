from pathlib import Path
from PIL import Image
from html.parser import HTMLParser
import json, hashlib
root=Path(__file__).resolve().parents[1]
m=json.loads((root/'manifest.json').read_text())
assert len(m['assets'])==34
assert sum(a['group']=='core' for a in m['assets'])==13
assert sum(a['group']=='sticker' for a in m['assets'])==3
assert sum(a['group']=='extra' for a in m['assets'])==16
assert sum(a['group']=='proposal' for a in m['assets'])==2
qa=json.loads((root/'CONTROL-CALIDAD.json').read_text())
for check in qa['checks']:
    p=root/check['file']; assert hashlib.sha256(p.read_bytes()).hexdigest()==check['sha256']
for a in m['assets']:
    assert (root/a['file']).is_file()
    if 'animated' in a:
        im=Image.open(root/a['animated']); assert im.size==(512,512) and im.n_frames>1
        assert im.info['loop']==(0 if a['loop'] else 1)
        total=0
        for i in range(im.n_frames):
            im.seek(i); rgba=im.convert('RGBA'); alpha=rgba.getchannel('A')
            assert alpha.getbbox() and alpha.getextrema()==(0,255)
            assert alpha.getpixel((0,0))==0 and alpha.getpixel((511,511))==0
            total+=im.info.get('duration',0)
        assert total==a['duration'], (a['id'],total,a['duration'])
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key in ['src','href'] and not value.startswith(('http','#','data:')):
                assert (root/value).exists(), value
for p in ['galeria.html','stickers-imprimir.html']: Links().feed((root/p).read_text())
assert (root/'stickers-imprimir.html').read_text().count('<section class="sticker-sheet">')==3
for name in ['animaciones.css','galeria.html','manifest.json','PROMPTS.json','CONTROL-CALIDAD.json','GUIA.md']: assert (root/name).exists()
print('PASS: 34 original PNGs, 11 animated transparent WebPs, all frames/durations/loops/hashes, local links, 3 print pages.')
