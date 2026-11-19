const { db, _, cloud } = require("../lib/cloud");
const { COLLECTIONS, getById, getAll, loadContext } = require("../lib/store");
const { str, int, cnDateKey, isCloudFile } = require("../lib/utils");
const { fail } = require("../lib/errors");
const { ensureVisitCode } = require("../lib/codes");
const { publicDish, mergeCategories, addCategoryIfMissing } = require("./dish");

const FAVORITE_CATEGORY = "收藏";

async function findByVisitCode(code) {
  const value = str(code, 12).toUpperCase();
  if (!value) {
    fail("请输入访问码");
  }
  const res = await db.collection(COLLECTIONS.families).where({ visitCode: value }).limit(1).get();
  if (!res.data[0]) {
    const invite = await db.collection(COLLECTIONS.families).where({ inviteCode: value }).count();
    fail(invite.total ? "这是邀请码，请向对方要「访问码」来浏览菜单" : "访问码无效或已被重置，请向对方确认", "BAD_CODE");
  }
  return res.data[0];
}

async function requireTargetDish(target, dishId) {
  const dish = await getById(COLLECTIONS.dishes, dishId);
  if (!dish || dish.familyId !== target._id) {
    fail("这道菜已被主人删除", "NOT_FOUND");
  }
  return dish;
}

function toggleName(list, name, add) {
  const rest = (list || []).filter((item) => item !== name);
  return add ? rest.concat([name]) : rest;
}

/** 记录来访：同一访客同一天合并为一条 */
async function recordVisit(target, user, userFamily, change = {}) {
  if (user.familyId && user.familyId === target._id) {
    return;
  }
  const now = Date.now();
  const date = cnDateKey(now);
  const id = `${target._id}_${user._id}_${date}`;
  const exist = await getById(COLLECTIONS.visits, id);
  let likes = (exist && exist.likes) || [];
  let copies = (exist && exist.copies) || [];
  if (change.like) likes = toggleName(likes, change.like, true);
  if (change.unlike) likes = toggleName(likes, change.unlike, false);
  if (change.copy) copies = toggleName(copies, change.copy, true);

  const data = {
    familyId: target._id,
    visitorOpenid: user._id,
    visitorName: user.nickName || "微信用户",
    visitorAvatar: user.avatarUrl || "",
    visitorFamilyName: userFamily ? userFamily.name : "",
    date,
    likes,
    copies,
    lastAt: now
  };
  if (exist) {
    await db.collection(COLLECTIONS.visits).doc(id).update({ data });
  } else {
    await db.collection(COLLECTIONS.visits).doc(id).set({ data: { ...data, firstAt: now } });
  }
}

function visitorDish(dish, likedSet, copiedSet) {
  const result = publicDish(dish);
  delete result.orderCount; // 不对外展示家庭点菜频率
  return { ...result, liked: likedSet.has(dish._id), copied: copiedSet.has(dish._id) };
}

async function visitFamily({ openid, data }) {
  const { user, family: mine } = await loadContext(openid, { requireFamily: false });
  const target = await findByVisitCode(data.code);
  if (mine && mine._id === target._id) {
    return { isMine: true };
  }

  const [dishes, likes, members, copies] = await Promise.all([
    getAll(COLLECTIONS.dishes, { familyId: target._id }),
    getAll(COLLECTIONS.likes, { familyId: target._id, openid }),
    db.collection(COLLECTIONS.users).where({ familyId: target._id }).count(),
    mine ? getAll(COLLECTIONS.dishes, { familyId: mine._id, sourceFamilyId: target._id }) : Promise.resolve([])
  ]);
  await recordVisit(target, user, mine);

  const likedSet = new Set(likes.map((item) => item.dishId));
  const copiedSet = new Set(copies.map((item) => item.sourceDishId));
  return {
    isMine: false,
    canCopy: Boolean(mine),
    family: {
      name: target.name,
      visitCode: target.visitCode,
      memberCount: members.total,
      dishCount: dishes.length
    },
    categories: mergeCategories(target.categories, dishes),
    dishes: dishes.map((dish) => visitorDish(dish, likedSet, copiedSet))
  };
}

async function toggleLike({ openid, data }) {
  const { user, family: mine } = await loadContext(openid, { requireFamily: false });
  const target = await findByVisitCode(data.code);
  const dish = await requireTargetDish(target, data.dishId);
  const id = `${dish._id}_${openid}`;
  const exist = await getById(COLLECTIONS.likes, id);

  if (exist) {
    await db.collection(COLLECTIONS.likes).doc(id).remove();
    await db.collection(COLLECTIONS.dishes).doc(dish._id).update({ data: { likeCount: _.inc(-1) } });
  } else {
    await db.collection(COLLECTIONS.likes).doc(id).set({
      data: { familyId: target._id, dishId: dish._id, openid, createdAt: Date.now() }
    });
    await db.collection(COLLECTIONS.dishes).doc(dish._id).update({ data: { likeCount: _.inc(1) } });
  }
  await recordVisit(target, user, mine, exist ? { unlike: dish.name } : { like: dish.name });

  const fresh = await getById(COLLECTIONS.dishes, dish._id);
  return { liked: !exist, likeCount: Math.max(0, (fresh && fresh.likeCount) || 0) };
}

