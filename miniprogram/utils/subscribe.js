const session = require("./session");

/**
 * 请求订阅消息授权（必须在点击事件中调用）
 * @param {string[]} keys newOrder / statusChange
 * @returns {Promise<number>} 用户同意的模板数，未配置模板时返回 -1
 */
function request(keys) {
  const templates = session.templates();
  const ids = keys.map((key) => templates[key]).filter(Boolean);
  if (!ids.length) {
    return Promise.resolve(-1);
  }
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: ids,
      success: (res) => resolve(ids.filter((id) => res[id] === "accept").length),
      fail: () => resolve(0)
    });
  });
}

function enabled() {
  const templates = session.templates();
  return Boolean(templates.newOrder || templates.statusChange);
}

module.exports = { request, enabled };
