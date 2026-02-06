from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from openai import OpenAI
from fuzzywuzzy import fuzz, process
import random, google.genai as genai, os, re, resend
from dotenv import load_dotenv
from urllib.parse import urlparse
load_dotenv()

os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GLOG_minloglevel"] = "2"

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key")

database_url = os.environ.get('DATABASE_URL', 'sqlite:///cyberpath.db')
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+psycopg2://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = database_url
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,  # Recycle connections after 5 minutes
    "pool_pre_ping": True,  # Verify connections before using
    "pool_size": 3,  # Small pool for free tier
    "max_overflow": 2,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

#---------------------------------------------------------------------------------------------------------------------------------
# Database Models
#---------------------------------------------------------------------------------------------------------------------------------

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(300), nullable=False)
    about_me = db.Column(db.String(500))
    verified = db.Column(db.Boolean, default=False)

class Marker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=True)
    
class Category(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    indoor_only = db.Column(db.Boolean, default=False)
    markers = db.relationship("Marker", backref="category", lazy=True)
    indoor_markers = db.relationship("IndoorMarker", backref="category", lazy=True)

class IndoorMarker(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    building = db.Column(db.String(100), nullable=False)
    floor = db.Column(db.String(50), nullable=False)
    name = db.Column(db.String(150), nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text)
    category_id = db.Column(db.Integer, db.ForeignKey("category.id"), nullable=False)
#------------
# Super Admin
#------------

def create_initial_admin():
    """Create initial admin account if none exists"""
    with app.app_context():
        admin_email = "hozhenxiang@gmail.com"
        
        if not User.query.filter_by(verified=True).first():
            # Create admin
            hashed_password = generate_password_hash("xiang1234")
            admin = User(
                email=admin_email,
                password=hashed_password,
                about_me="Initial Administrator",
                verified=True
            )
            db.session.add(admin)
            db.session.commit()
            print(f"✅ Created initial admin: {admin_email}")
            print(f"   Password: xiang1234")
            print("   ⚠️ Change password after first login!")


with app.app_context():
    #db.drop_all()
    db.create_all()

    if not Category.query.first():
        db.session.add_all([
            Category(name="Classroom", indoor_only=True),
            Category(name="Office", indoor_only=True),
            Category(name="Stairs", indoor_only=True),
            Category(name="Lift", indoor_only=True),
            Category(name="Restroom", indoor_only=True),
            Category(name="Other", indoor_only=True),

            Category(name="Lecture Hall", indoor_only=False),
            Category(name="Food & Drinks", indoor_only=False),
            Category(name="Facilities", indoor_only=False),
            Category(name="Recreation", indoor_only=False),
            Category(name="Others", indoor_only=False)
        ])
        db.session.commit()

    create_initial_admin()
   

@app.route("/")
def index():
    user = None
    if "user_email" in session:
        user_email = session["user_email"]
        user = User.query.filter_by(email=user_email).first()

    outdoor_categories = Category.query.filter_by(indoor_only=False).all()
    indoor_categories = Category.query.filter_by(indoor_only=True).all()
    return render_template("index.html", outdoor_categories=outdoor_categories, indoor_categories=indoor_categories, user=user)


#---------------------------------------------------------------------------------------------------------------------------------
# Admin Functionality
#---------------------------------------------------------------------------------------------------------------------------------

referral_code = 961523

resend.api_key = os.environ.get("RESEND_API_KEY")

def send_email(to, subject, body):
    try:
        resend.Emails.send({
            "from": "CyberPath <no-reply@cyberpath.app>",
            "to": to,
            "subject": subject,
            "text": body
        })
    except Exception as e:
        print("Resend email failed:", e)


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

    message = "Account created and automatically verified!" if verified_status else "Account created! Waiting for admin verification."
    
    return jsonify({"success": True, "message": message})


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
            "category": m.category.name if m.category else None,
            "category_id": m.category_id,
            "is_indoor": False
        }
        for m in markers
    ]

    return jsonify(markers_list)


