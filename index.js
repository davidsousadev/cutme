import express, { json, urlencoded, Router } from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import { toDataURL } from 'qrcode';
import cookieParser from 'cookie-parser';

import swaggerSpec from './swaggerOptions.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Constantes de ambiente
const apiUrl = process.env.URL;
const apiToken = process.env.RESTDB_TOKEN;
const dominio = process.env.DOMINIO;

const app = express();
const port = 3000;

// Configuração __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middlewares principais
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configurado
app.use(cors({
    origin: apiUrl,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Servir arquivos estáticos
app.use(express.static(join(__dirname, 'public')));
app.use('/tmp', express.static(join(__dirname, 'tmp')));

const headers = {
    'Content-Type': 'application/json',
    'x-apikey': apiToken,
    'Cache-Control': 'no-cache'
};

// Função auxiliar
function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/* ---------------- Swagger ---------------- */
const swaggerRouter = Router();
swaggerRouter.get("/", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="pt-br">
        <head>
          <meta charset="UTF-8">
          <title>Swagger UI</title>
          <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
        </head>
        <body>
          <div id="swagger-ui"></div>
          <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
          <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js"></script>
          <script>
            window.onload = () => {
              SwaggerUIBundle({
                spec: ${JSON.stringify(swaggerSpec)},
                dom_id: '#swagger-ui',
                presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
                layout: "BaseLayout"
              });
            }
          </script>
        </body>
      </html>
    `);
});
app.use('/api-docs', swaggerRouter);

/* ---------------- Cookies / Login ---------------- */

// Usuário fixo para exemplo
const USER = process.env.LOGIN_USER || "admin";
const PASS = process.env.LOGIN_PASS || "123456";

// Middleware de autenticação
function authMiddleware(req, res, next) {
    const session = req.cookies.session;
    if (session === "12345") {
        next();
    } else {
        res.redirect("/login");
    }
}

/* ---------------- Página principal protegida ---------------- */
app.get('/', async (req, res) => {
    let html = fs.readFileSync(join(__dirname, 'public', 'index.html'), 'utf-8');

    // Se tiver cookie de sessão, mostra "Sair", senão mostra "Login"
    if (req.cookies.session === "12345") {
        html = html.replace(
            /<a[^>]*id="auth-button"[^>]*>.*?<\/a>/,
            '<a href="/logout" id="auth-button" class="login-button">Sair</a>'
        );
    } else {
        html = html.replace(
            /<a[^>]*id="auth-button"[^>]*>.*?<\/a>/,
            '<a href="/login" id="auth-button" class="login-button">Login</a>'
        );
    }

    res.send(html);
});


// Página de login
app.get('/login', (req, res) => {
    // Se já estiver logado, manda pro index
    if (req.cookies.session === "12345") {
        return res.redirect("/");
    }
    res.sendFile(join(__dirname, 'public', 'login.html'));
});

// Processa login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === USER && password === PASS) {
        res.cookie("session", "12345", { httpOnly: true, maxAge: 3600000 }); // 1h
        res.redirect("/");
    } else {
        res.send("Usuário ou senha inválidos! <a href='/login'>Tente novamente</a>");
    }
});

// Logout
app.get('/logout', (req, res) => {
    res.clearCookie("session");
    res.redirect("/login");
});

app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}/`);
});


/* ---------------- Rotas da API ---------------- */

/**
 * @swagger
 * /listar:
 * 
 *   get:
 *     tags:
 *       - URLS
 *     summary: Listar URLs encurtadas
 *     description: Retorna uma lista de todas as URLs encurtadas cadastradas.
 *     responses:
 *       200:
 *         description: Lista de URLs retornada com sucesso.
 *       500:
 *         description: Erro ao buscar as URLs.
 */
app.get('/listar', async (req, res) => {
    try {
        const response = await axios.get(apiUrl, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /lista:
 *   get:
 *     tags:
 *       - URLS
 *     summary: Listar URLs encurtadas (últimos registros primeiro) com paginação
 *     description: >
 *       Retorna uma lista de URLs encurtadas cadastradas, ordenadas do mais recente para o mais antigo.
 *       É possível utilizar paginação através dos parâmetros de query `page` e `limit`.
 *       Por padrão, retorna os **10 últimos registros**.
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         description: Número da página para paginação (padrão é 1).
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         description: Número de itens por página (padrão é 10).
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de URLs retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   description: Lista das URLs encurtadas.
 *                   items:
 *                     type: object
 *                     properties:
 *                       url:
 *                         type: string
 *                         description: A URL original.
 *                         example: https://exemplo.com
 *                       urlcut:
 *                         type: string
 *                         description: Código encurtado da URL.
 *                         example: abc123
 *                       views:
 *                         type: integer
 *                         description: Número de visualizações da URL encurtada.
 *                         example: 42
 *                 pagination:
 *                   type: object
 *                   description: Informações sobre a paginação.
 *                   properties:
 *                     total:
 *                       type: integer
 *                       description: Total de URLs disponíveis.
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       description: Página atual.
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       description: Limite de itens por página.
 *                       example: 10
 *       500:
 *         description: Erro interno ao buscar as URLs.
 */
app.get('/lista', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Dados paginados e ordenados (últimos registros)
        const response = await axios.get(
            `${apiUrl}?q={}&h={"$orderby":{"_id":-1},"$skip":${skip},"$max":${limit}}`,
            { headers }
        );

        // Total de registros
        const totalResponse = await axios.get(apiUrl, { headers });
        const total = totalResponse.data.length;

        res.json({
            info: `${dominio}/lista?page=INT&skip=INT&limit=INT`,
            pagination: {
                total,
                page,
                limit
            },
            data: response.data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /:
 *   post:
 *     tags:
 *       - URLS
 *     summary: Encurtar uma URL
 *     description: Recebe uma URL, verifica se já existe, gera uma URL encurtada e retorna a URL e QR Code gerados.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: A URL a ser encurtada.
 *                 example: "https://example.com"
 *     responses:
 *       201:
 *         description: URL encurtada e QR Code gerados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newUrl:
 *                   type: string
 *                   description: A nova URL encurtada.
 *                 qrCode:
 *                   type: string
 *                   description: A imagem do QR Code gerada.
 *                 urlcut:
 *                   type: string
 *                   description: O código gerado para a URL encurtada.
 *       500:
 *         description: Erro ao processar a URL.
 */
app.post('/', async (req, res) => {
    try {
        let { url } = req.body;

        // Verifica e adiciona o protocolo caso esteja ausente
        if (!/^(http|https|ftp|ftps):\/\//i.test(url)) {
            url = `https://${url}`;
        }

        const existingEntry = await axios.get(apiUrl, { headers });
        const existingUrl = existingEntry.data.find(entry => entry.url === url);

        if (existingUrl) {
            // URL já existe, gera QR Code e retorna
            const existingShortUrl = dominio + existingUrl.urlcut;
            const qrCodeBase64 = await toDataURL(existingShortUrl, {
                color: {
                    dark: '#000',
                    light: '#FFF'
                }
            });

            return res.status(200).json({ newUrl: existingShortUrl, qrCode: qrCodeBase64, urlcut: existingUrl.urlcut });
        }

        let urlcut;
        let randomString;
        let isUnique = false;

        while (!isUnique) {
            randomString = generateRandomString(10);
            const duplicateEntry = existingEntry.data.find(entry => entry.urlcut === randomString);
            isUnique = !duplicateEntry;
        }

        urlcut = randomString;

        // Gera QR Code como Base64
        const urlQRCode = dominio + urlcut;
        const qrCodeBase64 = await toDataURL(urlQRCode, {
            color: {
                dark: '#000',
                light: '#FFF'
            }
        });

        const newBody = { url, urlcut, views: 0 };
        await axios.post(apiUrl, newBody, { headers });

        const newUrl = dominio + urlcut;

        // Retorna URL, Base64 do QR Code e a randomString para o nome do arquivo
        res.status(201).json({ newUrl, qrCode: qrCodeBase64, urlcut: urlcut });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /{urlcut}:
 *   get:
 *     tags:
 *       - URLS
 *     summary: Redirecionar para a URL original
 *     description: Recebe o código encurtado (urlcut) e redireciona para a URL original.
 *     parameters:
 *       - in: path
 *         name: urlcut
 *         required: true
 *         description: O código encurtado da URL.
 *         schema:
 *           type: string
 *           example: "abc123"
 *     responses:
 *       302:
 *         description: Redirecionamento para a URL original.
 *       404:
 *         description: URL não encontrada.
 *       500:
 *         description: Erro ao processar a requisição.
 */
app.get('/:urlcut', async (req, res) => {
    const { urlcut } = req.params;

    try {
        const response = await axios.get(`${apiUrl}?q={"urlcut":"${urlcut}"}`, { headers });

        if (response.data.length > 0) {
            const originalUrl = response.data[0].url;
            const id = response.data[0]._id;
            await axios.put(`${apiUrl}/${id}`, { $inc: { views: 1 } }, { headers });
            res.redirect(originalUrl);
        } else {
            res.status(404).json({ error: 'URL não encontrada' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /custom:
 * 
 *   post:
 *     tags:
 *       - URLS
 *     summary: Encurtar uma URL com código personalizado
 *     description: Recebe uma URL e um código personalizado, verifica se o código não existe no banco, e retorna a URL encurtada com o QR Code.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: A URL a ser encurtada.
 *                 example: "https://example.com"
 *               urlcut:
 *                 type: string
 *                 description: O código personalizado para a URL encurtada.
 *                 example: "minhacustomurl"
 *     responses:
 *       201:
 *         description: URL encurtada com código personalizado e QR Code gerados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 newUrl:
 *                   type: string
 *                   description: A nova URL encurtada.
 *                 qrCode:
 *                   type: string
 *                   description: A imagem do QR Code gerada.
 *                 urlcut:
 *                   type: string
 *                   description: O código personalizado da URL encurtada.
 *       400:
 *         description: Código personalizado já existe.
 *       500:
 *         description: Erro ao processar a URL.
 */
app.post('/custom', async (req, res) => {
    try {
        let { url, urlcut } = req.body;

        // Verifica e adiciona o protocolo caso esteja ausente
        if (!/^(http|https|ftp|ftps):\/\//i.test(url)) {
            url = `https://${url}`;
        }

        const existingEntry = await axios.get(apiUrl, { headers });
        const existingUrl = existingEntry.data.find(entry => entry.url === url);
        const existingCustomCode = existingEntry.data.find(entry => entry.urlcut === urlcut);

        if (existingUrl) {
            // URL já existe, gera QR Code e retorna
            const existingShortUrl = dominio + existingUrl.urlcut;
            const qrCodeBase64 = await toDataURL(existingShortUrl, {
                color: {
                    dark: '#000',
                    light: '#FFF'
                }
            });

            return res.status(200).json({ newUrl: existingShortUrl, qrCode: qrCodeBase64, urlcut: existingUrl.urlcut });
        }

        if (existingCustomCode) {
            // Código personalizado já existe
            return res.status(400).json({ error: 'Código personalizado já existe.' });
        }

        // Gera QR Code como Base64
        const urlQRCode = dominio + urlcut;
        const qrCodeBase64 = await toDataURL(urlQRCode, {
            color: {
                dark: '#000',
                light: '#FFF'
            }
        });

        const newBody = { url, urlcut, views: 0 };
        await axios.post(apiUrl, newBody, { headers });

        const newUrl = dominio + urlcut;

        // Retorna URL, Base64 do QR Code e o código personalizado
        res.status(201).json({ newUrl, qrCode: qrCodeBase64, urlcut: urlcut });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /id/{id}:
 *   get:
 *     tags:
 *       - URLS
 *     summary: Buscar informações de uma URL encurtada pelo ID
 *     description: Recebe o ID da URL encurtada e retorna as informações da URL.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: O ID da URL encurtada.
 *         schema:
 *           type: string
 *           example: "12345"
 *     responses:
 *       200:
 *         description: Informações da URL encurtada retornadas com sucesso.
 *       500:
 *         description: Erro ao buscar a URL.
 */
app.get('/id/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`${apiUrl}/${id}`, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @ swagger
 * /{id}:
 *   put:
 *     tags:
 *       - URLS
 *     summary: Atualizar informações de uma URL encurtada
 *     description: Atualiza as informações de uma URL encurtada pelo ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: O ID da URL encurtada.
 *         schema:
 *           type: string
 *           example: "12345"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *                 description: A URL a ser atualizada.
 *                 example: "https://novosite.com"
 *               urlcut:
 *                 type: string
 *                 description: O código da URL encurtada.
 *                 example: "xyz987"
 *     responses:
 *       200:
 *         description: Informações da URL atualizadas com sucesso.
 *       500:
 *         description: Erro ao atualizar a URL.
 */
/*app.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.put(`${apiUrl}/${id}`, req.body, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});*/

/**
 * @ swagger
 * /{id}:
 *   delete:
 *     tags:
 *       - URLS
 *     summary: Excluir uma URL encurtada
 *     description: Exclui uma URL encurtada pelo ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: O ID da URL a ser excluída.
 *         schema:
 *           type: string
 *           example: "12345"
 *     responses:
 *       204:
 *         description: URL excluída com sucesso.
 *       500:
 *         description: Erro ao excluir a URL.
 */
/*
app.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await axios.delete(`${apiUrl}/${id}`, { headers });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
*/

