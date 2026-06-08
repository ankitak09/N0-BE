import { FormEvent, useState } from "react";
import { supabase, supabaseConfigured } from "../supabaseClient";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!supabaseConfigured) {
      setMessage("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env to enable auth.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : "Signed in (demo)");
  }

  return (
    <section className="login">
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="login-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <button type="submit">Sign in</button>
      </form>
      {message ? <p className="login-message">{message}</p> : null}
    </section>
  );
}
