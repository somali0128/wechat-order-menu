const api = require("../../utils/api");
const session = require("../../utils/session");
const menu = require("../../utils/menu");
const { toast, confirm, prompt, actionSheet } = require("../../utils/ui");

Page({
  data: {
    list: [],
    loading: true,
    busy: false
  },

  async onShow() {
    const s = await session.requireFamily();
    if (!s) return;
    const cached = menu.peek();
    if (cached) this.apply(cached);
    try {
      this.apply(await menu.fetch());
    } catch (error) {
      toast(error.message);
    }
    this.setData({ loading: false });
  },

  apply(data) {
    this.setData({
      loading: false,
      list: data.categories.map((name) => ({
        name,
        count: data.dishes.filter((dish) => dish.category === name).length
      }))
    });
  },

  async persist(categories, loadingText) {
    if (this.data.busy) return false;
    this.setData({ busy: true });
    try {
      const saved = await api.call("saveCategories", { categories }, { loading: loadingText });
      menu.setCategoriesLocal(saved);
      this.apply(menu.peek());
      return true;
    } catch (error) {
      toast(error.message);
      return false;
    } finally {
      this.setData({ busy: false });
    }
  },

  names() {
    return this.data.list.map((item) => item.name);
  },

  async add() {
    const name = await prompt({ title: "新建分类", placeholder: "最多 10 个字，如：汤品" });
    if (!name) return;
    if (name.length > 10) {
      toast("分类名最多 10 个字");
      return;
    }
    if (this.names().includes(name)) {
      toast("分类已存在");
      return;
    }
    if (await this.persist(this.names().concat([name]), "正在添加")) {
      toast("已添加", "success");
    }
  },

  move(event) {
    if (this.data.busy) return;
    const { index, delta } = event.currentTarget.dataset;
    const target = index + Number(delta);
    const names = this.names();
    if (target < 0 || target >= names.length) return;
    [names[index], names[target]] = [names[target], names[index]];
    // 先本地更新，保证操作流畅
    const list = this.data.list.slice();
    [list[index], list[target]] = [list[target], list[index]];
    this.setData({ list });
    this.persist(names, "");
  },

  async more(event) {
    const item = this.data.list[event.currentTarget.dataset.index];
    const tap = await actionSheet(["重命名", "删除"]);
    if (tap === 0) {
      this.rename(item);
    } else if (tap === 1) {
      this.remove(item);
    }
  },

  async rename(item) {
    const name = await prompt({ title: "重命名分类", value: item.name, placeholder: "最多 10 个字" });
    if (!name || name === item.name) return;
    if (name.length > 10) {
      toast("分类名最多 10 个字");
      return;
    }
    try {
      const categories = await api.call("renameCategory", { from: item.name, to: name }, { loading: "正在保存" });
      this.apply(await menu.fetch());
      menu.setCategoriesLocal(categories);
      toast("已重命名", "success");
    } catch (error) {
      toast(error.message);
    }
  },

  async remove(item) {
    if (item.count) {
      wx.showModal({
        title: "无法删除",
        content: `「${item.name}」下还有 ${item.count} 道菜，请先把它们移到其他分类或删除。`,
        showCancel: false,
        confirmColor: "#ff8a1f"
      });
      return;
    }
    const ok = await confirm({ title: "删除分类", content: `确定删除「${item.name}」吗？`, confirmText: "删除", danger: true });
    if (!ok) return;
    if (await this.persist(this.names().filter((name) => name !== item.name), "正在删除")) {
      toast("已删除", "success");
    }
  }
});
