from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
import random
from datetime import datetime

app = Flask(__name__)
app.config["SECRET_KEY"] = "sixseven67"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///cyberpath.db"
db = SQLAlchemy(app)

#---------------------------------------------------------------------------------------------------------------------------------
# Database Models
#---------------------------------------------------------------------------------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)


class Marker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    timeadded = db.Column(db.DateTime, default=db.func.current_timestamp())
    

with app.app_context():
    db.create_all()


@app.route("/")
def index():

    return render_template("index.html")

#---------------------------------------------------------------------------------------------------------------------------------
# Account Functionality
#---------------------------------------------------------------------------------------------------------------------------------

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
    

@app.route("/signout", methods=["POST"])
def signout():
    session.pop("admin_logged_in", None)
    flash("Logged out successfully!", "success")
    return redirect(url_for("index"))


@app.route("/forgot-password", methods=["POST"])
def forgot_password():
    email = request.form["email"]
    new_password = request.form["password"]
    confirm_password = request.form["c_password"]

    user = User.query.filter_by(email=email).first()
    if not user:
        flash("Email not found!", "error")
        return redirect(url_for("index"))

    if user.password == new_password:
            flash("New password cannot be the same as your current password!", "error")
            return redirect(url_for("index"))


    if new_password != confirm_password:
        flash("Passwords do not match!", "error")
        return redirect(url_for("index"))

    if user:
        user.password = new_password
        db.session.commit()
        flash("Password updated successfully!", "success")
    else:
        flash("Email not found!", "error")
        return redirect(url_for("index"))

    
    return redirect(url_for("index"))


#---------------------------------------------------------------------------------------------------------------------------------
# Location Management Functionality
#---------------------------------------------------------------------------------------------------------------------------------

@app.route("/api/markers")
def api_markers():
    if not session.get("admin_logged_in"):
        return jsonify([])

    markers = Marker.query.order_by(Marker.id).all()
    markers_list = [
        {
            "id": m.id,
            "name": m.name,
            "latitude": m.latitude,
            "longitude": m.longitude,
            "description": m.description
        }
        for m in markers
    ]
    return jsonify(markers_list)


@app.route("/add-marker", methods=["POST"])
def add_marker():
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))
    
    name = request.form["name"]
    coords = request.form["coords"] 
    try:
        latitude, longitude = map(float, coords.split(","))
    except ValueError:
        flash("Invalid coordinates!", "error")
        return redirect(url_for("index"))

    description = request.form["description"]
    timeadded = datetime.now()

    new_marker = Marker(name=name, latitude=latitude, longitude=longitude, description=description, timeadded=timeadded)
    db.session.add(new_marker)
    db.session.commit()

    flash("Marker added successfully!", "success")
    return redirect(url_for("index"))

@app.route("/edit-marker/<int:marker_id>", methods=["POST"])
def edit_marker(marker_id):
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))
    
    marker = Marker.query.get_or_404(marker_id)

    marker.name = request.form["name"]
    coords = request.form["coords"]
    try:
        marker.latitude, marker.longitude = map(float, coords.split(","))
    except ValueError:
        flash("Invalid coordinates!", "error")
        return redirect(url_for("index"))

    marker.description = request.form["description"]
    marker.timeadded = datetime.now()

    db.session.commit()

    flash("Marker updated successfully!", "success")
    return redirect(url_for("index"))

@app.route("/delete-marker/<int:marker_id>", methods=["POST"])
def delete_marker(marker_id):
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))
    
    marker = Marker.query.get_or_404(marker_id)
    db.session.delete(marker)
    db.session.commit()

    return redirect(url_for("index"))


#---------------------------------------------------------------------------------------------------------------------------------
# Debugs (will remove after testing)
#---------------------------------------------------------------------------------------------------------------------------------

@app.route("/test-users")
def test_users():
    users = User.query.all()
    return "<br>".join([f"{u.id} - {u.email}" for u in users])

@app.route("/test-markers")
def debug_markers():
    markers = Marker.query.all()

    if not markers:
        return "No markers found in database."

    output = []
    for m in markers:
        output.append(f"{m.id}: {m.name} @ ({m.latitude}, {m.longitude}) — {m.description}")

    return "<br>".join(output)



if __name__ == "__main__":
    app.run(debug=True)
