const { CLOUD_ENV_ID } = require("./utils/config");

App({
  globalData: {
    cart: [],
    cloudReady: false,
    userProfile: null
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

    this.globalData.userProfile = wx.getStorageSync("family_menu_user_profile") || null;
  },

  setCart(cart) {
    this.globalData.cart = cart;
    wx.setStorageSync("family_menu_cart", cart);
  },

  setUserProfile(profile) {
    this.globalData.userProfile = profile;
    wx.setStorageSync("family_menu_user_profile", profile);
  }
});
