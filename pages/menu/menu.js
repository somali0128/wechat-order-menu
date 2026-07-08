const { dishes: defaultDishes } = require("../../data/dishes");
const { getCategories, listDishes, watchDishes } = require("../../utils/menuStore");
const { buildSharePath } = require("../../utils/sessionStore");

const heroSubtitles = [
  "今天锻炼了吗？记得补充蛋白质",
  "偶尔尝尝好久没吃过的菜也不错",
  "有想吃的新菜？记得添加到菜单哦",
  "实在不知道吃啥咱下个馆子吧"
];

Page({
  data: {
    categories: getCategories(defaultDishes),
    activeCategory: "全部",
    dishes: defaultDishes,
    filteredDishes: [],
    cart: [],
    cartCount: 0,
    loading: true,
    heroSubtitle: heroSubtitles[0]
  },

  watcher: null,

  onLoad() {
    this.pickHeroSubtitle();
    this.refreshCart();
  },

  onShow() {
    this.loadDishes();
    this.startWatch();
    this.refreshCart();
  },

  onHide() {
    this.closeWatch();
  },

  onUnload() {
    this.closeWatch();
  },

  pickHeroSubtitle() {
    const index = Math.floor(Math.random() * heroSubtitles.length);
    this.setData({
      heroSubtitle: heroSubtitles[index]
    });
  },

  async loadDishes() {
    this.setData({ loading: true });
    try {
      const dishes = await listDishes();
      this.applyDishes(dishes);
    } catch (error) {
      wx.showToast({
        title: "菜单读取失败",
        icon: "none"
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  startWatch() {
    this.closeWatch();
    this.watcher = watchDishes(
      (dishes) => {
        this.applyDishes(dishes);
        this.setData({ loading: false });
      },
      () => {
        wx.showToast({
          title: "菜单同步失败",
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

  applyDishes(dishes) {
    const categories = getCategories(dishes);
    const activeCategory = categories.includes(this.data.activeCategory)
      ? this.data.activeCategory
      : categories[0];
    const dishIds = dishes.map((dish) => dish.id);
    const cart = (getApp().globalData.cart || []).filter((item) => dishIds.includes(item.id));

    if (cart.length !== (getApp().globalData.cart || []).length) {
      getApp().setCart(cart);
    }

    this.setData({
      dishes,
      categories,
      activeCategory
    });
    this.refreshCart();
  },

  selectCategory(event) {
    this.setData({
      activeCategory: event.currentTarget.dataset.category
    });
    this.filterDishes();
  },

  filterDishes() {
    const filteredDishes = this.decorateDishes(this.getDishesByCategory());
    this.setData({ filteredDishes });
  },

  toggleDish(event) {
    const id = event.currentTarget.dataset.id;
    const dish = this.data.dishes.find((item) => item.id === id);
    if (!dish) {
      wx.showToast({
        title: "菜品已更新",
        icon: "none"
      });
      this.refreshCart();
      return;
    }

    const app = getApp();
    let cart = [...app.globalData.cart];
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      cart = cart.filter((item) => item.id !== id);
    } else {
      cart.push({
        ...dish,
        quantity: 1
      });
    }

    app.setCart(cart);
    this.refreshCart();
    wx.showToast({
      title: existing ? "已取消" : "已加入菜单",
      icon: "success"
    });
  },

  refreshCart() {
    const cart = getApp().globalData.cart || [];
    const cartCount = cart.length;

    this.setData({
      cart,
      cartCount,
      filteredDishes: this.decorateDishes(this.getDishesByCategory(), cart)
    });
  },

  getDishesByCategory() {
    if (this.data.activeCategory === "全部") {
      return this.data.dishes;
    }
    return this.data.dishes.filter((dish) => dish.category === this.data.activeCategory);
  },

  decorateDishes(list, currentCart = this.data.cart) {
    return list.map((dish) => {
      const cartItem = currentCart.find((item) => item.id === dish.id);
      return {
        ...dish,
        initial: dish.name.charAt(0),
        selected: Boolean(cartItem),
        actionText: cartItem ? "再想想" : "吃这个！"
      };
    });
  },

  goCart() {
    wx.switchTab({
      url: "/pages/cart/cart"
    });
  },

  onShareAppMessage() {
    return {
      title: "邀请你加入樾哥厨房共享菜单",
      path: buildSharePath("/pages/profile/profile")
    };
  },

  onShareTimeline() {
    return {
      title: "樾哥厨房共享菜单",
      query: buildSharePath("").replace(/^\?/, "")
    };
  }
});
