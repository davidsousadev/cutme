import swaggerJSDoc from 'swagger-jsdoc';

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
                url: 'https://cutme.vercel.app',
                description: 'Servidor Produção',
            },
            {
                url: 'http://localhost:3000',
                description: 'Servidor Local',
            },
        ],
    },
    apis: ['./index.js'],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

export default swaggerSpec;
