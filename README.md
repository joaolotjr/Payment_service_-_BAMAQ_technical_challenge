# 💰 Bamaq - Serviço de Pagamentos Idempotente

Este repositório contém a solução para o desafio técnico de backend do Grupo Bamaq. Trata-se de uma API RESTful para processamento de pagamentos, projetada com foco absoluto em resiliência, concorrência e **idempotência estrita**.

## 🚀 Como executar (O Único Comando)

O projeto foi configurado para subir toda a infraestrutura (Banco de Dados em Docker) e a aplicação Node.js com o menor esforço possível.

Certifique-se de ter o **Docker**, **Docker Compose** e o **Node.js (v18+)** instalados.

Na raiz do projeto, instale as dependências:
\`\`\`bash
npm install
\`\`\`

Em seguida, suba toda a aplicação com **um único comando**:
\`\`\`bash
npm run start:bamaq
\`\`\`
_(Este comando sobe o PostgreSQL no Docker, aplica as migrações do banco e inicia a API em modo de desenvolvimento)._

Acesse o painel de testes interativo no seu navegador: **[http://localhost:3000](http://localhost:3000)**

---

## 🏗️ Arquitetura e Decisões Técnicas

A stack escolhida foi alinhada com as demandas modernas de microsserviços e os requisitos da vaga:

- **Framework:** NestJS (TypeScript) - Pela injeção de dependências, modularidade e forte tipagem.
- **Banco de Dados:** PostgreSQL - Fundamental para garantir consistência ACID.
- **ORM:** Prisma (v6) - Tipagem estática e facilidade de migrações.

### 🛡️ A Estratégia de Idempotência e Concorrência

O maior desafio de um endpoint de pagamentos é evitar o _Double Spending_ (processamento duplicado) em requisições simultâneas.

**Decisão:** Não foi utilizada memória volátil (como `Sets` no Node ou Redis) para gerenciar o estado da concorrência, pois isso falharia em um ambiente com múltiplas instâncias (escalabilidade horizontal). A idempotência foi delegada inteiramente à camada de dados (PostgreSQL) através de uma **Unique Constraint** na coluna `idempotency_key`.

**O Fluxo (Otimista):**

1. O sistema recebe a requisição e tenta realizar o `INSERT` direto no banco com status `PENDING`.
2. Em caso de requisições concorrentes no exato mesmo milissegundo, o PostgreSQL aplica o _Lock_ de transação nativo e aceita apenas a primeira, rejeitando as demais com erro de violação de unicidade (código `P2002`).
3. O código captura essa violação, consulta o estado atual (`PENDING`, `SUCCESS` ou `FAILED`) e retorna o `409 Conflict` (se estiver em andamento) ou o resultado idêntico da primeira requisição finalizada.
   Isso elimina a vulnerabilidade de _Read-before-Write_ e garante 100% de consistência sem travar as threads do Node.js.

---

## 🧪 Como testar a aplicação

Para facilitar a validação dos cenários exigidos, um **Frontend nativo** foi embarcado na própria API.

Ao acessar `http://localhost:3000`, você terá uma interface dedicada para:

- **Cenário 1 (Concorrência Real):** O botão vermelho dispara 3 requisições simultâneas com a mesma Idempotency-Key. Você verá no painel de logs que o banco de dados barra duas requisições (retornando `409 Conflict`) e processa apenas uma (`200 OK`).
- **Cenários 2 e 3 (Retry):** Após um pagamento finalizar, clicar no botão de "1 Requisição" com a mesma chave retornará instantaneamente o estado salvo no banco (`SUCCESS` ou `FAILED`), sem reprocessar o delay.

### ⚙️ Endpoints (cURL manual)

Se preferir testar via terminal:

\`\`\`bash
curl -X POST http://localhost:3000/payments \
 -H "Content-Type: application/json" \
 -H "Idempotency-Key: uuid-chave-123" \
 -d '{"amount": 100, "customerId": "cli_123"}'
\`\`\`

---

_Desenvolvido para o processo seletivo de Desenvolvedor Backend._
