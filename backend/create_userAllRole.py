
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


ROLES = {
    "1": ("USER", "User"),
    "2": ("IT_SUPPORT", "IT Support"),
    "3": ("IT_MANAGER", "IT Manager"),
    "4": ("ADMIN", "Admin"),
}


def main():
    print("=== Create IT Service Desk User ===")

    username = input("Username: ").strip()
    full_name = input("Full name: ").strip()
    email = input("Email (optional): ").strip() or None

    print("\nSelect Role:")
    for number, (role, description) in ROLES.items():
        print(f"{number}. {description} ({role})")

    role_choice = input("Role [1]: ").strip() or "1"

    if role_choice not in ROLES:
        print("ERROR: Invalid Role selection.")
        return

    role = ROLES[role_choice][0]

    password = getpass("Password: ")
    confirm_password = getpass("Confirm password: ")

    if not username:
        print("ERROR: Username cannot be empty.")
        return

    if not full_name:
        print("ERROR: Full name cannot be empty.")
        return

    if not password:
        print("ERROR: Password cannot be empty.")
        return

    if password != confirm_password:
        print("ERROR: Passwords do not match.")
        return

    db = SessionLocal()

    try:
        existing_user = db.scalar(
            select(User).where(User.username == username)
        )

        if existing_user:
            print(f"ERROR: Username '{username}' already exists.")
            return

        user = User(
            username=username,
            password_hash=hash_password(password),
            full_name=full_name,
            email=email,
            role=role,
            is_active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print("\nSUCCESS: User created.")
        print(f"User ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Full name: {user.full_name}")
        print(f"Email: {user.email or '-'}")
        print(f"Role: {user.role}")
        print(f"Active: {user.is_active}")

    except SQLAlchemyError as exc:
        db.rollback()
        print(f"Database ERROR: {exc}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
