"""Package GPT Image originals; create requested 512px motion exports and QA.
Run with Pillow >= 12. No generation, retouching or upscaling occurs here.
"""
from pathlib import Path
import json, math, hashlib, html, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

ROOT = Path(__file__).resolve().parents[1]
N = 512
uses = {
 'saludando':'Carga y bienvenida', 'saludando-parpadeo':'Fotograma de parpadeo',
 'asomado':'Borde del buscador', 'guiando':'Navegación en auto dragón',
 'logrado':'Llegada y graduación', 'buscando':'Búsqueda sin resultados',
 'ubicacion':'Espera de ubicación', 'sin-conexion':'Error recuperable de conexión',
 'explorando':'Recorrido del campus', 'carino':'Respuesta a una caricia',
 'ayuda':'Ayuda y consejos', 'cabeza':'Avatar', 'pin':'Marcador de destino',
 'cabeza-2d':'Avatar pequeño', 'pin-2d':'Marcador pequeño', 'guiando-2d':'Navegación pequeña'
}
motion = {
 'saludando':('saludo',2400,True), 'asomado':('asomado',800,False),
 'guiando':('guia',1200,False), 'logrado':('logrado',1400,False),
 'buscando':('buscando',3200,True), 'ubicacion':('ubicacion',2000,True),
 'sin-conexion':('pausa',800,False), 'explorando':('explorando',3000,True),
 'carino':('carino',1400,False), 'ayuda':('ayuda',1000,False), 'pin':('pin',1000,False)
}
titles={'saludando-parpadeo':'Saludando · parpadeo','ubicacion':'Ubicación','sin-conexion':'Sin conexión','carino':'Cariño','cabeza-2d':'Cabeza 2D','pin-2d':'Pin 2D','guiando-2d':'Guiando 2D','casco-dragon':'Casco dragón','amigo-dragon':'Amigo dragón','danza-leon':'Danza del león','superheroe':'Superhéroe','galapagos':'Galápagos','volcan':'Volcán','pinata':'Piñata','hidratacion':'Hidratación'}
uses.update({'biblioteca':'Propuesta · espacios de lectura y estudio','hidratacion':'Propuesta · pausa voluntaria en el recorrido'})
def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
records=json.loads((ROOT/'PROMPTS.json').read_text())['assets']
assert len(records)==34 and len({r['id'] for r in records})==34
assets=[]; checks=[]
for r in records:
    group=r['group']; prefix={'extra':'extras/','proposal':'propuestas/'}.get(group,'')
    path=ROOT/(prefix+r['id']+'.png')
    im=Image.open(path); a=im.getchannel('A'); bbox=a.point(lambda p:255 if p>16 else 0).getbbox()
    if Path(r['source']).exists(): assert digest(path)==digest(Path(r['source'])), (path,'original changed')
    assert im.mode=='RGBA' and min(im.size)>=1254, (path,im.mode,im.size)
    assert a.getextrema()==(0,255) and all(a.getpixel(p)==0 for p in [(0,0),(0,im.height-1),(im.width-1,0),(im.width-1,im.height-1)]), path
    item={'id':r['id'],'title':titles.get(r['id'],r['id'].replace('-',' ').capitalize()),'group':group,
          'use':uses.get(r['id'],r.get('use','Sticker / vida del campus')),'file':str(path.relative_to(ROOT)),
          'width':im.width,'height':im.height,'alpha':True,'generator':'image_gen',
          'motion':'','duration':0,'loop':False}
    checks.append({'file':item['file'],'size':list(im.size),'mode':im.mode,'alpha_extrema':list(a.getextrema()),
                   'visible_bbox_alpha_gt_16':bbox,'margin_px':[bbox[0],bbox[1],im.width-bbox[2],im.height-bbox[3]],
                   'sha256':digest(path),'bytes':path.stat().st_size,'native_resolution':True})
    assert bbox[0]>0 and bbox[1]>0 and bbox[2]<im.width and bbox[3]<im.height, (path,'visible silhouette touches canvas')
    if r['id'] in motion:
        name,duration,loop=motion[r['id']]; item.update(motion=name,duration=duration,loop=loop)
        # Interface motion of the original sprite, not an articulated character animation.
        frames=[]; count=duration//50
        src=im.copy(); src.thumbnail((470,470),Image.Resampling.LANCZOS)
        for j in range(0 if '--reuse-webp' in sys.argv else count):
            t=j/(count-1); wave=math.sin(math.pi*t); s=1; x=y=angle=0
            if name in ['saludo','explorando']: y=-4*math.sin(2*math.pi*t)
            if name=='buscando': angle=1.5*math.sin(2*math.pi*t)
            if name=='ubicacion': y=-3*math.sin(2*math.pi*t)
            if name=='guia': x=6*wave
            if name in ['logrado','carino']: y=-9*wave; s=1+.025*wave
            if name=='asomado': y=12*(1-t)**3
            if name=='pin': y=-14*(1-t)**3
            if name=='ayuda': angle=-3*(1-t)**2
            if name=='pausa': s=.98+.02*t
            frame=Image.new('RGBA',(N,N)); sprite=src.resize((round(src.width*s),round(src.height*s)),Image.Resampling.LANCZOS)
            if angle: sprite=sprite.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
            frame.alpha_composite(sprite,(round((N-sprite.width)/2+x),round((N-sprite.height)/2+y)))
            frames.append(frame)
        out=ROOT/'animados'/f"{r['id']}.webp"
        if frames:
            temporary=out.with_name('.tmp-'+out.name)
            frames[0].save(temporary,save_all=True,append_images=frames[1:],duration=50,loop=0 if loop else 1,lossless=False,quality=85,method=3)
            temporary.replace(out)
        wi=Image.open(out); assert wi.size==(512,512) and wi.n_frames>1
        item['animated']=str(out.relative_to(ROOT))
        checks.append({'file':item['animated'],'size':list(wi.size),'frames':wi.n_frames,'loop':wi.info.get('loop'),
                       'duration_ms':duration,'alpha':wi.mode=='RGBA','sha256':digest(out),'bytes':out.stat().st_size})
    if r['id'] in ['pin','pin-2d']: item['anchor']=[round((bbox[0]+bbox[2])/2/im.width,4),round((bbox[3]-1)/im.height,4)]
    assets.append(item)
