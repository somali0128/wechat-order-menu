const api = require("../../utils/api");
const session = require("../../utils/session");
const menu = require("../../utils/menu");
const cart = require("../../utils/cart");
const { toast, confirm, prompt } = require("../../utils/ui");

const NEW_CATEGORY = "＋ 新建分类";

Page({
  data: {
    id: "",
    loading: true,
    saving: false,
    image: "",
    form: {
      name: "",
      category: "",
      tags: "",
      cookTime: "",
      calories: "",
      protein: "",
      description: "",
      steps: ""
    },
    ingredients: [""],
    categoryOptions: [NEW_CATEGORY]
  },

  async onLoad(query) {
    const id = query.id || "";
    this.setData({ id });
    wx.setNavigationBarTitle({ title: id ? "编辑菜品" : "新增菜品" });

    const s = await session.requireFamily();
    if (!s) return;

    let data = null;
    try {
      data = await menu.ensure();
    } catch (error) {
      toast(error.message);
    }
    const categories = data ? data.categories : [];
    this.setData({ categoryOptions: categories.concat([NEW_CATEGORY]) });

    if (id) {
      let dish = menu.find(id);
      if (!dish) {
        try {
          dish = await api.call("getDish", { id });
        } catch (error) {
          toast(error.message);
          setTimeout(() => wx.navigateBack(), 1200);
          return;
        }
      }
      this.fill(dish);
    } else {
      const category = decodeURIComponent(query.category || "") || categories[0] || "";
      this.setData({ "form.category": category });
    }
    this.setData({ loading: false });
  },

  fill(dish) {
    this.setData({
      image: dish.image,
      form: {
        name: dish.name,
        category: dish.category,
        tags: dish.tags.join(" "),
        cookTime: dish.cookTime,
        calories: dish.calories,
        protein: dish.protein,
        description: dish.description,
        steps: dish.steps
      },
      ingredients: dish.ingredients.length ? dish.ingredients.slice() : [""]
    });
  },

  onInput(event) {
    this.setData({ [`form.${event.currentTarget.dataset.field}`]: event.detail.value });
  },

  async onCategoryChange(event) {
    const value = this.data.categoryOptions[Number(event.detail.value)];
    if (value !== NEW_CATEGORY) {
      this.setData({ "form.category": value });
      return;
    }
    const name = await prompt({ title: "新建分类", placeholder: "最多 10 个字，如：汤品" });
    if (!name) return;
    if (name.length > 10) {
      toast("分类名最多 10 个字");
      return;
    }
    const options = this.data.categoryOptions.filter((item) => item !== NEW_CATEGORY);
    if (!options.includes(name)) options.push(name);
    this.setData({ "form.category": name, categoryOptions: options.concat([NEW_CATEGORY]) });
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ["image"],
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const file = res.tempFiles[0];
        if (file.size > 10 * 1024 * 1024) {
          toast("图片不能超过 10MB");
          return;
        }
        this.compress(file.tempFilePath);
      }
    });
  },

  compress(path) {
    wx.compressImage({
      src: path,
      quality: 70,
      compressedWidth: 1080,
      success: (res) => this.setData({ image: res.tempFilePath }),
      fail: () => this.setData({ image: path })
    });
  },

  removeImage() {
    this.setData({ image: "" });
  },

  onIngredientInput(event) {
    this.setData({ [`ingredients[${event.currentTarget.dataset.index}]`]: event.detail.value });
  },

  addIngredient() {
    if (this.data.ingredients.length >= 50) {
      toast("最多 50 种食材");
      return;
    }
    this.setData({ ingredients: this.data.ingredients.concat([""]) });
  },

  removeIngredient(event) {
    const index = event.currentTarget.dataset.index;
    const ingredients = this.data.ingredients.filter((_, i) => i !== index);
    this.setData({ ingredients: ingredients.length ? ingredients : [""] });
  },

  async save() {
    if (this.data.saving) return;
    const { form } = this.data;
    const ingredients = this.data.ingredients.map((item) => item.trim()).filter(Boolean);
    if (!form.name.trim()) {
      toast("请填写菜名");
      return;
    }
    if (!form.category.trim()) {
      toast("请选择分类");
      return;
    }
    if (!ingredients.length) {
      toast("请至少填写一种食材");
      return;
    }

    this.setData({ saving: true });
    wx.showLoading({ title: "正在保存", mask: true });
    try {
      const image = await api.uploadImage(this.data.image, `dishes/${session.familyId()}`);
      const dish = await api.call("saveDish", {
        dish: {
          id: this.data.id || undefined,
          name: form.name,
          category: form.category,
          tags: form.tags,
          cookTime: form.cookTime,
          calories: form.calories,
          protein: form.protein,
          description: form.description,
          steps: form.steps,
          ingredients,
          image
        }
      });
      menu.upsertLocal(dish);
      wx.hideLoading();
      wx.showToast({ title: "已保存", icon: "success" });
      setTimeout(() => wx.navigateBack(), 600);
    } catch (error) {
      wx.hideLoading();
      toast(error.message);
    }
    this.setData({ saving: false });
  },

  async remove() {
    const ok = await confirm({
      title: "删除菜品",
      content: `确定删除「${this.data.form.name}」吗？历史订单不受影响。`,
      confirmText: "删除",
      danger: true
    });
    if (!ok) return;
    try {
      await api.call("removeDish", { id: this.data.id }, { loading: "正在删除" });
      menu.removeLocal(this.data.id);
      cart.remove(this.data.id);
      wx.showToast({ title: "已删除", icon: "success" });
      setTimeout(() => {
        const pages = getCurrentPages();
        const prev = pages[pages.length - 2];
        // 从详情页进入时，删除后跳过已失效的详情页
        wx.navigateBack({ delta: prev && prev.route === "pages/dish/dish" ? 2 : 1 });
      }, 600);
    } catch (error) {
      toast(error.message);
    }
  }
});
