# Requisitos: Python 3 + numpy (testado com numpy 2.4). Lê referencias/pistas-2b/
# (pasta ignorada pelo git: geojson/ do bacinger/f1-circuits, MIT, e osm/ do
# OpenStreetMap, ODbL). Ferramenta de dev do PR 2b: não roda no npm test.
# Comando, da raiz do repositório:
#   python -I scripts/derivar-tracado-real.py <pista> 2 referencias/pistas-2b .
# Ex.: python -I scripts/derivar-tracado-real.py interlagos 2 referencias/pistas-2b .
# Saída (stdout, JSON): pontos de controle candidatos e a pit lane OSM alinhada.
# O resultado é PONTO DE PARTIDA: chicanes ainda precisam ser estilizadas à mão.
#
# O SCRIPT DÁ A BASE; O QUE VAI PRO JOGO PASSA POR DOIS PASSOS MANUAIS:
#   1. estilizar as chicanes (degraus) e reforçar retas/diagonais;
#   2. afinar pontos densos (a guarda de asfalto <= 17 é por índice).
# ⚠️ O alinhamento usa o traçado ATUAL do jogo (jogo() lê src/ui/tracados.ts e
# fluxo-corrida.ts). Depois que a pista nova entra, rodar de novo alinha contra
# ela e dá outros pontos. Pra reproduzir a base, aponte <repo> pra uma cópia com
# esses dois arquivos da revisão ANTERIOR à troca.
#
# Registro da Monza (medido em 2026-10-29; base reproduzida com os arquivos de
# 82bac6a~1): script 36 pontos -> estilizada 43 -> commitada 40 (82bac6a).
#   Passo 1 (36 -> 43, saem 13, entram 20):
#     reta principal, entram (520,513) (436,514);
#     Rettifilo, saem (390,514) (385,512) (384,501) (378,498) (330,514),
#       entram (412,504) (394,484) (370,496) (352,516) (318,520);
#     Roggia, saem (119,255) (102,247) (95,223),
#       entram (134,330) (126,292) (114,272) (90,262) (84,238), + (70,186) antes do Lesmo;
#     Serraglio, entram (400,338) (432,366);
#     Ascari, saem (455,388) (490,385) (502,390) (519,405) (530,407),
#       entram (456,384) (482,372) (508,392) (534,406) (600,410).
#   Passo 2 (43 -> 40, saem 9, entram 6):
#     Lesmo, saem (58,141) (56,124) (70,104) (79,101) (168,83) (179,85),
#       entram (58,140) (84,99) (166,82) (186,92);
#     Parabólica, saem (910,417) (919,426) (924,438), entram (916,422) (924,444).
#
# Registro do lote 1 (2026-10-29; base rodada direto sobre os traçados de 994f1de,
# guardada em referencias/pistas-2b/bases-lote1/). Aqui o trabalho manual foi
# sobretudo ABRIR trechos que, na escala da moldura, ficam colados no real:
#   Interlagos: script 70 pontos -> commitada 50. S do Senna, Curva do Sol,
#     Descida do Lago, Junção e a Subida desbastadas; os dois picos do miolo
#     ABAIXADOS ~15-25 u (a ponta de cada um encostava na Subida dos Boxes).
#   Mônaco: script 74 -> 56. Trecho de volta inteiro (túnel -> Rascasse)
#     deslocado até ~45 u pra baixo e ~30 u pra direita (corria a ~35 u da ida);
#     hairpin do Grand Hotel redesenhada com as pernas a ~40 u (eram ~18 u);
#     Rascasse e Tabac desbastadas.
#   Suzuka: script 65 -> 58. Degner afastada ~22-30 u do 130R, e 130R/Casio
#     ~18-25 u pra esquerda; aproximação do Spoon erguida ~28 u da reta traseira;
#     cruzamento refeito como vértice compartilhado (430,372) no trecho em que a
#     ligação já sobe pra hairpin; ponta da hairpin aberta; Esses, T1-T2 e Spoon
#     desbastados.
#   Ajustes depois do primeiro veredito do Marcos (2026-10-29), já no modelo de
#   box livre: Mônaco, perna da Piscina (#40-43) +8-10 u pra baixo (saída do box
#   depois da Sainte Dévote); Suzuka, grampo refeito em V (#24-29), #48 (455,347)
#   e crista dos Esses (#8, #9) baixada 6 u (box do lado real).
#
# Registro do lote 2 (2026-10-29; base rodada direto sobre os traçados de 4a40319,
# guardada em referencias/pistas-2b/bases-lote2/):
#   Silverstone: script 65 pontos -> commitada 48. Maggotts-Becketts-Chapel
#     erguidos ~14 u (na base o Loop corria a -12 u de folga de Becketts);
#     Village, Loop, Luffield, Copse, Stowe e Club desbastados; ponto (282,297)
#     inserido SOBRE a Wellington Straight (N=8: 0,739 -> 0,451, ver ESTADO.md).
#   Imola: script 41 -> commitada 32. Nenhum trecho colava; Tamburello,
#     Villeneuve, Tosa, Variante Alta e Rivazza desbastadas.
#   Spa: script 64 -> commitada 49. Nenhum trecho colava; La Source,
#     Bruxelles, Pouhon, Fagnes, Stavelot e Bus Stop desbastados; reta da
#     largada (#0, #1) afastada 10 u da Eau Rouge (degrau 5 do box); pontos
#     SOBRE a reta da largada (162,473) e o Kemmel (564,97), pro N=8.
#   Nürburgring: script 63 -> commitada 45. Três trechos colados abertos:
#     descida da Mercedes Arena x subida de volta (as duas diagonais, ~10 u
#     cada), pernas da Dunlop-Kehre (ida ~20 u pra baixo, volta ~5 u pra cima)
#     e laço x reta de cima; T1 recuada ~14 u pra direita (garganta do ômega).
#   Montreal: script 44 -> commitada 32. Pernas da L'Épingle afastadas (reta
#     Casino 5-9 u acima na saída do grampo); Senna, chicanes de baixo e a do
#     Muro dos Campeões desbastadas.
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
