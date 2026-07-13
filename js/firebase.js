// Firebase init + the full data layer, ported from src/lib/{firebase,
// marketplace,chat,admin,community,user-profile,site-settings}.ts.
// One file, flat namespaces (Auth/Profile/Products/Sourcing/Ads/Chat/Admin/
// Favorites/Comments/Reviews/Reports/SiteSettings) since every function here
// is a thin Firestore/Auth call — splitting further buys nothing.

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import {
  initializeFirestore,
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  increment,
  serverTimestamp,
  getCountFromServer,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDxum9DYcroSdHuXWoeCZvfJ1N5tH9WN0g",
  authDomain: "waraqat-shajar.firebaseapp.com",
  projectId: "waraqat-shajar",
  storageBucket: "waraqat-shajar.firebasestorage.app",
  messagingSenderId: "931782671707",
  appId: "1:931782671707:web:56af19fcb31cdf9f652e7e",
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
// ignoreUndefinedProperties: this is a hand-written JS app (no static typing),
// so optional object fields are often built as `value || undefined` — plain
// getFirestore() throws "invalid-argument" the moment such a field is written.
export const db = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
export const storage = getStorage(firebaseApp);

// ===========================================================================
// Storage (device file uploads — paths match storage.rules exactly)
// ===========================================================================
export const Storage = {
  async uploadFile(path, file) {
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, file);
    return getDownloadURL(fileRef);
  },
};

// ===========================================================================
// Auth
// ===========================================================================
const googleProvider = new GoogleAuthProvider();

export const Auth = {
  onChange(callback) {
    return onAuthStateChanged(auth, callback);
  },

  async registerWithEmail(fullName, email, password) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    return credential.user;
  },

  async signInWithEmail(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  },

  async signInWithGoogle() {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  },

  async signOutUser() {
    await signOut(auth);
  },

  async resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  },

  getAuthErrorKey(error) {
    const code = error?.code ?? "";
    switch (code) {
      case "auth/invalid-email":
        return "invalidEmail";
      case "auth/weak-password":
        return "weakPassword";
      case "auth/email-already-in-use":
        return "emailInUse";
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "wrongCredentials";
      default:
        return "generic";
    }
  },
};

// ===========================================================================
// User profile (users/{uid})
// ===========================================================================
function userDocRef(uid) {
  return doc(db, "users", uid);
}

export const Profile = {
  async createUserProfile(input) {
    await setDoc(userDocRef(input.uid), {
      uid: input.uid,
      fullName: input.fullName,
      phone: input.phone,
      governorate: input.governorate,
      accountType: input.accountType,
      crops: input.crops ?? [],
      sourcingCategories: input.sourcingCategories ?? [],
      email: input.email,
      photoURL: input.photoURL,
      authProvider: input.authProvider,
      termsAcceptedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      ratingAverage: 0,
      ratingCount: 0,
      status: "active",
      suspendedUntil: null,
    });
  },

  async getUserProfile(uid) {
    const snap = await getDoc(userDocRef(uid));
    return snap.exists() ? snap.data() : null;
  },

  subscribeUserProfile(uid, callback) {
    return onSnapshot(userDocRef(uid), (snap) => callback(snap.exists() ? snap.data() : null));
  },
};

// ===========================================================================
// Products
// ===========================================================================
const productsCol = collection(db, "products");

