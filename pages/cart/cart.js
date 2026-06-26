const { buildOrder, createOrder } = require("../../utils/orderStore");

Page({
  data: {
    cart: [],
    ingredients: [],
    checkedIngredients: [],
    submitting: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const cart = getApp().globalData.cart || [];
    const ingredients = [];

    cart.forEach((dish) => {
      dish.ingredients.forEach((ingredient) => {
        if (!ingredients.includes(ingredient)) {
          ingredients.push(ingredient);
        }
      });
    });

    this.setData({
      cart: cart.map((dish) => ({
        ...dish,
        ingredientText: dish.ingredients.join("、")
      })),
      ingredients: ingredients.map((name) => ({
        name,
        checked: true
      })),
      checkedIngredients: ingredients
    });
  },

  changeIngredient(event) {
    const checkedIngredients = event.detail.value;
    this.setData({
      checkedIngredients,
      ingredients: this.data.ingredients.map((ingredient) => ({
        ...ingredient,
        checked: checkedIngredients.includes(ingredient.name)
      }))
    });
  },

  removeDish(event) {
    const id = event.currentTarget.dataset.id;
    const cart = getApp().globalData.cart.filter((item) => item.id !== id);
    getApp().setCart(cart);
    this.refresh();
  },

  goMenu() {
    wx.switchTab({
      url: "/pages/menu/menu"
    });
  },

  async submitOrder() {
    if (!this.data.cart.length) {
      wx.showToast({
        title: "请先选择菜品",
        icon: "none"
      });
      return;
    }

    this.setData({ submitting: true });

    try {
      const order = buildOrder(this.data.cart, this.data.checkedIngredients);
      await createOrder(order);
      getApp().setCart([]);
      wx.showToast({
        title: "下单成功",
        icon: "success"
      });
      setTimeout(() => {
        wx.switchTab({
          url: "/pages/orders/orders"
        });
      }, 500);
    } catch (error) {
      wx.showToast({
        title: "下单失败，请检查云开发",
        icon: "none"
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});
