import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, sendPasswordResetEmail, onAuthStateChanged,
  signOut, updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase.js";

const $ = (id) => document.getElementById(id);

function friendlyError(error) {
  const map = {
    "auth/email-already-in-use": "This email is already registered. Try logging in.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Choose a password with at least 6 characters.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/user-not-found": "No account was found for this email.",
    "auth/wrong-password": "Email or password is incorrect.",
    "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in popup.",
    "auth/unauthorized-domain": "Add this website domain to Firebase Authorized domains.",
    "auth/network-request-failed": "Network error. Check your internet connection."
  };
  return map[error.code] || error.message || "Something went wrong. Please try again.";
}

function message(text, error = false) {
  $("authMessage").textContent = text;
  $("authMessage").classList.toggle("error", error);
}
function mode(name) {
  const signup = name === "signup";
  $("loginForm").hidden = signup;
  $("signupForm").hidden = !signup;
  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);
  message("");
}

async function ensureProfile(user, nickname = "") {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      nickname: nickname || user.displayName || "NEXORA Player",
      email: user.email || "",
      photoURL: user.photoURL || "",
      region: "Nepal",
      role: "player",
      createdAt: serverTimestamp()
    });
  }
}

async function googleSignIn() {
  try {
    message("Opening Google sign-in...");
    const result = await signInWithPopup(auth, googleProvider);
    await ensureProfile(result.user);
    message("Google sign-in successful.");
  } catch (error) { message(friendlyError(error), true); }
}

function renderDashboard(user, profile) {
  $("playerName").textContent = profile?.nickname || user.displayName || "NEXORA Player";
  $("playerEmail").textContent = user.email || "";
  $("playerUID").textContent = user.uid;
  $("playerRegion").textContent = profile?.region || "Nepal";
  if (user.photoURL) {
    $("playerPhoto").src = user.photoURL;
    $("playerPhoto").hidden = false;
    $("avatarFallback").hidden = true;
  } else {
    $("playerPhoto").hidden = true;
    $("avatarFallback").hidden = false;
    $("avatarFallback").textContent = ($("playerName").textContent || "N").charAt(0).toUpperCase();
  }
}

export function initializeAuthUI() {
  $("year").textContent = new Date().getFullYear();
  $("loginTab").addEventListener("click", () => mode("login"));
  $("signupTab").addEventListener("click", () => mode("signup"));

  $("signupForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const nickname = $("signupNickname").value.trim();
    const email = $("signupEmail").value.trim();
    const password = $("signupPassword").value;
    if (nickname.length < 3) return message("Nickname must contain at least 3 characters.", true);
    try {
      message("Creating your account...");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: nickname });
      await ensureProfile(credential.user, nickname);
      $("signupForm").reset();
      message("Account created successfully.");
    } catch (error) { message(friendlyError(error), true); }
  });

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      message("Signing you in...");
      await signInWithEmailAndPassword(auth, $("loginEmail").value.trim(), $("loginPassword").value);
      $("loginForm").reset();
      message("Login successful.");
    } catch (error) { message(friendlyError(error), true); }
  });

  $("googleLogin").addEventListener("click", googleSignIn);
  $("googleSignup").addEventListener("click", googleSignIn);

  $("forgotPassword").addEventListener("click", async () => {
    const email = $("loginEmail").value.trim();
    if (!email) return message("Enter your email address first.", true);
    try {
      await sendPasswordResetEmail(auth, email);
      message("If an account exists for that address, a reset email has been sent.");
    } catch (error) { message(friendlyError(error), true); }
  });

  $("logoutButton").addEventListener("click", async () => {
    try { await signOut(auth); }
    catch (error) {
      $("profileMessage").textContent = friendlyError(error);
      $("profileMessage").classList.add("error");
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      $("dashboardView").hidden = true;
      $("authView").hidden = false;
      mode("login");
      return;
    }
    $("authView").hidden = true;
    $("dashboardView").hidden = false;
    $("profileMessage").textContent = "Loading your player profile...";
    $("profileMessage").classList.remove("error");
    try {
      await ensureProfile(user);
      const snap = await getDoc(doc(db, "users", user.uid));
      renderDashboard(user, snap.exists() ? snap.data() : null);
      $("profileMessage").textContent = "Your player profile is connected.";
    } catch (error) {
      renderDashboard(user, null);
      $("profileMessage").textContent = friendlyError(error);
      $("profileMessage").classList.add("error");
    }
  });
}