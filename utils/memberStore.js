const { MEMBERS_COLLECTION } = require("./config");
const { getFamilyKey } = require("./sessionStore");

const LOCAL_MEMBERS_KEY = "family_menu_members";

function getAppInstance() {
  return getApp ? getApp() : null;
}

function isCloudReady() {
  const app = getAppInstance();
  return Boolean(app && app.globalData.cloudReady && wx.cloud);
}

function normalizeMember(member) {
  const familyKey = getFamilyKey();
  return {
    id: member.id || member._id || `member_${Date.now()}`,
    name: member.name || "家庭成员",
    role: member.role || "成员",
    phone: member.phone || "",
    avatarUrl: member.avatarUrl || "",
    openid: member.openid || "",
    familyKey: member.familyKey || familyKey,
    updatedAt: member.updatedAt || Date.now()
  };
}

function getLocalMembers() {
  const cached = wx.getStorageSync(`${LOCAL_MEMBERS_KEY}_${getFamilyKey()}`);
  return Array.isArray(cached) ? cached.map(normalizeMember) : [];
}

function setLocalMembers(members) {
  wx.setStorageSync(`${LOCAL_MEMBERS_KEY}_${getFamilyKey()}`, members.map(normalizeMember));
}

async function listMembers() {
  if (isCloudReady()) {
    const db = wx.cloud.database();
    const result = await db
      .collection(MEMBERS_COLLECTION)
      .where({ familyKey: getFamilyKey() })
      .get();
    const members = sortMembers(result.data.map(normalizeMember));
    setLocalMembers(members);
    return members;
  }

  return sortMembers(getLocalMembers());
}

async function upsertMember(member) {
  const normalized = normalizeMember({
    ...member,
    id: member.id || `member_${Date.now()}`,
    updatedAt: Date.now()
  });
  const members = await listMembers();
  const index = members.findIndex((item) => item.id === normalized.id);

  if (index >= 0) {
    members[index] = normalized;
  } else {
    members.unshift(normalized);
  }

  setLocalMembers(members);

  if (isCloudReady()) {
    const db = wx.cloud.database();
    await db.collection(MEMBERS_COLLECTION).doc(normalized.id).set({
      data: {
        ...normalized,
        familyKey: getFamilyKey()
      }
    });
  }

  return members;
}

async function removeMember(id) {
  const members = (await listMembers()).filter((member) => member.id !== id);
  setLocalMembers(members);

  if (isCloudReady()) {
    const db = wx.cloud.database();
    await db.collection(MEMBERS_COLLECTION).doc(id).remove();
  }

  return members;
}

function watchMembers(onChange, onError) {
  if (!isCloudReady()) {
    onChange(getLocalMembers());
    return null;
  }

  const db = wx.cloud.database();
  return db
    .collection(MEMBERS_COLLECTION)
    .where({ familyKey: getFamilyKey() })
    .watch({
      onChange(snapshot) {
        const members = sortMembers(snapshot.docs.map(normalizeMember));
        setLocalMembers(members);
        onChange(members);
      },
      onError
    });
}

function sortMembers(members) {
  return members.sort((a, b) => b.updatedAt - a.updatedAt);
}

module.exports = {
  listMembers,
  removeMember,
  upsertMember,
  watchMembers
};
