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
    const filteredDishes = this.decorateDishes(
      dishes.filter((dish) => dish.category === this.data.activeCategory)
    );
    this.setData({ filteredDishes });
  },

  addDish(event) {
    const id = event.currentTarget.dataset.id;
    const dish = dishes.find((item) => item.id === id);
    const app = getApp();
    const cart = [...app.globalData.cart];
    const existing = cart.find((item) => item.id === id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        ...dish,
        quantity: 1
      });
    }

    app.setCart(cart);
    this.refreshCart();
    wx.showToast({
      title: "已加入菜单",
      icon: "success"
    });
  },

  reduceDish(event) {
    const id = event.currentTarget.dataset.id;
    const app = getApp();
    const cart = app.globalData.cart
      .map((item) => (item.id === id ? { ...item, quantity: item.quantity - 1 } : item))
      .filter((item) => item.quantity > 0);

    app.setCart(cart);
    this.refreshCart();
  },

  refreshCart() {
    const cart = getApp().globalData.cart || [];
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    this.setData({
      cart,
      cartCount,
      filteredDishes: this.decorateDishes(
        dishes.filter((dish) => dish.category === this.data.activeCategory),
        cart
      )
    });
  },

  decorateDishes(list, currentCart = this.data.cart) {
    return list.map((dish) => {
      const cartItem = currentCart.find((item) => item.id === dish.id);
      return {
        ...dish,
        initial: dish.name.charAt(0),
        quantity: cartItem ? cartItem.quantity : 0
      };
    });
  },

  goCart() {
    wx.switchTab({
      url: "/pages/cart/cart"
    });
  }
});
