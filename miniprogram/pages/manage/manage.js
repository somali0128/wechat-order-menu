const session = require("../../utils/session");
const menu = require("../../utils/menu");
const { toast } = require("../../utils/ui");

const ALL = "全部";

Page({
  data: {
    keyword: "",
    categories: [ALL],
    active: ALL,
    list: [],
    total: 0,
    loading: true
  },

  dishes: [],

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    const cached = menu.peek();
    if (cached) this.apply(cached);
    await this.load();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load() {
    try {
      this.apply(await menu.fetch());
    } catch (error) {
      toast(error.message);
    }
    this.setData({ loading: false });
  },

  apply(data) {
    this.dishes = data.dishes;
    const categories = [ALL].concat(data.categories);
    this.setData({
      categories,
      active: categories.includes(this.data.active) ? this.data.active : ALL,
      total: data.dishes.length,
      loading: false
    });
    this.render();
  },

  render() {
    const keyword = this.data.keyword.trim().toLowerCase();
    const active = this.data.active;
    const list = this.dishes
      .filter((dish) => (active === ALL || dish.category === active) && (!keyword || dish.searchText.includes(keyword)))
      .map((dish) => ({
        id: dish.id,
        name: dish.name,
        image: dish.image,
        category: dish.category,
        sub: `${dish.ingredients.length} 种食材${dish.orderCount ? ` · 点过 ${dish.orderCount} 次` : ""}`
      }));
    this.setData({ list });
  },

  onSearch(event) {
    this.setData({ keyword: event.detail.value });
    this.render();
  },

  selectCategory(event) {
    this.setData({ active: event.currentTarget.dataset.name });
    this.render();
  },

  edit(event) {
    wx.navigateTo({ url: `/pages/dish-edit/dish-edit?id=${event.currentTarget.dataset.id}` });
  },

  add() {
    const category = this.data.active === ALL ? "" : this.data.active;
    wx.navigateTo({ url: `/pages/dish-edit/dish-edit?category=${encodeURIComponent(category)}` });
  },

  goCategories() {
    wx.navigateTo({ url: "/pages/categories/categories" });
  }
});
