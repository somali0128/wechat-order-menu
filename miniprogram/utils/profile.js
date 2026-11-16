const api = require("./api");
const session = require("./session");

/** 保存头像和昵称；avatar 可以是本地临时路径，会先上传 */
async function saveProfile({ nickName, avatar }) {
  const session0 = session.get();
  const user = (session0 && session0.user) || {};
  const payload = {};
  if (nickName !== undefined && nickName !== user.nickName) {
    payload.nickName = nickName;
  }
  if (avatar && avatar !== user.avatarUrl) {
    payload.avatarUrl = await api.uploadImage(avatar, "avatars");
  }
  if (!Object.keys(payload).length) {
    return user;
  }
  const next = await api.call("updateProfile", payload);
  session.setUser(next);
  return next;
}

module.exports = { saveProfile };
