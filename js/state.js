// Module-level singleton replacing AuthContext + FavoritesContext (React).
// Ported 1:1 from src/contexts/{auth-context,favorites-context}.tsx.
import { auth, db, Auth, Admin, Favorites, OWNER_EMAIL } from "./firebase.js";
import { doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const listeners = new Set();

export const authState = {
  user: null,
  profile: null,
  isAdmin: false,
  isOwner: false,
  isAdminModeActive: false,
  loading: true,
};

export const favoritesState = {
  favoriteIds: new Set(),
  loading: false,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  listeners.forEach((fn) => fn());
}

function sessionKey(uid) {
  return `adminModeUnlocked:${uid}`;
}

function applyDarkMode() {
  document.documentElement.classList.toggle("dark", authState.isAdminModeActive);
}

function recomputeAdminMode(adminModeUnlocked) {
  authState.isOwner = authState.user?.email === OWNER_EMAIL;
  authState.isAdminModeActive = authState.isAdmin && (authState.isOwner || adminModeUnlocked);
  applyDarkMode();
}

let adminModeUnlocked = false;
let unsubProfile = null;
let unsubAdmin = null;
let unsubFavorites = null;
let bootstrapAttempted = false;

Auth.onChange((nextUser) => {
  authState.user = nextUser;

  if (unsubProfile) unsubProfile();
  if (unsubAdmin) unsubAdmin();
  if (unsubFavorites) unsubFavorites();
  unsubProfile = unsubAdmin = unsubFavorites = null;

  if (!nextUser) {
    authState.profile = null;
    authState.isAdmin = false;
    adminModeUnlocked = false;
    bootstrapAttempted = false;
    authState.loading = false;
    favoritesState.favoriteIds = new Set();
    recomputeAdminMode(false);
    notify();
    return;
  }

  adminModeUnlocked = sessionStorage.getItem(sessionKey(nextUser.uid)) === "1";
  recomputeAdminMode(adminModeUnlocked);

  unsubProfile = onSnapshot(
    doc(db, "users", nextUser.uid),
    (snap) => {
      authState.profile = snap.exists() ? snap.data() : null;
      authState.loading = false;
      notify();
    },
    () => {
      authState.profile = null;
      authState.loading = false;
      notify();
    },
  );

  unsubAdmin = Admin.subscribeIsAdmin(nextUser.uid, (isAdmin) => {
    authState.isAdmin = isAdmin;
    recomputeAdminMode(adminModeUnlocked);
    if (isAdmin && !bootstrapAttempted) {
      // no-op: owner bootstrap only fires when NOT yet admin (see below)
    }
    if (!isAdmin && !bootstrapAttempted && nextUser.email === OWNER_EMAIL) {
      bootstrapAttempted = true;
      Admin.grantSelfAdmin(nextUser.uid, nextUser.email).catch(() => {
        bootstrapAttempted = false;
      });
    }
    notify();
  });

  favoritesState.loading = true;
  unsubFavorites = Favorites.subscribeFavorites(nextUser.uid, (favorites) => {
    favoritesState.favoriteIds = new Set(favorites.map((f) => f.productId));
    favoritesState.loading = false;
    notify();
  });

  notify();
});

export async function unlockAdminMode(code) {
  if (!authState.user) return false;
  const ok = await Admin.verifyAdminModeCode(authState.user.uid, code);
  if (ok) {
    sessionStorage.setItem(sessionKey(authState.user.uid), "1");
    adminModeUnlocked = true;
    recomputeAdminMode(true);
    notify();
  }
  return ok;
}

export async function toggleFavorite(productId) {
  if (!authState.user) return;
  if (favoritesState.favoriteIds.has(productId)) {
    await Favorites.removeFavorite(authState.user.uid, productId);
  } else {
    await Favorites.addFavorite(authState.user.uid, productId);
  }
}
