# from flask import Blueprint, render_template, request, redirect, url_for, flash
# from . import db
# from .models import User


# bp = Blueprint("admin", __name__, url_prefix="/admin")


# @bp.route("/signup", methods=["GET", "POST"])

# def signup():
#     if request.method == "POST":
#         username = request.form["username"]
#         password = request.form["password"]

#         existing = User.query.filter_by(username=username).first()
#         if existing:
#             flash("Username already exists.")
#             return redirect(url_for("admin.signup"))

#         new_user = User(username=username, password=password)
#         db.session.add(new_user)
#         db.session.commit()
#         flash("Account created successfully!")
#         return redirect(url_for("admin.login"))

#     return render_template("signup.html")


# @bp.route("/login", methods=["GET", "POST"])
# def login():
#     if request.method == "POST":
#         username = request.form["username"]
#         password = request.form["password"]

#         user = User.query.filter_by(username=username, password=password).first()
#         if user:
#             flash("Login successful!")
#             return redirect(url_for("main.index"))
#         else:
#             flash("Invalid username or password.")
#     return render_template("login.html")