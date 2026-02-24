from flask import Flask, render_template, request, redirect, url_for, flash, session
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
import re

from db import init_db, get_conn

app = Flask(__name__)
init_db()
app.secret_key = "dev-change-me"  # change in production

# Token signer
serializer = URLSafeTimedSerializer(app.secret_key)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def make_login_token(email: str) -> str:
    return serializer.dumps({"email": email}, salt="login")


def read_login_token(token: str, max_age_seconds: int = 15 * 60) -> str:
    data = serializer.loads(token, salt="login", max_age=max_age_seconds)
    return data["email"]


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/continue-email", methods=["POST"])
def continue_email():
    print("HIT /continue-email", flush=True)
    email = (request.form.get("email") or "").strip().lower()

    if not EMAIL_RE.match(email):
        flash("Please enter a valid email address.", "error")
        return redirect(url_for("index"))

    token = make_login_token(email)
    magic_link = url_for("verify_email", token=token, _external=True)

    # In production: send email via SMTP/SendGrid/Mailgun, etc.
    print("\n=== MAGIC LINK ===")
    print(magic_link)
    print("==================\n")

    flash("Check your email for a sign-in link. (Dev: link printed in terminal.)", "success")
    return redirect(url_for("index"))


@app.route("/verify/<token>", methods=["GET"])
def verify_email(token):
    try:
        email = read_login_token(token)
    except SignatureExpired:
        flash("That sign-in link has expired. Please request a new one.", "error")
        return redirect(url_for("index"))
    except BadSignature:
        flash("Invalid sign-in link.", "error")
        return redirect(url_for("index"))

    # "Log the user in"
    session["user_email"] = email
    flash(f"Signed in as {email}", "success")

    # return redirect(url_for("dashboard"))
    return redirect(url_for("meetings"))



@app.route("/dashboard")
def dashboard():
    email = session.get("user_email")
    if not email:
        flash("Please sign in first.", "error")
        return redirect(url_for("index"))
    return render_template("dashboard.html", email=email)

@app.route("/meetings")
def meetings():
    # Require login (same pattern as dashboard)
    email = session.get("user_email")
    if not email:
        flash("Please sign in first.", "error")
        return redirect(url_for("index"))

    q = (request.args.get("q") or "").strip()
    status = (request.args.get("status") or "").strip().lower()  # scheduled/cancelled/completed or ""
    mine = (request.args.get("mine") or "").strip() == "1"       # "1" to filter by organizer

    sql = """
        SELECT id, title, organizer_email, start_time, end_time, location, status
        FROM meetings
        WHERE 1=1
    """
    params = []

    if q:
        sql += " AND (title LIKE ? OR location LIKE ? OR organizer_email LIKE ?)"
        like = f"%{q}%"
        params.extend([like, like, like])

    if status in {"scheduled", "cancelled", "completed"}:
        sql += " AND status = ?"
        params.append(status)

    if mine:
        sql += " AND organizer_email = ?"
        params.append(email)

    sql += " ORDER BY start_time ASC"

    conn = get_conn()
    rows = conn.execute(sql, params).fetchall()
    conn.close()

    return render_template("meetings.html", meetings=rows, q=q, status=status, mine=mine, email=email)


@app.route("/meetings/<int:meeting_id>")
def meeting_detail(meeting_id: int):
    email = session.get("user_email")
    if not email:
        flash("Please sign in first.", "error")
        return redirect(url_for("index"))

    conn = get_conn()
    row = conn.execute(
        "SELECT * FROM meetings WHERE id = ?",
        (meeting_id,)
    ).fetchone()
    conn.close()

    if row is None:
        flash("Meeting not found.", "error")
        return redirect(url_for("meetings"))

    return render_template("meeting_detail.html", meeting=row)



@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user_email", None)
    flash("Signed out.", "success")
    return redirect(url_for("index"))


# Stubs for OAuth buttons (wire up later)
@app.route("/auth/google")
def auth_google():
    flash("Google OAuth not wired up yet.", "error")
    return redirect(url_for("index"))

@app.route("/auth/microsoft")
def auth_microsoft():
    flash("Microsoft OAuth not wired up yet.", "error")
    return redirect(url_for("index"))


if __name__ == "__main__":
    app.run(debug=True)
