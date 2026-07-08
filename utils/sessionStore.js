const { DEFAULT_FAMILY_KEY } = require("./config");

const SESSION_KEY = "family_menu_session";
const FAMILY_KEY = "family_menu_family_key";

function getAppInstance() {
  return getApp ? getApp() : null;
}

function isCloudReady() {
  const app = getAppInstance();
  return Boolean(app && app.globalData.cloudReady && wx.cloud);
}

function getStoredSession() {
  return wx.getStorageSync(SESSION_KEY) || null;
}

function setStoredSession(session) {
  wx.setStorageSync(SESSION_KEY, session);
  const app = getAppInstance();
  if (app) {
    app.globalData.session = session;
  }
}

function getFamilyKey() {
  return wx.getStorageSync(FAMILY_KEY) || DEFAULT_FAMILY_KEY || "default_family";
}

function setFamilyKey(familyKey) {
  const normalized = normalizeFamilyKey(familyKey);
  wx.setStorageSync(FAMILY_KEY, normalized);
  const app = getAppInstance();
  if (app) {
    app.globalData.familyKey = normalized;
  }
  return normalized;
}

function normalizeFamilyKey(value) {
  return String(value || "")
    .trim()
    .replace(/[^\w-]/g, "")
    .slice(0, 48) || DEFAULT_FAMILY_KEY || "default_family";
}

function createFamilyKey(openid) {
  const seed = openid || `local_${Date.now()}`;
  return `family_${String(seed).slice(-12)}`;
}

async function login() {
  if (isCloudReady()) {
    const result = await wx.cloud.callFunction({
      name: "login",
      data: {}
    });
    const data = result.result || {};
    const session = {
      openid: data.openid || "",
      unionid: data.unionid || "",
      appid: data.appid || "",
      loginAt: Date.now(),
      cloud: true
    };
    setStoredSession(session);

    if (!getFamilyKey() || getFamilyKey() === DEFAULT_FAMILY_KEY) {
      setFamilyKey(createFamilyKey(session.openid));
    }

    return session;
  }

  const localSession = {
    openid: `local_${Date.now()}`,
    unionid: "",
    appid: "",
    loginAt: Date.now(),
    cloud: false
  };
  setStoredSession(localSession);
  return localSession;
}

function buildSharePath(pagePath = "/pages/profile/profile") {
  return `${pagePath}?familyKey=${encodeURIComponent(getFamilyKey())}`;
}

module.exports = {
  buildSharePath,
  createFamilyKey,
  getFamilyKey,
  getStoredSession,
  login,
  normalizeFamilyKey,
  setFamilyKey
};
