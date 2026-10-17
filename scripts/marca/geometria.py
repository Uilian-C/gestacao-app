"""Geometria do símbolo: metade do coração (curvas de Bézier) e a onda com espessura variável."""
import math
ROSE,BLUE='#c8607a','#5f93b8'
LEFT=[((100,79),(82,55),(50,53),(40,79)),((40,79),(30,106),(56,132),(100,162))]
def bez(p,t):
    (x0,y0),(x1,y1),(x2,y2),(x3,y3)=p; m=1-t
    return (m**3*x0+3*m*m*t*x1+3*m*t*t*x2+t**3*x3, m**3*y0+3*m*m*t*y1+3*m*t*t*y2+t**3*y3)
PTS=[]
for i,s in enumerate(LEFT):
    for k in range(36+(1 if i==1 else 0)): PTS.append(bez(s,k/36))
ACC=[0]
for a,b in zip(PTS,PTS[1:]): ACC.append(ACC[-1]+math.dist(a,b))
U=[x/ACC[-1] for x in ACC]
def wave(scale,wmax,color,op=1,top=.085,bot=.07,wmin=.28,mirror=False,ripple=0,freq=9,segments=None,fill=None,cy=108):
    """Meia onda do coração: espessura maior no meio (pico do som). ripple: borda que vibra. segments: trechos (u0,u1)."""
    out=[]
    for (s0,s1) in (segments or [(0,1)]):
        a=top+(1-top-bot)*s0; b=top+(1-top-bot)*s1
        sel=[(p,u) for p,u in zip(PTS,U) if a<=u<=b]
        pts=[(100+(x-100)*scale, cy+(y-108)*scale) for (x,y),_ in sel]
        us=[(u-top)/(1-top-bot) for _,u in sel]
        L,R=[],[]
        for i,(x,y) in enumerate(pts):
            p0=pts[max(i-1,0)]; p1=pts[min(i+1,len(pts)-1)]
            dx,dy=p1[0]-p0[0],p1[1]-p0[1]; n=math.hypot(dx,dy) or 1; nx,ny=-dy/n,dx/n
            w=wmax*(wmin+(1-wmin)*math.sin(math.pi*us[i])**.8)/2
            off=ripple*math.sin(2*math.pi*freq*us[i])*math.sin(math.pi*us[i])
            cx_,cy_=x+nx*off,y+ny*off
            L.append((cx_+nx*w,cy_+ny*w)); R.append((cx_-nx*w,cy_-ny*w))
        if mirror:
            L=[(200-x,y) for x,y in L]; R=[(200-x,y) for x,y in R]
        poly=L+R[::-1]
        d='M'+' L'.join(f'{x:.1f} {y:.1f}' for x,y in poly)+'Z'
        r=min(math.dist(L[0],R[0]),math.dist(L[-1],R[-1]))/2
        caps=f'<circle cx="{(L[0][0]+R[0][0])/2:.1f}" cy="{(L[0][1]+R[0][1])/2:.1f}" r="{math.dist(L[0],R[0])/2:.1f}"/><circle cx="{(L[-1][0]+R[-1][0])/2:.1f}" cy="{(L[-1][1]+R[-1][1])/2:.1f}" r="{math.dist(L[-1],R[-1])/2:.1f}"/>'
        out.append(f'<path d="{d}"/>{caps}')
    return f'<g fill="{fill or color}" opacity="{op}">{"".join(out)}</g>'
def pair(scale,wmax,op=1,**k):
    lf=k.pop('lfill',None); rf=k.pop('rfill',None)
    return wave(scale,wmax,ROSE,op,fill=lf,**k)+wave(scale,wmax,BLUE,op,mirror=True,fill=rf,**k)
GRAD='''<defs>
<linearGradient id="gr" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="180"><stop offset="0" stop-color="#ecb3c0"/><stop offset=".42" stop-color="#c8607a"/><stop offset="1" stop-color="#efb9c5"/></linearGradient>
<linearGradient id="gb" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="180"><stop offset="0" stop-color="#b5d2e6"/><stop offset=".42" stop-color="#5f93b8"/><stop offset="1" stop-color="#bcd6e8"/></linearGradient>
</defs>'''
