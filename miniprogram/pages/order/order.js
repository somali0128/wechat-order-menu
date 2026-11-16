const api = require("../../utils/api");
const session = require("../../utils/session");
const menu = require("../../utils/menu");
const cart = require("../../utils/cart");
const subscribe = require("../../utils/subscribe");
const { toast, confirm, createPoller } = require("../../utils/ui");
const { FLOW, NEXT_ACTION, statusMeta, mealDateText, timeText } = require("../../utils/format");

Page({
  data: {
    id: "",
    loading: true,
    errorText: "",
    order: null,
    steps: [],
    meta: {},
    mealText: "",
    createdText: "",
    logs: [],
    nextAction: null,
    missingCount: 0,
    busy: false
  },

  onLoad(query) {
    this.setData({ id: query.id || "" });
    if (query.created) {
      wx.showToast({ title: "下单成功", icon: "success" });
    }
    this.poller = createPoller(() => this.load(true), 8000);
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    this.load();
    this.poller.start();
  },

  onHide() {
    this.poller.stop();
  },

  onUnload() {
    this.poller.stop();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load(silent = false) {
    try {
      const order = await api.call("getOrder", { id: this.data.id });
      this.apply(order);
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        this.poller.stop();
        this.setData({ order: null, errorText: "订单已被删除" });
      } else if (!silent && !this.data.order) {
        this.setData({ errorText: error.message });
      }
    }
    this.setData({ loading: false });
  },

  apply(order) {
    const currentIndex = FLOW.indexOf(order.status);
    const steps = FLOW.map((status, index) => ({
      text: statusMeta(status).text,
      done: currentIndex >= 0 && index <= currentIndex,
      current: index === currentIndex
    }));
    this.setData({
      order,
      steps,
      meta: statusMeta(order.status),
      mealText: `${mealDateText(order.mealDate)}（${order.mealDate}）· ${order.mealType}`,
      createdText: timeText(order.createdAt),
      logs: order.logs
        .slice()
        .reverse()
        .map((log) => ({
          text: `${log.byName} ${log.status === "pending" ? "提交了订单" : `将订单标记为「${statusMeta(log.status).text}」`}`,
          time: timeText(log.at)
        })),
      nextAction: NEXT_ACTION[order.status] || null,
      missingCount: order.ingredients.filter((item) => !item.ready).length,
      errorText: ""
    });
  },

  async toggleIngredient(event) {
    const { order } = this.data;
    if (!order || !order.canCancel) return;
    const index = event.currentTarget.dataset.index;
    const item = order.ingredients[index];
    const ready = !item.ready;
    this.setData({
      [`order.ingredients[${index}].ready`]: ready,
      missingCount: this.data.missingCount + (ready ? -1 : 1)
    });
    try {
      await api.call("toggleIngredient", { id: order.id, name: item.name, ready });
    } catch (error) {
      this.setData({
        [`order.ingredients[${index}].ready`]: !ready,
        missingCount: this.data.missingCount + (ready ? 1 : -1)
      });
      toast(error.message);
    }
  },

  copyShopping() {
    const missing = this.data.order.ingredients.filter((item) => !item.ready).map((item) => item.name);
    if (!missing.length) {
      toast("食材都齐了");
      return;
    }
    wx.setClipboardData({
      data: `采购清单（${this.data.mealText}）：\n${missing.map((name) => `□ ${name}`).join("\n")}`
    });
  },

  async changeStatus(status, loadingText) {
    if (this.data.busy) return;
    this.setData({ busy: true });
    try {
      const order = await api.call(
        "updateOrderStatus",
        { id: this.data.order.id, status, envVersion: api.envVersion() },
        { loading: loadingText }
      );
      this.apply(order);
      wx.showToast({ title: statusMeta(status).text, icon: "success" });
    } catch (error) {
      toast(error.message);
    }
    this.setData({ busy: false });
  },

  async advance() {
    const action = this.data.nextAction;
    if (!action) return;
    if (action.status === "done") {
      // 顺便订阅下一次新订单提醒
      await subscribe.request(["newOrder"]);
    }
    this.changeStatus(action.status, "正在更新");
  },

  async cancel() {
    const ok = await confirm({ title: "取消订单", content: "确定取消这个订单吗？", confirmText: "取消订单", danger: true });
    if (ok) this.changeStatus("cancelled", "正在取消");
  },

  async remove() {
    const ok = await confirm({ title: "删除订单", content: "删除后无法恢复，确定删除吗？", confirmText: "删除", danger: true });
    if (!ok) return;
    try {
      await api.call("deleteOrder", { id: this.data.order.id }, { loading: "正在删除" });
      this.poller.stop();
      wx.showToast({ title: "已删除", icon: "success" });
      setTimeout(() => this.back(), 600);
    } catch (error) {
      toast(error.message);
    }
  },

  async reorder() {
    let available = [];
    try {
      const data = await menu.ensure();
      const ids = data.dishes.map((dish) => dish.id);
      available = this.data.order.dishes.filter((dish) => ids.includes(dish.dishId));
    } catch (error) {
      toast(error.message);
      return;
    }
    if (!available.length) {
      toast("这些菜已从菜单删除");
      return;
    }
    available.forEach((dish) => cart.add(dish.dishId, dish.quantity));
    toast(
      available.length < this.data.order.dishes.length ? "部分菜品已删除，其余已加入" : "已加入想吃清单",
      available.length < this.data.order.dishes.length ? "none" : "success"
    );
    setTimeout(() => wx.switchTab({ url: "/pages/cart/cart" }), 500);
  },

  openDish(event) {
    const id = event.currentTarget.dataset.id;
    if (menu.find(id)) {
      wx.navigateTo({ url: `/pages/dish/dish?id=${id}` });
    } else {
      toast("这道菜已从菜单删除");
    }
  },

  copyNo() {
    wx.setClipboardData({ data: this.data.order.orderNo });
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/orders/orders" }) });
  }
});
