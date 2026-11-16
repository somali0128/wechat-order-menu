const { db, cloud } = require("./cloud");
const { fail } = require("./errors");
const { isCloudFile } = require("./utils");

const COLLECTIONS = {
  users: "users",
  families: "families",
  dishes: "dishes",
  orders: "orders"
};

let collectionsReady = false;

// 首次运行时自动创建集合，免去手动建表
async function ensureCollections() {
  if (collectionsReady) {
    return;
  }
  await Promise.all(
    Object.values(COLLECTIONS).map((name) => db.createCollection(name).catch(() => null))
  );
  collectionsReady = true;
}

async function getById(collection, id) {
  if (!id) {
    return null;
  }
  const res = await db.collection(collection).where({ _id: id }).limit(1).get();
  return res.data[0] || null;
}

async function getAll(collection, where, orderField = "createdAt", order = "asc") {
  const result = [];
  const pageSize = 100;
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await db
      .collection(collection)
      .where(where)
      .orderBy(orderField, order)
      .skip(skip)
      .limit(pageSize)
      .get();
    result.push(...res.data);
    if (res.data.length < pageSize) {
      break;
    }
    skip += pageSize;
  }
  return result;
}

async function deleteFiles(fileIds) {
  const list = (fileIds || []).filter(isCloudFile);
  for (let i = 0; i < list.length; i += 50) {
    try {
      await cloud.deleteFile({ fileList: list.slice(i, i + 50) });
    } catch (error) {
      console.warn("deleteFile failed", error);
    }
  }
}

// 读取当前用户及其家庭，作为所有家庭内操作的权限基础
async function loadContext(openid, { requireFamily = true, requireOwner = false } = {}) {
  const user = await getById(COLLECTIONS.users, openid);
  if (!user) {
    fail("请重新进入小程序", "NO_USER");
  }
  const family = user.familyId ? await getById(COLLECTIONS.families, user.familyId) : null;
  if (requireFamily && !family) {
    fail("你还没有加入家庭", "NO_FAMILY");
  }
  if (requireOwner && family.ownerOpenid !== openid) {
    fail("只有家庭管理员可以操作", "FORBIDDEN");
  }
  return { user, family };
}

module.exports = {
  COLLECTIONS,
  ensureCollections,
  getById,
  getAll,
  deleteFiles,
  loadContext
};
