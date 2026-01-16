from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from flask_mail import Mail, Message
from datetime import datetime
from dotenv import load_dotenv
import random, google.genai as genai, os, re

app = Flask(__name__)
app.config["SECRET_KEY"] = "sixseven67"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///cyberpath.db"
app.config["MAIL_SERVER"] = "smtp.gmail.com"
app.config["MAIL_PORT"] = 587
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USE_SSL"] = False
app.config["MAIL_USERNAME"] = "cyberpathotp@gmail.com" 
app.config["MAIL_PASSWORD"] = "onjl mije yxkv ruit"
app.config["MAIL_DEFAULT_SENDER"] = "cyberpathotp@gmail.com"
mail = Mail(app)
db = SQLAlchemy(app)


#---------------------------------------------------------------------------------------------------------------------------------
# Database Models
#---------------------------------------------------------------------------------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)
    about_me = db.Column(db.String(500))
    verified = db.Column(db.Boolean, default=False)

class Marker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    timeadded = db.Column(db.DateTime, default=datetime.now)
    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=True)
    
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    markers = db.relationship("Marker", backref="category", lazy=True)

class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    subject = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, nullable=False)
    time_submitted = db.Column(db.DateTime, default=datetime.now)

with app.app_context():
    #db.drop_all()
    db.create_all()

    if not Category.query.first():
        db.session.add_all([
            Category(name="Lecture Halls"),
            Category(name="Labs"),
            Category(name="Offices"),
            Category(name="Food & Drinks"),
            Category(name="Facilities"),
            Category(name="Recreation"),
            Category(name="Others")
        ])
        db.session.commit()
   

@app.route("/")
def index():
    user = None
    if "user_email" in session:
        user_email = session["user_email"]
        user = User.query.filter_by(email=user_email).first()

    categories = Category.query.all()
    return render_template("index.html", user=user, categories=categories)


#---------------------------------------------------------------------------------------------------------------------------------
# Admin Functionality
#---------------------------------------------------------------------------------------------------------------------------------

referral_code = 961523


def is_valid_password(password):
    if len(password) < 8:
        return False

    if not re.search(r"[A-Z]", password):
        return False

    if not re.search(r"\d", password):
        return False

    return True


@app.route("/signup", methods=["POST"])
def signup():
    referral = request.form.get("referral")
    email = request.form["email"]
    password = request.form["password"]

    if referral and int(referral) != referral_code:
        return jsonify({"success": False, "field": "referral", "message": "Invalid referral code!"})
    
    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"success": False, "field": "email", "message": "Email already exists!"})

    if not is_valid_password(password):
        return jsonify({"success": False, "field": "password", "message": "Password must have at least 8 characters, including 1 uppercase and 1 number."})
    
    hashed_password = generate_password_hash(password)

    if email.lower() == "hozhenxiang@gmail.com":
        verified_status = True
    else:
        verified_status = False

    new_user = User(email=email, password=hashed_password, verified=verified_status)
    db.session.add(new_user)
    db.session.commit()

    if verified_status:
        flash("Account created and automatically verified!", "success")
    else:
        flash("Account created! Waiting for admin verification.", "success")

    return redirect(url_for("index"))


@app.route("/api/admins")
def api_admins():
    verified_admins = User.query.filter_by(verified=True).all()

    admins_list = [
        {
            "id": admin.id,
            "email": admin.email
        }
        for admin in verified_admins
    ]

    return jsonify(admins_list)


@app.route("/signin", methods=["POST"])
def signin():
    email = request.form["email"]
    password = request.form["password"]

    user = User.query.filter_by(email=email).first()

    if not user:
        flash("Invalid email or password!", "error")
        return redirect(url_for("index"))

    if not user.verified:
        flash("Your account is not yet verified by an admin.", "error")
        return redirect(url_for("index"))

    if check_password_hash(user.password, password):
        session["admin_logged_in"] = True
        session["user_email"] = user.email
        flash("Login successful!", "success")
        return redirect(url_for("index"))
    else:
        flash("Invalid email or password!", "error")
        return redirect(url_for("index"))
    

