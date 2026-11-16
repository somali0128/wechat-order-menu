const session = require("../../utils/session");
const menu = require("../../utils/menu");
const cart = require("../../utils/cart");
const { toast } = require("../../utils/ui");
const { SLOGANS } = require("../../utils/config");

const ALL = "全部";
const HOT = "常点";

Page({
  data: {
    slogan: "",
    familyName: "",
    keyword: "",
    categories: [],
    active: ALL,
    list: [],
    listTitle: ALL,
    selectedCount: 0,
    loading: true,
    refreshing: false,
    errorText: "",
    hasDishes: false
  },

  dishes: [],

  onLoad() {
    this.setData({ slogan: SLOGANS[Math.floor(Math.random() * SLOGANS.length)] || "" });
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    this.setData({ familyName: s.family.name });
    cart.updateBadge();
    const cached = menu.peek();
    if (cached) {
      this.apply(cached);
    }
    this.load();
  },

  async load() {
    try {
      const data = await menu.fetch();
      this.apply(data);
      this.setData({ errorText: "" });
    } catch (error) {
      if (!this.dishes.length) {
        this.setData({ errorText: error.message });
      } else {
        toast(error.message);
      }
    }
    this.setData({ loading: false, refreshing: false });
  },

  onRefresh() {
    this.setData({ refreshing: true });
    this.load();
  },

  apply(data) {
    this.dishes = data.dishes;
    this.categoryNames = data.categories;
    cart.prune(data.dishes.map((dish) => dish.id));
    this.setData({ hasDishes: data.dishes.length > 0, loading: false });
    this.render();
  },

  render() {
    const selectedIds = cart.get().map((item) => item.dishId);
    const keyword = this.data.keyword.trim().toLowerCase();
    const hot = this.dishes
      .filter((dish) => dish.orderCount > 0)
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    const names = [ALL].concat(hot.length ? [HOT] : [], this.categoryNames || []);
    const active = names.includes(this.data.active) ? this.data.active : ALL;

    const categories = names.map((name) => {
      let pool = this.dishes;
      if (name === HOT) pool = hot;
      else if (name !== ALL) pool = this.dishes.filter((dish) => dish.category === name);
      return {
        name,
        selected: pool.filter((dish) => selectedIds.includes(dish.id)).length
      };
    });

    let source;
    if (keyword) {
      source = this.dishes.filter((dish) => dish.searchText.includes(keyword));
    } else if (active === HOT) {
      source = hot;
    } else if (active === ALL) {
      source = this.dishes;
    } else {
      source = this.dishes.filter((dish) => dish.category === active);
    }

    this.setData({
      categories,
      active,
      listTitle: keyword ? `搜索“${this.data.keyword.trim()}”` : active,
      list: source.map((dish) => ({
        id: dish.id,
        name: dish.name,
        image: dish.image,
        description: dish.description || dish.ingredientText,
        tags: dish.tags.slice(0, 2),
        cookTime: dish.cookTime,
        metaText: dish.metaText,
        selected: selectedIds.includes(dish.id)
      })),
      selectedCount: selectedIds.length
    });
  },

  onSearch(event) {
    this.setData({ keyword: event.detail.value });
    this.render();
  },

  clearSearch() {
    this.setData({ keyword: "" });
    this.render();
  },

  selectCategory(event) {
    this.setData({ active: event.currentTarget.dataset.name });
    this.render();
  },

  toggle(event) {
    const id = event.currentTarget.dataset.id;
    const added = cart.toggle(id);
    this.render();
    if (added) {
      wx.vibrateShort({ type: "light", fail() {} });
    }
  },

  openDish(event) {
    wx.navigateTo({ url: `/pages/dish/dish?id=${event.currentTarget.dataset.id}` });
  },

  goCart() {
    wx.switchTab({ url: "/pages/cart/cart" });
  },

  goAdd() {
    wx.navigateTo({ url: "/pages/dish-edit/dish-edit" });
  }
});
