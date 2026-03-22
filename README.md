# 💰 Bamaq - Serviço de Pagamentos Idempotente V1

Este repositório contém a solução para o desafio técnico de backend do Grupo Bamaq. Trata-se de uma API RESTful para processamento de pagamentos, projetada com foco absoluto em resiliência, concorrência e **idempotência estrita**.

## 🛠️ Tecnologias Utilizadas

- **Framework:** NestJS (Node.js / TypeScript)
- **Banco de Dados:** PostgreSQL (via Docker)
- **Mensageria / Fila:** Redis (via Docker) + BullMQ
- **ORM:** Prisma (v7+ com Driver Adapter nativo do Node.js)
- **Qualidade:** Prettier, ESLint configurados.

---

## 🚀 Como executar

Levando o requisito de facilidade ao pé da letra, a aplicação possui um fluxo de execução automatizado para a primeira avaliação, e um fluxo ágil para execuções subsequentes.

**Pré-requisitos:**

- Node.js (v18 ou superior)
- Docker e Docker Compose instalados e rodando.

**1. Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto e adicione a URL do banco (utilizamos a porta `5433` para evitar conflitos com instalações locais do Postgres):

```
DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5433/bamaq_payments_db
```

**2. Primeira Execução (Setup Automático de 1 Comando)**
Para avaliar o projeto do zero, rodando a instalação, subindo a infraestrutura e iniciando a API de uma só vez, rode no terminal:

```
npm run start:bamaq
```

(Este comando orquestra o npm install, levanta o PostgreSQL e o Redis via docker-compose, aplica as migrações do Prisma e inicia a API no modo watch).

**3. Execuções Subsequentes (Dia a Dia)**
Se você já rodou o comando acima (ou seja, os pacotes já estão instalados e o banco de dados já está rodando no Docker), você não precisa reinstalar tudo. Para subir apenas a API de forma rápida, utilize:

```
npm run start:dev
```

(Alternativamente, se preferir o fluxo manual clássico, você pode rodar npm install seguido de `npm run start:dev` - desde que a infraestrutura do Docker já tenha sido iniciada).

Acesse o painel de testes interativo no seu navegador: http://localhost:3000

## 🏗️ Arquitetura e Decisões Técnicas

A stack escolhida foi alinhada com as demandas modernas de microsserviços e os requisitos da vaga:

- **Framework:** NestJS (TypeScript) - Pela injeção de dependências, modularidade e forte tipagem.
- **Banco de Dados:** PostgreSQL - Fundamental para garantir consistência ACID.
- **ORM:** Prisma (v7+) - Tipagem estática, facilidade de migrações e uso de Driver Adapters nativos para maior performance de conexão.

### 🛡️ A Estratégia de Idempotência e Concorrência

O maior desafio de um endpoint de pagamentos é evitar o _Double Spending_ (processamento duplicado) em requisições simultâneas.

**Decisão:** Não foi utilizada memória volátil (como `Sets` no Node ou Redis) para gerenciar o estado da concorrência, pois isso falharia em um ambiente com múltiplas instâncias (escalabilidade horizontal). A idempotência foi delegada inteiramente à camada de dados (PostgreSQL) através de uma **Unique Constraint** na coluna `idempotency_key`.

**- O Fluxo (Otimista):**

1. O sistema recebe a requisição e tenta realizar o `INSERT` direto no banco com status `PENDING`.
2. Em caso de requisições concorrentes no exato mesmo milissegundo, o PostgreSQL aplica o _Lock_ de transação nativo e aceita apenas a primeira, rejeitando as demais com erro de violação de unicidade (código `P2002`).
3. O código captura essa violação, consulta o estado atual (`PENDING`, `SUCCESS` ou `FAILED`) e retorna o `409 Conflict` (se estiver em andamento) ou o resultado idêntico da primeira requisição finalizada.
   Isso elimina a vulnerabilidade de _Read-before-Write_ e garante 100% de consistência sem travar as threads do Node.js.

**- Tuning de Concorrência (Prisma Adapter)**
Para lidar com a alta carga de conexões simultâneas no banco sem gerar o erro P1017 (Connection Closed), o motor do Prisma foi configurado com o adaptador nativo pg e o Pool de conexões foi ajustado (max: 20, connectionTimeoutMillis: 2000) para garantir resiliência sob estresse.

**- Processamento Assíncrono (Event-Driven com Redis/BullMQ)**
Para garantir que a aplicação não bloqueie o Event Loop do Node.js durante o tempo de processamento do gateway (I/O intensivo), a arquitetura foi desenhada de forma assíncrona. O endpoint salva a intenção de pagamento no banco e delega o processamento pesado para uma fila gerenciada pelo Redis, devolvendo imediatamente o status PENDING para o cliente (202 Accepted). Um Worker em background consome a fila e finaliza a transação com SUCCESS ou FAILED.

**- Observabilidade (Logs Estruturados e Correlation ID)**
Para garantir a rastreabilidade em um ambiente distribuído e assíncrono, a aplicação utiliza o **Pino** para geração de Logs Estruturados (JSON). Toda requisição recebe (ou gera) um `Correlation ID` único, que é injetado no contexto do log e repassado integralmente para os _Workers_ do Redis. Isso permite que ferramentas de APM (como Datadog ou Kibana) consigam rastrear o ciclo de vida completo de uma transação, desde a Controller até a finalização do processamento em _background_.

---

## 🧪 Como testar a aplicação

Para facilitar a validação dos cenários exigidos, um **Frontend nativo** foi embarcado na própria API.

Ao acessar `http://localhost:3000`, você terá uma interface dedicada para:

- **Cenário 1 (Concorrência Real):** O botão vermelho dispara 3 requisições simultâneas com a mesma Idempotency-Key. Você verá no painel de logs que o banco de dados barra duas requisições (retornando `409 Conflict`) e processa apenas uma (`200 OK`).
- **Cenários 2 e 3 (Retry):** Após um pagamento finalizar, clicar no botão de "1 Requisição" com a mesma chave retornará instantaneamente o estado salvo no banco (`SUCCESS` ou `FAILED`), sem reprocessar o delay.

### ⚙️ Endpoints (cURL manual)

Se preferir testar via terminal:

```
curl -X POST http://localhost:3000/payments \
 -H "Content-Type: application/json" \
 -H "Idempotency-Key: uuid-chave-123" \
 -d '{"amount": 100, "customerId": "cli_123"}'
```

---

### 🤖 Testes Automatizados (Unitários com Jest)

Para garantir a integridade da regra de negócio mais crítica do sistema (a trava de concorrência e idempotência), o serviço principal (`PaymentsService`) foi coberto com testes unitários.

O dublê (Mock) do Prisma e da Fila foi configurado para validar 3 comportamentos essenciais da arquitetura:

1. **Caminho Feliz:** Garante que uma requisição limpa crie o pagamento com status `PENDING` e envie o payload corretamente para a fila do Redis.
2. **Cenário de Retry (Cache):** Simula a tentativa de recriar um pagamento já concluído, garantindo que o sistema intercepte o erro `P2002` do banco e devolva o estado final instantaneamente.
3. **Cenário de Concorrência Real:** Garante que, se duas threads tentarem processar a mesma chave ao mesmo tempo, a segunda receba um `409 ConflictException` (tratado no catch), preservando a consistência ACID.

Para executar a suíte de testes na sua máquina (não requer Docker ativo), rode na raiz do projeto:

```
npm run test
```

---

_Desenvolvido para o processo seletivo de Desenvolvedor Backend._
