from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import math
from openai import OpenAI
from fuzzywuzzy import fuzz, process
import random, google.genai as genai, os, re, resend

os.environ["GRPC_VERBOSITY"] = "ERROR"
os.environ["GLOG_minloglevel"] = "2"

app = Flask(__name__)
app.config["SECRET_KEY"] = "sixseven67"
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///cyberpath.db"
db = SQLAlchemy(app)

#---------------------------------------------------------------------------------------------------------------------------------
# Node-based Routing Models
#---------------------------------------------------------------------------------------------------------------------------------

class Node(db.Model):
    """Walking path node/intersection"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    type = db.Column(db.String(50))  # 'intersection', 'entrance', 'stair', 'ramp', 'landmark'
    is_indoor = db.Column(db.Boolean, default=False)
    building_id = db.Column(db.String(50), nullable=True)  # 'fci', 'fcm', etc.
    floor = db.Column(db.Integer, nullable=True)
    
class Edge(db.Model):
    """Connection between nodes with walking info"""
    id = db.Column(db.Integer, primary_key=True)
    node_a_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    node_b_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    distance = db.Column(db.Float)  # in meters
    walking_time = db.Column(db.Float)  # in seconds
    is_bidirectional = db.Column(db.Boolean, default=True)
    path_type = db.Column(db.String(50))  # 'sidewalk', 'pedestrian', 'stair', 'ramp', 'hallway'
    is_indoor = db.Column(db.Boolean, default=False)
    
    # Relationships
    node_a = db.relationship('Node', foreign_keys=[node_a_id])
    node_b = db.relationship('Node', foreign_keys=[node_b_id])

class LocationNode(db.Model):
    """Connect markers (destinations) to nearest nodes"""
    id = db.Column(db.Integer, primary_key=True)
    marker_id = db.Column(db.Integer, db.ForeignKey('marker.id'), nullable=False)
    node_id = db.Column(db.Integer, db.ForeignKey('node.id'), nullable=False)
    
    # Relationships
    marker = db.relationship('Marker')
    node = db.relationship('Node')

    #---------------------------------------------------------------------------------------------------------------------------------
# Node Management API
#---------------------------------------------------------------------------------------------------------------------------------

@app.route("/api/nodes", methods=["GET"])
def get_nodes():
    nodes = Node.query.all()
    return jsonify([{
        "id": n.id,
        "name": n.name,
        "latitude": n.latitude,
        "longitude": n.longitude,
        "type": n.type,
        "is_indoor": n.is_indoor,
        "building_id": n.building_id,
        "floor": n.floor
    } for n in nodes])

@app.route("/api/edges", methods=["GET"])
def get_edges():
    edges = Edge.query.all()
    return jsonify([{
        "id": e.id,
        "node_a_id": e.node_a_id,
        "node_b_id": e.node_b_id,
        "distance": e.distance,
        "walking_time": e.walking_time,
        "path_type": e.path_type,
        "is_bidirectional": e.is_bidirectional
    } for e in edges])

@app.route("/api/location-nodes", methods=["GET"])
def get_location_nodes():
    connections = LocationNode.query.all()
    return jsonify([{
        "id": c.id,
        "marker_id": c.marker_id,
        "node_id": c.node_id,
        "marker_name": c.marker.name,
        "node_name": c.node.name
    } for c in connections])

@app.route("/api/add-node", methods=["POST"])
def add_node():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    data = request.get_json()
    
    # Validate coordinates
    try:
        lat = float(data["latitude"])
        lng = float(data["longitude"])
    except:
        return jsonify({"success": False, "message": "Invalid coordinates"})
    
    new_node = Node(
        name=data.get("name", ""),
        latitude=lat,
        longitude=lng,
        type=data.get("type", "intersection"),
        is_indoor=data.get("is_indoor", False),
        building_id=data.get("building_id"),
        floor=data.get("floor")
    )
    
    db.session.add(new_node)
    db.session.commit()
    
    return jsonify({"success": True, "id": new_node.id, "message": "Node added"})

@app.route("/api/add-edge", methods=["POST"])
def add_edge():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    data = request.get_json()
    
    # Calculate distance
    node_a = Node.query.get(data["node_a_id"])
    node_b = Node.query.get(data["node_b_id"])
    
    if not node_a or not node_b:
        return jsonify({"success": False, "message": "Invalid nodes"})
    
    # Calculate distance in meters
    distance = calculate_distance(
        node_a.latitude, node_a.longitude,
        node_b.latitude, node_b.longitude
    )
    
    # Estimate walking time (assuming 1.4 m/s walking speed)
    walking_time = distance / 1.4
    
    new_edge = Edge(
        node_a_id=data["node_a_id"],
        node_b_id=data["node_b_id"],
        distance=distance,
        walking_time=walking_time,
        is_bidirectional=data.get("is_bidirectional", True),
        path_type=data.get("path_type", "sidewalk"),
        is_indoor=data.get("is_indoor", False)
    )
    
    db.session.add(new_edge)
    db.session.commit()
    
    return jsonify({"success": True, "id": new_edge.id, "message": "Path added"})

@app.route("/api/connect-location", methods=["POST"])
def connect_location():
    if not session.get("admin_logged_in"):
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    data = request.get_json()
    
    # Check if connection already exists
    existing = LocationNode.query.filter_by(
        marker_id=data["marker_id"],
        node_id=data["node_id"]
    ).first()
    
    if existing:
        return jsonify({"success": False, "message": "Already connected"})
    
    new_connection = LocationNode(
        marker_id=data["marker_id"],
        node_id=data["node_id"]
    )
    
    db.session.add(new_connection)
    db.session.commit()
    
    return jsonify({"success": True, "message": "Location connected to node"})

# Helper function for distance calculation
def calculate_distance(lat1, lon1, lat2, lon2):
    """Calculate distance between two points in meters using Haversine formula"""
    R = 6371000  # Earth's radius in meters
    
    φ1 = math.radians(lat1)
    φ2 = math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)
    
    a = math.sin(Δφ/2) * math.sin(Δφ/2) + \
        math.cos(φ1) * math.cos(φ2) * \
        math.sin(Δλ/2) * math.sin(Δλ/2)
    
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

#---------------------------------------------------------------------------------------------------------------------------------
# Pathfinding Algorithm
#---------------------------------------------------------------------------------------------------------------------------------

@app.route("/api/calculate-route", methods=["POST"])
def calculate_route():
    data = request.get_json()
    
    start_lat = data["start_lat"]
    start_lng = data["start_lng"]
    end_lat = data["end_lat"]
    end_lng = data["end_lng"]
    
    # 1. Find nearest nodes to start and end
    all_nodes = Node.query.filter_by(is_indoor=False).all()  # Outdoor only for now
    
    start_node = find_nearest_node(start_lat, start_lng, all_nodes)
    end_node = find_nearest_node(end_lat, end_lng, all_nodes)
    
    if not start_node or not end_node:
        return jsonify({
            "success": False, 
            "message": "No path nodes found near start/end points"
        })
    
    # 2. Find path using Dijkstra's algorithm
    path_nodes = find_shortest_path(start_node.id, end_node.id)
    
    if not path_nodes:
        return jsonify({"success": False, "message": "No path found"})
    
    # 3. Format path for Leaflet
    path_coordinates = []
    total_distance = 0
    total_time = 0
    
    for i in range(len(path_nodes) - 1):
        node_a = path_nodes[i]
        node_b = path_nodes[i + 1]
        
        # Get edge between these nodes
        edge = Edge.query.filter(
            ((Edge.node_a_id == node_a.id) & (Edge.node_b_id == node_b.id)) |
            ((Edge.node_a_id == node_b.id) & (Edge.node_b_id == node_a.id))
        ).first()
        
        if edge:
            total_distance += edge.distance
            total_time += edge.walking_time
        
        # Add coordinates for polyline
        path_coordinates.append([node_a.latitude, node_a.longitude])
    
    # Add final node
    if path_nodes:
        last_node = path_nodes[-1]
        path_coordinates.append([last_node.latitude, last_node.longitude])
    
    return jsonify({
        "success": True,
        "path": path_coordinates,
        "distance": round(total_distance, 1),
        "time": round(total_time, 1),
        "steps": len(path_nodes) - 1,
        "start_node": {"id": start_node.id, "name": start_node.name},
        "end_node": {"id": end_node.id, "name": end_node.name}
    })

def find_nearest_node(lat, lng, nodes):
    """Find the nearest node to given coordinates"""
    nearest = None
    min_distance = float('inf')
    
    for node in nodes:
        distance = calculate_distance(lat, lng, node.latitude, node.longitude)
        if distance < min_distance and distance < 100:  # Within 100 meters
            min_distance = distance
            nearest = node
    
    return nearest

def find_shortest_path(start_node_id, end_node_id):
    """Dijkstra's algorithm for shortest path"""
    # Get all edges
    edges = Edge.query.filter_by(is_bidirectional=True).all()
    
    # Build graph
    graph = {}
    for edge in edges:
        if edge.node_a_id not in graph:
            graph[edge.node_a_id] = []
        if edge.node_b_id not in graph:
            graph[edge.node_b_id] = []
        
        graph[edge.node_a_id].append((edge.node_b_id, edge.distance))
        if edge.is_bidirectional:
            graph[edge.node_b_id].append((edge.node_a_id, edge.distance))
    
    # Dijkstra's algorithm
    distances = {node_id: float('inf') for node_id in graph}
    previous = {node_id: None for node_id in graph}
    distances[start_node_id] = 0
    
    unvisited = set(graph.keys())
    
    while unvisited:
        # Get unvisited node with smallest distance
        current = min(unvisited, key=lambda node_id: distances[node_id])
        
        if distances[current] == float('inf'):
            break
        
        unvisited.remove(current)
        
        # If we reached the destination
        if current == end_node_id:
            break
        
        # Update distances to neighbors
        for neighbor, weight in graph.get(current, []):
            if neighbor in unvisited:
                new_distance = distances[current] + weight
                if new_distance < distances[neighbor]:
                    distances[neighbor] = new_distance
                    previous[neighbor] = current
    
    # Reconstruct path
    if previous[end_node_id] is None:
        return None
    
    path = []
    current = end_node_id
    while current is not None:
        node = Node.query.get(current)
        if node:
            path.insert(0, node)
        current = previous[current]
    
    return path

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

