from app.db.session import init_db


def main() -> None:
    init_db()
    print("Expense Tracker schema initialized.")


if __name__ == "__main__":
    main()