manifest={'version':'2.0','created':'2026-10-23','generator':'GPT Image · built-in image_gen',
 'identity_master':'referencias/gaston-master.png','base_url':'/mascota/gaston-v2/',
 'reference_priority':['gaston-master.png','explicit identity requirements','concept-board.png: context/palette','variantes-1/2.png: costume only'],
 'assets':assets,'extras_inventory':{'variantes-1':[3,4,5,8,9,10,11,12],'variantes-2':[2,3,4,6,8,9,10,11]},
 'motion_note':'512px WebP: interface transforms, no independent limb motion. Static PNG for reduced motion.'}
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
qa={'version':'2.0','date':'2026-10-23','technical_status':'pass','native_png_minimum':1254,'png_count':len(assets),
 'webp_count':len(motion),'checks':checks,'visual_review':json.loads((ROOT/'REVISION-GALERIA.json').read_text()) if (ROOT/'REVISION-GALERIA.json').exists() else {'status':'pending','note':'Set only after reviewing generated images and gallery.'},
 'limitations':['Motion exports move the illustration as a unit; they are not articulated character animations.',
 '2D stickers are raster PNGs with flat vector appearance, not editable SVGs.',
 'No dragon-amigo.png was supplied by that name; material is constrained by the explicit smooth vinyl instruction.']}
(ROOT/'CONTROL-CALIDAD.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')