@app.route("/api/indoor-markers")
def api_indoor_markers():
    IndoorMarkers = IndoorMarker.query.order_by(IndoorMarker.id).all()
    IndoorMarkers_list = [
        {
            "id": im.id,
            "building": im.building,
            "floor": im.floor,
            "name": im.name,
            "latitude": im.latitude,
            "longitude": im.longitude,
            "description": im.description,
            "category": im.category.name if im.category else None,
            "category_id": im.category_id,
            "is_indoor": True
        }
        for im in IndoorMarkers
    ]
    return jsonify(IndoorMarkers_list)


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
    category_id = request.form.get("category_id")

    building_id = request.form.get("building_id")
    floor = request.form.get("floor")
    is_indoor = request.form.get("is_indoor") == "1"

    if is_indoor:
        if not building_id or not floor:
            flash("Indoor locations must have a building and floor", "error")
            return redirect(url_for("index"))
        
        new_indoor_marker = IndoorMarker(building=building_id, floor=floor, name=name, latitude=latitude, longitude=longitude, description=description, category_id=category_id)
        db.session.add(new_indoor_marker)
        db.session.commit()

        flash("Indoor marker added successfully!", "success")
        return redirect(url_for("index"))

    new_marker = Marker(name=name, latitude=latitude, longitude=longitude, description=description, category_id=category_id)
    db.session.add(new_marker)
    db.session.commit()

    flash("Marker added successfully!", "success")
    return redirect(url_for("index"))


@app.route("/edit-marker/<int:marker_id>", methods=["POST"])
def edit_marker(marker_id):
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))

    marker_id = request.form["marker_id"]
    is_indoor = request.form.get("is_indoor") == "1"

    if is_indoor:
        marker = IndoorMarker.query.get_or_404(marker_id)
        marker.building = request.form["building_id"]
        marker.floor = request.form["floor"]
    else:
        marker = Marker.query.get_or_404(marker_id)

    marker.name = request.form["name"]
    marker.description = request.form["description"]
    marker.category_id = request.form.get("category_id")

    try:
        marker.latitude, marker.longitude = map(
            float, request.form["coords"].split(",")
        )
    except ValueError:
        flash("Invalid coordinates", "error")
        return redirect(url_for("index"))

    db.session.commit()

    flash("Marker updated successfully!", "success")
    return redirect(url_for("index"))


@app.route("/delete-marker/<int:marker_id>", methods=["POST"])
def delete_marker(marker_id):
    if not session.get("admin_logged_in"):
        return redirect(url_for("index"))

    marker = Marker.query.get(marker_id)
    if marker:
        db.session.delete(marker)
        db.session.commit()
        return redirect(url_for("index"))

    indoor_marker = IndoorMarker.query.get_or_404(marker_id)
    db.session.delete(indoor_marker)
    db.session.commit()

    return redirect(url_for("index"))



   

# @app.route("/delete-feedback/<int:feedback_id>", methods=["POST"])
# def delete_feedback(feedback_id):
#     if not session.get("admin_logged_in"):
#         return redirect(url_for("index"))
    
#     feedback = Feedback.query.get_or_404(feedback_id)
#     db.session.delete(feedback)
#     db.session.commit()

#     return redirect(url_for("index"))

# ===========================================
# AI CHATBOT SECTION
# ===========================================

gemini_api_key = os.environ.get("GEMINI_API_KEY") 
openrouter_api_key = os.environ.get("OPENROUTER_API_KEY")

# Initialize client as None
gemini_client = None
openrouter_client = None

if gemini_api_key:
    # Just use the new method - no fallback
    try:
        gemini_client = genai.Client(api_key=gemini_api_key)
        print("✅ Gemini API configured successfully.")
    except Exception as e:
        print(f"❌ Failed to create Gemini client: {e}")
        gemini_client = None
else:
    print("⚠️ GEMINI_API_KEY not found in environment variables.")

if openrouter_api_key:
    try:
        openrouter_client = OpenAI(
            api_key=openrouter_api_key,
            base_url="https://openrouter.ai/api/v1"
        )
        print("✅ OpenRouter API client created")
    except Exception as e:
        print(f"❌ OpenRouter client failed: {e}")
        openrouter_client = None
else:
    print("⚠️ OPENROUTER_API_KEY not found")

def get_ai_response(user_message, campus_info):
    """Try multiple AI providers in order"""
    full_prompt = f"{campus_info}\n\nUser asks: {user_message}\n\nYour helpful answer:"
    

    # 1. FIRST try Gemini (your current working model)
    if gemini_client:
        try:
            print("🔄 Trying Gemini...")
            response = gemini_client.models.generate_content(
                model="gemini-3-flash-preview",
                contents=full_prompt
            )
            answer = response.text
            print("✅ Gemini succeeded")
            return answer
        except Exception as e:
            print(f"❌ Gemini failed: {e}")
    
    # 2. SECOND try OpenRouter (free fallback)
    if openrouter_client:
        try:
            print("🔄 Trying OpenRouter...")
            response = openrouter_client.chat.completions.create(
                model="arcee-ai/trinity-large-preview:free",  # Free model
                messages=[
                    {"role": "system", "content": campus_info},
                    {"role": "user", "content": user_message}
                ],
                
            )
            answer = response.choices[0].message.content
            print("✅ OpenRouter succeeded")
            return answer
        except Exception as e:
            print(f"❌ OpenRouter failed: {e}")

    print("❌ All AI providers failed")
    return "I'm here to help with campus navigation! Try asking about specific locations like the library, labs, or cafeteria."
    

