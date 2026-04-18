import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, storeToken } from "../../lib/api";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        username,
        password,
      });

      storeToken(response.data.access_token);
      navigate("/reports", { replace: true });
    } catch {
      setErrorMessage("Unable to sign in with those credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="auth-card__eyebrow">Expense tracker</p>
        <h1>Sign in</h1>
        <p className="auth-card__copy">
          Start with your monthly reports, then move through upload and review.
        </p>
        <form className="auth-card__form" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              required
              value={username}
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {errorMessage ? <p role="alert">{errorMessage}</p> : null}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
