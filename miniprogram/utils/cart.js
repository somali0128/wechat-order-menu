const session = require("./session");

const TAB_INDEX = 1;

function key() {
  return `cart_${session.familyId()}`;
}

function get() {
  const list = wx.getStorageSync(key());
  return Array.isArray(list) ? list : [];
}

function save(list) {
  wx.setStorageSync(key(), list);
  updateBadge(list);
  return list;
}

function has(dishId) {
  return get().some((item) => item.dishId === dishId);
}

function toggle(dishId) {
  const list = get();
  const exists = list.some((item) => item.dishId === dishId);
  save(exists ? list.filter((item) => item.dishId !== dishId) : list.concat([{ dishId, quantity: 1 }]));
  return !exists;
}

function add(dishId, quantity = 1) {
  const list = get();
  if (!list.some((item) => item.dishId === dishId)) {
    list.push({ dishId, quantity });
    save(list);
  }
}

function setQuantity(dishId, quantity) {
  save(get().map((item) => (item.dishId === dishId ? { ...item, quantity } : item)));
}

function remove(dishId) {
  save(get().filter((item) => item.dishId !== dishId));
}

function clear() {
  save([]);
}

/** 移除已被删除的菜品 */
function prune(validIds) {
  const list = get();
  const next = list.filter((item) => validIds.includes(item.dishId));
  if (next.length !== list.length) {
    save(next);
  }
  return next;
}

function updateBadge(list = get()) {
  const count = list.length;
  const noop = () => {};
  if (count) {
    wx.setTabBarBadge({ index: TAB_INDEX, text: String(count), fail: noop });
  } else {
    wx.removeTabBarBadge({ index: TAB_INDEX, fail: noop });
  }
}

module.exports = {
  get,
  has,
  toggle,
  add,
  setQuantity,
  remove,
  clear,
  prune,
  updateBadge
};
