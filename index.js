const express = require('express');
const axios = require('axios');
const cors = require('cors'); 
require('dotenv').config();
const path = require('path');

const app = express();
const port = 3000;

const apiUrl = process.env.URL;
const apiToken = process.env.RESTDB_TOKEN;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dominio = "https://cutme.vercel.app/";

app.use(cors({
  origin: apiUrl, 
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const headers = {
    'Content-Type': 'application/json',
    'x-apikey': apiToken,
    'Cache-Control': 'no-cache'
};

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

app.post('/', async (req, res) => {
  try {
    const { url } = req.body; 
    const randomString = generateRandomString(10); 
    const urlcut = randomString; 
    const newBody = { url, urlcut, views: 0 };
    await axios.post(apiUrl, newBody, { headers });
    const newUrl = dominio + urlcut;
    res.status(201).json({ newUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const response = await axios.get(`${apiUrl}/${id}`, { headers });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

function generateRandomString(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

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

app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log(`API rodando em http://localhost:${port}/`);
});