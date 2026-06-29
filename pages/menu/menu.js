const { dishes, categories } = require("../../data/dishes");

Page({
  data: {
    categories,
    activeCategory: categories[0],
    dishes,
    filteredDishes: [],
    cart: [],
    cartCount: 0
  },

  onLoad() {
    this.refreshCart();
    this.filterDishes();
  },

  onShow() {
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
    const dish = dishes.find((item) => item.id === id);
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
      return dishes;
    }
    return dishes.filter((dish) => dish.category === this.data.activeCategory);
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
  }
});