def send_email(to, subject, body):
    try:
        msg = Message(
            subject=subject,
            recipients=[to],
            body=body
        )
        mail.send(msg)
    except Exception as e:
        print("Email failed:", e)


@app.route("/admin/approve/<int:user_id>", methods=["POST"])
def approve_user(user_id):
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Not authorized"}), 403

    user = User.query.get_or_404(user_id)
    user.verified = True
    db.session.commit()

    send_email(
        to=user.email,
        subject="Your account has been approved 🎉",
        body=f"""Hello,

Good news! Your account has been approved by our admin team.

You can now log in and access admin features.

Welcome aboard,
CyberPath Team
"""
    )

    return jsonify({"success": True, "message": f"{user.email} approved!"})


@app.route("/admin/reject/<int:user_id>", methods=["POST"])
def reject_user(user_id):
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Not authorized"}), 403

    user = User.query.get_or_404(user_id)
    email = user.email
    db.session.delete(user)
    db.session.commit()

    send_email(
        to=email,
        subject="Account request update",
        body=f"""Hello,

Thank you for your interest in CyberPath.

After review, your account request was not approved.

If you believe this was a mistake, feel free to contact the team.

Regards,
CyberPath Team
"""
    )
    
    return jsonify({"success": True, "message": f"{user.email} rejected!"})


@app.route("/api/pending-approvals")
def api_pending_users():
    if not session.get("admin_logged_in"):
        return jsonify([])

    users = User.query.filter_by(verified=False).all()
    return jsonify([{"id": u.id, "email": u.email} for u in users])


@app.route("/delete-admin/<int:user_id>", methods=["POST"])
def delete_admin(user_id):
    if session.get("user_email") != "hozhenxiang@gmail.com":
        return jsonify({"success": False, "message": "Unauthorized action."})

    user = User.query.get_or_404(user_id)

    if user.email == "hozhenxiang@gmail.com":
        return jsonify({"success": False, "message": "Cannot delete this admin."})
    
    if user.email == session.get("user_email"):
        return jsonify({"success": False, "message": "Cannot delete your own account."})
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({"success": True, "message": f"Admin {user.email} deleted successfully."})


@app.route("/signout", methods=["POST"])
def signout():
    session.pop("admin_logged_in", None)
    session.pop("user_email", None)
    flash("Logged out successfully!", "success")
    return redirect(url_for("index"))


@app.route("/forgot-password/send-otp", methods=["POST"])
def send_forgot_otp():
    email = request.form["email"]
    user = User.query.filter_by(email=email).first()

    if not user:
        return jsonify({"success": False, "message": "Email not found"})

    otp = str(random.randint(100000, 999999))

    session["forgot_otp"] = otp
    session["forgot_email"] = email
    session["otp_verified"] = False

    send_email(
        to=email,
        subject="CyberPath Password Reset OTP",
        body=f"Your OTP for password reset is: {otp}"
    )

    return jsonify({"success": True})


@app.route("/forgot-password/verify", methods=["POST"])
def verify_forgot_otp():
    otp = request.form["otp"]
    new_password = request.form["password"]
    confirm_password = request.form["confirm_password"]

    if "forgot_otp" not in session or "forgot_email" not in session:
        return jsonify({"success": False, "message": "OTP expired"})

    if otp != session["forgot_otp"]:
        return jsonify({"success": False, "message": "Invalid OTP"})

    if new_password != confirm_password:
        return jsonify({"success": False, "message": "Passwords do not match"})

    if not is_valid_password(new_password):
        return jsonify({"success": False, "message": "Passwords must be at least 8 characters long, contain at least one uppercase letter and one number."})
    
    user = User.query.filter_by(email=session["forgot_email"]).first()

    if check_password_hash(user.password, new_password):
        return jsonify({
            "success": False,
            "message": "New password cannot be the same as old password"
        })

    user.password = generate_password_hash(new_password)
    db.session.commit()

    session.pop("forgot_otp")
    session.pop("forgot_email")

    return jsonify({"success": True})


