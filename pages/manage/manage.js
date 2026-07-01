const { getCategories, listDishes, removeDish, upsertDish, watchDishes } = require("../../utils/menuStore");

const emptyForm = {
  id: "",
  name: "",
  category: "",
  tag: "",
  calories: "",
  protein: "",
  imageTone: "green",
  description: "",
  ingredientText: ""
};

Page({
  data: {
    dishes: [],
    categories: ["全部"],
    form: { ...emptyForm },
    toneIndex: 4,
    editing: false,
    saving: false,
    loading: true,
    toneOptions: ["egg", "shrimp", "tomato", "pork", "green", "cream", "salmon"]
  },

  watcher: null,

  onLoad() {
    this.loadDishes();
    this.startWatch();
  },

  onUnload() {
    this.closeWatch();
  },

  async loadDishes() {
    this.setData({ loading: true });
    try {
      const dishes = await listDishes();
      this.applyDishes(dishes);
    } catch (error) {
      wx.showToast({
        title: "菜品读取失败",
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
          title: "菜品同步失败",
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
    this.setData({
      dishes: dishes.map((dish) => ({
        ...dish,
        initial: dish.name.charAt(0),
        ingredientText: dish.ingredients.join("、")
      })),
      categories: getCategories(dishes)
    });
  },

  updateField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  changeTone(event) {
    const toneIndex = Number(event.detail.value);
    const imageTone = this.data.toneOptions[toneIndex];
    this.setData({
      toneIndex,
      "form.imageTone": imageTone
    });
  },

  editDish(event) {
    const id = event.currentTarget.dataset.id;
    const dish = this.data.dishes.find((item) => item.id === id);
    if (!dish) {
      return;
    }

    this.setData({
      editing: true,
      toneIndex: Math.max(this.data.toneOptions.indexOf(dish.imageTone), 0),
      form: {
        id: dish.id,
        name: dish.name,
        category: dish.category,
        tag: dish.tag,
        calories: dish.calories,
        protein: dish.protein,
        imageTone: dish.imageTone,
        description: dish.description,
        ingredientText: dish.ingredients.join("、")
      }
    });
  },

  resetForm() {
    this.setData({
      editing: false,
      toneIndex: 4,
      form: { ...emptyForm }
    });
  },

  async saveDish() {
    const form = this.data.form;
    if (!form.name.trim() || !form.category.trim()) {
      wx.showToast({
        title: "请填写菜名和分类",
        icon: "none"
      });
      return;
    }

    const ingredients = form.ingredientText
      .split(/[、,\n]/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!ingredients.length) {
      wx.showToast({
        title: "请填写食材",
        icon: "none"
      });
      return;
    }

    this.setData({ saving: true });
    try {
      await upsertDish({
        id: form.id,
        name: form.name.trim(),
        category: form.category.trim(),
        tag: form.tag.trim() || "家常",
        calories: form.calories.trim() || "待补充",
        protein: form.protein.trim() || "待补充",
        imageTone: form.imageTone,
        description: form.description.trim(),
        ingredients
      });
      this.resetForm();
      wx.showToast({
        title: "已保存",
        icon: "success"
      });
    } catch (error) {
      wx.showToast({
        title: "保存失败",
        icon: "none"
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  confirmRemove(event) {
    const id = event.currentTarget.dataset.id;
    const dish = this.data.dishes.find((item) => item.id === id);
    if (!dish) {
      return;
    }

    wx.showModal({
      title: "移除菜品",
      content: `确定移除「${dish.name}」吗？`,
      confirmColor: "#d64545",
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        try {
          await removeDish(id);
          if (this.data.form.id === id) {
            this.resetForm();
          }
          wx.showToast({
            title: "已移除",
            icon: "success"
          });
        } catch (error) {
          wx.showToast({
            title: "移除失败",
            icon: "none"
          });
        }
      }
    });
  }
});
