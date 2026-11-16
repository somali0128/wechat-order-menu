const { CLOUD_ENV_ID } = require("./utils/config");
const api = require("./utils/api");

App({
  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: "提示",
        content: "当前微信版本过低，请升级后再使用",
        showCancel: false
      });
      return;
    }
    if (api.isConfigured()) {
      wx.cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
    }
    this.checkUpdate();
  },

  // 发布新版本后提示用户重启
  checkUpdate() {
    if (!wx.getUpdateManager) return;
    const manager = wx.getUpdateManager();
    manager.onUpdateReady(() => {
      wx.showModal({
        title: "发现新版本",
        content: "新版本已准备好，是否重启使用？",
        success: (res) => {
          if (res.confirm) manager.applyUpdate();
        }
      });
    });
  }
});
