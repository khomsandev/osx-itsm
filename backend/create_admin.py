
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User


def main():
    print("=== Create IT Service Desk Admin ===")

    username = input("Username [admin]: ").strip() or "admin"
    full_name = (
        input("Full name [System Administrator]: ").strip()
        or "System Administrator"
    )
    password = getpass("Password: ")
    confirm_password = getpass("Confirm password: ")

    if not username:
        print("ERROR: Username cannot be empty.")
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
            role="ADMIN",
            is_active=True,
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        print("\nSUCCESS: User created.")
        print(f"User ID: {user.id}")
        print(f"Username: {user.username}")
        print(f"Role: {user.role}")
        print(f"Active: {user.is_active}")

    except SQLAlchemyError as exc:
        db.rollback()
        print(f"Database ERROR: {exc}")

    finally:
        db.close()


if __name__ == "__main__":
    main()