export const Products = {
  newProductId() {
    return doc(productsCol).id;
  },

  async createProduct(id, input) {
    await setDoc(doc(productsCol, id), {
      ...input,
      status: "active",
      viewsCount: 0,
      offersCount: 0,
      dealsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  },

  async updateProduct(id, patch) {
    await updateDoc(doc(db, "products", id), { ...patch, updatedAt: serverTimestamp() });
  },

  async setProductStatus(id, status) {
    await updateDoc(doc(db, "products", id), { status, updatedAt: serverTimestamp() });
  },

  async deleteProduct(id) {
    await deleteDoc(doc(db, "products", id));
  },

  async getProduct(id) {
    const snap = await getDoc(doc(db, "products", id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  subscribeMyProducts(ownerId, callback) {
    const q = query(productsCol, where("ownerId", "==", ownerId), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },

  async listActiveProducts(filters = {}) {
    const constraints = [where("status", "==", "active")];
    if (filters.category) constraints.push(where("category", "==", filters.category));
    if (filters.governorate) constraints.push(where("governorate", "==", filters.governorate));
    constraints.push(orderBy("createdAt", "desc"));
    if (filters.limitCount) constraints.push(limit(filters.limitCount));
    const snap = await getDocs(query(productsCol, ...constraints));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async incrementProductViews(id) {
    await updateDoc(doc(db, "products", id), { viewsCount: increment(1) });
  },

  async incrementProductOffers(id) {
    await updateDoc(doc(db, "products", id), { offersCount: increment(1) });
  },

  async incrementProductDeals(id) {
    await updateDoc(doc(db, "products", id), { dealsCount: increment(1) });
  },
};

// ===========================================================================
// Sourcing requests
// ===========================================================================
const sourcingCol = collection(db, "sourcingRequests");

export const Sourcing = {
  async createSourcingRequest(input) {
    await addDoc(sourcingCol, { ...input, status: "open", createdAt: serverTimestamp() });
  },

  async closeSourcingRequest(id) {
    await updateDoc(doc(db, "sourcingRequests", id), { status: "closed" });
  },

  async deleteSourcingRequest(id) {
    await deleteDoc(doc(db, "sourcingRequests", id));
  },

  subscribeMySourcingRequests(ownerId, callback) {
    const q = query(sourcingCol, where("ownerId", "==", ownerId), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },

  async listMatchingSourcingRequests(crops, governorate) {
    if (crops.length === 0) return [];
    const q = query(
      sourcingCol,
      where("status", "==", "open"),
      where("category", "in", crops.slice(0, 10)),
      where("governorates", "array-contains", governorate),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

// ===========================================================================
// Ads
// ===========================================================================
const adsCol = collection(db, "ads");

export const Ads = {
  async createAd(input) {
    await addDoc(adsCol, { ...input, createdAt: serverTimestamp() });
  },

  async updateAd(id, patch) {
    await updateDoc(doc(db, "ads", id), patch);
  },

  async deleteAd(id) {
    await deleteDoc(doc(db, "ads", id));
  },

  async listAllAds() {
    const snap = await getDocs(query(adsCol, orderBy("order", "asc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async listActiveAdsByPlacement(placement) {
    const snap = await getDocs(
      query(adsCol, where("placement", "==", placement), where("active", "==", true)),
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => a.order - b.order);
  },
};

// ===========================================================================
// Chat
// ===========================================================================
const chatsCol = collection(db, "chats");

export const Chat = {
  async findOrCreateChat(params) {
    const q = query(
      chatsCol,
      where("participantIds", "array-contains", params.currentUid),
      where("contextId", "==", params.contextId),
    );
    const snap = await getDocs(q);
    const existing = snap.docs.find((d) => d.data().participantIds.includes(params.otherUid));
    if (existing) return existing.id;

    const docRef = await addDoc(chatsCol, {
      participantIds: [params.currentUid, params.otherUid],
      participantNames: {
        [params.currentUid]: params.currentName,
        [params.otherUid]: params.otherName,
      },
      participantPhones: {
        [params.currentUid]: params.currentPhone,
        [params.otherUid]: params.otherPhone,
      },
      contextType: params.contextType,
      contextId: params.contextId,
      contextLabel: params.contextLabel,
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  async getChat(chatId) {
    const snap = await getDoc(doc(db, "chats", chatId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  subscribeMyChats(uid, callback) {
    const q = query(chatsCol, where("participantIds", "array-contains", uid), orderBy("lastMessageAt", "desc"));
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },

  subscribeChatMessages(chatId, callback) {
    const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(q, (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
  },

  async sendTextMessage(chatId, senderId, text) {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId,
      type: "text",
      text,
      offer: null,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "chats", chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
  },

  async sendOfferMessage(chatId, senderId, offer) {
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId,
      type: "offer",
      text: null,
      offer: { ...offer, status: "pending" },
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: `${offer.pricePerUnit} / ${offer.unit}`,
      lastMessageAt: serverTimestamp(),
    });
  },

  async respondToOffer(chatId, messageId, status) {
    await updateDoc(doc(db, "chats", chatId, "messages", messageId), { "offer.status": status });
  },

  async listIncomingOffers(farmerUid) {
    const chatsSnap = await getDocs(query(chatsCol, where("participantIds", "array-contains", farmerUid)));
    const productChats = chatsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.contextType === "product");

    const perChat = await Promise.all(
      productChats.map(async (chat) => {
        const buyerUid = chat.participantIds.find((id) => id !== farmerUid);
        if (!buyerUid) return [];
        const messagesSnap = await getDocs(
          query(collection(db, "chats", chat.id, "messages"), orderBy("createdAt", "desc")),
        );
        return messagesSnap.docs
          .filter((m) => m.data().type === "offer" && m.data().senderId === buyerUid)
          .map((m) => {
            const data = m.data();
            return {
              ...data.offer,
              chatId: chat.id,
              messageId: m.id,
              productId: chat.contextId,
              productLabel: chat.contextLabel,
              buyerName: chat.participantNames[buyerUid],
              buyerPhone: chat.participantPhones[buyerUid],
              createdAt: data.createdAt ?? null,
            };
          });
      }),
    );

    return perChat.flat().sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  },

  // The buyer-side mirror of listIncomingOffers — every offer a buyer has
  // sent across all their product chats, regardless of which farmer it went to.
  async listMyOffers(buyerUid) {
    const chatsSnap = await getDocs(query(chatsCol, where("participantIds", "array-contains", buyerUid)));
    const productChats = chatsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((c) => c.contextType === "product");

    const perChat = await Promise.all(
      productChats.map(async (chat) => {
        const farmerUid = chat.participantIds.find((id) => id !== buyerUid);
        if (!farmerUid) return [];
        const messagesSnap = await getDocs(
          query(collection(db, "chats", chat.id, "messages"), orderBy("createdAt", "desc")),
        );
        return messagesSnap.docs
          .filter((m) => m.data().type === "offer" && m.data().senderId === buyerUid)
          .map((m) => {
            const data = m.data();
            return {
              ...data.offer,
              chatId: chat.id,
              messageId: m.id,
              productId: chat.contextId,
              productLabel: chat.contextLabel,
              farmerName: chat.participantNames[farmerUid],
              createdAt: data.createdAt ?? null,
            };
          });
      }),
    );

    return perChat.flat().sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
  },

  // Admin-only: every chat, for the moderation/oversight view. Read-only —
  // never call anything here that writes to the chat or its messages, so
  // browsing a conversation stays invisible to its participants.
  async listAllChats() {
    const snap = await getDocs(query(chatsCol, orderBy("lastMessageAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

// ===========================================================================
// Phone-attempt logging — a user's own client writes one of these whenever
// containsPhoneNumber() blocks their chat/comment submission, so admins can
// see who tried to share contact info, when, and with/on whom.
// ===========================================================================
const phoneAttemptsCol = collection(db, "phoneAttempts");

export const PhoneAttempts = {
  async logAttempt({ uid, name, context, contextId, targetName, snippet }) {
    await addDoc(phoneAttemptsCol, {
      uid,
      name,
      context,
      contextId,
      targetName: targetName ?? null,
      snippet,
      createdAt: serverTimestamp(),
    });
  },

  async listAll() {
    const snap = await getDocs(query(phoneAttemptsCol, orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },
};

// ===========================================================================
// Favorites
// ===========================================================================
const favoritesCol = collection(db, "favorites");

function favoriteId(uid, productId) {
  return `${uid}_${productId}`;
}

export const Favorites = {
  async addFavorite(uid, productId) {
    await setDoc(doc(favoritesCol, favoriteId(uid, productId)), {
      uid,
      productId,
      createdAt: serverTimestamp(),
    });
  },

  async removeFavorite(uid, productId) {
    await deleteDoc(doc(favoritesCol, favoriteId(uid, productId)));
  },

  subscribeFavorites(uid, callback) {
    const q = query(favoritesCol, where("uid", "==", uid), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => callback([]),
    );
  },
};

// ===========================================================================
// Cart — same one-doc-per-(user,product) shape as Favorites, plus a
// quantity field the user can adjust from the cart page.
// ===========================================================================
const cartItemsCol = collection(db, "cartItems");

function cartItemId(uid, productId) {
  return `${uid}_${productId}`;
}

export const Cart = {
  async addToCart(uid, productId, quantity) {
    await setDoc(doc(cartItemsCol, cartItemId(uid, productId)), {
      uid,
      productId,
      quantity,
      addedAt: serverTimestamp(),
    });
  },

  async updateCartQuantity(uid, productId, quantity) {
    await updateDoc(doc(cartItemsCol, cartItemId(uid, productId)), { quantity });
  },

  async removeFromCart(uid, productId) {
    await deleteDoc(doc(cartItemsCol, cartItemId(uid, productId)));
  },

  subscribeCart(uid, callback) {
    const q = query(cartItemsCol, where("uid", "==", uid), orderBy("addedAt", "desc"));
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => callback([]),
    );
  },
};

// ===========================================================================
// Product comments
// ===========================================================================
const commentsCol = collection(db, "productComments");

export const Comments = {
  async addProductComment(input) {
    await addDoc(commentsCol, { ...input, createdAt: serverTimestamp() });
  },

  async deleteProductComment(id) {
    await deleteDoc(doc(db, "productComments", id));
  },

  subscribeProductComments(productId, callback) {
    const q = query(commentsCol, where("productId", "==", productId), orderBy("createdAt", "desc"));
    return onSnapshot(
      q,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => callback([]),
    );
  },
};

// ===========================================================================
// Reviews
// ===========================================================================
const reviewsCol = collection(db, "reviews");

export const Reviews = {
  async createReview(input) {
    await addDoc(reviewsCol, { ...input, createdAt: serverTimestamp() });
  },

  async getUserReviews(uid) {
    const q = query(reviewsCol, where("toUid", "==", uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getUserRatingSummary(uid) {
    const reviews = await Reviews.getUserReviews(uid);
    if (reviews.length === 0) return { average: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / reviews.length, count: reviews.length };
  },

  async hasReviewedChat(fromUid, chatId) {
    const q = query(reviewsCol, where("fromUid", "==", fromUid), where("chatId", "==", chatId));
    const snap = await getDocs(q);
    return !snap.empty;
  },
};

// ===========================================================================
// Reports
// ===========================================================================
const reportsCol = collection(db, "reports");

export const Reports = {
  async createReport(input) {
    await addDoc(reportsCol, { ...input, status: "pending", adminNotes: "", createdAt: serverTimestamp() });
  },

  async listAllReports() {
    const snap = await getDocs(query(reportsCol, orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async updateReportStatus(id, status, adminNotes) {
    await updateDoc(doc(db, "reports", id), { status, adminNotes });
  },
};

// ===========================================================================
// Admin
// ===========================================================================
export const OWNER_EMAIL = "sgyiath@gmail.com";

export const Admin = {
  async grantSelfAdmin(uid, email) {
    await setDoc(doc(db, "admins", uid), { email, grantedAt: serverTimestamp() });
  },

  async grantAdmin(uid, email, adminModeCode) {
    await setDoc(doc(db, "admins", uid), { email, adminModeCode, grantedAt: serverTimestamp() });
  },

  async revokeAdmin(uid) {
    await deleteDoc(doc(db, "admins", uid));
  },

  async listAllAdmins() {
    const snap = await getDocs(collection(db, "admins"));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  },

  async setAdminModeCode(uid, code) {
    await updateDoc(doc(db, "admins", uid), { adminModeCode: code });
  },

  // Support-chat opt-in: an admin who flips this on shows up as a pickable
  // contact on the public "Contact Us" page.
  async setAcceptingSupport(uid, accepting) {
    await updateDoc(doc(db, "admins", uid), { acceptingSupport: accepting });
  },

  async listSupportAdmins() {
    const snap = await getDocs(query(collection(db, "admins"), where("acceptingSupport", "==", true)));
    return snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
  },

  async verifyAdminModeCode(uid, code) {
    const snap = await getDoc(doc(db, "admins", uid));
    if (!snap.exists()) return false;
    const stored = snap.data().adminModeCode;
    return Boolean(stored) && stored === code;
  },

  subscribeIsAdmin(uid, callback) {
    return onSnapshot(doc(db, "admins", uid), (snap) => callback(snap.exists()));
  },

  async listAllUsers() {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => d.data());
  },

  async deleteUserAccount(uid) {
    await deleteDoc(doc(db, "users", uid));
    await Admin.revokeAdmin(uid).catch(() => {});
  },

  async setUserStatus(uid, status, suspendedDays) {
    await updateDoc(doc(db, "users", uid), {
      status,
      suspendedUntil:
        status === "suspended" && suspendedDays
          ? Timestamp.fromDate(new Date(Date.now() + suspendedDays * 24 * 60 * 60 * 1000))
          : null,
    });
  },

  async listAllProductsForAdmin() {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async removeListingAdmin(id) {
    await deleteDoc(doc(db, "products", id));
  },

  async listAllProductComments() {
    const snap = await getDocs(query(collection(db, "productComments"), orderBy("createdAt", "desc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async removeProductCommentAdmin(id) {
    await deleteDoc(doc(db, "productComments", id));
  },

  async listMostActiveUsers(limitCount = 10) {
    const [users, products, sourcingRequests, comments, reviews] = await Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "products")),
      getDocs(collection(db, "sourcingRequests")),
      getDocs(collection(db, "productComments")),
      getDocs(collection(db, "reviews")),
    ]);

    const scores = new Map();
    function add(uid, weight) {
      if (!uid) return;
      scores.set(uid, (scores.get(uid) ?? 0) + weight);
    }
    products.docs.forEach((d) => add(d.data().ownerId, 3));
    sourcingRequests.docs.forEach((d) => add(d.data().ownerId, 3));
    comments.docs.forEach((d) => add(d.data().uid, 1));
    reviews.docs.forEach((d) => add(d.data().fromUid, 1));

    const userList = users.docs.map((d) => d.data());
    return userList
      .map((u) => ({
        uid: u.uid,
        fullName: u.fullName,
        email: u.email,
        accountType: u.accountType,
        score: scores.get(u.uid) ?? 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limitCount);
  },

  async listFarmerDealsRanking(limitCount = 10) {
    const snap = await getDocs(collection(db, "products"));
    const totals = new Map();
    snap.docs.forEach((d) => {
      const data = d.data();
      const current = totals.get(data.ownerId) ?? { fullName: data.ownerName, dealsCount: 0 };
      current.dealsCount += data.dealsCount ?? 0;
      totals.set(data.ownerId, current);
    });
    return Array.from(totals.entries())
      .map(([uid, v]) => ({ uid, fullName: v.fullName, dealsCount: v.dealsCount }))
      .sort((a, b) => b.dealsCount - a.dealsCount)
      .slice(0, limitCount);
  },

  async getPlatformAnalytics() {
    const usersSnap = await getDocs(collection(db, "users"));
    const users = usersSnap.docs.map((d) => d.data());
    const usersByRole = users.reduce((acc, u) => {
      acc[u.accountType] = (acc[u.accountType] ?? 0) + 1;
      return acc;
    }, {});

    const activeListingsSnap = await getCountFromServer(
      query(collection(db, "products"), where("status", "==", "active")),
    );
    const pendingReportsSnap = await getCountFromServer(
      query(collection(db, "reports"), where("status", "==", "pending")),
    );
    const commentsSnap = await getCountFromServer(collection(db, "productComments"));
    const adsSnap = await getCountFromServer(query(collection(db, "ads"), where("active", "==", true)));

    return {
      totalUsers: users.length,
      usersByRole,
      activeListings: activeListingsSnap.data().count,
      pendingReports: pendingReportsSnap.data().count,
      totalComments: commentsSnap.data().count,
      activeAds: adsSnap.data().count,
    };
  },
};

// ===========================================================================
// Site settings (settings/siteImages)
// ===========================================================================
const DEFAULT_SITE_IMAGES = {
  heroImages: ["images/hero-farmer.jpg"],
  categoryImages: {},
};
const siteImagesRef = doc(db, "settings", "siteImages");

const DEFAULT_SITE_CONTENT = { ar: {}, en: {} };
const siteContentRef = doc(db, "settings", "siteContent");

const DEFAULT_SITE_THEME = { primaryColor: null };
const siteThemeRef = doc(db, "settings", "siteTheme");

const DEFAULT_SOCIAL_LINKS = { links: [] };
const socialLinksRef = doc(db, "settings", "socialLinks");

const DEFAULT_AD_PLACEMENTS = {};
const adPlacementsRef = doc(db, "settings", "adPlacements");

const DEFAULT_CATEGORIES_CONFIG = { extra: [], hidden: [] };
const categoriesConfigRef = doc(db, "settings", "categories");

function slugify(name) {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || `category-${Date.now()}`
  );
}

export const SiteSettings = {
  async getSiteImagesOnce() {
    const snap = await getDoc(siteImagesRef);
    return snap.exists() ? { ...DEFAULT_SITE_IMAGES, ...snap.data() } : DEFAULT_SITE_IMAGES;
  },

  subscribeSiteImages(callback) {
    return onSnapshot(
      siteImagesRef,
      (snap) => callback(snap.exists() ? { ...DEFAULT_SITE_IMAGES, ...snap.data() } : DEFAULT_SITE_IMAGES),
      () => callback(DEFAULT_SITE_IMAGES),
    );
  },

  async updateHeroImages(heroImages) {
    await setDoc(siteImagesRef, { heroImages }, { merge: true });
  },

  async updateCategoryImage(category, url) {
    await setDoc(siteImagesRef, { categoryImages: { [category]: url } }, { merge: true });
  },

  async updateLogoUrl(url) {
    await setDoc(siteImagesRef, { logoUrl: url }, { merge: true });
  },

  async getSiteContentOnce() {
    const snap = await getDoc(siteContentRef);
    return snap.exists() ? { ...DEFAULT_SITE_CONTENT, ...snap.data() } : DEFAULT_SITE_CONTENT;
  },

  async updateSiteContent(locale, patch) {
    await setDoc(siteContentRef, { [locale]: patch }, { merge: true });
  },

  subscribeSiteTheme(callback) {
    return onSnapshot(
      siteThemeRef,
      (snap) => callback(snap.exists() ? { ...DEFAULT_SITE_THEME, ...snap.data() } : DEFAULT_SITE_THEME),
      () => callback(DEFAULT_SITE_THEME),
    );
  },

  async updateSiteTheme(primaryColor) {
    await setDoc(siteThemeRef, { primaryColor }, { merge: true });
  },

  subscribeSocialLinks(callback) {
    return onSnapshot(
      socialLinksRef,
      (snap) => callback(snap.exists() ? { ...DEFAULT_SOCIAL_LINKS, ...snap.data() } : DEFAULT_SOCIAL_LINKS),
      () => callback(DEFAULT_SOCIAL_LINKS),
    );
  },

  async updateSocialLinks(links) {
    await setDoc(socialLinksRef, { links }, { merge: true });
  },

  async getAdPlacementsOnce() {
    const snap = await getDoc(adPlacementsRef);
    return snap.exists() ? { ...DEFAULT_AD_PLACEMENTS, ...snap.data() } : DEFAULT_AD_PLACEMENTS;
  },

  subscribeAdPlacements(callback) {
    return onSnapshot(
      adPlacementsRef,
      (snap) => callback(snap.exists() ? { ...DEFAULT_AD_PLACEMENTS, ...snap.data() } : DEFAULT_AD_PLACEMENTS),
      () => callback(DEFAULT_AD_PLACEMENTS),
    );
  },

  async updateAdPlacementEnabled(placement, enabled) {
    await setDoc(adPlacementsRef, { [placement]: enabled }, { merge: true });
  },

  async getCategoriesConfigOnce() {
    const snap = await getDoc(categoriesConfigRef);
    return snap.exists() ? { ...DEFAULT_CATEGORIES_CONFIG, ...snap.data() } : DEFAULT_CATEGORIES_CONFIG;
  },

  subscribeCategoriesConfig(callback) {
    return onSnapshot(
      categoriesConfigRef,
      (snap) => callback(snap.exists() ? { ...DEFAULT_CATEGORIES_CONFIG, ...snap.data() } : DEFAULT_CATEGORIES_CONFIG),
      () => callback(DEFAULT_CATEGORIES_CONFIG),
    );
  },

  async addCustomCategory({ ar, en, imageUrl }) {
    const config = await SiteSettings.getCategoriesConfigOnce();
    const id = slugify(en);
    const next = [...config.extra.filter((c) => c.id !== id), { id, ar, en, imageUrl: imageUrl || null }];
    await setDoc(categoriesConfigRef, { extra: next }, { merge: true });
    return id;
  },

  async removeCustomCategory(id) {
    const config = await SiteSettings.getCategoriesConfigOnce();
    await setDoc(categoriesConfigRef, { extra: config.extra.filter((c) => c.id !== id) }, { merge: true });
  },

  async toggleCategoryHidden(id, hidden) {
    const config = await SiteSettings.getCategoriesConfigOnce();
    const nextHidden = hidden
      ? [...new Set([...config.hidden, id])]
      : config.hidden.filter((h) => h !== id);
    await setDoc(categoriesConfigRef, { hidden: nextHidden }, { merge: true });
  },
};
