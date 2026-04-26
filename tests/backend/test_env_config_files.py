from pathlib import Path


def _read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        values[key] = value
    return values


def test_env_example_contains_bootstrap_credentials() -> None:
    env_example = Path(".env.example")
    env_file = Path(".env")

    assert env_example.exists()
    assert env_file.exists()

    example_values = _read_env_file(env_example)
    local_values = _read_env_file(env_file)

    assert example_values["EXPENSE_TRACKER_BOOTSTRAP_USERNAME"] == local_values[
        "EXPENSE_TRACKER_BOOTSTRAP_USERNAME"
    ]
    assert example_values["EXPENSE_TRACKER_BOOTSTRAP_PASSWORD"] == local_values[
        "EXPENSE_TRACKER_BOOTSTRAP_PASSWORD"
    ]


def test_gitignore_ignores_local_env_file() -> None:
    content = Path(".gitignore").read_text()

    assert "\n.env\n" in f"\n{content}\n"
