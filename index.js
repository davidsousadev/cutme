import dotenv from 'dotenv';
dotenv.config();

import express, { json, urlencoded } from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import { toDataURL } from 'qrcode';

import swaggerJsDoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';

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

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Configuração do Swagger
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Encurtador de URL',
            version: '1.0.0',
            description: 'Documentação da API de Encurtador de URL usando Swagger.',
        },
        servers: [
            {
                url: `http://localhost:${port}`,
                description: 'Servidor local',
            },
        ],
    },
    apis: ['./index.js'], // Arquivos onde estão as rotas documentadas
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', serve, setup(swaggerDocs));

/**
 * @swagger
 * /:
 *   get:
 *     summary: Página principal
 *     description: Retorna a página principal do projeto.
 *     responses:
 *       200:
 *         description: Página carregada com sucesso.
 *       500:
 *         description: Erro interno do servidor.
 */
app.get('/', async (req, res) => {
    try {
        const response = await axios.get(apiUrl, { headers });
        res.sendFile(join(__dirname, 'public', 'index.html'));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /listar:
 *   get:
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
            data: response.data,
            pagination: {
                total,
                page,
                limit
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /:
 *   post:
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
 *   post:
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

app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}/`);
});