resend.api_key = "pretend-this-is-a-real-resend-api-key"

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
# Feedback functions
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
   

# @app.route("/delete-feedback/<int:feedback_id>", methods=["POST"])
# def delete_feedback(feedback_id):
#     if not session.get("admin_logged_in"):
#         return redirect(url_for("index"))
    
#     feedback = Feedback.query.get_or_404(feedback_id)
#     db.session.delete(feedback)
#     db.session.commit()

#     return redirect(url_for("index"))

#---------------------------------------------------------------------------------------------------------------------------------
# AI chatbot
#---------------------------------------------------------------------------------------------------------------------------------

gemini_api_key = "pretend-this-is-a-real-gemini-api-key"
openrouter_api_key = "pretend-this-is-a-real-openrouter-api-key"

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
                model="google/gemma-3-27b-it:free",  # Free model
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
        
        markers = Marker.query.all()
        
        locationNames = [marker.name for marker in markers]

        campus_info = f"""
            You are CyberPath, a friendly, smart and slightly fun campus assistant for Multimedia University (MMU) Cyberjaya.

            You can chat naturally with users for greetings, thanks, or general conversation.
            You are polite, helpful, and a little cheerful — but still professional.

            You are connected to a live campus location database.

            ALL AVAILABLE LOCATIONS:
            {', '.join(locationNames)}

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
        
        location_data = check_for_location(user_message)

        return jsonify({
            "success": True,
            "response": answer,
            "coordinates": location_data.get("coordinates") or None,
            "location_name": location_data.get("location_name") or None,
            "location_description": location_data.get("location_description") or None
        })
    
    except Exception as e:
        print(f"Chatbot error: {e}")
        return jsonify({
            "success": True,
            "response": "I'm here to help with campus navigation! Try asking about locations or directions."
        })
    

def check_for_location(user_message):
    markers = Marker.query.all()
    locationNames = [marker.name for marker in markers]
    result = process.extractOne(user_message, locationNames, scorer=fuzz.token_sort_ratio)
    userLower = user_message.lower()

    location_keywords = [
        "where", "location", "place", "find", "directions",
        "navigate", "route", "path", "how to get", "way to",
        "show me", "take me", "guide me", "locate", "find"
    ]

    locationQuestion = False
    for keyword in location_keywords:
        if keyword in userLower:
            locationQuestion = True
            break

    shortform = {
        "dtc": "Dewan Tun Canselor",
        "mmu": "Multimedia University",
        "lib": "Library",
        "lab": "Computer Lab",
        "caf": "Cafeteria",
        "hall": "Lecture Hall",
        "food": "Cafeteria",
        "restaurant": "Cafeteria",
    }

    for short, long in shortform.items():
        if f" {short} " in f" {userLower} " or userLower == short:
            for marker in markers:
                if long.lower() in marker.name.lower():
                     return {
                        "coordinates": {
                            "latitude": marker.latitude, 
                            "longitude": marker.longitude,
                        },
                        "location_name": marker.name,
                        "location_description": marker.description, 
                    }
    
    if locationQuestion:
        if result:  
            best_match, score = result
            print(f"🔍 Fuzzy match: '{user_message}' → '{best_match}' (score: {score})")
            
            if score > 40:  # 60% similarity threshold
                for marker in markers:
                    if marker.name == best_match:   
            
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
