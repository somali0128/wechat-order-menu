const { ORDERS_COLLECTION } = require("./config");

function getAppInstance() {
  return getApp ? getApp() : null;
}

function isCloudReady() {
  const app = getAppInstance();
  return Boolean(app && app.globalData.cloudReady && wx.cloud);
}

function getLocalOrders() {
  return wx.getStorageSync("family_menu_orders") || [];
}

function setLocalOrders(orders) {
  wx.setStorageSync("family_menu_orders", orders);
}

function normalizeOrder(order) {
  return {
    ...order,
    createdAtText: order.createdAtText || formatTime(order.createdAt)
  };
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildOrder(cart, checkedIngredients) {
  const allIngredients = [];
  cart.forEach((item) => {
    item.ingredients.forEach((ingredient) => {
      if (!allIngredients.includes(ingredient)) {
        allIngredients.push(ingredient);
      }
    });
  });

  return {
    status: "已下单",
    dishes: cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      ingredients: item.ingredients
    })),
    ingredients: allIngredients.map((name) => ({
      name,
      ready: checkedIngredients.includes(name)
    })),
    totalItems: cart.reduce((sum, item) => sum + item.quantity, 0),
    createdAt: Date.now(),
    createdAtText: formatTime(Date.now())
  };
}

async function createOrder(order) {
  if (isCloudReady()) {
    const db = wx.cloud.database();
    const result = await db.collection(ORDERS_COLLECTION).add({
      data: order
    });
    return {
      ...order,
      _id: result._id
    };
  }

  const localOrder = {
    ...order,
    _id: `local_${Date.now()}`
  };
  const orders = [localOrder, ...getLocalOrders()];
  setLocalOrders(orders);
  return localOrder;
}

async function listOrders() {
  if (isCloudReady()) {
    const db = wx.cloud.database();
    const result = await db
      .collection(ORDERS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();
    return result.data.map(normalizeOrder);
  }

  return getLocalOrders().map(normalizeOrder);
}

function watchOrders(onChange, onError) {
  if (!isCloudReady()) {
    onChange(getLocalOrders().map(normalizeOrder));
    return null;
  }

  const db = wx.cloud.database();
  return db
    .collection(ORDERS_COLLECTION)
    .orderBy("createdAt", "desc")
    .watch({
      onChange(snapshot) {
        onChange(snapshot.docs.map(normalizeOrder));
      },
      onError
    });
}

module.exports = {
  buildOrder,
  createOrder,
  listOrders,
  watchOrders
};
