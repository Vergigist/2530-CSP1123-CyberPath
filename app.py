from flask import Flask, render_template, request, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config["SECRET_KEY"] = "secret123"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
db = SQLAlchemy(app)


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)


with app.app_context():
    db.create_all()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup", methods=["POST"])
def signup():
    email = request.form["email"]
    password = request.form["password"]

    existing = User.query.filter_by(email=email).first()
    if existing:
        flash("Email already exists!", "error")
        return redirect(url_for("index"))

    new_user = User(email=email, password=password)
    db.session.add(new_user)
    db.session.commit()

    flash("Account created successfully!", "success")
    return redirect(url_for("index"))


@app.route("/signin", methods=["POST"])
def signin():
    email = request.form["email"]
    password = request.form["password"]

    user = User.query.filter_by(email=email, password=password).first()
    if user:
        session["admin_logged_in"] = True
        flash("Login successful!", "success")
        return redirect(url_for("index"))
    else:
        flash("Invalid email or password!", "error")
        return redirect(url_for("index"))


# DEBUG route — view all users
@app.route("/test-users")
def test_users():
    users = User.query.all()
    return "<br>".join([f"{u.id} - {u.email}" for u in users])


if __name__ == "__main__":
    app.run(debug=True)


