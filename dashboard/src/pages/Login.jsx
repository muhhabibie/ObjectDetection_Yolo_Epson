import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    const response = await fetch(
      "http://localhost:8000/api/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      }
    );

    const data = await response.json();

      if (response.ok) {
      localStorage.setItem(
        "token",
        data.access_token
      );

        if (onLogin) onLogin();
    } else {
      alert(data.detail);
    }
  };

  return (
    <div className="login-container">
        <form className="login-form" onSubmit={handleLogin}>
        <h2>Login</h2>

        <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
        />

        <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit">Login</button>
        </form>
    </div>
    );
}

export default Login;