const api = require("./api");
const menu = require("./menu");

const RECENT_KEY = "recent_visits";
let current = null;

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function remember(code, name) {
  const list = (wx.getStorageSync(RECENT_KEY) || []).filter((item) => item.code !== code);
  list.unshift({ code, name, at: Date.now() });
  wx.setStorageSync(RECENT_KEY, list.slice(0, 6));
}

function recent() {
  const list = wx.getStorageSync(RECENT_KEY);
  return Array.isArray(list) ? list : [];
}

function forget(code) {
  wx.setStorageSync(
    RECENT_KEY,
    recent().filter((item) => item.code !== code)
  );
}

/** 打开某个家庭的菜单（会记录一次来访） */
async function open(rawCode) {
  const code = normalizeCode(rawCode);
  try {
    const res = await api.call("visitFamily", { code });
    current = { ...res, code, dishes: res.dishes.map(menu.decorate) };
    if (!res.isMine) remember(code, res.family.name);
    return current;
  } catch (error) {
    if (error.code === "BAD_CODE") forget(code);
    throw error;
  }
}

function get(code) {
  return current && current.code === normalizeCode(code) ? current : null;
}

function find(code, id) {
  const data = get(code);
  return data ? data.dishes.find((dish) => dish.id === id) || null : null;
}

function patch(code, id, fields) {
  const dish = find(code, id);
  if (dish) Object.assign(dish, fields);
}

async function toggleLike(code, id) {
  const res = await api.call("toggleLike", { code: normalizeCode(code), dishId: id });
  patch(code, id, { liked: res.liked, likeCount: res.likeCount });
  return res;
}

async function copy(code, id) {
  const dish = await api.call("copyDish", { code: normalizeCode(code), dishId: id }, { loading: "正在加入" });
  patch(code, id, { copied: true });
  menu.upsertLocal(dish);
  return dish;
}

module.exports = { open, get, find, recent, toggleLike, copy, normalizeCode };
