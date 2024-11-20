const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const app = express();
const port = 3000;

require('dotenv').config();

const apiUrl = process.env.URL;
const apiToken = process.env.RESTDB_TOKEN;
const dominio = process.env.DOMINIO;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: apiUrl, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/tmp', express.static(path.join(__dirname, 'tmp')));

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

app.get('/', async (req, res) => {
    try {
        const response = await axios.get(apiUrl, { headers });
        res.sendFile(path.join(__dirname, 'public', 'index.html')); 
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/lista', async (req, res) => {
    try {
        const response = await axios.get(apiUrl, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/', async (req, res) => {
    try {
        let { url } = req.body;

        // Verifica e adiciona o protocolo caso esteja ausente
        if (!/^(http|https|ftp|ftps):\/\//i.test(url)) {
            url = `http://${url}`;
        }

        const existingEntry = await axios.get(apiUrl, { headers });
        const existingUrl = existingEntry.data.find(entry => entry.url === url);

        if (existingUrl) {
            // URL já existe, gera QR Code e retorna
            const existingShortUrl = dominio + existingUrl.urlcut;
            const qrCodeBase64 = await QRCode.toDataURL(existingShortUrl, {
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
        const qrCodeBase64 = await QRCode.toDataURL(urlQRCode, {
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

app.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`${apiUrl}/${id}`, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.put(`${apiUrl}/${id}`, req.body, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await axios.delete(`${apiUrl}/${id}`, { headers });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}/`);
});
