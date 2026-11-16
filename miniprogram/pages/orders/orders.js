const api = require("../../utils/api");
const session = require("../../utils/session");
const cart = require("../../utils/cart");
const { toast, createPoller } = require("../../utils/ui");
const { statusMeta, mealDateText, timeText } = require("../../utils/format");

const PAGE_SIZE = 20;

function decorate(order) {
  const meta = statusMeta(order.status);
  const missing = order.ingredients.filter((item) => !item.ready).length;
  return {
    id: order.id,
    title: `${mealDateText(order.mealDate)} · ${order.mealType}`,
    statusText: meta.text,
    tone: meta.tone,
    covers: order.dishes.slice(0, 4),
    more: Math.max(0, order.dishes.length - 4),
    dishText: order.dishes.map((dish) => (dish.quantity > 1 ? `${dish.name}×${dish.quantity}` : dish.name)).join("、"),
    dishCount: order.dishes.length,
    people: order.people,
    remark: order.remark,
    missing,
    active: ["pending", "shopping", "cooking"].includes(order.status),
    creatorName: order.creatorName,
    timeText: timeText(order.createdAt)
  };
}

Page({
  data: {
    tabs: [
      { key: "active", name: "进行中" },
      { key: "done", name: "已完成" },
      { key: "all", name: "全部" }
    ],
    tab: "active",
    list: [],
    loading: true,
    loadingMore: false,
    hasMore: false,
    errorText: ""
  },

  onLoad() {
    this.poller = createPoller(() => this.refresh(true), 10000);
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    cart.updateBadge();
    this.refresh(this.data.list.length > 0);
    this.poller.start();
  },

  onHide() {
    this.poller.stop();
  },

  onUnload() {
    this.poller.stop();
  },

  async onPullDownRefresh() {
    await this.refresh();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    this.loadMore();
  },

  switchTab(event) {
    const tab = event.currentTarget.dataset.key;
    if (tab === this.data.tab) return;
    this.setData({ tab, list: [], loading: true, hasMore: false });
    this.refresh();
  },

  /** silent：后台刷新，不显示加载状态 */
  async refresh(silent = false) {
    const tab = this.data.tab;
    if (!silent) this.setData({ loading: !this.data.list.length });
    try {
      const limit = Math.min(100, Math.max(PAGE_SIZE, this.data.list.length));
      const res = await api.call("listOrders", { status: tab, offset: 0, limit });
      if (tab !== this.data.tab) return;
      this.setData({
        list: res.list.map(decorate),
        hasMore: res.hasMore,
        errorText: ""
      });
    } catch (error) {
      if (!silent) {
        if (this.data.list.length) toast(error.message);
        else this.setData({ errorText: error.message });
      }
    }
    this.setData({ loading: false });
  },

  reload() {
    this.setData({ loading: true, errorText: "" });
    this.refresh();
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loadingMore) return;
    const tab = this.data.tab;
    this.setData({ loadingMore: true });
    try {
      const res = await api.call("listOrders", { status: tab, offset: this.data.list.length, limit: PAGE_SIZE });
      if (tab === this.data.tab) {
        this.setData({ list: this.data.list.concat(res.list.map(decorate)), hasMore: res.hasMore });
      }
    } catch (error) {
      toast(error.message);
    }
    this.setData({ loadingMore: false });
  },

  openOrder(event) {
    wx.navigateTo({ url: `/pages/order/order?id=${event.currentTarget.dataset.id}` });
  },

  goMenu() {
    wx.switchTab({ url: "/pages/menu/menu" });
  }
});
