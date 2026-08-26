"""Portao do e2e: reprova se um teste que ja passava parar de passar."""
import os
import sys
import xml.etree.ElementTree as ET

LISTA = '.github/e2e-intocaveis.txt'
XML = 'suite/resultado.xml'

if not os.path.exists(XML):
    sys.exit(f'{XML} nao existe: o pytest nem chegou a rodar. Veja o frota.log.')

esperados = [
    l.strip() for l in open(LISTA)
    if l.strip() and not l.startswith('#')
]

raiz = ET.parse(XML).getroot()
suite = raiz if raiz.tag == 'testsuite' else raiz.find('testsuite')

estado = {}
for tc in suite.iter('testcase'):
    nome = f"{tc.get('classname')}::{tc.get('name')}"
    filhos = list(tc)
    estado[nome] = filhos[0].tag if filhos else 'passou'

quebrados = [(n, estado.get(n, 'ausente')) for n in esperados
             if estado.get(n, 'ausente') != 'passou']
promover = sorted(n for n, s in estado.items()
                  if s == 'passou' and n not in esperados)

linhas = [f'## e2e — {len(esperados) - len(quebrados)}/{len(esperados)} intocaveis passando', '']

if quebrados:
    linhas.append('### REGRESSAO')
    linhas.append('Estes testes passavam e pararam:')
    linhas.append('')
    linhas += [f'- `{n}` -> **{s}**' for n, s in quebrados]
    linhas.append('')
    linhas.append('Baixe o artifact `e2e` e veja o `frota.log`.')
else:
    linhas.append('Nenhuma regressao. Todos os intocaveis seguem passando.')

if promover:
    linhas += ['', f'### {len(promover)} candidatos a promover',
               'Passaram e ainda nao estao na lista. Mova para '
               '`.github/e2e-intocaveis.txt` quando quiser travar:', '']
    linhas += [f'- `{n}`' for n in promover]

texto = '\n'.join(linhas)
print(texto)
resumo = os.environ.get('GITHUB_STEP_SUMMARY')
if resumo:
    with open(resumo, 'a') as f:
        f.write(texto + '\n')

sys.exit(1 if quebrados else 0)