@app.route("/forgot-password/reset", methods=["POST"])
def reset_forgot_password_state():
    session.pop("forgot_otp", None)
    session.pop("forgot_email", None)
    session.pop("otp_verified", None)
    return "", 204


@app.route("/update-about-me", methods=["POST"])
def update_about_me():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False}), 403

    user_email = session["user_email"]
    data = request.get_json()
    text = data.get("about_me", "")

    user = User.query.filter_by(email=user_email).first()
    if user:
        user.about_me = text
        db.session.commit()

    return jsonify({"success": True})

@app.route("/api/admin/me")
def get_my_admin_profile():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False}), 403

    user_email = session.get("user_email")
    user = User.query.filter_by(email=user_email).first_or_404()

    return jsonify({
        "success": True,
        "email": user.email,
        "about_me": user.about_me or ""
    })


@app.route("/api/admins")
def get_admins():
    if not session.get("admin_logged_in"):
        return jsonify([]), 403

    admins = User.query.filter_by(verified=True).all()
    result = []
    for admin in admins:
        result.append({
            "id": admin.id,
            "email": admin.email,
            "about_me": admin.about_me or ""
        })
    return jsonify(result)


@app.route("/api/admin/<int:user_id>")
def get_admin_profile(user_id):
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Not authorized"}), 403

    user = User.query.filter_by(id=user_id, verified=True).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    return jsonify({
        "success": True,
        "email": user.email,
        "about_me": user.about_me or ""
    })


@app.route("/change-email", methods=["POST"])
def change_email():
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))

    current_email = session.get("user_email")
    password = request.form["password"]
    new_email = request.form["new_email"]

    existing = User.query.filter_by(email=new_email).first()
    if existing:
        flash("Email already in use!", "change_email_error")
        return redirect(url_for("index"))

    user = User.query.filter_by(email=current_email).first()

    if user and check_password_hash(user.password, password):
        user.email = new_email
        db.session.commit()
        session["user_email"] = new_email
        flash("Email changed successfully!", "success")
        return redirect(url_for("index"))
    else:
        flash("Incorrect password!", "change_email_error")
        return redirect(url_for("index"))


@app.route("/changepassword", methods=["POST"])
def change_password():
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))

    email = session.get("user_email")
    current_password = request.form["current_password"]
    new_password = request.form["new_password"]
    confirm_password = request.form["confirm_password"]

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password, current_password):
        flash("Current password is incorrect!", "change_password_error")
        return redirect(url_for("index"))

    if not is_valid_password(new_password):
        flash("Password must be at least 8 characters long, contain at least one uppercase letter and one number.", "change_password_error")
        return redirect(url_for("index"))

    if new_password != confirm_password:
        flash("New passwords do not match!", "change_password_error")
        return redirect(url_for("index"))

    if check_password_hash(user.password, new_password):
        flash("New password cannot be the same as the current password!", "change_password_error")
        return redirect(url_for("index"))

    user.password = generate_password_hash(new_password)
    db.session.commit()

    flash("Password changed successfully!", "success")
    return redirect(url_for("index"))


@app.route("/api/feedbacks")
def get_feedbacks():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False}), 403

    feedbacks = Feedback.query.order_by(Feedback.time_submitted.desc()).all()

    return jsonify({
        "success": True,
        "feedbacks": [
            {
                "id": fb.id,
                "subject": fb.subject,
                "description": fb.description,
                "time": fb.time_submitted.strftime("%Y-%m-%d %H:%M")
            }
            for fb in feedbacks
        ]
    })
   

@app.route("/delete-feedback/<int:feedback_id>", methods=["POST"])
def delete_feedback(feedback_id):
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))
    
    feedback = Feedback.query.get_or_404(feedback_id)
    db.session.delete(feedback)
    db.session.commit()

    return redirect(url_for("index"))

