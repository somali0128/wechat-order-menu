function toast(title, icon = "none") {
  wx.showToast({ title: String(title || ""), icon, duration: 2000 });
}

function confirm({ title, content, confirmText = "确定", danger = false }) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      confirmColor: danger ? "#e5484d" : "#ff8a1f",
      success: (res) => resolve(Boolean(res.confirm)),
      fail: () => resolve(false)
    });
  });
}

function prompt({ title, value = "", placeholder = "" }) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      editable: true,
      content: value,
      placeholderText: placeholder,
      confirmColor: "#ff8a1f",
      success: (res) => resolve(res.confirm ? String(res.content || "").trim() : null),
      fail: () => resolve(null)
    });
  });
}

function actionSheet(itemList) {
  return new Promise((resolve) => {
    wx.showActionSheet({
      itemList,
      success: (res) => resolve(res.tapIndex),
      fail: () => resolve(-1)
    });
  });
}

/** 简单轮询器：页面可见时定时刷新 */
function createPoller(fn, interval) {
  let timer = null;
  return {
    start() {
      this.stop();
      timer = setInterval(fn, interval);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }
  };
}

module.exports = { toast, confirm, prompt, actionSheet, createPoller };
