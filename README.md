# NEXORA Esports — separated project files

## Project structure
- `index.html` — page structure
- `src/style.css` — responsive styling
- `src/main.js` — app entry point
- `src/firebase.js` — Firebase setup
- `src/auth.js` — registration, login, Google sign-in, reset password, profile and logout
- `.env.example` — Firebase configuration template
- `firestore.rules` — player profile security rules

## Setup
1. Install Node.js LTS: https://nodejs.org/
2. Open this folder in VS Code.
3. Run `npm install`.
4. Copy `.env.example` to `.env.local`.
5. Fill `.env.local` with your Firebase Web App config.
6. In Firebase Authentication, enable Email/Password and Google.
7. Add your website domain to Authentication > Settings > Authorized domains when needed.
8. Create Firestore Database and publish the rules in `firestore.rules`.
9. Run `npm run dev` and open the local URL shown in the terminal.
10. Run `npm run build` for a production build.

Never put Firebase service-account private keys in frontend code. This is the authentication/player-profile starter, not the complete tournament platform.