@app.route("/chatbot/ask", methods=["POST"])
def chatbot_ask():
    user_message = request.json.get("message", "").strip()
    if not user_message:
        return jsonify({"success": False, "message": "Please type a question"})

    try:
        print(f"\n=== CHATBOT REQUEST ===")
        print(f"User message: '{user_message}'")
        
        # FIRST: Try to find location in database
        location_data = check_for_location(user_message)
        
        # SECOND: Generate AI response - ALWAYS generate AI response!
        markers = Marker.query.all()
        indoor_markers = IndoorMarker.query.all()
        
        # Get all location names for the AI context
        location_names = [m.name for m in markers if m.name] + [im.name for im in indoor_markers if im.name]

        campus_info = f"""
            You are CyberPath, a friendly, smart and slightly fun campus assistant for Multimedia University (MMU) Cyberjaya.

            You can chat naturally with users for greetings, thanks, or general conversation.
            You are polite, helpful, and a little cheerful — but still professional.

            You are connected to a live campus location database.

            ALL AVAILABLE LOCATIONS:
            {', '.join(location_names[:20]) if location_names else 'Various campus locations'}

            VERY IMPORTANT RULES:
            • If a location is NOT in the list, say: "I don't have that location in my database."
            • NEVER invent location names.
            • NEVER recommend Google Maps or external apps.
            • Always suggest using the CyberPath navigation system.
            • Keep all answers short (1–2 sentences).

            HOW TO RESPOND:

            1. If the user greets you (hi, hello, thanks, who are you, etc):
            → Reply in a friendly, fun, helpful way.

            2. If the user asks about a general campus topic:
            → Give a short helpful answer.

            3. If the user asks about a location:
            → Only use locations from the database list.

            
            You help users find lecture halls, labs, offices, food places, and campus facilities.

            Be warm, clear, and friendly — but accurate.
            """

        answer = get_ai_response(user_message, campus_info)
        print(f"✅ AI Response: {answer[:100]}...")  # Debug

        # Prepare response - ALWAYS include success: true
        response_data = {
            "success": True,
            "response": answer
        }
        
        # Add location data if found (but we still respond even without location!)
        if location_data and location_data.get("coordinates") and location_data.get("location_name"):
            print(f"📍 Location data found: {location_data.get('location_name')}")
            response_data.update({
                "coordinates": location_data.get("coordinates"),
                "location_name": location_data.get("location_name"),
                "location_description": location_data.get("location_description", ""),
                "building": location_data.get("building"),
                "is_indoor": location_data.get("is_indoor", False),
                "floor": location_data.get("floor")
            })
        else:
            print("📍 No location data found (but still responding to user)")
        
        print("=== END REQUEST ===\n")
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Chatbot error: {e}")
        import traceback
        traceback.print_exc()
        
        # Always return a valid response even on error
        return jsonify({
            "success": True,
            "response": "I'm here to help with campus navigation! How can I assist you today?"
        })

