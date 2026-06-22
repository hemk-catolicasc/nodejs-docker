# Trabalho de Sistemas Operacionais — Infraestrutura Docker

**Aluno:** Lucas Hemkemeier
**Disciplina:** Sistemas Operacionais

Infraestrutura com dois containers Docker: uma aplicação web em Node.js/Express e
um banco de dados MySQL, ligados por uma rede dedicada, com volume persistente,
limite de memória e execução com usuário não-root.

## Estrutura

```
projeto-docker/
├── docker-compose.yml      # orquestra os dois serviços, rede e volume
├── .env                    # variáveis (nome do aluno e credenciais de dev)
├── gerar-evidencias.sh     # gera os .txt de evidência
├── app/
│   ├── Dockerfile          # imagem do app, usuário não-root
│   ├── package.json        # dependências: express e mysql2
│   └── server.js           # rotas /, /info e /db
├── evidencias/             # saídas de docker ps/stats/inspect/logs + print
└── README.md
```

## Como executar

Pré-requisito: Docker Desktop instalado e em execução.

```bash
# 1. Na raiz do projeto, subir a infraestrutura
docker compose up -d --build

# 2. Conferir os containers no ar
docker ps

# 3. Acessar no navegador
#    http://localhost:3000       -> dados do SO
#    http://localhost:3000/info  -> pid, uptime, cpus
#    http://localhost:3000/db    -> teste de conexão com o MySQL

# 4. Gerar as evidências de texto
bash gerar-evidencias.sh

# 5. Derrubar tudo (mantendo o volume)
docker compose down
```

## Rotas da aplicação

### `GET /`
```json
{
  "disciplina": "Sistemas Operacionais",
  "aluno": "Lucas Hemkemeier",
  "hostname": "a1b2c3d4e5f6",
  "plataforma": "linux",
  "arquitetura": "x64"
}
```

### `GET /info`
```json
{
  "pid": 1,
  "uptime": 123,
  "cpus": 4
}
```

### `GET /db`
```json
{
  "banco": "conectado",
  "resultado": { "ok": 1 }
}
```

Os valores vêm das APIs do próprio Node: `os.hostname()`, `os.platform()`,
`os.arch()`, `os.cpus()`, `process.pid` e `process.uptime()`.

---

## Respostas — conceitos de Sistemas Operacionais

### 1. Qual a diferença entre imagem e container?
A **imagem** é um artefato estático e somente-leitura: um empacotamento em camadas
contendo o sistema de arquivos, as bibliotecas e a aplicação. O **container** é uma
instância em execução dessa imagem — um processo isolado, com uma camada gravável
própria por cima das camadas da imagem. Em termos de SO: a imagem está para o
programa em disco assim como o container está para o processo em memória. De uma
imagem podem nascer vários containers.

### 2. Qual processo está executando dentro do container?
O processo `node server.js`, definido no `CMD` do Dockerfile. Como usamos a forma
exec (`CMD ["node", "server.js"]`), esse processo é o **PID 1** do container e é o
único processo principal — é ele quem responde nas portas e quem mantém o container
vivo. A rota `/info` expõe justamente esse `process.pid`.

### 3. O container possui kernel próprio? Justifique.
Não. O container **compartilha o kernel do host**. O isolamento (processos, rede,
sistema de arquivos, usuários) é feito por recursos do próprio kernel Linux —
*namespaces* e *cgroups* — e não por um kernel separado. Por isso um container Linux
sobe em milissegundos e consome pouca memória: não há um segundo sistema operacional
sendo inicializado, apenas processos isolados sobre o mesmo kernel.

### 4. Qual recurso foi limitado na sua infraestrutura?
A **memória**. O serviço web está com `mem_limit: 128m`, atendendo ao requisito de
128 MB. Esse limite é aplicado pelo kernel via *cgroups*: se o processo ultrapassar
o teto, o kernel aciona o *OOM killer*. O MySQL recebeu `512m` porque não inicializa
com apenas 128 MB — limitá-lo a 128 MB faria o container reiniciar em loop.

### 5. Qual a finalidade do volume Docker utilizado?
**Persistência de dados.** O volume nomeado `db_dados` é montado em
`/var/lib/mysql`, onde o MySQL grava os dados. O volume vive fora do ciclo de vida
do container: se o container do banco for removido e recriado, os dados continuam
intactos. Sem o volume, tudo o que estivesse no banco seria perdido a cada
remoção do container.

### 6. Qual a finalidade da rede Docker criada?
**Comunicação isolada entre os serviços.** A rede bridge dedicada `rede_app` conecta
`web` e `db` em um segmento próprio, e o Docker fornece DNS interno: o app encontra o
banco pelo nome do serviço (`db`), sem IP fixo. Isso segrega o tráfego dos serviços
de outras redes/containers e é o que a rota `/db` comprova na prática.

### 7. Por que executar aplicações como usuário não-root?
Por **segurança** — princípio do menor privilégio. Se a aplicação for comprometida,
o atacante herda apenas as permissões daquele usuário, e não as de root. Como o
container compartilha o kernel do host, um root dentro do container amplia a
superfície de escalonamento de privilégio. Por isso o app roda como o usuário
`node` (uid 1000), e não como root.

### 8. Por que Docker não é uma máquina virtual?
Porque **não virtualiza hardware nem executa um SO convidado**. Uma VM roda sobre um
hypervisor, com kernel e sistema operacional completos próprios para cada máquina.
O Docker usa virtualização em nível de sistema operacional: os containers são
processos isolados por *namespaces* e *cgroups* que **compartilham o kernel do
host**. O resultado é muito mais leve e rápido que uma VM, ao custo de não ter
isolamento tão forte nem rodar um kernel diferente do host.

### 9. O que representa o PID exibido na rota /info?
É o **identificador do processo** (Process ID) do Node **dentro do namespace de PID
do container**. Como o `node` é o processo principal (forma exec no `CMD`), ele
aparece como **PID 1** — o primeiro processo daquele namespace, equivalente ao papel
do `init` em um SO. Esse PID 1 é local ao container; no host, o mesmo processo tem
outro PID, porque o namespace remapeia a numeração.

### 10. Cite três conceitos de Sistemas Operacionais presentes neste projeto.
1. **Processos e isolamento** — o app é um processo (PID 1) isolado por namespaces.
2. **Gerenciamento de recursos** — limite de memória aplicado via cgroups.
3. **Sistema de arquivos** — camadas da imagem + volume persistente em
   `/var/lib/mysql`.
   *(Também presentes: redes, virtualização em nível de SO e segurança/privilégios.)*

---

## Observações técnicas

- O limite de **128 MB** foi aplicado ao serviço web. O MySQL recebeu 512 MB porque
  não sobe em 128 MB (seria derrubado pelo OOM killer), o que comprometeria as
  evidências.
- O arquivo `.env` é uma **fixture de desenvolvimento**. As credenciais ali não
  devem ser usadas em produção — em produção viriam de variáveis de ambiente seguras.
- O `depends_on` com `condition: service_healthy` faz o app só iniciar depois que o
  *healthcheck* do MySQL passa, evitando erro de conexão na rota `/db` logo na subida.
