# Petzara Desktop

Aplicativo desktop para o sistema Petzara. É um **wrapper Electron** que carrega `https://app.petzara.app` em uma janela nativa, sem código de negócio próprio. Toda a lógica reside no frontend web.

**Repositório:** `LucasBatista37/petzara-desktop` | **Distribuição:** GitHub Releases

---

## Arquitetura

```
[Electron Main Process] (src/main.js)
    │
    └── BrowserWindow (Chromium)
            └── carrega https://app.petzara.app
                    │
                    └── [React SPA] (PetShop-Agendamento-Sistema)
                                └── [API] (PetShop-Agendamento-Backend)
```

O desktop não tem nenhuma dependência de código do frontend ou backend. Ele só:
- Abre uma janela com a URL da produção
- Lida com falha de conexão (exibe `offline.html`)
- Redireciona links externos para o browser padrão do sistema
- Impede navegação fora do domínio `app.petzara.app`

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Electron 31.x |
| Build/distribuição | electron-builder 24.x |
| Node.js | 20 (CI/CD) |
| Runtime | Node.js 22.x (local) |

---

## Configurações de segurança

| Configuração | Valor | Motivo |
|---|---|---|
| `nodeIntegration` | `false` | Impede acesso Node.js no renderer |
| `contextIsolation` | `true` | Isola o preload do renderer |
| `sandbox` | `true` | Habilita sandbox do Chromium |
| Preload script | 5 linhas, sem API exposta | Superfície mínima |
| Links externos | `shell.openExternal()` | Não abrem dentro do app |
| Navegação fora do domínio | Bloqueada | Previne redirect hijacking |

---

## Estrutura de arquivos

```
petzara-desktop/
├── src/
│   ├── main.js         # Processo principal Electron (75 linhas)
│   ├── preload.js      # Script de preload mínimo (5 linhas)
│   └── offline.html    # UI de fallback sem conexão (78 linhas)
├── assets/
│   ├── icon.ico        # Ícone Windows
│   ├── icon.icns       # Ícone macOS
│   └── icon.png        # Ícone Linux
├── .github/
│   └── workflows/
│       └── release.yml # Build multiplataforma no GitHub Actions
└── package.json
```

---

## Setup e execução local

```bash
npm install
npm run dev       # Abre a janela Electron (aponta para app.petzara.app)
```

> Em desenvolvimento o app carrega a URL de **produção**. Para apontar para um servidor local, altere temporariamente `APP_URL` em `src/main.js`.

---

## Build de distribuição

```bash
npm run build        # Windows (.exe — NSIS installer)
npm run build:mac    # macOS (.dmg)
npm run build:linux  # Linux (.AppImage)
```

Artefatos gerados em `dist/`.

> **macOS:** A assinatura de código está desativada (`"identity": null` em `package.json`) para builds locais. Builds de produção via GitHub Actions usam o Mac signing do repositório.

---

## Release automático (CI/CD)

O workflow `.github/workflows/release.yml` é acionado quando uma tag `v*` é criada:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Ele builda para Windows, macOS e Linux em paralelo e publica os artefatos no GitHub Releases com o provider `github` configurado no `package.json`.

---

## Pontos importantes para IAs e desenvolvedores novos

- **Não há código de negócio aqui** — qualquer bug de funcionalidade deve ser investigado no frontend (`PetShop-Agendamento-Sistema`) ou backend (`PetShop-Agendamento-Backend`).
- Alterar `APP_URL` em `main.js` muda para onde o app aponta — em produção deve ser sempre `https://app.petzara.app`.
- O `offline.html` é servido localmente pelo Electron quando os error codes de rede `-2, -6, -105, -106, -109, -137, -3` são detectados no carregamento do frame principal.
- O `preload.js` é intencionalmente mínimo — não expõe APIs ao renderer. Mantenha assim.