def check_for_location(user_message):
    """Find location in database and return coordinates"""
    userLower = str(user_message).lower()
    
    print(f"🔍 Checking location for: '{user_message}'")
    
    # Get ALL markers from database
    markers = Marker.query.all()
    indoor_markers = IndoorMarker.query.all()
    
    # Combine all location names for fuzzy matching
    all_location_names = []
    all_locations = []  # Store the actual objects
    
    # Add outdoor markers
    for marker in markers:
        if marker.name:
            all_location_names.append(str(marker.name))
            all_locations.append({
                "type": "outdoor",
                "object": marker,
                "name": marker.name,
                "lat": marker.latitude,
                "lng": marker.longitude,
                "description": marker.description,
                "category": marker.category.name if marker.category else None
            })
    
    # Add indoor markers
    for marker in indoor_markers:
        if marker.name:
            all_location_names.append(str(marker.name))
            all_locations.append({
                "type": "indoor",
                "object": marker,
                "name": marker.name,
                "lat": marker.latitude,
                "lng": marker.longitude,
                "description": marker.description,
                "building": marker.building,
                "floor": marker.floor
            })
    
    # Add building names
    building_names = [
        "FCI Building", "FOM Building", "FAIE Building", "FCM Building",
        "Dewan Tun Canselor", "DTC", "Library", "Cafeteria", 
        "Haji Tapah", "Starbees"
    ]
    
    for building in building_names:
        all_location_names.append(building)
        all_locations.append({
            "type": "building",
            "name": building,
            "lat": None,  # Will get from get_building_coordinates
            "lng": None
        })
    
    print(f"   Searching through {len(all_location_names)} locations")
    
    # Check for short forms first
    shortform = {
        "dtc": "Dewan Tun Canselor",
        "lib": "Library",
        "caf": "Cafeteria",
        "ht": "Haji Tapah",
        "food": "Starbees",
        "fci": "FCI Building",
        "fom": "FOM Building",
        "faie": "FAIE Building",
        "fcm": "FCM Building",
    }
    
    for short, long in shortform.items():
        if f" {short} " in f" {userLower} " or userLower == short:
            print(f"   Shortform matched: '{short}' -> '{long}'")
            # Check if it's a building
            for location in all_locations:
                if location["name"].lower() == long.lower():
                    if location["type"] == "building":
                        return get_building_coordinates(long)
                    else:
                        building_name = extract_building_from_name(location["name"])
                        is_indoor = location["type"] == "indoor" or (
                            location.get("category") in ["Classroom", "Office","Restroom","Lift","Stairs"]
                        )
                        return {
                            "coordinates": {"latitude": location["lat"], "longitude": location["lng"]},
                            "location_name": location["name"],
                            "location_description": location.get("description", ""),
                            "building": building_name,
                            "is_indoor": is_indoor,
                            "floor": location.get("floor")
                        }
    
    # Check if this is a location question
    location_keywords = ["where", "location", "place", "find", "directions", "navigate", 
                        "route", "path", "how to get", "way to", "show me", "take me", 
                        "guide me", "locate"]
    
    is_location_question = any(keyword in userLower for keyword in location_keywords)
    
    # Always try to find a location match, but prioritize if it's a location question
    if all_location_names:  # Always try to match if we have locations
        result = process.extractOne(user_message, all_location_names, scorer=fuzz.token_sort_ratio)
        
        if result:
            best_match, score = result
            print(f"   Fuzzy match: '{user_message}' → '{best_match}' (score: {score})")
            
            # Lower threshold for location questions, higher for general chat
            threshold = 40 if is_location_question else 60
            
            if score > threshold:
                # Find the matching location object
                for location in all_locations:
                    if location["name"].lower() == best_match.lower():
                        print(f"   Found matching location: {location['name']} (type: {location['type']})")
                        
                        # Handle buildings specially
                        if location["type"] == "building":
                            return get_building_coordinates(best_match)
                        
                        # Get coordinates
                        if location["lat"] is None or location["lng"] is None:
                            # This shouldn't happen for non-building locations
                            continue
                        
                        building_name = extract_building_from_name(location["name"])
                        is_indoor = location["type"] == "indoor" or (
                            location.get("category") in ["Classroom", "Office","Restroom","Lift","Stairs"]
                        )
                        
                        return {
                            "coordinates": {"latitude": location["lat"], "longitude": location["lng"]},
                            "location_name": location["name"],
                            "location_description": location.get("description", f"{location['name']} at MMU"),
                            "building": building_name,
                            "is_indoor": is_indoor,
                            "floor": location.get("floor")
                        }
    
    print(f"   No location match found for: '{user_message}'")
    return {}

def extract_building_from_name(location_name):
    """Extract building name from location name"""
    if not location_name:
        return None
        
    location_name_lower = location_name.lower()
    
    if "fci" in location_name_lower or "cqar" in location_name_lower or "cqcr" in location_name_lower:
        return "FCI Building"
    elif "fom" in location_name_lower:
        return "FOM Building"
    elif "faie" in location_name_lower or "clar" in location_name_lower or "clbr" in location_name_lower or "clcr" in location_name_lower or "faie stairs" in location_name_lower or "faie lift" in location_name_lower or "faie restroom" in location_name_lower or "faie classroom" in location_name_lower:
        return "FAIE Building"
    elif "fcm" in location_name_lower:
        return "FCM Building"
    elif "room" in location_name_lower or "fci stairs" in location_name_lower or "fci lift" in location_name_lower or "fci restroom" in location_name_lower or "fci classroom" in location_name_lower:
        return "FCI Building"
    return None

def get_building_coordinates(building_name):
    """Return coordinates for hardcoded buildings"""
    building_coords = {
        "FCI Building": {"latitude": 2.928633, "longitude": 101.64111},
        "FOM Building": {"latitude": 2.929348, "longitude": 101.641260},
        "FAIE Building": {"latitude": 2.926401, "longitude": 101.641255},
        "FCM Building": {"latitude": 2.926155, "longitude": 101.642649}
    }
    
    coords = building_coords.get(building_name)
    if coords:
        return {
            "coordinates": coords,
            "location_name": building_name,
            "location_description": "Building on MMU campus"
        }
    return {}

#---------------------------------------------------------------------------------------------------------------------------------
# Run Program
#---------------------------------------------------------------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000)
