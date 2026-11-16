const { CLOUD_ENV_ID } = require("./config");

class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code || "ERROR";
  }
}

function isConfigured() {
  return Boolean(CLOUD_ENV_ID) && CLOUD_ENV_ID !== "your-cloud-env-id";
}

function friendlyMessage(error) {
  const msg = String((error && (error.errMsg || error.message)) || "");
  if (/FunctionName parameter could not be found|FUNCTION_NOT_FOUND|-501000/.test(msg)) {
    return "云函数 api 未部署，请在开发者工具中上传并部署";
  }
  if (/env.*not.*exist|INVALID_ENV|-501001/i.test(msg)) {
    return "云环境 ID 无效，请检查 utils/config.js";
  }
  if (/timeout|网络|network|request:fail/i.test(msg)) {
    return "网络不太好，请稍后重试";
  }
  return "服务暂不可用，请稍后重试";
}

/**
 * 调用云函数 api
 * @param {string} action 操作名
 * @param {object} data 参数
 * @param {{loading?: string}} options loading 文案，传入时显示遮罩
 */
function call(action, data = {}, options = {}) {
  if (!isConfigured()) {
    return Promise.reject(new ApiError("请先在 utils/config.js 中填写云开发环境 ID", "NOT_CONFIGURED"));
  }
  if (options.loading) {
    wx.showLoading({ title: options.loading, mask: true });
  }
  const done = () => {
    if (options.loading) {
      wx.hideLoading();
    }
  };
  return wx.cloud
    .callFunction({ name: "api", data: { action, data } })
    .then((res) => {
      done();
      const result = res.result || {};
      if (!result.ok) {
        throw new ApiError(result.message || "操作失败", result.code);
      }
      return result.data;
    })
    .catch((error) => {
      done();
      if (error instanceof ApiError) {
        if (error.code === "NO_FAMILY" || error.code === "NO_USER") {
          handleLostFamily();
        }
        throw error;
      }
      console.error(`[api:${action}]`, error);
      throw new ApiError(friendlyMessage(error), "NETWORK");
    });
}

function handleLostFamily() {
  const session = require("./session");
  session.reset();
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (!current || current.route !== "pages/welcome/welcome") {
    wx.reLaunch({ url: "/pages/welcome/welcome" });
  }
}

function envVersion() {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion;
  } catch (error) {
    return "release";
  }
}

/** 上传本地临时图片到云存储，返回 fileID */
function uploadImage(tempPath, folder) {
  if (!tempPath || tempPath.startsWith("cloud://")) {
    return Promise.resolve(tempPath || "");
  }
  const ext = (tempPath.match(/\.(\w+)$/) || [])[1] || "jpg";
  const name = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  return wx.cloud
    .uploadFile({ cloudPath: `${folder}/${name}`, filePath: tempPath })
    .then((res) => res.fileID)
    .catch((error) => {
      console.error("uploadFile", error);
      throw new ApiError("图片上传失败，请重试", "UPLOAD");
    });
}

module.exports = {
  ApiError,
  call,
  isConfigured,
  envVersion,
  uploadImage
};