#---------------------------------------------------------------------------------------------------------------------------------
# Location Management Functionality
#---------------------------------------------------------------------------------------------------------------------------------

@app.route("/api/markers")
def api_markers():
    markers = Marker.query.order_by(Marker.id).all()
    markers_list = [
        {
            "id": m.id,
            "name": m.name,
            "latitude": m.latitude,
            "longitude": m.longitude,
            "description": m.description,
            "category": m.category.name if m.category else None
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
    category_id = request.form.get("category_id")

    new_marker = Marker(name=name, latitude=latitude, longitude=longitude, description=description, timeadded=timeadded, category_id=category_id)
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
    marker.category_id = request.form.get("category_id")

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
# User functions
#---------------------------------------------------------------------------------------------------------------------------------

@app.route("/feedback", methods=["POST"])
def feedback():
    subject = request.form["subject"]
    description = request.form["description"]

    new_feedback = Feedback(subject=subject, description=description)
    db.session.add(new_feedback)
    db.session.commit()

    flash("Feedback submitted successfully!", "success")
    return redirect(url_for("index"))
#---------------------------------------------------------------------------------------------------------------------------------
# AI chatbot
#---------------------------------------------------------------------------------------------------------------------------------

load_dotenv()  
gemini_api_key = os.getenv("GEMINI_API_KEY")

# Initialize client as None
client = None

if gemini_api_key:
    # Just use the new method - no fallback
    try:
        client = genai.Client(api_key=gemini_api_key)
        print("✅ Gemini API configured successfully.")
    except Exception as e:
        print(f"❌ Failed to create Gemini client: {e}")
        client = None
else:
    print("⚠️ GEMINI_API_KEY not found in environment variables.")


@app.route("/chatbot/ask", methods=["POST"])
def chatbot_ask():
    user_message = request.json.get("message", "").strip()
    if not user_message:
        return jsonify({"success": False, "message": "Please type a question"})

    try:
        campus_info = """
        You are a helpful assistant for Multimedia University (MMU) Cyberjaya campus.
        Your name is CyberPath Assistant.
        
        You help with:
        1. Finding locations on campus
        2. Giving directions
        3. Answering questions about campus facilities
        4. Navigation help
        
        The campus has:
        - Lecture halls
        - Labs
        - Offices
        - Food places
        - Recreations
        - Other facilities
        
        If someone asks about a location, try to give helpful information.
        If they want directions, explain they can use the navigation system.
        Be friendly and helpful.
        Keep answers short and clear.   
        """

        full_prompt = f"{campus_info}\n\nUser asks: {user_message}\n\nYour helpful answer:"

        if client:
            try:
                response = client.models.generate_content(
                    model="gemini-3-flash-preview",
                    contents=full_prompt
                )
                answer = response.text
                print(f"✅ AI Response: {answer[:100]}...")  # Debug
            except Exception as e:
                print(f"Gemini API error: {e}")
                answer = "Sorry, I'm having trouble accessing the chatbot service right now."
        else:   
            answer = "Chatbot is currently unavailable."    

        location_data = check_for_location(user_message)

        return jsonify({
            "success": True,
            "response": answer,
            "coordinates": location_data.get("coordinates"),
            "location_name": location_data.get("location_name"),
            "location_description": location_data.get("location_description")
        })
    
    except Exception as e:
        print(f"Chatbot error: {e}")
        return jsonify({
            "success": True,
            "response": "I'm here to help with campus navigation! Try asking about locations or directions."
        })
    

def check_for_location(user_message):
    markers = Marker.query.all()
        
    for marker in markers:
        if marker.name.lower() in user_message.lower():
            # Found a matching location!
            return {
                    "coordinates": {
                    "latitude": marker.latitude, 
                    "longitude": marker.longitude,
                    },
                    "location_name": marker.name,
                    "location_description": marker.description, 
                    }
    return {}


#---------------------------------------------------------------------------------------------------------------------------------
# Run Program
#---------------------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)
