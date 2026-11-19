const session = require("../../utils/session");
const visit = require("../../utils/visit");
const share = require("../../utils/share");
const { toast } = require("../../utils/ui");

const ALL = "全部";

Page({
  data: {
    code: "",
    loading: true,
    errorText: "",
    family: null,
    canCopy: false,
    isMine: false,
    readonly: false,
    categories: [ALL],
    active: ALL,
    list: [],
    busyId: ""
  },

  onLoad(query) {
    share.enableTimeline();
    this.singlePage = share.isSinglePage();
    this.setData({ code: visit.normalizeCode(query.code) });
    this.load();
  },

  onShow() {
    // 从详情页返回时同步点赞 / 收藏状态
    if (this.data.family) this.render();
  },

  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },

  async load() {
    try {
      if (!this.singlePage) {
        await session.login();
        share.prepare();
      }
      const data = await visit.open(this.data.code);
      wx.setNavigationBarTitle({ title: data.family.name });
      this.setData({
        family: data.family,
        canCopy: data.canCopy,
        isMine: data.isMine,
        readonly: this.singlePage || data.anonymous,
        categories: [ALL].concat(data.categories),
        errorText: ""
      });
      this.render();
    } catch (error) {
      if (!this.data.family) this.setData({ errorText: error.message });
      else toast(error.message);
    }
    this.setData({ loading: false });
  },

  render() {
    const data = visit.get(this.data.code);
    if (!data) return;
    const active = this.data.categories.includes(this.data.active) ? this.data.active : ALL;
    this.setData({
      active,
      list: data.dishes
        .filter((dish) => active === ALL || dish.category === active)
        .map((dish) => ({
          id: dish.id,
          name: dish.name,
          image: dish.image,
          description: dish.description || dish.ingredientText,
          tags: dish.tags.slice(0, 2),
          cookTime: dish.cookTime,
          liked: dish.liked,
          likeCount: dish.likeCount,
          copied: dish.copied
        }))
    });
  },

  selectCategory(event) {
    this.setData({ active: event.currentTarget.dataset.name });
    this.render();
  },

  openDish(event) {
    wx.navigateTo({
      url: `/pages/visit-dish/visit-dish?code=${this.data.code}&id=${event.currentTarget.dataset.id}`,
      fail: () => toast("点击屏幕下方「前往小程序」查看详情")
    });
  },

  /** 只读状态下的提示，返回 true 表示不能操作 */
  blocked() {
    if (this.data.readonly) {
      toast("点击屏幕下方「前往小程序」后，就能点赞和收藏");
      return true;
    }
    if (this.data.isMine) {
      toast("这是你自己家的菜");
      return true;
    }
    return false;
  },

  async like(event) {
    const id = event.currentTarget.dataset.id;
    if (this.data.busyId || this.blocked()) return;
    this.setData({ busyId: id });
    try {
      const res = await visit.toggleLike(this.data.code, id);
      if (res.liked) wx.vibrateShort({ type: "light", fail() {} });
      this.render();
    } catch (error) {
      toast(error.message);
    }
    this.setData({ busyId: "" });
  },

  async copy(event) {
    const id = event.currentTarget.dataset.id;
    const dish = visit.find(this.data.code, id);
    if (!dish || dish.copied || this.blocked()) return;
    if (!this.data.canCopy) {
      toast("创建或加入家庭后，才能加入自己的菜谱");
      return;
    }
    try {
      await visit.copy(this.data.code, id);
      this.render();
      toast("已加入「收藏」分类", "success");
    } catch (error) {
      toast(error.message);
    }
  },

  onShareAppMessage() {
    const name = this.data.family ? this.data.family.name : "";
    return {
      title: name ? `来「${name}」看看今天吃什么` : "来看看我家的菜单",
      path: `/pages/visit-menu/visit-menu?code=${this.data.code}`,
      imageUrl: share.image()
    };
  },

  onShareTimeline() {
    const name = this.data.family ? this.data.family.name : "";
    return {
      title: name ? `「${name}」的家常菜单` : "看看我家的菜单",
      query: `code=${this.data.code}`,
      imageUrl: share.image()
    };
  },

  back() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: "/pages/menu/menu" }) });
  }
});
