const { dishes: defaultDishes } = require("../data/dishes");
const { DEFAULT_FAMILY_KEY, MENU_COLLECTION } = require("./config");

const LOCAL_MENU_KEY = "family_menu_dishes";
const MENU_DOC_ID = DEFAULT_FAMILY_KEY || "default_family";

function getAppInstance() {
  return getApp ? getApp() : null;
}

function isCloudReady() {
  const app = getAppInstance();
  return Boolean(app && app.globalData.cloudReady && wx.cloud);
}

function cloneDishes(dishes) {
  return dishes.map((dish) => ({
    ...dish,
    ingredients: Array.isArray(dish.ingredients) ? [...dish.ingredients] : []
  }));
}

function normalizeDish(dish) {
  return {
    id: dish.id || `dish_${Date.now()}`,
    name: dish.name || "",
    category: dish.category || "其他",
    tag: dish.tag || "家常",
    calories: dish.calories || "待补充",
    protein: dish.protein || "待补充",
    imageTone: dish.imageTone || "green",
    description: dish.description || "",
    ingredients: Array.isArray(dish.ingredients)
      ? dish.ingredients.filter(Boolean)
      : String(dish.ingredients || "")
          .split(/[、,\n]/)
          .map((item) => item.trim())
          .filter(Boolean),
    updatedAt: dish.updatedAt || Date.now()
  };
}

function getLocalDishes() {
  const cached = wx.getStorageSync(LOCAL_MENU_KEY);
  if (Array.isArray(cached) && cached.length) {
    return cached.map(normalizeDish);
  }
  return cloneDishes(defaultDishes).map(normalizeDish);
}

function setLocalDishes(dishes) {
  wx.setStorageSync(LOCAL_MENU_KEY, dishes.map(normalizeDish));
}

function getCategories(dishes) {
  const categories = ["全部"];
  dishes.forEach((dish) => {
    if (dish.category && !categories.includes(dish.category)) {
      categories.push(dish.category);
    }
  });
  return categories;
}

async function ensureCloudMenu(db) {
  try {
    const result = await db.collection(MENU_COLLECTION).doc(MENU_DOC_ID).get();
    if (result.data && Array.isArray(result.data.dishes)) {
      const dishes = result.data.dishes.map(normalizeDish);
      setLocalDishes(dishes);
      return dishes;
    }
  } catch (error) {
    await db.collection(MENU_COLLECTION).doc(MENU_DOC_ID).set({
      data: {
        familyKey: MENU_DOC_ID,
        dishes: getLocalDishes(),
        updatedAt: Date.now()
      }
    });
  }
  return getLocalDishes();
}

async function listDishes() {
  if (isCloudReady()) {
    const db = wx.cloud.database();
    return ensureCloudMenu(db);
  }
  return getLocalDishes();
}

async function saveDishes(dishes) {
  const normalized = dishes.map(normalizeDish);
  setLocalDishes(normalized);

  if (isCloudReady()) {
    const db = wx.cloud.database();
    await db.collection(MENU_COLLECTION).doc(MENU_DOC_ID).set({
      data: {
        familyKey: MENU_DOC_ID,
        dishes: normalized,
        updatedAt: Date.now()
      }
    });
  }

  return normalized;
}

async function upsertDish(dish) {
  const dishes = await listDishes();
  const normalized = normalizeDish({
    ...dish,
    id: dish.id || `dish_${Date.now()}`
  });
  const index = dishes.findIndex((item) => item.id === normalized.id);

  if (index >= 0) {
    dishes[index] = normalized;
  } else {
    dishes.unshift(normalized);
  }

  return saveDishes(dishes);
}

async function removeDish(id) {
  const dishes = await listDishes();
  return saveDishes(dishes.filter((dish) => dish.id !== id));
}

function watchDishes(onChange, onError) {
  if (!isCloudReady()) {
    onChange(getLocalDishes());
    return null;
  }

  const db = wx.cloud.database();
  return db.collection(MENU_COLLECTION).doc(MENU_DOC_ID).watch({
    onChange(snapshot) {
      const doc = snapshot.docs && snapshot.docs[0];
      if (doc && Array.isArray(doc.dishes)) {
        const dishes = doc.dishes.map(normalizeDish);
        setLocalDishes(dishes);
        onChange(dishes);
      }
    },
    onError
  });
}

module.exports = {
  getCategories,
  listDishes,
  removeDish,
  saveDishes,
  upsertDish,
  watchDishes
};
