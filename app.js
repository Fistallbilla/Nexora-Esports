import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app);
let U = null, T = [], E = [], cfg = { fee: 10, cur: "$", pay: "", adminUid: "" }, tab = "browse", gf = "all", unsub = [];
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const isAdmin = () => U && U.uid === cfg.adminUid;
const money = n => esc(cfg.cur) + Math.round(n * 100) / 100;
const ents = t => E.filter(e => e.t === t.id);
const run = async fn => { try { await fn(); } catch (e) { alert(e.message || e); } };

onAuthStateChanged(auth, user => {
  U = user; unsub.forEach(f => f()); unsub = [];
  if (user) {
    unsub.push(onSnapshot(collection(db, "tournaments"), s => { T = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); }, console.error));
    unsub.push(onSnapshot(collection(db, "entries"), s => { E = s.docs.map(d => ({ id: d.id, ...d.data() })); render(); }, console.error));
  }
  unsub.push(onSnapshot(doc(db, "settings", "main"), d => { if (d.exists()) cfg = { ...cfg, ...d.data() }; render(); }, () => {}));
  render();
});

function render() {
  $("who").innerHTML = U ? `<span class="mute">${esc(U.displayName || U.email)}</span> <button class="btn ghost" data-a="out">Sign out</button>` : "";
  if (!U) { $("nav").innerHTML = ""; $("app").innerHTML = vLogin(); return; }
  const tabs = [["browse", "Tournaments"], ["create", "Host one"], ["mine", "My entries"], ...(isAdmin() ? [["money", "Earnings"]] : [])];
  $("nav").innerHTML = tabs.map(t => `<button class="${tab === t[0] ? "on" : ""}" data-a="tab" data-v="${t[0]}">${t[1]}</button>`).join("");
  $("app").innerHTML = tab === "browse" ? vBrowse() : tab === "create" ? vCreate() : tab === "mine" ? vMine() : vMoney();
}

function vLogin() {
  return `<div class="card plain"><h2>Sign in to play</h2>
  <button class="btn" data-a="google">Continue with Google</button>
  <label for="em">Email</label><input id="em" type="email" autocomplete="email">
  <label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password">
  <label for="dn">Player name (new accounts)</label><input id="dn" placeholder="Your in-game name">
  <div class="row"><button class="btn" data-a="login">Sign in</button><button class="btn ghost" data-a="signup">Create account</button></div></div>`;
}

function card(t) {
  const es = ents(t), paid = es.filter(e => e.paid).length, pool = paid * t.fee * (1 - cfg.fee / 100), mine = es.find(e => e.u === U.uid), canManage = t.by === U.uid || isAdmin();
  let h = `<div class="card ${t.game}"><div class="top"><div class="t">${esc(t.title)}</div><div class="pool">${money(pool)}</div></div>
  <div class="mute">${t.game === "ff" ? "Free Fire" : "eFootball"} · ${esc(t.mode)} · hosted by ${esc(t.byName)}${t.when ? " · " + esc(t.when.replace("T", " ")) : ""}</div>
  <div class="mute">Entry ${t.fee ? money(t.fee) : "free"} · ${es.length}/${t.max} joined${t.fee ? " · pool after " + cfg.fee + "% platform fee" : ""}</div>`;
  if (t.status === "done") h += `<p class="ok">Winner: ${esc(t.winnerName)}</p>`;
  h += `<div class="row">`;
  if (t.status !== "done") {
    if (!mine) h += es.length < t.max ? `<button class="btn g" data-a="join" data-v="${t.id}">Join${t.fee ? " · " + money(t.fee) : ""}</button>` : `<span class="mute">Full</span>`;
    else {
      h += `<span class="${mine.paid ? "ok" : "mute"}">${mine.paid ? "You're in" : "Awaiting payment confirmation"}</span>`;
      if (!mine.paid && t.fee) h += `<button class="btn ghost" data-a="ref" data-v="${mine.id}">Send payment ID</button>`;
      h += `<button class="btn ghost" data-a="leave" data-v="${mine.id}">Leave</button>`;
    }
    if (canManage) h += `<select data-a="win" data-v="${t.id}" style="width:auto"><option value="">Pick winner…</option>${es.filter(e => e.paid).map(e => `<option value="${esc(e.u)}">${esc(e.name)}</option>`).join("")}</select>`;
  }
  if (canManage) h += `<button class="btn ghost" data-a="delT" data-v="${t.id}">Delete</button>`;
  h += `</div>`;
  if (canManage) es.forEach(e => h += `<div class="pl"><span>${esc(e.name)}${e.ref ? " · ref " + esc(e.ref) : ""}</span>${e.paid ? `<span class="ok">paid</span>` : `<button class="btn ghost" data-a="pay" data-v="${e.id}">Confirm payment</button>`}</div>`);
  return h + `</div>`;
}

