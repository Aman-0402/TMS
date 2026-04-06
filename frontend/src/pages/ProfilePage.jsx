import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import http from "../api/http";
import PageHeader from "../components/common/PageHeader";

const ROLE_BADGE = { ADMIN: "danger", MANAGER: "primary", TRAINER: "info", STUDENT: "secondary" };

function formatDateTime(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function ProfilePage() {
  const [profile, setProfile]       = useState(null);
  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);

  // Info form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");

  // Password form
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [isSavingPw, setIsSavingPw] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await http.get("profile/me/");
      const data = res.data;
      setProfile(data);
      setFirstName(data.first_name || "");
      setLastName(data.last_name   || "");
      setEmail(data.email           || "");
    } catch {
      toast.error("Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Save profile info ──────────────────────────────────────────────────
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await http.patch("profile/me/", {
        first_name: firstName.trim(),
        last_name:  lastName.trim(),
        email:      email.trim(),
      });
      setProfile((prev) => ({ ...prev, ...res.data }));
      toast.success("Profile updated successfully.");
    } catch (err) {
      const d = err.response?.data;
      toast.error(d?.email?.[0] || d?.detail || d?.error || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPw || !currentPw) { toast.error("All password fields are required."); return; }
    if (newPw !== confirmPw)  { toast.error("New passwords do not match."); return; }
    if (newPw.length < 8)     { toast.error("New password must be at least 8 characters."); return; }

    setIsSavingPw(true);
    try {
      await http.patch("profile/me/", {
        current_password: currentPw,
        new_password:     newPw,
        confirm_password: confirmPw,
      });
      toast.success("Password changed successfully.");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      const d = err.response?.data;
      const msg =
        d?.current_password?.[0] ||
        d?.new_password?.[0]     ||
        d?.confirm_password?.[0] ||
        d?.non_field_errors?.[0] ||
        d?.detail || "Failed to change password.";
      toast.error(msg);
    } finally {
      setIsSavingPw(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading…</span>
        </div>
      </div>
    );
  }

  const initials = ((profile?.first_name?.[0] || "") + (profile?.last_name?.[0] || "")) ||
    (profile?.username || "U").slice(0, 2).toUpperCase();

  return (
    <>
      <PageHeader
        title="My Profile"
        description="View and update your account information and password."
      />

      <div className="row g-4">
        {/* ── Left: identity card ─────────────────────────────────────────── */}
        <div className="col-lg-4">
          <div className="card shadow-sm border-0 text-center p-4">
            {/* Avatar */}
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center bg-primary text-white fw-bold mx-auto mb-3"
              style={{ width: 80, height: 80, fontSize: "1.75rem" }}
            >
              {initials.toUpperCase()}
            </div>

            <h2 className="h5 mb-1">
              {profile?.first_name || profile?.last_name
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : profile?.username}
            </h2>
            <p className="text-muted small mb-2">@{profile?.username}</p>
            <span className={`badge bg-${ROLE_BADGE[profile?.role] || "secondary"} mb-3`}>
              {profile?.role}
            </span>

            <hr />

            <dl className="text-start small mb-0">
              <dt className="text-muted">Email</dt>
              <dd className="mb-2">{profile?.email || <span className="text-muted">—</span>}</dd>

              <dt className="text-muted">Status</dt>
              <dd className="mb-2">
                <span className={`badge bg-${profile?.is_approved ? "success" : "warning text-dark"}`}>
                  {profile?.is_approved ? "Approved" : "Pending"}
                </span>
              </dd>

              <dt className="text-muted">Member since</dt>
              <dd className="mb-2">{formatDateTime(profile?.date_joined)}</dd>

              <dt className="text-muted">Last login</dt>
              <dd className="mb-0">{formatDateTime(profile?.last_login)}</dd>
            </dl>
          </div>
        </div>

        {/* ── Right: edit forms ───────────────────────────────────────────── */}
        <div className="col-lg-8 d-flex flex-column gap-4">
          {/* Profile info */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h3 className="h5 mb-4">Personal Information</h3>
              <form onSubmit={handleSaveInfo}>
                <div className="row g-3">
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="pr-fname">First Name</label>
                    <input
                      id="pr-fname"
                      type="text"
                      className="form-control"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="pr-lname">Last Name</label>
                    <input
                      id="pr-lname"
                      type="text"
                      className="form-control"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="pr-email">Email Address</label>
                    <input
                      id="pr-email"
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Username <span className="text-muted">(read-only)</span></label>
                    <input type="text" className="form-control bg-light" value={profile?.username || ""} readOnly />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Role <span className="text-muted">(read-only)</span></label>
                    <input type="text" className="form-control bg-light" value={profile?.role || ""} readOnly />
                  </div>
                </div>

                <div className="mt-4">
                  <button type="submit" className="btn btn-primary px-4" disabled={isSaving}>
                    {isSaving ? (
                      <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Saving…</>
                    ) : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Password change */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <h3 className="h5 mb-1">Change Password</h3>
              <p className="text-muted small mb-4">Leave blank to keep your current password.</p>
              <form onSubmit={handleChangePassword}>
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label" htmlFor="pw-current">Current Password</label>
                    <input
                      id="pw-current"
                      type="password"
                      className="form-control"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="pw-new">New Password</label>
                    <input
                      id="pw-new"
                      type="password"
                      className="form-control"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Min. 8 characters"
                    />
                  </div>
                  <div className="col-sm-6">
                    <label className="form-label" htmlFor="pw-confirm">Confirm New Password</label>
                    <input
                      id="pw-confirm"
                      type="password"
                      className="form-control"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <button type="submit" className="btn btn-outline-danger px-4" disabled={isSavingPw}>
                    {isSavingPw ? (
                      <><span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />Changing…</>
                    ) : "Change Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default ProfilePage;
