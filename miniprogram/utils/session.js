let current = null;
let pending = null;

function login(force = false) {
  const api = require("./api");
  if (current && !force) {
    return Promise.resolve(current);
  }
  if (pending) {
    return pending;
  }
  pending = api
    .call("login")
    .then((res) => {
      current = res;
      pending = null;
      return res;
    })
    .catch((error) => {
      pending = null;
      throw error;
    });
  return pending;
}

/**
 * 页面守卫：确保已登录且已加入家庭，否则跳转欢迎页。
 * 返回 session；未加入家庭或出错时返回 null。
 */
async function requireFamily() {
  try {
    const session = await login();
    if (!session.family) {
      wx.reLaunch({ url: "/pages/welcome/welcome" });
      return null;
    }
    return session;
  } catch (error) {
    if (error.code === "NOT_CONFIGURED") {
      wx.reLaunch({ url: "/pages/welcome/welcome" });
      return null;
    }
    wx.showToast({ title: error.message, icon: "none" });
    return null;
  }
}

function get() {
  return current;
}

function setFamily(family) {
  if (current) {
    current.family = family;
  }
}

function setUser(user) {
  if (current) {
    current.user = { ...current.user, ...user };
  }
}

function reset() {
  current = null;
  pending = null;
}

function familyId() {
  return current && current.family ? current.family.id : "";
}

function templates() {
  return (current && current.templates) || {};
}

module.exports = {
  login,
  requireFamily,
  get,
  setFamily,
  setUser,
  reset,
  familyId,
  templates
};
