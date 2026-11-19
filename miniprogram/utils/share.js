const session = require("./session");

const DEFAULT_IMAGE = "/images/share-default.png";
let cache = { fileID: "", path: "" };

function avatarId() {
  const s = session.get();
  return (s && s.user && s.user.avatarUrl) || "";
}

/** 预先把当前用户头像下载到本地，分享卡片用它做封面（避免截到页面上的邀请码） */
function prepare() {
  const id = avatarId();
  if (!id || cache.fileID === id) {
    return Promise.resolve(cache.path);
  }
  if (!id.startsWith("cloud://")) {
    cache = { fileID: id, path: id };
    return Promise.resolve(id);
  }
  return wx.cloud
    .downloadFile({ fileID: id })
    .then((res) => {
      cache = { fileID: id, path: res.tempFilePath };
      return res.tempFilePath;
    })
    .catch(() => "");
}

/** 分享封面：当前用户头像；没有头像时用默认封面 */
function image() {
  const id = avatarId();
  return id && cache.fileID === id && cache.path ? cache.path : DEFAULT_IMAGE;
}

/** 是否处于朋友圈单页模式（拿不到用户身份，只能浏览） */
function isSinglePage() {
  try {
    return wx.getLaunchOptionsSync().scene === 1154;
  } catch (error) {
    return false;
  }
}

function enableTimeline() {
  wx.showShareMenu({ withShareTicket: false, menus: ["shareAppMessage", "shareTimeline"], fail() {} });
}

module.exports = { prepare, image, isSinglePage, enableTimeline };
