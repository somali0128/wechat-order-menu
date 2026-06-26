const { listOrders, watchOrders } = require("../../utils/orderStore");

Page({
  data: {
    orders: [],
    cloudReady: false,
    loading: true
  },

  watcher: null,

  onLoad() {
    this.setData({
      cloudReady: getApp().globalData.cloudReady
    });
  },

  onShow() {
    this.loadOrders();
    this.startWatch();
  },

  onHide() {
    this.closeWatch();
  },

  onUnload() {
    this.closeWatch();
  },

  async loadOrders() {
    this.setData({ loading: true });
    try {
      const orders = await listOrders();
      this.setData({ orders });
    } catch (error) {
      wx.showToast({
        title: "订单读取失败",
        icon: "none"
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  startWatch() {
    this.closeWatch();
    this.watcher = watchOrders(
      (orders) => {
        this.setData({
          orders,
          loading: false
        });
      },
      () => {
        wx.showToast({
          title: "同步监听失败",
          icon: "none"
        });
      }
    );
  },

  closeWatch() {
    if (this.watcher && this.watcher.close) {
      this.watcher.close();
    }
    this.watcher = null;
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  }
});
