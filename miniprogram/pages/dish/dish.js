const api = require("../../utils/api");
const session = require("../../utils/session");
const menu = require("../../utils/menu");
const cart = require("../../utils/cart");
const { toast } = require("../../utils/ui");

Page({
  data: {
    id: "",
    dish: null,
    steps: [],
    selected: false,
    loading: true,
    errorText: ""
  },

  onLoad(query) {
    this.setData({ id: query.id || "" });
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    const cached = menu.find(this.data.id);
    if (cached) {
      this.apply(cached);
    }
    try {
      const dish = await api.call("getDish", { id: this.data.id });
      menu.upsertLocal(dish);
      this.apply(menu.find(dish.id) || dish);
    } catch (error) {
      if (error.code === "NOT_FOUND") {
        menu.removeLocal(this.data.id);
        this.setData({ dish: null, loading: false, errorText: "这道菜已被删除" });
      } else if (!this.data.dish) {
        this.setData({ loading: false, errorText: error.message });
      }
    }
  },

  apply(dish) {
    wx.setNavigationBarTitle({ title: dish.name });
    this.setData({
      dish,
      steps: String(dish.steps || "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean),
      selected: cart.has(dish.id),
      loading: false,
      errorText: ""
    });
  },

  toggle() {
    const added = cart.toggle(this.data.id);
    this.setData({ selected: added });
    toast(added ? "已加入想吃清单" : "已从清单移除", added ? "success" : "none");
  },

  edit() {
    wx.navigateTo({ url: `/pages/dish-edit/dish-edit?id=${this.data.id}` });
  },

  goCart() {
    wx.switchTab({ url: "/pages/cart/cart" });
  },

  preview() {
    const image = this.data.dish && this.data.dish.image;
    if (image) {
      wx.previewImage({ urls: [image] });
    }
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/menu/menu" }) });
  }
});
