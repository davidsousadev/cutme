document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('urlForm');
    const urlInput = document.getElementById('urlInput');
    const shortUrlElement = document.getElementById('shortUrl');
    const shortUrlLink = document.getElementById('shortUrlLink');
    const resultSection = document.getElementById('resultSection');
    const qrcodeImage = document.getElementById('qrcode_image');
    const copyButton = document.getElementById('copyButton');
    const downloadQRCode = document.getElementById('downloadQRCode');

    const copyToClipboard = () => {
        const url = shortUrlElement.innerText;
        navigator.clipboard.writeText(url).then(() => {
            mostrarNotificacao('URL copiada para a área de transferência!');
        }).catch(err => {
            console.error('Erro ao copiar:', err);
        });
    };

    copyButton.addEventListener('click', copyToClipboard);

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const url = urlInput.value;

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
                qrcodeImage.src = data.qrCode; 
                qrcodeImage.style.display = 'block';
                downloadQRCode.href = data.qrCode;
                downloadQRCode.download = `${data.urlcut}.png`; 
                downloadQRCode.style.display = 'block';
                resultSection.style.display = 'block';
                copyButton.style.display = 'inline-block';
                mostrarNotificacao('Sua URL foi encurtada com sucesso!');
            } else {
                mostrarNotificacao('Erro ao encurtar a URL.');
            }
        } catch (error) {
            console.error('Erro:', error);
            mostrarNotificacao('Erro ao encurtar a URL.');
        }
    });
});
