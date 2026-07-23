/**
 * SaDonTech Hub | auth.js
 * Real authentication via Supabase Auth: signup, login, logout,
 * password reset, and (via Supabase's hosted email flow) email verification.
 *
 * Requires supabase-config.js to be loaded first with real project credentials.
 */

let sb = null;
let currentUser = null;

function isSupabaseConfigured() {
  return (
    typeof SUPABASE_CONFIG !== "undefined" &&
    SUPABASE_CONFIG.url &&
    !SUPABASE_CONFIG.url.includes("YOUR-PROJECT-REF") &&
    SUPABASE_CONFIG.anonKey &&
    !SUPABASE_CONFIG.anonKey.includes("YOUR-ANON")
  );
}

function initSupabaseClient() {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[SaDonTech Hub] Supabase is not configured yet — auth, profiles, and the " +
      "admin dashboard are disabled until you fill in supabase-config.js. " +
      "See SETUP.md."
    );
    return null;
  }
  if (typeof window.supabase === "undefined") {
    console.error("[SaDonTech Hub] Supabase SDK failed to load (check your network/ad-blocker).");
    return null;
  }
  return window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
}

/* ============================================================
   DOM REFS
   ============================================================ */
const authModal = document.getElementById("authModal");
const authModalOverlay = document.getElementById("authModalOverlay");
const authModalTitle = document.getElementById("authModalTitle");
const accountBtn = document.getElementById("accountBtn");
const accountBtnLabel = document.getElementById("accountBtnLabel");
const mobileAccountLink = document.getElementById("mobileAccountLink");

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const forgotPasswordForm = document.getElementById("forgotPasswordForm");

const authTabLogin = document.getElementById("authTabLogin");
const authTabSignup = document.getElementById("authTabSignup");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const backToLoginBtn = document.getElementById("backToLoginBtn");

/* ============================================================
   MODAL CONTROLS
   ============================================================ */
function openAuthModal(view = "login") {
  if (!authModal || !authModalOverlay) return;
  showAuthView(view);
  authModal.classList.add("open");
  authModalOverlay.classList.add("open");
}

function closeAuthModal() {
  if (!authModal || !authModalOverlay) return;
  authModal.classList.remove("open");
  authModalOverlay.classList.remove("open");
  clearAuthMessages();
}

function showAuthView(view) {
  const isLogin = view === "login";
  const isSignup = view === "signup";
  const isForgot = view === "forgot";

  if (loginForm) loginForm.hidden = !isLogin;
  if (signupForm) signupForm.hidden = !isSignup;
  if (forgotPasswordForm) forgotPasswordForm.hidden = !isForgot;

  if (authTabLogin) {
    authTabLogin.classList.toggle("is-active", isLogin || isForgot);
    authTabLogin.setAttribute("aria-selected", String(isLogin || isForgot));
  }
  if (authTabSignup) {
    authTabSignup.classList.toggle("is-active", isSignup);
    authTabSignup.setAttribute("aria-selected", String(isSignup));
  }
  if (authModalTitle) {
    authModalTitle.textContent = isSignup ? "Create your account" : isForgot ? "Reset password" : "Log in";
  }
  clearAuthMessages();
}

function clearAuthMessages() {
  ["loginMessage", "signupMessage", "forgotMessage"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = "";
      el.classList.remove("is-error", "is-success");
    }
  });
}

function setAuthMessage(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("is-error", type === "error");
  el.classList.toggle("is-success", type === "success");
}

/* ============================================================
   AUTH ACTIONS
   ============================================================ */
async function handleSignUp(event) {
  event.preventDefault();
  if (!sb) {
    setAuthMessage("signupMessage", "Account features aren't set up yet. See SETUP.md.", "error");
    return;
  }

  const fullName = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const btn = document.getElementById("signupSubmitBtn");

  if (!fullName || !email || password.length < 6) {
    setAuthMessage("signupMessage", "Please fill in every field (password: 6+ characters).", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creating account...";

  const { error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: window.location.origin + window.location.pathname,
    },
  });

  btn.disabled = false;
  btn.textContent = "Create account";

  if (error) {
    setAuthMessage("signupMessage", error.message, "error");
    return;
  }

  setAuthMessage(
    "signupMessage",
    "Almost done! Check your email to confirm your account before logging in.",
    "success"
  );
  signupForm.reset();
}

