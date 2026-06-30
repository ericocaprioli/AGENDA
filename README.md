# Agenda Escolar 2026

Sistema de calendário escolar interativo para o ano de 2026, desenvolvido para o Colégio Estadual Profª Hercília F do Nascimento em Mangueirinha - PR.

## 📋 Descrição

Aplicativo web completo para gerenciamento e visualização do calendário escolar, com duas interfaces:
- **Visualização Pública**: Para alunos, pais e professores consultarem o calendário
- **Área Administrativa**: Para administradores gerenciarem eventos e atividades

## 🚀 Funcionalidades

### Interface Pública
- Visualização de calendário mensal interativo
- Navegação entre meses
- Exibição de feriados nacionais e municipais
- Eventos escolares pré-cadastrados (início/término de aulas, trimestres, conselhos de classe, etc.)
- Eventos dinâmicos carregados do banco de dados
- Legenda de cores para tipos de eventos
- Informações de contato da escola
- Lista de turmas com identificação visual

### Interface Administrativa
- Autenticação segura via Supabase Authentication
- Criação de eventos clicando em qualquer dia do calendário
- Edição inline de eventos existentes
- Exclusão de eventos
- Sincronização automática com banco de dados
- Controle de sessão (login/logout)

## 🛠️ Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase
  - PostgreSQL (Banco de dados relacional)
  - Authentication (Autenticação de usuários)
  - Plano gratuito: 500MB de banco de dados, 2GB transferência/mês, 50.000 requisições/mês
  - 100% gratuito sem necessidade de cartão de crédito
- **Hosting**: GitHub Pages

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/ericocaprioli/AGENDA.git
```

2. Abra o arquivo `agenda-escolar-2026.html` no navegador para visualização pública

3. Para acesso administrativo, abra `agenda-admin.html` e faça login com credenciais Supabase

## 🔧 Configuração

Para usar o sistema administrativo, configure o Supabase:

1. Crie um projeto em [Supabase](https://supabase.com/)
2. Crie uma tabela chamada `eventos` no banco de dados com as colunas:
   - `id` (bigint, primary key)
   - `data` (text)
   - `titulo` (text)
   - `tipo` (text)
   - `criadoEm` (timestamp)
3. Ative o Authentication (Email/Password)
4. Copie as credenciais do projeto (Project Settings → API)
5. Substitua as credenciais no arquivo `supabase-config.js`
6. Configure as RLS (Row Level Security) para permitir leitura pública e escrita autenticada

**Política RLS sugerida:**
```sql
-- Habilitar RLS
ALTER TABLE eventos ENABLE ROW LEVEL SECURITY;

-- Política para leitura pública
CREATE POLICY "Leitura pública para todos" 
ON eventos FOR SELECT 
USING (true);

-- Política para escrita apenas autenticados
CREATE POLICY "Escrita apenas para autenticados" 
ON eventos FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Atualização apenas para autenticados" 
ON eventos FOR UPDATE 
USING (auth.role() = 'authenticated');

CREATE POLICY "Exclusão apenas para autenticados" 
ON eventos FOR DELETE 
USING (auth.role() = 'authenticated');
```

## 🎨 Tipos de Eventos

| Cor | Tipo |
|-----|------|
| Vermelho | Feriados |
| Amarelo | Início/término das aulas |
| Azul | Início/término de trimestres |
| Verde escuro | Estudo e Planejamento |
| Preto | Plano de Abandono |
| Laranja | Recesso escolar |
| Cinza | Conselho de Classe Extraordinário |
| Rosa | Início das férias 2027 |
| Roxo | Conselho de Classe Intermediário |
| Azul claro | Continuidade das férias |
| Ciano | Eventos criados por usuários |

## 📱 Demonstração

Acesse a versão online: https://ericocaprioli.github.io/AGENDA/

## 📄 Licença

Este projeto está licenciado sob **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

### O que você PODE fazer:
- ✅ Compartilhar — copiar e redistribuir o material
- ✅ Adaptar — remixar, transformar e construir sobre o material

### O que você NÃO PODE fazer:
- ❌ Usar para fins comerciais
- ❌ Vender este projeto ou derivados

### Condições:
- Atribuição — Você deve dar o crédito apropriado

Para mais informações: https://creativecommons.org/licenses/by-nc/4.0/

## 👨‍💻 Autor

Desenvolvido por ericocaprioli

## 🏫 Instituição

Colégio Estadual Profª Hercília F do Nascimento - EFMP
Mangueirinha - PR

## 📞 Contato

- **Telefone**: (46)3243-1271
- **E-mail**: mulhercilianascimento@seed.pr.gov.br
- **Endereço**: Rua Governador Garcés, nº 674, Bairro Vila Verde, 85540-046 - Mangueirinha - PR

---

**⚠️ AVISO IMPORTANTE**: Este projeto é destinado exclusivamente para uso educacional e não comercial. A venda ou exploração comercial deste software é estritamente proibida nos termos da licença CC BY-NC 4.0.
