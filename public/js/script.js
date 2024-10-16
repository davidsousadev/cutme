const form = document.getElementById('urlForm');
        const resultSection = document.getElementById('resultSection');
        const shortUrlElement = document.getElementById('shortUrl');
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
                    resultSection.style.display = 'block';
                    copyButton.style.display = 'block';
                } else {
                    alert('Erro ao encurtar a URL: ' + data.error);
                }
            } catch (error) {
                console.error('Erro:', error);
                alert('Erro ao encurtar a URL.');
            }
        });

        function copyToClipboard() {
            const urlText = shortUrlElement.innerText;

            navigator.clipboard.writeText(urlText)
                .then(() => {
                    alert('URL copiada para a área de transferência!');
                })
                .catch(err => {
                    console.error('Erro ao copiar URL: ', err);
                });
        }