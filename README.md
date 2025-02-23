# 🚀 Encurtador de URL com Node.js, Express e RESTful API

Este projeto é um encurtador de URL simples, construído com Node.js e Express, que permite encurtar links, gerar QR Codes e acompanhar o número de visualizações. As URLs encurtadas podem ser acessadas, editadas e excluídas via API REST.

## 📦 Recursos

- 🔗 Encurtamento de URL com identificador único.
- 📷 Geração de QR Code para cada URL encurtada.
- 🚀 Redirecionamento automático ao acessar a URL curta.
- 📊 Contagem de visualizações para cada link.
- ⚙️ API para criar, listar, atualizar e excluir URLs.

## 🛠️ Tecnologias Utilizadas

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Axios](https://axios-http.com/)
- [QRCode](https://www.npmjs.com/package/qrcode)
- [RESTdb.io](https://restdb.io/) (como backend para armazenar as URLs)
- [dotenv](https://www.npmjs.com/package/dotenv) para variáveis de ambiente
- [CORS](https://www.npmjs.com/package/cors) para controle de acesso

## 🚀 Instalação e Configuração

### 1. Clonando o Repositório

```bash
git clone https://github.com/davidsousadev/cutme.git
cd cutme
```

### 2. Instalando as Dependências

```bash
npm install
```

### 3. Configurando Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto e adicione as seguintes informações:

```env
PORT=3000
URL=https://seu-endpoint-restdb.io/rest/urls
RESTDB_TOKEN=seu-token-api
DOMINIO=http://seu-dominio.com/
```

### 4. Executando o Servidor

```bash
npm start
```

O servidor estará disponível em [http://localhost:3000](http://localhost:3000).

## 🌐 Rotas da API

### 1. **Listar URLs**

**GET /lista**

Retorna todas as URLs encurtadas cadastradas.

Exemplo de resposta:

```json
[
  {
    "_id": "12345",
    "url": "https://exemplo.com",
    "urlcut": "abc123",
    "views": 10
  }
]
```

### 2. **Criar uma Nova URL**

**POST /**

Encurta uma nova URL.

Exemplo de corpo da requisição:

```json
{
  "url": "https://exemplo.com"
}
```

Exemplo de resposta:

```json
{
  "newUrl": "http://seu-dominio.com/abc123",
  "qrCode": "data:image/png;base64,...",
  "urlcut": "abc123"
}
```

### 3. **Redirecionar para a URL Original**

**GET /:urlcut**

Redireciona para a URL original com base no código encurtado.

### 4. **Atualizar uma URL**

**PUT /:id**

Atualiza uma URL existente.

Exemplo de corpo da requisição:

```json
{
  "url": "https://novo-exemplo.com"
}
```

### 5. **Excluir uma URL**

**DELETE /:id**

Remove uma URL cadastrada.

## 📝 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).

---

Feito com ❤️ por [David Sousa](https://github.com/davidsousadev)
