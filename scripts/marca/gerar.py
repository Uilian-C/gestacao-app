"""Gera o símbolo do Tumtum: componente React, favicon e as fontes dos ícones.

Uso: python3 scripts/marca/gerar.py && node scripts/marca/icones.mjs
"""
import re
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from geometria import *  # noqa: E402,F403
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
FONTES = os.path.join(os.path.dirname(__file__), 'svg')
os.makedirs(FONTES, exist_ok=True)
ROSA=[(0,'#ffd0dc'),(.5,'#ff7fa0'),(1,'#e64d78')]; AZUL=[(0,'#cfe8ff'),(.5,'#5fb0f5'),(1,'#2f84d6')]
def shapes(svg): return re.findall(r'<(?:path d="[^"]+"|circle cx="[^"]+" cy="[^"]+" r="[^"]+")/>', svg)
def side(scale,w,mirror): return shapes(wave(scale,w,'#000',1,mirror=mirror))
OUT=(1.12,7); IN=(0.84,12)
groups={'outer':{'l':side(*OUT,False),'r':side(*OUT,True)},'inner':{'l':side(*IN,False),'r':side(*IN,True)}}
def grad_svg(i,stops): return f'<linearGradient id="{i}" gradientUnits="userSpaceOnUse" x1="0" y1="176" x2="0" y2="40">'+''.join(f'<stop offset="{o}" stop-color="{c}"/>' for o,c in stops)+'</linearGradient>'
def mark_svg(fill_l='url(#tr)',fill_r='url(#tb)'):
    g=lambda name,op: f'<g opacity="{op}"><g fill="{fill_l}">{"".join(groups[name]["l"])}</g><g fill="{fill_r}">{"".join(groups[name]["r"])}</g></g>'
    return g('outer',.55)+g('inner',1)
VB=(4,22,192,176)
def icon(scale,rounded,bg='#fbf3ec'):
    w=VB[2]*scale; h=VB[3]*scale; tx=(512-w)/2-VB[0]*scale; ty=(512-h)/2-VB[1]*scale
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs>{grad_svg("tr",ROSA)}{grad_svg("tb",AZUL)}</defs>'
            f'<rect width="512" height="512" rx="{rounded}" fill="{bg}"/><g transform="translate({tx:.1f} {ty:.1f}) scale({scale})">{mark_svg()}</g></svg>')
open(os.path.join(RAIZ,'public','favicon.svg'),'w').write(icon(2.45,112))
open(os.path.join(FONTES,'full.svg'),'w').write(icon(2.15,0))
open(os.path.join(FONTES,'mask.svg'),'w').write(icon(1.65,0))
open(os.path.join(FONTES,'badge.svg'),'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{" ".join(map(str,VB))}">{mark_svg("#fff","#fff")}</svg>')
J=lambda e: e.replace('/>',' />')
def group_jsx(name, cls):
    l='\n          '.join(J(e) for e in groups[name]['l']); r='\n          '.join(J(e) for e in groups[name]['r'])
    op=' opacity={0.55}' if name=='outer' else ''
    return f'''      <g className={{animated ? '{cls}' : undefined}}{op}>
        <g fill={{`url(#${{id}}r)`}}>
          {l}
        </g>
        <g fill={{`url(#${{id}}b)`}}>
          {r}
        </g>
      </g>'''
clip='\n              '.join(J(e) for n in ('outer','inner') for s in ('l','r') for e in groups[n][s])
stops=lambda st: '\n          '.join(f'<stop offset="{o}" stopColor="{c}" />' for o,c in st)
tsx=f'''import {{ useId }} from 'react';

// Símbolo do Tumtum: o coração desenhado pelo som da batida. Duas ondas de cada
// lado (tum e tum): rosa da mãe, azul do pai, do claro embaixo ao intenso em
// cima. O centro fica vazio, para caber qualquer família.
// Gerado por scripts/marca/gerar.py a partir das curvas do coração (ondas mais
// grossas no meio, como o pico do som). Para mudar o desenho, edite o script e gere de novo.

interface Props {{
  className?: string;
  /** Bate no ritmo tum-tum (abertura e carregamentos). Quem pede menos movimento no celular vê parado. */
  animated?: boolean;
  /** Texto para leitores de tela; sem ele, o símbolo é decorativo. */
  label?: string;
}}

export default function BrandMark({{ className = 'w-8 h-8', animated = false, label }}: Props) {{
  const id = `tt${{useId().replace(/[^a-zA-Z0-9]/g, '')}}`;
  return (
    <svg viewBox="{' '.join(map(str,VB))}" className={{className}} role={{label ? 'img' : undefined}} aria-label={{label}} aria-hidden={{label ? undefined : true}}>
      <defs>
        <linearGradient id={{`${{id}}r`}} gradientUnits="userSpaceOnUse" x1="0" y1="176" x2="0" y2="40">
          {stops(ROSA)}
        </linearGradient>
        <linearGradient id={{`${{id}}b`}} gradientUnits="userSpaceOnUse" x1="0" y1="176" x2="0" y2="40">
          {stops(AZUL)}
        </linearGradient>
        {{animated && (
          <>
            <linearGradient id={{`${{id}}l`}} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity={{0}} />
              <stop offset="0.5" stopColor="#fff" stopOpacity={{0.75}} />
              <stop offset="1" stopColor="#fff" stopOpacity={{0}} />
            </linearGradient>
            <clipPath id={{`${{id}}c`}}>
              {clip}
            </clipPath>
          </>
        )}}
      </defs>
{group_jsx('outer','tt-eco')}
{group_jsx('inner','tt-batida')}
      {{animated && (
        <g clipPath={{`url(#${{id}}c)`}}>
          <rect className="tt-luz" x="0" y="150" width="200" height="56" fill={{`url(#${{id}}l)`}} />
        </g>
      )}}
    </svg>
  );
}}
'''
open(os.path.join(RAIZ,'src','components','BrandMark.tsx'),'w').write(tsx)
print('Gerados: src/components/BrandMark.tsx, public/favicon.svg e scripts/marca/svg/*. Agora rode: node scripts/marca/icones.mjs')
