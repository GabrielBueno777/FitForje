# Fit Forje

Aplicação fitness de página única com servidor Bun, API same-origin e persistência local SQLite.

## Requisitos

- Bun 1.3 ou mais recente.

## Instalação e execução

Na raiz do repositório:

```sh
bun install
bun run dev
```

Abra `http://localhost:3000`. O modo de desenvolvimento reinicia o servidor ao alterar arquivos. `bun --watch index.ts` também inicia diretamente o mesmo servidor. Para iniciar sem watch, use `bun run start`. Para verificar os tipos, use `bun run typecheck`.

Bun carrega variáveis de `.env` automaticamente. Consulte `.env.example`; a aplicação usa `PORT` e `FITFORJE_DB_PATH`. Sem configuração, escuta na porta 3000 e cria `data/fitforje.sqlite` na primeira execução. O banco é local e não deve ser enviado ao Git.

## Funcionalidades

- Cadastro e login com hash de senha Argon2 e sessão em cookie `HttpOnly`.
- Perfil, preferências e treinos concluídos persistidos em SQLite.
- Sugestões de treino e refeições geradas a partir do perfil; são conteúdo informativo, não orientação profissional.
- Acesso administrativo protegido por papel. Para promover uma conta existente manualmente, execute após cadastro:

```sh
bun -e "import { db } from './src/db.ts'; db.query('UPDATE users SET role = ? WHERE email = ?').run('admin', 'seu-email@example.com'); db.close();"
```

## Integrações pendentes

- Checkout não está conectado a um provedor; nenhuma cobrança é realizada nem os planos são ativados.
- Recuperação de senha não envia e-mail.
- Login com Google não está configurado.
- Os preços que já existiam no protótipo foram mantidos; confirme-os antes de publicar.
- Na primeira abertura, contas válidas da versão antiga em `localStorage` são migradas ao SQLite e suas senhas são hasheadas no servidor. Depois da migração, será necessário entrar novamente. A conta pública de demonstração (`admin@fitforje.com`) é descartada; contas antigas com papel admin são migradas como usuários comuns e precisam de promoção manual. A migração acontece somente no navegador/origem que ainda contém esses dados.

## Antes de produção

Este projeto ainda é um protótipo comercial, não uma implantação pronta para receber clientes. Antes da publicação, configure um banco gerenciado com criptografia em repouso e backups, HTTPS, limitação de tentativas de login, recuperação de senha por provedor confiável, checkout por página/tokenização hospedada (nunca colete cartão neste app), política de privacidade e termos, monitoramento e estratégia de migração. Promova administradores manualmente; não existe cadastro público de papel administrativo.

O perfil pode conter dados pessoais e preferências relacionadas à saúde, incluindo restrições alimentares. Limite o acesso ao banco e defina retenção/exclusão de dados antes de uso comercial. Métricas de receita e assinaturas não são exibidas porque ainda não existe integração de cobrança.

## Imagens

As fotos são distribuídas localmente para evitar dependência de terceiros em tempo de execução. Foram obtidas do Unsplash e podem ser usadas conforme a [licença do Unsplash](https://unsplash.com/license): [foto de treino](https://images.unsplash.com/photo-1517836357463-d25dfeac3438) e [foto de refeição](https://images.unsplash.com/photo-1512621776951-a57141f2eefd).