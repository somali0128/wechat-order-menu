const { listMembers, removeMember, upsertMember, watchMembers } = require("../../utils/memberStore");
const {
  buildSharePath,
  createFamilyKey,
  getFamilyKey,
  getStoredSession,
  login,
  normalizeFamilyKey,
  setFamilyKey
} = require("../../utils/sessionStore");

const emptyForm = {
  id: "",
  name: "",
  role: "",
  phone: ""
};

Page({
  data: {
    cloudReady: false,
    familyKey: "",
    familyCode: "",
    session: null,
    userProfile: null,
    members: [],
    form: { ...emptyForm },
    editing: false,
    loading: true,
    saving: false
  },

  watcher: null,

  onLoad(options = {}) {
    if (options.familyKey) {
      setFamilyKey(options.familyKey);
    }

    const app = getApp();
    this.setData({
      cloudReady: app.globalData.cloudReady,
      familyKey: getFamilyKey(),
      familyCode: getFamilyKey(),
      session: getStoredSession(),
      userProfile: app.globalData.userProfile
    });

    if (wx.showShareMenu) {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ["shareAppMessage", "shareTimeline"]
      });
    }

    this.loadMembers();
    this.startWatch();
  },

  onUnload() {
    this.closeWatch();
  },

  onShow() {
    const familyKey = getFamilyKey();
    if (familyKey !== this.data.familyKey) {
      this.setData({
        familyKey,
        familyCode: familyKey,
        session: getStoredSession(),
        members: [],
        loading: true
      });
      this.loadMembers();
      this.startWatch();
    }
  },

  async loginWithWechat() {
    try {
      const result = await login();
      this.setData({
        session: result,
        familyKey: getFamilyKey(),
        familyCode: getFamilyKey()
      });
      wx.showToast({
        title: result.cloud ? "云登录成功" : "本地登录成功",
        icon: "success"
      });
    } catch (error) {
      wx.showToast({
        title: "登录失败，请检查云函数",
        icon: "none"
      });
    }
  },

  async authorizeProfile() {
    try {
      const result = await new Promise((resolve, reject) => {
        wx.getUserProfile({
          desc: "用于展示家庭菜单共享成员信息",
          success: resolve,
          fail: reject
        });
      });
      const profile = result.userInfo;
      getApp().setUserProfile(profile);
      this.setData({ userProfile: profile });

      if (profile.nickName) {
        this.setData({
          form: {
            ...this.data.form,
            name: this.data.form.name || profile.nickName
          }
        });
      }

      wx.showToast({
        title: "已授权",
        icon: "success"
      });
    } catch (error) {
      wx.showToast({
        title: "授权已取消",
        icon: "none"
      });
    }
  },

  async loadMembers() {
    this.setData({ loading: true });
    try {
      const members = await listMembers();
      this.setData({ members: this.decorateMembers(members) });
    } catch (error) {
      wx.showToast({
        title: "成员读取失败",
        icon: "none"
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  startWatch() {
    this.closeWatch();
    this.watcher = watchMembers(
      (members) => {
        this.setData({
          members: this.decorateMembers(members),
          loading: false
        });
      },
      () => {
        wx.showToast({
          title: "成员同步失败",
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

  updateField(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value
    });
  },

  updateFamilyCode(event) {
    this.setData({
      familyCode: normalizeFamilyKey(event.detail.value)
    });
  },

  switchFamily() {
    const familyKey = setFamilyKey(this.data.familyCode);
    this.setData({
      familyKey,
      familyCode: familyKey,
      members: [],
      loading: true
    });
    this.loadMembers();
    this.startWatch();
    wx.showToast({
      title: "已切换家庭",
      icon: "success"
    });
  },

  createNewFamily() {
    const session = this.data.session || getStoredSession() || {};
    const familyKey = setFamilyKey(createFamilyKey(session.openid));
    this.setData({
      familyKey,
      familyCode: familyKey,
      members: [],
      loading: true
    });
    this.loadMembers();
    this.startWatch();
    wx.showToast({
      title: "已创建家庭",
      icon: "success"
    });
  },

  copyFamilyCode() {
    wx.setClipboardData({
      data: this.data.familyKey,
      success: () => {
        wx.showToast({
          title: "家庭码已复制",
          icon: "success"
        });
      }
    });
  },

  decorateMembers(members) {
    return members.map((member) => ({
      ...member,
      initial: member.name.charAt(0),
      metaText: `${member.role}${member.phone ? ` · ${member.phone}` : ""}`
    }));
  },

  editMember(event) {
    const id = event.currentTarget.dataset.id;
    const member = this.data.members.find((item) => item.id === id);
    if (!member) {
      return;
    }

    this.setData({
      editing: true,
      form: {
        id: member.id,
        name: member.name,
        role: member.role,
        phone: member.phone
      }
    });
  },

  resetForm() {
    this.setData({
      editing: false,
      form: { ...emptyForm }
    });
  },

  async saveMember() {
    const form = this.data.form;
    if (!form.name.trim()) {
      wx.showToast({
        title: "请填写成员姓名",
        icon: "none"
      });
      return;
    }

    this.setData({ saving: true });
    try {
      const profile = this.data.userProfile || {};
      const session = this.data.session || getStoredSession() || {};
      await upsertMember({
        id: form.id,
        name: form.name.trim(),
        role: form.role.trim() || "成员",
        phone: form.phone.trim(),
        avatarUrl: profile.avatarUrl || "",
        openid: session.openid || ""
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
    const member = this.data.members.find((item) => item.id === id);
    if (!member) {
      return;
    }

    wx.showModal({
      title: "移除成员",
      content: `确定移除「${member.name}」吗？`,
      confirmColor: "#d64545",
      success: async (result) => {
        if (!result.confirm) {
          return;
        }

        try {
          await removeMember(id);
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
  },

  goManage() {
    wx.navigateTo({
      url: "/pages/manage/manage"
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
      query: `familyKey=${encodeURIComponent(this.data.familyKey)}`
    };
  }
});