async function copyImage(fileID, familyId) {
  if (!isCloudFile(fileID)) {
    return "";
  }
  try {
    const file = await cloud.downloadFile({ fileID });
    const ext = (fileID.match(/\.(\w+)$/) || [])[1] || "jpg";
    const name = `copy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const res = await cloud.uploadFile({ cloudPath: `dishes/${familyId}/${name}`, fileContent: file.fileContent });
    return res.fileID;
  } catch (error) {
    console.warn("copy image failed", error.errCode || error.message);
    return "";
  }
}

async function copyDish({ openid, data }) {
  const { user, family: mine } = await loadContext(openid, { requireFamily: false });
  if (!mine) {
    fail("创建或加入家庭后，才能把菜加入自己的菜谱", "NEED_FAMILY");
  }
  const target = await findByVisitCode(data.code);
  if (target._id === mine._id) {
    fail("这已经是你家的菜了");
  }
  const dish = await requireTargetDish(target, data.dishId);
  const [dup, count] = await Promise.all([
    db.collection(COLLECTIONS.dishes).where({ familyId: mine._id, sourceDishId: dish._id }).count(),
    db.collection(COLLECTIONS.dishes).where({ familyId: mine._id }).count()
  ]);
  if (dup.total) {
    fail("这道菜已经在你的菜谱里了");
  }
  if (count.total >= 500) {
    fail("菜品数量已达上限（500）");
  }

  const now = Date.now();
  const copy = {
    familyId: mine._id,
    name: dish.name,
    category: FAVORITE_CATEGORY,
    tags: dish.tags || [],
    cookTime: dish.cookTime || "",
    calories: dish.calories || "",
    protein: dish.protein || "",
    description: dish.description || "",
    ingredients: dish.ingredients || [],
    steps: dish.steps || "",
    image: await copyImage(dish.image, mine._id),
    orderCount: 0,
    likeCount: 0,
    sourceDishId: dish._id,
    sourceFamilyId: target._id,
    sourceFamilyName: target.name,
    createdBy: openid,
    createdAt: now,
    updatedAt: now
  };
  const res = await db.collection(COLLECTIONS.dishes).add({ data: copy });
  await addCategoryIfMissing(mine, FAVORITE_CATEGORY);
  await recordVisit(target, user, mine, { copy: dish.name });
  return publicDish({ ...copy, _id: res._id });
}

async function recommendFamilies({ openid }) {
  const { family: mine } = await loadContext(openid, { requireFamily: false });
  const res = await db
    .collection(COLLECTIONS.families)
    .aggregate()
    .match({ openBrowse: true })
    .sample({ size: 12 })
    .end();
  const candidates = (res.list || []).filter((family) => !mine || family._id !== mine._id);

  const cards = await Promise.all(
    candidates.map(async (family) => {
      const [previews, count] = await Promise.all([
        db.collection(COLLECTIONS.dishes).where({ familyId: family._id }).orderBy("likeCount", "desc").limit(3).get(),
        db.collection(COLLECTIONS.dishes).where({ familyId: family._id }).count()
      ]);
      if (!count.total) {
        return null;
      }
      return {
        name: family.name,
        visitCode: await ensureVisitCode(family),
        dishCount: count.total,
        previews: previews.data.map((dish) => ({ name: dish.name, image: dish.image || "" }))
      };
    })
  );
  return cards.filter(Boolean).slice(0, 6);
}

async function listVisitors({ openid, data }) {
  const { family } = await loadContext(openid);
  const offset = int(data.offset, 0, 100000, 0);
  const limit = int(data.limit, 1, 50, 20);
  const [res, today] = await Promise.all([
    db
      .collection(COLLECTIONS.visits)
      .where({ familyId: family._id })
      .orderBy("lastAt", "desc")
      .skip(offset)
      .limit(limit + 1)
      .get(),
    db.collection(COLLECTIONS.visits).where({ familyId: family._id, date: cnDateKey() }).count()
  ]);
  return {
    todayCount: today.total,
    hasMore: res.data.length > limit,
    list: res.data.slice(0, limit).map((visit) => ({
      id: visit._id,
      name: visit.visitorName,
      avatar: visit.visitorAvatar,
      familyName: visit.visitorFamilyName,
      date: visit.date,
      lastAt: visit.lastAt,
      likes: visit.likes || [],
      copies: visit.copies || []
    }))
  };
}

module.exports = {
  visitFamily,
  toggleLike,
  copyDish,
  recommendFamilies,
  listVisitors
};
