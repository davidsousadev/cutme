function copyToClipboard() {
    const urlElement = document.getElementById('url');
    const urlText = urlElement.innerText; // Pega o texto da URL

    navigator.clipboard.writeText(urlText) // Copia a url
        .then(() => {
            alert('URL copiada para a área de transferência!');
        })
        .catch(err => {
            console.error('Erro ao copiar URL: ', err);
        });
}