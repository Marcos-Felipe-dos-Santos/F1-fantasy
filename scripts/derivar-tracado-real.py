# Requisitos: Python 3 + numpy (testado com numpy 2.4). Lê referencias/pistas-2b/
# (pasta ignorada pelo git: geojson/ do bacinger/f1-circuits, MIT, e osm/ do
# OpenStreetMap, ODbL). Ferramenta de dev do PR 2b: não roda no npm test.
# Comando, da raiz do repositório:
#   python -I scripts/derivar-tracado-real.py <pista> 2 referencias/pistas-2b .
# Ex.: python -I scripts/derivar-tracado-real.py interlagos 2 referencias/pistas-2b .
# Saída (stdout, JSON): pontos de controle candidatos e a pit lane OSM alinhada.
# O resultado é PONTO DE PARTIDA: chicanes ainda precisam ser estilizadas à mão.
"""Deriva pontos de controle de uma pista a partir da linha central real (GeoJSON),
alinhada ao traçado ATUAL do jogo (mesma orientação, sentido e largada), reescalada
uniformemente pra moldura [56,924]x[36,564] e simplificada (Douglas-Peucker).
Uso: python -I scripts/derivar-tracado-real.py <pista> <tolerancia_u> <ref_dir> <repo>"""
import json, math, os, re, sys
import numpy as np

pista, tol, REF, REPO = sys.argv[1], float(sys.argv[2]), sys.argv[3], sys.argv[4]
MOLD = (56, 924, 36, 564)

def jogo():
    src = open(os.path.join(REPO,'src','ui','tracados.ts'),encoding='utf-8').read()+open(os.path.join(REPO,'src','ui','fluxo-corrida.ts'),encoding='utf-8').read()
    consts = {m.group(1): [(float(a),float(b)) for a,b in re.findall(r'\{\s*x:\s*(-?[\d.]+),\s*y:\s*(-?[\d.]+)\s*\}', m.group(2))]
              for m in re.finditer(r'const (TRACADO_[A-Z_]+)\s*:\s*[A-Za-z<>\[\] ]+=\s*\[(.*?)\];', src, re.S)}
    mapa = dict(re.findall(r"'pista-([a-z-]+)':\s*(TRACADO_[A-Z_]+)", src))
    return np.array(consts[mapa[pista]])

def projetar(c, lat0, lon0):
    k = math.cos(math.radians(lat0)); return np.array([((lo-lon0)*k*111320.0, -(la-lat0)*110540.0) for lo,la in c])

def reamostrar(P, n):
    P = np.vstack([P,P[:1]]); s = np.concatenate([[0],np.cumsum(np.linalg.norm(np.diff(P,axis=0),axis=1))])
    t = np.linspace(0,s[-1],n,endpoint=False); return np.column_stack([np.interp(t,s,P[:,0]),np.interp(t,s,P[:,1])])

def procrustes(A,B):
    ma,mb=A.mean(0),B.mean(0); A0,B0=A-ma,B-mb; U,S,Vt=np.linalg.svd(A0.T@B0); d=np.sign(np.linalg.det(U@Vt))
    D=np.diag([1,d]); R=U@D@Vt; s=(S*np.diag(D)).sum()/(A0**2).sum(); return R, s, ma, mb

def rdp(P, eps):
    if len(P) < 3: return P
    a,b = P[0],P[-1]; ab=b-a; L=np.linalg.norm(ab)
    d = np.abs(ab[0]*(P[:,1]-a[1])-ab[1]*(P[:,0]-a[0]))/L if L>0 else np.linalg.norm(P-a,axis=1)
    i = int(np.argmax(d))
    if d[i] > eps: return np.vstack([rdp(P[:i+1],eps)[:-1], rdp(P[i:],eps)])
    return np.vstack([a,b])

g = json.load(open(os.path.join(REF,'geojson',f'{pista}.geojson'),encoding='utf-8'))
c = g['features'][0]['geometry']['coordinates']
if c[0]==c[-1]: c=c[:-1]
lon0=np.mean([p[0] for p in c]); lat0=np.mean([p[1] for p in c])
real = projetar(c,lat0,lon0)
J = jogo(); n=240
R0, Jn = reamostrar(real,n), reamostrar(J,n)
melhor=None
for sentido in (1,-1):
    Rs=R0[::sentido]
    for k in range(0,n,2):
        Rk=np.roll(Rs,-k,axis=0); Rm,s,ma,mb=procrustes(Rk,Jn); e=np.linalg.norm((Rk-ma)@Rm*s+mb-Jn,axis=1).mean()
        if melhor is None or e<melhor[0]: melhor=(e,sentido,Rm,s,ma,mb)
_,sentido,Rm,s,ma,mb = melhor
real_ord = real if sentido==1 else real[::-1]
A = (real_ord-ma)@Rm*s+mb
# largada: o ponto real mais perto do v0 do jogo
i0 = int(np.argmin(np.linalg.norm(A-J[0],axis=1)))
A = np.roll(A,-i0,axis=0)
# reescala uniforme pra moldura
lo,hi=A.min(0),A.max(0); esc=min((MOLD[1]-MOLD[0])/(hi[0]-lo[0]),(MOLD[3]-MOLD[2])/(hi[1]-lo[1]))
cen=np.array([(MOLD[0]+MOLD[1])/2,(MOLD[2]+MOLD[3])/2]); A=(A-(lo+hi)/2)*esc+cen
dens = reamostrar(A, 2000)
fech = np.vstack([dens, dens[:1]])
P = rdp(fech, tol)[:-1]
pts=[(int(round(x)),int(round(y))) for x,y in P]
# tira duplicados consecutivos
out=[]
for p in pts:
    if not out or p!=out[-1]: out.append(p)
if out[0]==out[-1]: out.pop()
meta = {'pista':pista,'sentido':sentido,'escala_u_por_m':esc*s,'n':len(out),'pontos':out}
# pit lanes alinhadas
pit=[]
f=os.path.join(REF,'osm',f'{pista}.json')
if os.path.exists(f):
    for w in json.load(open(f,encoding='utf-8')):
        q=(projetar(w['coords'],lat0,lon0)-ma)@Rm*s+mb; q=(q-(lo+hi)/2)*esc+cen
        pit.append({'rotulo':w.get('rotulo'),'osm_way':w.get('osm_way'),'pontos':[(round(x,1),round(y,1)) for x,y in q]})
meta['pit']=pit
print(json.dumps(meta))
