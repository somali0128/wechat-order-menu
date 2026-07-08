const { CLOUD_ENV_ID } = require("./utils/config");
const { getFamilyKey, getStoredSession, setFamilyKey } = require("./utils/sessionStore");

App({
  globalData: {
    cart: [],
    cloudReady: false,
    familyKey: "",
    session: null,
    userProfile: null
  },

  onLaunch(options) {
    if (wx.cloud && CLOUD_ENV_ID && CLOUD_ENV_ID !== "your-cloud-env-id") {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
      this.globalData.cloudReady = true;
    }

    const launchFamilyKey = options && options.query && options.query.familyKey;
    this.globalData.familyKey = launchFamilyKey ? setFamilyKey(launchFamilyKey) : getFamilyKey();
    this.globalData.session = getStoredSession();
    const cachedCart = wx.getStorageSync("family_menu_cart");
    if (Array.isArray(cachedCart)) {
      this.globalData.cart = cachedCart;
    }

    this.globalData.userProfile = wx.getStorageSync("family_menu_user_profile") || null;

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }
  },

  onShow(options) {
    const familyKey = options && options.query && options.query.familyKey;
    if (familyKey) {
      this.globalData.familyKey = setFamilyKey(familyKey);
    }
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
