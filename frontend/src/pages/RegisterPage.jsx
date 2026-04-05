import { useState } from "react";
import { Link } from "react-router-dom";

import API from "../api/axios";

const initialFormData = {
  username: "",
  email: "",
  password: "",
  role: "STUDENT",
};

function RegisterPage() {
  const [formData, setFormData] = useState(initialFormData);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((currentData) => ({ ...currentData, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      const response = await API.post("register/", formData);
      setSuccessMessage(response.data.message || "Waiting for approval");
      setFormData(initialFormData);
    } catch (registerError) {
      const apiErrors = registerError.response?.data;

      if (apiErrors && typeof apiErrors === "object") {
        const firstError = Object.values(apiErrors).flat()[0];
        setError(firstError || "Unable to register.");
      } else {
        setError("Unable to register. Please verify your details.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card shadow border-0">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <div className="sidebar-brand text-dark">TMS</div>
            <p className="text-secondary mb-0">Create an account and wait for approval</p>
          </div>

          {error ? (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="alert alert-success" role="alert">
              {successMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                className="form-control"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="form-control"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                className="form-control"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
                required
              />
            </div>

            <div className="mb-4">
              <label className="form-label" htmlFor="role">
                Role
              </label>
              <select
                id="role"
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                <option value="MANAGER">Manager</option>
                <option value="TRAINER">Trainer</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 d-flex justify-content-center align-items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" aria-hidden="true"></span>
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <span className="text-secondary">Already have an account? </span>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
