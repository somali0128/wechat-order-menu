const { db } = require("../lib/cloud");
const { COLLECTIONS, ensureCollections, getById, deleteFiles } = require("../lib/store");
const { str, isCloudFile } = require("../lib/utils");
const { checkText } = require("../lib/security");
const { fail } = require("../lib/errors");
const settings = require("../settings");
const { ensureVisitCode } = require("../lib/codes");

function publicUser(user, openid) {
  return {
    openid,
    nickName: user.nickName || "",
    avatarUrl: user.avatarUrl || "",
    familyId: user.familyId || ""
  };
}

function publicFamily(family, openid) {
  return {
    id: family._id,
    name: family.name,
    inviteCode: family.inviteCode,
    visitCode: family.visitCode || "",
    openBrowse: Boolean(family.openBrowse),
    isOwner: family.ownerOpenid === openid,
    categories: family.categories || []
  };
}

function templateIds() {
  const subscribe = settings.subscribe || {};
  return {
    newOrder: (subscribe.newOrder && subscribe.newOrder.id) || "",
    statusChange: (subscribe.statusChange && subscribe.statusChange.id) || ""
  };
}

async function login({ openid }) {
  await ensureCollections();
  let user = await getById(COLLECTIONS.users, openid);
  if (!user) {
    const now = Date.now();
    user = {
      nickName: "",
      avatarUrl: "",
      familyId: "",
      createdAt: now,
      updatedAt: now
    };
    await db.collection(COLLECTIONS.users).doc(openid).set({ data: user });
  }

  let family = null;
  if (user.familyId) {
    family = await getById(COLLECTIONS.families, user.familyId);
    if (family) {
      await ensureVisitCode(family);
    } else {
      // 家庭已解散
      await db.collection(COLLECTIONS.users).doc(openid).update({ data: { familyId: "" } });
      user.familyId = "";
    }
  }

  return {
    user: publicUser(user, openid),
    family: family ? publicFamily(family, openid) : null,
    templates: templateIds()
  };
}

async function updateProfile({ openid, data }) {
  const user = await getById(COLLECTIONS.users, openid);
  if (!user) {
    fail("请重新进入小程序", "NO_USER");
  }
  const update = { updatedAt: Date.now() };

  if (data.nickName !== undefined) {
    const nickName = str(data.nickName, 20, "昵称");
    if (!nickName) {
      fail("请填写昵称");
    }
    await checkText(openid, nickName);
    update.nickName = nickName;
  }

  if (data.avatarUrl !== undefined) {
    const avatarUrl = str(data.avatarUrl, 500);
    if (avatarUrl && !isCloudFile(avatarUrl) && !avatarUrl.startsWith("https://")) {
      fail("头像地址无效");
    }
    update.avatarUrl = avatarUrl;
    if (user.avatarUrl && user.avatarUrl !== avatarUrl) {
      await deleteFiles([user.avatarUrl]);
    }
  }

  await db.collection(COLLECTIONS.users).doc(openid).update({ data: update });
  return publicUser({ ...user, ...update }, openid);
}

module.exports = {
  login,
  updateProfile,
  publicUser,
  publicFamily
};
