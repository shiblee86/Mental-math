// ============================================================
//  FIREBASE SETUP — required for the Two-Player Race mode.
//  Classic and Survival work without this; only Host/Join Race needs it.
//
//  1. Go to https://console.firebase.google.com → Add project (free).
//  2. In the project, click the "</>" (web app) icon to register a web
//     app, then copy the firebaseConfig object it gives you into
//     REPLACE_ME below.
//  3. Build → Realtime Database → Create Database → start in
//     **locked mode** (region: pick anything close to your players).
//  4. Build → Authentication → Get started → Sign-in method →
//     enable "Anonymous".
//  5. Realtime Database → Rules tab → paste this and Publish:
//       {
//         "rules": {
//           "rooms": {
//             "$roomCode": {
//               ".read": "auth != null",
//               ".write": "auth != null"
//             }
//           }
//         }
//       }
//  That's it — no server to run or deploy. This file is safe to
//  commit/publish on GitHub Pages: Firebase's client config is not a
//  secret, access is controlled entirely by the rules above.
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyD5hxDkJGSql4eMXoolSUByMcfIXC7px2s",
  authDomain: "mental-math-e5237.firebaseapp.com",
  databaseURL: "https://mental-math-e5237-default-rtdb.firebaseio.com",
  projectId: "mental-math-e5237",
  storageBucket: "mental-math-e5237.firebasestorage.app",
  messagingSenderId: "593915010945",
  appId: "1:593915010945:web:14faea613831c92a511280"
};

try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error('Firebase failed to initialize — fill in firebase-config.js with your project config.', e);
}
