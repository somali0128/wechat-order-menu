const { db, _ } = require("../lib/cloud");
const { COLLECTIONS, getById, getAll, deleteFiles, loadContext } = require("../lib/store");
const { str, requiredStr, strList, isCloudFile } = require("../lib/utils");
const { checkText } = require("../lib/security");
const { fail } = require("../lib/errors");

function publicDish(dish) {
  return {
    id: dish._id,
    name: dish.name,
    category: dish.category,
    tags: dish.tags || [],
    cookTime: dish.cookTime || "",
    calories: dish.calories || "",
    protein: dish.protein || "",
    description: dish.description || "",
    ingredients: dish.ingredients || [],
    steps: dish.steps || "",
    image: dish.image || "",
    orderCount: dish.orderCount || 0,
    updatedAt: dish.updatedAt || 0
  };
}

function mergeCategories(familyCategories, dishes) {
  const result = [...(familyCategories || [])];
  dishes.forEach((dish) => {
    if (dish.category && !result.includes(dish.category)) {
      result.push(dish.category);
    }
  });
  return result;
}

async function requireDish(family, id) {
  const dish = await getById(COLLECTIONS.dishes, id);
  if (!dish || dish.familyId !== family._id) {
    fail("菜品不存在或已被删除", "NOT_FOUND");
  }
  return dish;
}

async function listDishes({ openid }) {
  const { family } = await loadContext(openid);
  const dishes = await getAll(COLLECTIONS.dishes, { familyId: family._id });
  return {
    categories: mergeCategories(family.categories, dishes),
    dishes: dishes.map(publicDish)
  };
}

async function getDish({ openid, data }) {
  const { family } = await loadContext(openid);
  const dish = await requireDish(family, data.id);
  return publicDish(dish);
}

async function addCategoryIfMissing(family, category) {
  if (!(family.categories || []).includes(category)) {
    await db.collection(COLLECTIONS.families).doc(family._id).update({
      data: { categories: _.push([category]), updatedAt: Date.now() }
    });
  }
}

async function saveDish({ openid, data }) {
  const { family } = await loadContext(openid);
  const input = data.dish || {};
  const dish = {
    name: requiredStr(input.name, 20, "菜名"),
    category: requiredStr(input.category, 10, "分类"),
    tags: strList(input.tags, { maxItems: 5, maxLength: 8, label: "标签" }),
    cookTime: str(input.cookTime, 12, "制作时长"),
    calories: str(input.calories, 16, "热量"),
    protein: str(input.protein, 16, "蛋白质"),
    description: str(input.description, 200, "简介"),
    ingredients: strList(input.ingredients, { maxItems: 50, maxLength: 20, label: "食材" }),
    steps: str(input.steps, 2000, "做法"),
    image: str(input.image, 500)
  };
  if (!dish.ingredients.length) {
    fail("请至少填写一种食材");
  }
  if (dish.image && !isCloudFile(dish.image)) {
    fail("图片地址无效");
  }
  await checkText(openid, dish.name, dish.category, dish.tags, dish.description, dish.ingredients, dish.steps);

  const now = Date.now();
  let id = input.id;

  if (id) {
    const old = await requireDish(family, id);
    await db.collection(COLLECTIONS.dishes).doc(id).update({
      data: { ...dish, updatedAt: now }
    });
    if (old.image && old.image !== dish.image) {
      await deleteFiles([old.image]);
    }
  } else {
    const count = await db.collection(COLLECTIONS.dishes).where({ familyId: family._id }).count();
    if (count.total >= 500) {
      fail("菜品数量已达上限（500）");
    }
    const res = await db.collection(COLLECTIONS.dishes).add({
      data: {
        ...dish,
        familyId: family._id,
        orderCount: 0,
        createdBy: openid,
        createdAt: now,
        updatedAt: now
      }
    });
    id = res._id;
  }

  await addCategoryIfMissing(family, dish.category);
  return publicDish({ ...dish, _id: id, updatedAt: now });
}

async function removeDish({ openid, data }) {
  const { family } = await loadContext(openid);
  const dish = await requireDish(family, data.id);
  await db.collection(COLLECTIONS.dishes).doc(dish._id).remove();
  await deleteFiles([dish.image]);
  return true;
}

async function saveCategories({ openid, data }) {
  const { family } = await loadContext(openid);
  const categories = strList(data.categories, { maxItems: 30, maxLength: 10, label: "分类" });
  const dishes = await getAll(COLLECTIONS.dishes, { familyId: family._id });
  const used = mergeCategories([], dishes);
  const missing = used.filter((item) => !categories.includes(item));
  if (missing.length) {
    fail(`分类「${missing[0]}」下还有菜品，不能删除`);
  }
  const added = categories.filter((item) => !(family.categories || []).includes(item));
  await checkText(openid, added);
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { categories, updatedAt: Date.now() }
  });
  return categories;
}

async function renameCategory({ openid, data }) {
  const { family } = await loadContext(openid);
  const from = requiredStr(data.from, 10, "原分类");
  const to = requiredStr(data.to, 10, "新分类名称");
  if (from === to) {
    return family.categories || [];
  }
  const dishes = await getAll(COLLECTIONS.dishes, { familyId: family._id });
  const categories = mergeCategories(family.categories, dishes);
  if (categories.includes(to)) {
    fail("已存在同名分类");
  }
  await checkText(openid, to);
  const next = categories.map((item) => (item === from ? to : item));
  await db
    .collection(COLLECTIONS.dishes)
    .where({ familyId: family._id, category: from })
    .update({ data: { category: to, updatedAt: Date.now() } });
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { categories: next, updatedAt: Date.now() }
  });
  return next;
}

module.exports = {
  listDishes,
  getDish,
  saveDish,
  removeDish,
  saveCategories,
  renameCategory,
  publicDish
};
