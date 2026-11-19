const { db, _ } = require("../lib/cloud");
const { COLLECTIONS, getById, getAll, deleteFiles, loadContext } = require("../lib/store");
const { requiredStr, str } = require("../lib/utils");
const { checkText } = require("../lib/security");
const { fail } = require("../lib/errors");
const { publicFamily } = require("./user");
const seed = require("../seed");
const { generateCode, ensureVisitCode } = require("../lib/codes");
const { cnDateKey } = require("../lib/utils");

async function listMembers(family, openid) {
  const users = await getAll(COLLECTIONS.users, { familyId: family._id }, "joinedAt", "asc");
  return users
    .map((user) => ({
      openid: user._id,
      nickName: user.nickName || "家庭成员",
      avatarUrl: user.avatarUrl || "",
      isOwner: user._id === family.ownerOpenid,
      isMe: user._id === openid,
      joinedAt: user.joinedAt || 0
    }))
    .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || a.joinedAt - b.joinedAt);
}

async function createFamily({ openid, data }) {
  const { user } = await loadContext(openid, { requireFamily: false });
  if (user.familyId && (await getById(COLLECTIONS.families, user.familyId))) {
    fail("你已经加入了一个家庭");
  }
  const name = requiredStr(data.name, 16, "家庭名称");
  await checkText(openid, name);

  const now = Date.now();
  const withSample = data.withSample !== false;
  const family = {
    name,
    inviteCode: await generateCode(),
    visitCode: await generateCode(),
    openBrowse: false,
    ownerOpenid: openid,
    categories: withSample ? [...seed.categories] : [],
    createdAt: now,
    updatedAt: now
  };
  const res = await db.collection(COLLECTIONS.families).add({ data: family });
  const familyId = res._id;

  if (withSample) {
    await Promise.all(
      seed.dishes.map((dish, index) =>
        db.collection(COLLECTIONS.dishes).add({
          data: {
            familyId,
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
            orderCount: 0,
            likeCount: 0,
            createdBy: openid,
            createdAt: now + index,
            updatedAt: now + index
          }
        })
      )
    );
  }

  await db.collection(COLLECTIONS.users).doc(openid).update({
    data: { familyId, joinedAt: now, updatedAt: now }
  });

  return publicFamily({ ...family, _id: familyId }, openid);
}

async function joinFamily({ openid, data }) {
  const { user } = await loadContext(openid, { requireFamily: false });
  const code = str(data.code, 12).toUpperCase();
  if (!code) {
    fail("请输入邀请码");
  }
  const res = await db.collection(COLLECTIONS.families).where({ inviteCode: code }).limit(1).get();
  const family = res.data[0];
  if (!family) {
    const visit = await db.collection(COLLECTIONS.families).where({ visitCode: code }).count();
    fail(visit.total ? "这是访问码，只能浏览菜单；加入家庭需要邀请码" : "邀请码无效，请向家人确认");
  }
  if (user.familyId === family._id) {
    return publicFamily(family, openid);
  }
  if (user.familyId && (await getById(COLLECTIONS.families, user.familyId))) {
    fail("你已在其他家庭中，请先退出");
  }
  const now = Date.now();
  await db.collection(COLLECTIONS.users).doc(openid).update({
    data: { familyId: family._id, joinedAt: now, updatedAt: now }
  });
  return publicFamily(family, openid);
}

async function getFamily({ openid }) {
  const { family } = await loadContext(openid);
  await ensureVisitCode(family);
  const [members, dishCount, orderCount, activeCount, visitorsToday] = await Promise.all([
    listMembers(family, openid),
    db.collection(COLLECTIONS.dishes).where({ familyId: family._id }).count(),
    db.collection(COLLECTIONS.orders).where({ familyId: family._id }).count(),
    db
      .collection(COLLECTIONS.orders)
      .where({ familyId: family._id, status: _.in(["pending", "shopping", "cooking"]) })
      .count(),
    db.collection(COLLECTIONS.visits).where({ familyId: family._id, date: cnDateKey() }).count()
  ]);
  return {
    family: publicFamily(family, openid),
    members,
    stats: {
      dishes: dishCount.total,
      orders: orderCount.total,
      active: activeCount.total,
      members: members.length,
      visitorsToday: visitorsToday.total
    }
  };
}

