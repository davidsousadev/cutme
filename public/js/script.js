const form = document.getElementById('urlForm');
const resultSection = document.getElementById('resultSection');
const shortUrlElement = document.getElementById('shortUrl');
const shortUrlLink = document.getElementById('shortUrlLink');
const qrcodeImage = document.getElementById('qrcode_image');
const downloadQRCode = document.getElementById('downloadQRCode');
const copyButton = document.getElementById('copyButton');

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const url = document.getElementById('urlInput').value;

    try {
        const response = await fetch('/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (response.ok) {
            
            shortUrlElement.innerText = data.newUrl; 
            shortUrlLink.href = data.newUrl;
            shortUrlLink.style.display = 'block';

            qrcodeImage.src = data.filePath;
            qrcodeImage.style.display = 'block';
            downloadQRCode.href = data.filePath;

            resultSection.style.display = 'block';
            copyButton.style.display = 'block';
            mostrarNotificacao('Sua URL foi encurtada com sucesso!');
        } else {
            mostrarNotificacao('Erro ao encurtar a URL.');
        }
    } catch (error) {
        console.error('Erro:', error);
        mostrarNotificacao('Erro ao encurtar a URL.');
    }
});

function copyToClipboard() {
    const urlText = shortUrlElement.innerText;

    navigator.clipboard.writeText(urlText)
        .then(() => {
            mostrarNotificacao('URL copiada para a área de transferência!');
        })
        .catch(err => {
            console.error('Erro ao copiar URL: ', err);
            mostrarNotificacao('Erro ao copiar URL.');
        });
}