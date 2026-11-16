const { db, _ } = require("../lib/cloud");
const { COLLECTIONS, getById, getAll, loadContext } = require("../lib/store");
const { str, int, makeOrderNo } = require("../lib/utils");
const { checkText } = require("../lib/security");
const { fail } = require("../lib/errors");
const { sendSubscribe } = require("../lib/notify");

const STATUS = {
  pending: "已下单",
  shopping: "采购中",
  cooking: "制作中",
  done: "已完成",
  cancelled: "已取消"
};

const ACTIVE = ["pending", "shopping", "cooking"];

const TRANSITIONS = {
  pending: ["shopping", "cooking", "cancelled"],
  shopping: ["cooking", "cancelled"],
  cooking: ["done", "cancelled"],
  done: [],
  cancelled: []
};

const MEAL_TYPES = ["早餐", "午餐", "晚餐", "加餐"];

function publicOrder(order, openid, ownerOpenid) {
  return {
    id: order._id,
    orderNo: order.orderNo,
    status: order.status,
    statusText: STATUS[order.status] || order.status,
    mealDate: order.mealDate,
    mealType: order.mealType,
    people: order.people,
    remark: order.remark || "",
    dishes: order.dishes || [],
    ingredients: order.ingredients || [],
    creatorOpenid: order.creatorOpenid,
    creatorName: order.creatorName || "家人",
    creatorAvatar: order.creatorAvatar || "",
    logs: order.logs || [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    canCancel: ACTIVE.includes(order.status),
    canDelete: !ACTIVE.includes(order.status) && (order.creatorOpenid === openid || ownerOpenid === openid)
  };
}

async function requireOrder(family, id) {
  const order = await getById(COLLECTIONS.orders, id);
  if (!order || order.familyId !== family._id) {
    fail("订单不存在或已被删除", "NOT_FOUND");
  }
  return order;
}

async function otherMembers(familyId, openid) {
  const users = await getAll(COLLECTIONS.users, { familyId }, "createdAt");
  return users.map((user) => user._id).filter((id) => id !== openid);
}

async function createOrder({ openid, data }) {
  const { user, family } = await loadContext(openid);
  const items = Array.isArray(data.items) ? data.items.slice(0, 50) : [];
  if (!items.length) {
    fail("请先选择菜品");
  }
  const mealDate = str(data.mealDate, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate)) {
    fail("请选择用餐日期");
  }
  const mealType = MEAL_TYPES.includes(data.mealType) ? data.mealType : "晚餐";
  const people = int(data.people, 1, 50, 2);
  const remark = str(data.remark, 100, "备注");
  await checkText(openid, remark);

  const ids = items.map((item) => item.dishId).filter(Boolean);
  const res = await db
    .collection(COLLECTIONS.dishes)
    .where({ familyId: family._id, _id: _.in(ids) })
    .limit(100)
    .get();
  const dishMap = {};
  res.data.forEach((dish) => {
    dishMap[dish._id] = dish;
  });

  const dishes = [];
  items.forEach((item) => {
    const dish = dishMap[item.dishId];
    if (dish && !dishes.some((exist) => exist.dishId === dish._id)) {
      dishes.push({
        dishId: dish._id,
        name: dish.name,
        image: dish.image || "",
        category: dish.category,
        quantity: int(item.quantity, 1, 20, 1)
      });
    }
  });
  if (!dishes.length) {
    fail("所选菜品已被删除，请重新选择");
  }

  const readySet = new Set(Array.isArray(data.readyIngredients) ? data.readyIngredients : []);
  const ingredientNames = [];
  dishes.forEach((item) => {
    (dishMap[item.dishId].ingredients || []).forEach((name) => {
      if (!ingredientNames.includes(name)) {
        ingredientNames.push(name);
      }
    });
  });

  const now = Date.now();
  const creatorName = user.nickName || "家人";
  const order = {
    familyId: family._id,
    orderNo: makeOrderNo(now),
    status: "pending",
    mealDate,
    mealType,
    people,
    remark,
    dishes,
    ingredients: ingredientNames.map((name) => ({ name, ready: readySet.has(name) })),
    creatorOpenid: openid,
    creatorName,
    creatorAvatar: user.avatarUrl || "",
    logs: [{ status: "pending", by: openid, byName: creatorName, at: now }],
    createdAt: now,
    updatedAt: now
  };
  const added = await db.collection(COLLECTIONS.orders).add({ data: order });
  order._id = added._id;

  await Promise.all(
    dishes.map((item) =>
      db
        .collection(COLLECTIONS.dishes)
        .doc(item.dishId)
        .update({ data: { orderCount: _.inc(1) } })
        .catch(() => null)
    )
  );

  await sendSubscribe("newOrder", await otherMembers(family._id, openid), order, {
    envVersion: data.envVersion
  });

  return publicOrder(order, openid, family.ownerOpenid);
}