# Contact sheets are review derivatives only; each original comes from its own GPT Image call.
for group, selected in [('core',[a for a in assets if a['group'] in ['core','sticker']]),('extras',[a for a in assets if a['group']=='extra']),('propuestas',[a for a in assets if a['group']=='proposal'])]:
    if not selected: continue
    cols=4; cw,ch=320,350; sheet=Image.new('RGB',(cols*cw,math.ceil(len(selected)/cols)*ch),'#f5eee8'); draw=ImageDraw.Draw(sheet)
    for i,a in enumerate(selected):
        thumb=Image.open(ROOT/a['file']); thumb.thumbnail((290,300),Image.Resampling.LANCZOS)
        x=(i%cols)*cw; y=(i//cols)*ch
        sheet.paste(thumb,(x+(cw-thumb.width)//2,y+(300-thumb.height)//2),thumb)
        draw.text((x+12,y+315),a['id'],fill='#231f20',font_size=20)
    sheet.save(ROOT/f'revision-{group}.jpg',quality=90)

data=json.dumps(assets,ensure_ascii=False).replace('</','<\\/')
page='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gastón v2 · Galería</title><link rel="stylesheet" href="animaciones.css"><link rel="stylesheet" href="galeria.css"><body><header><p class="eyebrow">USFQ EXPLORA · RECURSOS DE PERSONAJE</p><h1>Hola, soy Gastón<span>v2</span></h1><p>Un cerdito del campus con espíritu de dragón.</p><nav><a href="GUIA.md">Guía</a><a href="manifest.json">Manifest</a><a href="stickers-imprimir.html">Stickers para imprimir ↗</a></nav></header><main><section class="toolbar" aria-label="Controles de galería"><label>Fondo <select id="background"><option value="light">Claro</option><option value="dark">Oscuro</option><option value="checker">Transparencia</option></select></label><label>Mostrar <select id="filter"><option value="all">Todo</option><option value="core">Principal</option><option value="sticker">2D pequeño</option><option value="extra">Extras</option><option value="proposal">Propuestas</option></select></label><label><input type="checkbox" id="animate"> Ver WebP animados</label><button id="replay">Repetir gestos</button></section><p class="note">PNG originales transparentes ≥1254 px · WebP de 512 px · Activa movimiento reducido para conservar las versiones estáticas.</p><section id="grid" class="grid light" aria-label="Recursos de Gastón"></section><section class="integration"><h2>Un compañero para cada estado</h2><div class="screens"><article><h3>¡Bienvenido!</h3><img src="saludando.png" alt="Gastón saluda con su disfraz de dragón"><p>Explora el campus a tu ritmo.</p></article><article><h3>¿A dónde vas?</h3><img src="asomado.png" alt="Gastón asomado"><div class="search">Buscar aula o edificio</div><p>Biblioteca · La Pagoda · Coliseo</p></article><article><h3>Sigue tu ruta</h3><img src="guiando.png" alt="Gastón conduce un auto dragón"><p>Tu próximo destino está cerca.</p></article><article><h3>¡Llegaste!</h3><img src="logrado.png" alt="Gastón graduado celebra"><p>Celebra cada descubrimiento.</p></article></div><p class="note">Maquetas de colocación; el kit no modifica la integración de la app.</p></section></main><footer>Gastón v2 · GPT Image · 23 octubre 2026</footer><script>const assets=__DATA__;const grid=document.querySelector('#grid'), animate=document.querySelector('#animate'), filter=document.querySelector('#filter');const reduced=matchMedia('(prefers-reduced-motion: reduce)');function render(){grid.replaceChildren();assets.filter(a=>filter.value==='all'||a.group===filter.value).forEach(a=>{const c=document.createElement('article');c.className='card';const p=document.createElement('picture');const img=document.createElement('img');img.src=animate.checked&&!reduced.matches&&a.animated?a.animated:a.file;img.alt=a.title;img.loading='lazy';p.append(img);c.append(p);const h=document.createElement('h2');h.textContent=a.title;c.append(h);const note=document.createElement('p');note.textContent=a.use;c.append(note);const meta=document.createElement('small');meta.textContent=a.width+' × '+a.height+' · '+a.group;c.append(meta);const link=document.createElement('a');link.href=a.file;link.download='';link.textContent='PNG ↗';c.append(link);if(a.group==='sticker'){const row=document.createElement('div');row.className='sizes';[24,32,48,64].forEach(s=>{const i=document.createElement('img');i.src=a.file;i.width=s;i.height=s;i.alt=s+' px';row.append(i)});c.append(row)}grid.append(c)})}document.querySelector('#background').onchange=e=>grid.className='grid '+e.target.value;filter.onchange=render;animate.onchange=render;document.querySelector('#replay').onclick=render;reduced.addEventListener('change',render);document.addEventListener('visibilitychange',()=>{if(document.hidden){animate.checked=false;render()}});render();</script></body></html>'''.replace('__DATA__',data)
(ROOT/'galeria.html').write_text(page)
printables=[a for a in assets if a['id']!='saludando-parpadeo']
cards_list=[f'<figure><img src="{html.escape(a["file"])}" alt="{html.escape(a["title"])}"><figcaption>{html.escape(a["title"])}</figcaption></figure>' for a in printables]
cards='<style>main{display:block}.sticker-sheet{display:grid;grid-template-columns:repeat(3,1fr);background:white;margin-bottom:12mm}@media print{.sticker-sheet{margin:0;break-after:page}.sticker-sheet:last-child{break-after:auto}}</style>'+''.join('<section class="sticker-sheet">'+''.join(cards_list[i:i+12])+'</section>' for i in range(0,len(cards_list),12))
(ROOT/'stickers-imprimir.html').write_text('''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gastón v2 · Stickers A4</title><style>*{box-sizing:border-box}body{font:14px system-ui;background:#eee;color:#231f20;margin:24px}header{max-width:190mm;margin:auto auto 20px}button{padding:12px;background:#e11b22;color:white;border:0;border-radius:10px}main{width:190mm;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);background:white}figure{margin:0;padding:4mm;min-height:61mm;break-inside:avoid;text-align:center;border:1px dashed #ddd}img{width:48mm;height:48mm;object-fit:contain;filter:drop-shadow(1px 0 white) drop-shadow(-1px 0 white) drop-shadow(0 1px white) drop-shadow(0 -1px white)}figcaption{font-size:9px;color:#777}@page{size:A4;margin:10mm}@media print{body{margin:0;background:white}header{display:none}main{width:190mm}figure{height:61mm}}</style><body><header><h1>Stickers para el stand</h1><p>A4 · 100% / tamaño real · papel adhesivo blanco. Cada dibujo ocupa hasta 48 mm. Recortar dejando 2 mm blancos alrededor de la silueta. Las líneas punteadas separan las celdas; no son líneas de troquel. No es un archivo de corte industrial.</p><button onclick="window.print()">Imprimir / Guardar PDF</button> <a href="galeria.html">Volver a la galería</a></header><main>'''+cards+'</main></body></html>')
print(json.dumps({'png':len(assets),'webp':len(motion),'technical':'pass'}))
