import random
import string

def string(tamanho=10, caracteres=string.ascii_letters + string.digits):
    return ''.join(random.choice(caracteres) for _ in range(tamanho))
