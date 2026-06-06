import { useState } from "react";
import { User, Lock, Eye, EyeOff, ScanEye } from "lucide-react";
import "./Login.css";

const API_BASE = ""

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username || !password) {
      setErrorMsg("Username dan password harus diisi");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/api/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: username, // API expects 'email' key, we pass username/email value here
            password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.access_token);
        if (onLogin) onLogin();
      } else {
        setErrorMsg(data.detail || "Username atau password salah");
      }
    } catch (err) {
      setErrorMsg("Gagal terhubung ke server backend");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-container">
            <ScanEye size={28} className="login-logo-icon" />
          </div>
          <h1 className="login-title">EpsonQC</h1>
          <p className="login-subtitle">Vision Quality Control System</p>
        </div>

        {errorMsg && (
          <div className="login-error-alert">
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          {/* Input Username */}
          <div className="login-input-group">
            <label className="login-label">Username</label>
            <div className="login-input-wrapper">
              <User className="login-input-icon" size={18} />
              <input
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Input Password */}
          <div className="login-input-group">
            <label className="login-label">Password</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="login-submit-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="login-loading-spinner" />
            ) : (
              "Sign In to Dashboard"
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>PT Epson Indonesia Quality Control</p>
        </div>
      </div>
    </div>
  );
}

export default Login;