async function handleLogIn(event) {
  event.preventDefault();
  if (!sb) {
    setAuthMessage("loginMessage", "Account features aren't set up yet. See SETUP.md.", "error");
    return;
  }

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("loginSubmitBtn");

  btn.disabled = true;
  btn.textContent = "Logging in...";

  const { error } = await sb.auth.signInWithPassword({ email, password });

  btn.disabled = false;
  btn.textContent = "Log in";

  if (error) {
    // Supabase returns a generic invalid-credentials message; this also
    // covers "email not yet confirmed" for accounts pending verification.
    setAuthMessage("loginMessage", error.message, "error");
    return;
  }

  loginForm.reset();
  closeAuthModal();
  if (typeof showToast === "function") showToast("Welcome back!");
}

async function handleForgotPassword(event) {
  event.preventDefault();
  if (!sb) {
    setAuthMessage("forgotMessage", "Account features aren't set up yet. See SETUP.md.", "error");
    return;
  }

  const email = document.getElementById("forgotEmail").value.trim();
  const btn = document.getElementById("forgotSubmitBtn");

  btn.disabled = true;
  btn.textContent = "Sending...";

  const { error } = await sb.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin + "/reset-password.html",
  });

  btn.disabled = false;
  btn.textContent = "Send reset link";

  if (error) {
    setAuthMessage("forgotMessage", error.message, "error");
    return;
  }

  setAuthMessage("forgotMessage", "If that email has an account, a reset link is on its way.", "success");
  forgotPasswordForm.reset();
}

async function handleSignOut() {
  if (!sb) return;
  await sb.auth.signOut();
  if (typeof showToast === "function") showToast("Logged out.");
}

/* ============================================================
   NAVBAR STATE
   ============================================================ */
function updateAccountNav() {
  if (!accountBtnLabel) return;

  if (currentUser) {
    const label = currentUser.user_metadata?.full_name?.split(" ")[0] || "Account";
    accountBtnLabel.textContent = label;
    if (mobileAccountLink) mobileAccountLink.textContent = `My Account (${label})`;
  } else {
    accountBtnLabel.textContent = "Login";
    if (mobileAccountLink) mobileAccountLink.textContent = "Login / Sign up";
  }
}

function handleAccountBtnClick() {
  if (currentUser) {
    window.location.href = "account.html";
  } else {
    openAuthModal("login");
  }
}

/* ============================================================
   INIT
   ============================================================ */
function initAuth() {
  sb = initSupabaseClient();
  window.sbClient = sb; // exposed for account.html / admin.html / app.js
  window.sbGetCurrentUser = () => currentUser;
  window.openAuthModal = openAuthModal;

  if (accountBtn) accountBtn.addEventListener("click", handleAccountBtnClick);
  if (mobileAccountLink) {
    mobileAccountLink.addEventListener("click", (e) => {
      if (!currentUser) {
        e.preventDefault();
        openAuthModal("login");
        if (typeof closeMobileMenu === "function") closeMobileMenu();
      }
    });
  }

  if (authModalOverlay) authModalOverlay.addEventListener("click", closeAuthModal);
  const authModalClose = document.getElementById("authModalClose");
  if (authModalClose) authModalClose.addEventListener("click", closeAuthModal);

  if (authTabLogin) authTabLogin.addEventListener("click", () => showAuthView("login"));
  if (authTabSignup) authTabSignup.addEventListener("click", () => showAuthView("signup"));
  if (forgotPasswordBtn) forgotPasswordBtn.addEventListener("click", () => showAuthView("forgot"));
  if (backToLoginBtn) backToLoginBtn.addEventListener("click", () => showAuthView("login"));

  if (loginForm) loginForm.addEventListener("submit", handleLogIn);
  if (signupForm) signupForm.addEventListener("submit", handleSignUp);
  if (forgotPasswordForm) forgotPasswordForm.addEventListener("submit", handleForgotPassword);

  if (!sb) {
    updateAccountNav();
    return;
  }

  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
    updateAccountNav();
  });

  sb.auth.getSession().then(({ data }) => {
    currentUser = data.session?.user ?? null;
    updateAccountNav();
  });
}

document.addEventListener("DOMContentLoaded", initAuth);