async function updateFamily({ openid, data }) {
  const { family } = await loadContext(openid, { requireOwner: true });
  const name = requiredStr(data.name, 16, "家庭名称");
  await checkText(openid, name);
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { name, updatedAt: Date.now() }
  });
  return publicFamily({ ...family, name }, openid);
}

async function resetInviteCode({ openid }) {
  const { family } = await loadContext(openid, { requireOwner: true });
  const inviteCode = await generateCode();
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { inviteCode, updatedAt: Date.now() }
  });
  return publicFamily({ ...family, inviteCode }, openid);
}

async function resetVisitCode({ openid }) {
  const { family } = await loadContext(openid, { requireOwner: true });
  const visitCode = await generateCode();
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { visitCode, updatedAt: Date.now() }
  });
  return publicFamily({ ...family, visitCode }, openid);
}

async function setOpenBrowse({ openid, data }) {
  const { family } = await loadContext(openid, { requireOwner: true });
  const openBrowse = Boolean(data.open);
  await ensureVisitCode(family);
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { openBrowse, updatedAt: Date.now() }
  });
  return publicFamily({ ...family, openBrowse }, openid);
}

async function requireMember(family, target) {
  const member = await getById(COLLECTIONS.users, target);
  if (!member || member.familyId !== family._id) {
    fail("该成员不在家庭中");
  }
  return member;
}

async function removeMember({ openid, data }) {
  const { family } = await loadContext(openid, { requireOwner: true });
  if (data.openid === openid) {
    fail("不能移除自己");
  }
  await requireMember(family, data.openid);
  await db.collection(COLLECTIONS.users).doc(data.openid).update({
    data: { familyId: "", updatedAt: Date.now() }
  });
  return true;
}

async function transferOwner({ openid, data }) {
  const { family } = await loadContext(openid, { requireOwner: true });
  if (data.openid === openid) {
    fail("你已经是管理员");
  }
  await requireMember(family, data.openid);
  await db.collection(COLLECTIONS.families).doc(family._id).update({
    data: { ownerOpenid: data.openid, updatedAt: Date.now() }
  });
  return true;
}

async function dissolveFamily(family) {
  const dishes = await getAll(COLLECTIONS.dishes, { familyId: family._id });
  await deleteFiles(dishes.map((dish) => dish.image));
  await db.collection(COLLECTIONS.dishes).where({ familyId: family._id }).remove();
  await db.collection(COLLECTIONS.orders).where({ familyId: family._id }).remove();
  await db.collection(COLLECTIONS.likes).where({ familyId: family._id }).remove();
  await db.collection(COLLECTIONS.visits).where({ familyId: family._id }).remove();
  await db.collection(COLLECTIONS.families).doc(family._id).remove();
}

async function leaveFamily({ openid }) {
  const { family } = await loadContext(openid);
  const isOwner = family.ownerOpenid === openid;
  const memberCount = (await db.collection(COLLECTIONS.users).where({ familyId: family._id }).count()).total;

  if (isOwner && memberCount > 1) {
    fail("请先把管理员转让给其他成员，再退出家庭");
  }

  await db.collection(COLLECTIONS.users).doc(openid).update({
    data: { familyId: "", updatedAt: Date.now() }
  });

  if (isOwner) {
    await dissolveFamily(family);
    return { dissolved: true };
  }
  return { dissolved: false };
}

module.exports = {
  createFamily,
  joinFamily,
  getFamily,
  updateFamily,
  resetInviteCode,
  resetVisitCode,
  setOpenBrowse,
  removeMember,
  transferOwner,
  leaveFamily
};
