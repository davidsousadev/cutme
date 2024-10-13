from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class URL(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    url = db.Column(db.String(100), nullable=False)
    urlcurta = db.Column(db.String(100), nullable=False, unique=True)
    acessos = db.Column(db.Integer, default=0)

    def to_dict(self):
        return {
            "_id": self.id,
            "url": self.url,
            "urlcurta": self.urlcurta,
            "acessos": self.acessos
        }