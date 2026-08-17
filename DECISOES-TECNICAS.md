# Decisões Técnicas — BANTADS

## UI Kit

**UI Kit escolhido:** PrimeNG

**Versão:** primeng@21.1.9

O projeto utilizará exclusivamente o PrimeNG como biblioteca de componentes de interface.

A configuração global do PrimeNG está centralizada no `app.config.ts`, utilizando um tema próprio baseado no Aura.

---

## Arquitetura de Layout

Foi definido um `AppLayoutComponent` compartilhado para estruturar as telas autenticadas da aplicação.

O layout possui:

- Cabeçalho com a marca BANTADS;
- Área de navegação lateral;
- Área principal de conteúdo;
- `<router-outlet>` para renderização das páginas;
- Toast global para notificações.

As telas são renderizadas dentro do layout através do Angular Router.

---

### Cores

| Token | Valor |
|---|---|
| Primary | `#0B3B45` |
| Secondary | `#00B4D8` |
| Background | `#F4F7F8` |
| Surface | `#FFFFFF` |
| Text | `#1A242B` |
| Text Secondary | `#64748B` |
| Success | `#10B981` |
| Error | `#E63946` |
| Warning | `#F4A261` |
| Border | `#E2E8F0` |
| Focus | `#2563EB` |

### Tipografia

**Fonte:** Inter

| Uso | Peso |
|---|---|
| Heading | 700 |
| Body | 400 |
| Label | 500 |

### Espaçamento

| Token | Valor |
|---|---|
| XS | 4px |
| SM | 8px |
| MD | 16px |
| LG | 24px |
| XL | 32px |

### Bordas

**Border radius padrão:** `8px`

---

## Tokens Globais

As cores, tipografia e espaçamentos da aplicação são definidos globalmente.

Arquivo:

```text
src/styles.scss
``` 

# Versões e Ambiente 

## Frontend

| Tecnologia | Versão |
|---|---|
| Node.js | 20.20.0 |
| npm | 10.9.4 |
| Angular CLI | 17.3.17 |
| Angular | 17.x |
| PrimeNG | 21.1.9 |
| @primeuix/themes | 3.0.0 |

## UI

| Tecnologia | Utilização |
|---|---|
| PrimeNG | Componentes de interface |
| PrimeUIX Themes | Tema e Design Tokens |
| Inter | Tipografia |