function vBrowse() {
  const chips = [["all", "All"], ["ff", "Free Fire"], ["ef", "eFootball"]].map(g => `<button class="chip ${gf === g[0] ? "on" : ""}" data-a="gf" data-v="${g[0]}">${g[1]}</button>`).join("");
  const l = T.filter(t => gf === "all" || t.game === gf).sort((a, b) => (a.when || "") < (b.when || "") ? -1 : 1);
  return `<div class="row" style="margin:0 0 10px">${chips}</div>` + (l.length ? l.map(card).join("") : `<p class="mute">No tournaments yet. Host the first one.</p>`);
}
function vMine() {
  const ids = E.filter(e => e.u === U.uid).map(e => e.t), l = T.filter(t => ids.includes(t.id) || t.by === U.uid);
  return l.length ? l.map(card).join("") : `<p class="mute">Tournaments you host or join appear here.</p>`;
}
function vCreate() {
  return `<div class="card plain"><label for="g">Game</label><select id="g"><option value="ff">Free Fire</option><option value="ef">eFootball</option></select>
  <label for="ti">Tournament name</label><input id="ti" placeholder="Friday night squad cup">
  <label for="mo">Format</label><input id="mo" placeholder="Squad (4v4), 1v1 knockout…">
  <div class="two"><div><label for="fe">Entry fee (${esc(cfg.cur)})</label><input id="fe" type="number" min="0" value="0"></div><div><label for="mx">Max players</label><input id="mx" type="number" min="2" value="12"></div></div>
  <label for="wh">Start time</label><input id="wh" type="datetime-local">
  <div class="row"><button class="btn" data-a="create">Create tournament</button></div>
  <p class="mute">The platform keeps ${cfg.fee}% of every confirmed entry fee. The rest is the prize pool.</p></div>`;
}
function vMoney() {
  let tot = 0, gross = 0, rows = "";
  T.forEach(t => { const p = ents(t).filter(e => e.paid).length * t.fee; gross += p; tot += p * cfg.fee / 100; if (p) rows += `<div class="pl"><span>${esc(t.title)}</span><span>${money(p * cfg.fee / 100)}</span></div>`; });
  return `<div class="card plain"><div class="mute">Your platform earnings</div><div class="big">${money(tot)}</div><div class="mute">from ${money(gross)} in confirmed entry fees</div>${rows}</div>
  <div class="card plain"><h2>Settings</h2><div class="two"><div><label for="sf">Platform fee %</label><input id="sf" type="number" min="0" max="50" value="${cfg.fee}"></div><div><label for="sc">Currency symbol</label><input id="sc" value="${esc(cfg.cur)}"></div></div>
  <label for="sp">Payment instructions (shown to players)</label><textarea id="sp" rows="3">${esc(cfg.pay)}</textarea>
  <div class="row"><button class="btn" data-a="cfg">Save settings</button></div></div>`;
}

const name = () => U.displayName || U.email.split("@")[0];
const actions = {
  out: () => signOut(auth),
  tab: v => { tab = v; render(); },
  gf: v => { gf = v; render(); },
  google: () => signInWithPopup(auth, new GoogleAuthProvider()),
  login: () => signInWithEmailAndPassword(auth, $("em").value, $("pw").value),
  signup: async () => { const c = await createUserWithEmailAndPassword(auth, $("em").value, $("pw").value); await updateProfile(c.user, { displayName: $("dn").value.trim() || $("em").value.split("@")[0] }); location.reload(); },
  create: async () => {
    const ti = $("ti").value.trim(); if (!ti) return alert("Enter a tournament name.");
    await addDoc(collection(db, "tournaments"), { game: $("g").value, title: ti, mode: $("mo").value.trim() || "Open", fee: Math.max(0, +$("fe").value || 0), max: Math.max(2, +$("mx").value || 12), when: $("wh").value, by: U.uid, byName: name(), status: "open", winner: "", winnerName: "", created: serverTimestamp() });
    tab = "browse"; render();
  },
  join: async v => {
    const t = T.find(x => x.id === v);
    if (t.fee && cfg.pay) alert("How to pay:\n\n" + cfg.pay + '\n\nAfter paying, tap "Send payment ID" so the host can confirm you.');
    await setDoc(doc(db, "entries", v + "_" + U.uid), { t: v, u: U.uid, name: name(), paid: !t.fee, ref: "" });
  },
  leave: v => deleteDoc(doc(db, "entries", v)),
  ref: v => { const r = prompt("Enter your payment transaction ID"); if (r) return updateDoc(doc(db, "entries", v), { ref: r.slice(0, 60) }); },
  pay: v => updateDoc(doc(db, "entries", v), { paid: true }),
  delT: async v => { if (!confirm("Delete this tournament and its entries?")) return; for (const e of ents({ id: v })) await deleteDoc(doc(db, "entries", e.id)); await deleteDoc(doc(db, "tournaments", v)); },
  cfg: () => setDoc(doc(db, "settings", "main"), { ...cfg, fee: Math.min(50, Math.max(0, +$("sf").value || 0)), cur: $("sc").value || "$", pay: $("sp").value })
};
document.addEventListener("click", e => { const b = e.target.closest("button[data-a]"); if (b) run(() => actions[b.dataset.a](b.dataset.v)); });
document.addEventListener("change", e => {
  const s = e.target.closest("select[data-a='win']"); if (!s || !s.value) return;
  const w = E.find(x => x.t === s.dataset.v && x.u === s.value);
  run(() => updateDoc(doc(db, "tournaments", s.dataset.v), { winner: s.value, winnerName: w ? w.name : "", status: "done" }));
});