async function listOrders({ openid, data }) {
  const { family } = await loadContext(openid);
  const where = { familyId: family._id };
  if (data.status === "active") {
    where.status = _.in(ACTIVE);
  } else if (data.status === "done") {
    where.status = "done";
  }
  const offset = int(data.offset, 0, 100000, 0);
  const limit = int(data.limit, 1, 100, 20);
  const res = await db
    .collection(COLLECTIONS.orders)
    .where(where)
    .orderBy("createdAt", "desc")
    .skip(offset)
    .limit(limit + 1)
    .get();
  return {
    list: res.data.slice(0, limit).map((order) => publicOrder(order, openid, family.ownerOpenid)),
    hasMore: res.data.length > limit
  };
}

async function getOrder({ openid, data }) {
  const { family } = await loadContext(openid);
  const order = await requireOrder(family, data.id);
  return publicOrder(order, openid, family.ownerOpenid);
}

async function updateOrderStatus({ openid, data }) {
  const { user, family } = await loadContext(openid);
  const order = await requireOrder(family, data.id);
  const status = data.status;
  if (!STATUS[status]) {
    fail("状态无效");
  }
  if (order.status === status) {
    return publicOrder(order, openid, family.ownerOpenid);
  }
  if (!(TRANSITIONS[order.status] || []).includes(status)) {
    fail(`订单${STATUS[order.status]}，无法改为${STATUS[status]}`);
  }

  const now = Date.now();
  const actorName = user.nickName || "家人";
  const log = { status, by: openid, byName: actorName, at: now };
  await db
    .collection(COLLECTIONS.orders)
    .doc(order._id)
    .update({ data: { status, updatedAt: now, logs: _.push([log]) } });

  const next = { ...order, status, updatedAt: now, logs: [...(order.logs || []), log] };

  if (order.creatorOpenid !== openid) {
    await sendSubscribe("statusChange", [order.creatorOpenid], next, {
      actorName,
      statusText: STATUS[status],
      envVersion: data.envVersion
    });
  }

  return publicOrder(next, openid, family.ownerOpenid);
}

async function toggleIngredient({ openid, data }) {
  const { family } = await loadContext(openid);
  const order = await requireOrder(family, data.id);
  const index = (order.ingredients || []).findIndex((item) => item.name === data.name);
  if (index < 0) {
    fail("食材不存在");
  }
  const ready = Boolean(data.ready);
  await db
    .collection(COLLECTIONS.orders)
    .doc(order._id)
    .update({ data: { [`ingredients.${index}.ready`]: ready, updatedAt: Date.now() } });
  return { name: data.name, ready };
}

async function deleteOrder({ openid, data }) {
  const { family } = await loadContext(openid);
  const order = await requireOrder(family, data.id);
  if (ACTIVE.includes(order.status)) {
    fail("进行中的订单请先取消");
  }
  if (order.creatorOpenid !== openid && family.ownerOpenid !== openid) {
    fail("只有下单人或管理员可以删除");
  }
  await db.collection(COLLECTIONS.orders).doc(order._id).remove();
  return true;
}

module.exports = {
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  toggleIngredient,
  deleteOrder
};
