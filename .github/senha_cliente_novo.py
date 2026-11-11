"""Entrega a senha do cliente novo a suite (automatic_password) lendo o firehose do RabbitMQ."""
import base64
import errno
import json
import os
import sys
import time
import urllib.request

API = os.environ.get('RABBITMQ_API', 'http://localhost:15672/api')
ESPIA = 'e2e.espia.senha'
ESPERA_SENHA = 120
VIDA = 1500

config, fifo = sys.argv[1], sys.argv[2]
alvos = set(json.load(open(config))['novos_clientes'])
AUTH = 'Basic ' + base64.b64encode(b'guest:guest').decode()


def api(metodo, caminho, corpo=None):
    dados = None if corpo is None else json.dumps(corpo).encode()
    req = urllib.request.Request(API + caminho, data=dados, method=metodo, headers={
        'Authorization': AUTH, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=10) as r:
        texto = r.read()
    return json.loads(texto) if texto else None


def coletar(senhas, capturados):
    try:
        lote = api('POST', f'/queues/%2F/{ESPIA}/get',
                   {'count': 500, 'ackmode': 'ack_requeue_false', 'encoding': 'auto'})
    except OSError as e:
        print(f'falha ao ler a fila espia: {e}', flush=True)
        return
    for m in lote:
        corpo = m['payload']
        if m['payload_encoding'] == 'base64':
            corpo = base64.b64decode(corpo).decode('utf-8', 'replace')
        try:
            msg = json.loads(corpo)
        except ValueError:
            continue
        if not isinstance(msg, dict) or msg.get('tipo') != 'email.senha-nova':
            continue
        para, senha = (msg.get('payload') or {}).get('para'), (msg.get('payload') or {}).get('senha')
        if para in alvos and para not in capturados and senha:
            capturados.add(para)
            senhas.append((para, senha))
            print(f'senha de {para} capturada', flush=True)


api('PUT', '/vhosts/%2F', {'tracing': True})
api('PUT', f'/queues/%2F/{ESPIA}', {'durable': False, 'auto_delete': False})
api('POST', f'/bindings/%2F/e/amq.rabbitmq.trace/q/{ESPIA}', {'routing_key': 'publish.#'})
if os.path.exists(fifo):
    os.remove(fifo)
os.mkfifo(fifo)
print('pronto', flush=True)

senhas, capturados, entregues = [], set(), 0
inicio = time.time()
try:
    while entregues < len(alvos) and time.time() - inicio < VIDA:
        coletar(senhas, capturados)
        try:
            fd = os.open(fifo, os.O_WRONLY | os.O_NONBLOCK)
        except OSError as e:
            if e.errno != errno.ENXIO:
                raise
            time.sleep(0.5)
            continue

        espera = time.time()
        while not senhas and time.time() - espera < ESPERA_SENHA:
            time.sleep(0.5)
            coletar(senhas, capturados)

        if senhas:
            para, senha = senhas.pop(0)
            os.write(fd, f'email: {para}\nsenha: {senha}\n'.encode())
            entregues += 1
            print(f'senha de {para} entregue', flush=True)
        else:
            os.write(fd, b'nenhuma email.senha-nova chegou\n')
            print(f'a suite esperou {ESPERA_SENHA}s e nenhuma senha chegou', flush=True)
        os.close(fd)
        time.sleep(2)
finally:
    try:
        os.close(os.open(fifo, os.O_WRONLY | os.O_NONBLOCK))
    except OSError:
        pass
    os.remove(fifo)

print(f'fim: {entregues}/{len(alvos)} senhas entregues', flush=True)
sys.exit(0 if entregues == len(alvos) else 1)
