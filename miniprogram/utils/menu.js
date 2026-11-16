const api = require("./api");
const session = require("./session");

let cache = null;

function storageKey() {
  return `menu_${session.familyId()}`;
}

function decorate(dish) {
  const meta = [];
  if (dish.calories) meta.push(dish.calories);
  if (dish.protein) meta.push(`蛋白质 ${dish.protein}`);
  return {
    ...dish,
    metaText: meta.join(" · "),
    ingredientText: dish.ingredients.join("、"),
    searchText: `${dish.name} ${dish.ingredients.join(" ")} ${dish.tags.join(" ")}`.toLowerCase()
  };
}

function rank(order, category) {
  return order[category] === undefined ? 999 : order[category];
}

function setCache(raw) {
  const categories = raw.categories || [];
  const order = {};
  categories.forEach((name, index) => {
    order[name] = index;
  });
  const dishes = (raw.dishes || [])
    .map(decorate)
    .sort((a, b) => rank(order, a.category) - rank(order, b.category));
  cache = { familyId: session.familyId(), categories, dishes };
  try {
    wx.setStorageSync(storageKey(), raw);
  } catch (error) {
    // 缓存失败不影响使用
  }
  return cache;
}

/** 立即可用的数据（内存或本地缓存），可能为空 */
function peek() {
  if (cache && cache.familyId === session.familyId()) {
    return cache;
  }
  const raw = wx.getStorageSync(storageKey());
  if (raw && raw.dishes) {
    return setCache(raw);
  }
  return null;
}

function fetch() {
  return api.call("listDishes").then(setCache);
}

function ensure() {
  const data = peek();
  return data ? Promise.resolve(data) : fetch();
}

function find(id) {
  const data = peek();
  return data ? data.dishes.find((dish) => dish.id === id) || null : null;
}

/** 本地更新单个菜品（保存后立即生效，无需重新拉取） */
function upsertLocal(dish) {
  const data = peek();
  if (!data) return;
  const raw = {
    categories: data.categories.includes(dish.category) ? data.categories : [...data.categories, dish.category],
    dishes: data.dishes.filter((item) => item.id !== dish.id).concat([dish])
  };
  setCache(raw);
}

function removeLocal(id) {
  const data = peek();
  if (!data) return;
  setCache({ categories: data.categories, dishes: data.dishes.filter((item) => item.id !== id) });
}

function setCategoriesLocal(categories) {
  const data = peek();
  if (!data) return;
  setCache({ categories, dishes: data.dishes });
}

module.exports = {
  peek,
  fetch,
  ensure,
  find,
  upsertLocal,
  removeLocal,
  setCategoriesLocal
};
