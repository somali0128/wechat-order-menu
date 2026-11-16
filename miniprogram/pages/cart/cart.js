const api = require("../../utils/api");
const session = require("../../utils/session");
const menu = require("../../utils/menu");
const cart = require("../../utils/cart");
const subscribe = require("../../utils/subscribe");
const { toast } = require("../../utils/ui");
const { dateKey, mealDateText, defaultMealType } = require("../../utils/format");

const MEAL_TYPES = ["早餐", "午餐", "晚餐", "加餐"];

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

Page({
  data: {
    loading: true,
    items: [],
    totalQuantity: 0,
    mealTypes: MEAL_TYPES,
    mealType: defaultMealType(),
    mealDate: dateKey(),
    mealDateLabel: "今天",
    minDate: dateKey(),
    maxDate: addDays(60),
    people: 2,
    remark: "",
    ingredients: [],
    haveCount: 0,
    submitting: false
  },

  haveSet: {},

  onLoad() {
    const people = wx.getStorageSync("last_people");
    if (people) {
      this.setData({ people });
    }
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    cart.updateBadge();
    // 日期过期时重置为今天
    if (this.data.mealDate < dateKey()) {
      this.setData({ mealDate: dateKey(), minDate: dateKey(), mealType: defaultMealType() });
    }
    this.setData({ mealDateLabel: mealDateText(this.data.mealDate), minDate: dateKey(), maxDate: addDays(60) });
    const cached = menu.peek();
    if (cached) {
      this.build(cached);
    }
    try {
      this.build(await menu.fetch());
    } catch (error) {
      if (!cached) toast(error.message);
    }
    this.setData({ loading: false });
  },

  build(data) {
    const map = {};
    data.dishes.forEach((dish) => {
      map[dish.id] = dish;
    });
    const list = cart.prune(data.dishes.map((dish) => dish.id));
    const items = list
      .map((entry) => {
        const dish = map[entry.dishId];
        return {
          id: dish.id,
          name: dish.name,
          image: dish.image,
          category: dish.category,
          ingredientText: dish.ingredientText,
          ingredients: dish.ingredients,
          quantity: entry.quantity || 1
        };
      });

    const names = [];
    items.forEach((item) => {
      item.ingredients.forEach((name) => {
        if (!names.includes(name)) names.push(name);
      });
    });

    const ingredients = names.map((name) => ({ name, have: Boolean(this.haveSet[name]) }));
    this.setData({
      items,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      ingredients,
      haveCount: ingredients.filter((item) => item.have).length
    });
  },

  rebuild() {
    const cached = menu.peek();
    if (cached) this.build(cached);
  },

  changeQuantity(event) {
    const { id, delta } = event.currentTarget.dataset;
    const item = this.data.items.find((entry) => entry.id === id);
    if (!item) return;
    const next = item.quantity + Number(delta);
    if (next < 1) {
      this.removeItem(event);
      return;
    }
    if (next > 20) return;
    cart.setQuantity(id, next);
    this.rebuild();
  },

  removeItem(event) {
    cart.remove(event.currentTarget.dataset.id);
    this.rebuild();
  },

  clearAll() {
    wx.showModal({
      title: "清空已选菜品？",
      confirmColor: "#e5484d",
      success: (res) => {
        if (res.confirm) {
          cart.clear();
          this.rebuild();
        }
      }
    });
  },

  onDateChange(event) {
    const mealDate = event.detail.value;
    this.setData({ mealDate, mealDateLabel: mealDateText(mealDate) });
  },

  selectMealType(event) {
    this.setData({ mealType: event.currentTarget.dataset.value });
  },

  changePeople(event) {
    const people = Math.min(50, Math.max(1, this.data.people + Number(event.currentTarget.dataset.delta)));
    this.setData({ people });
  },

  onRemarkInput(event) {
    this.setData({ remark: event.detail.value });
  },

  toggleIngredient(event) {
    const name = event.currentTarget.dataset.name;
    this.haveSet[name] = !this.haveSet[name];
    this.updateIngredients();
  },

  markAll() {
    const allHave = this.data.haveCount === this.data.ingredients.length;
    this.data.ingredients.forEach((item) => {
      this.haveSet[item.name] = !allHave;
    });
    this.updateIngredients();
  },

  updateIngredients() {
    const ingredients = this.data.ingredients.map((item) => ({ ...item, have: Boolean(this.haveSet[item.name]) }));
    this.setData({ ingredients, haveCount: ingredients.filter((item) => item.have).length });
  },

  copyShopping() {
    const missing = this.data.ingredients.filter((item) => !item.have).map((item) => item.name);
    if (!missing.length) {
      toast("食材都齐了，不用买");
      return;
    }
    wx.setClipboardData({
      data: `采购清单（${this.data.mealDateLabel}${this.data.mealType}）：\n${missing.map((name) => `□ ${name}`).join("\n")}`
    });
  },

  openDish(event) {
    wx.navigateTo({ url: `/pages/dish/dish?id=${event.currentTarget.dataset.id}` });
  },

  goMenu() {
    wx.switchTab({ url: "/pages/menu/menu" });
  },

  async submit() {
    if (this.data.submitting) return;
    if (!this.data.items.length) {
      toast("请先选择菜品");
      return;
    }
    // 订阅消息需在点击事件中第一时间调用
    await subscribe.request(["statusChange", "newOrder"]);

    this.setData({ submitting: true });
    try {
      const order = await api.call(
        "createOrder",
        {
          items: this.data.items.map((item) => ({ dishId: item.id, quantity: item.quantity })),
          readyIngredients: this.data.ingredients.filter((item) => item.have).map((item) => item.name),
          mealDate: this.data.mealDate,
          mealType: this.data.mealType,
          people: this.data.people,
          remark: this.data.remark.trim(),
          envVersion: api.envVersion()
        },
        { loading: "正在提交" }
      );
      wx.setStorageSync("last_people", this.data.people);
      cart.clear();
      this.haveSet = {};
      this.setData({ remark: "", items: [], ingredients: [], haveCount: 0, totalQuantity: 0 });
      wx.navigateTo({ url: `/pages/order/order?id=${order.id}&created=1` });
    } catch (error) {
      toast(error.message);
    }
    this.setData({ submitting: false });
  }
});
