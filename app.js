const { CLOUD_ENV_ID } = require("./utils/config");

App({
  globalData: {
    cart: [],
    cloudReady: false
  },

  onLaunch() {
    if (wx.cloud && CLOUD_ENV_ID && CLOUD_ENV_ID !== "your-cloud-env-id") {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
      this.globalData.cloudReady = true;
    }

    const cachedCart = wx.getStorageSync("family_menu_cart");
    if (Array.isArray(cachedCart)) {
      this.globalData.cart = cachedCart;
    }
  },

  setCart(cart) {
    this.globalData.cart = cart;
    wx.setStorageSync("family_menu_cart", cart);
  }
});
