from flask import Flask, flash, jsonify, redirect, render_template, request, url_for
from flask_cors import CORS
from url import db, URL
from string_aleatoria import string

urlpadrao = "https://cutme.vercel.app/"

app = Flask(__name__)
app.secret_key = 'chave'

CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///items.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/lista', methods=['GET'])
def get_urls():
    urls = URL.query.all()
    return jsonify([url.to_dict() for url in urls])

@app.route('/', methods=['POST'])
def create_url():
    url = request.form.get('url')
    try:
        if url and not URL.query.filter_by(url=url).first():
            urlcurta = string()
            new_url = URL(url=url, urlcurta=urlcurta, acessos=0)
            db.session.add(new_url)
            db.session.commit()
            urlcurta = urlpadrao + urlcurta
            return render_template('url.html', url=urlcurta)
        else:
            flash('Adicione uma URL válida ou a URL já existe.', 'error')
            return redirect(url_for('index')) 
    except Exception as e:
        flash(f'Ocorreu um erro ao adicionar a URL: {str(e)}', 'error')
        return redirect(url_for('index'))  

@app.route('/<urlcurta>')
def redirect_url(urlcurta):
    verificaurl = URL.query.filter_by(urlcurta=urlcurta).first()
    if verificaurl: 
        verificaurl.acessos += 1
        db.session.commit()
        return redirect(verificaurl.url)  
    else:
        flash('URL curta não encontrada.', 'error')  
        return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)
