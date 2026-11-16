const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

const STATUS = {
  pending: { text: "已下单", tone: "orange" },
  shopping: { text: "采购中", tone: "blue" },
  cooking: { text: "制作中", tone: "purple" },
  done: { text: "已完成", tone: "green" },
  cancelled: { text: "已取消", tone: "gray" }
};

const FLOW = ["pending", "shopping", "cooking", "done"];

const NEXT_ACTION = {
  pending: { status: "shopping", text: "开始采购" },
  shopping: { status: "cooking", text: "开始做饭" },
  cooking: { status: "done", text: "做好了，开饭！" }
};

function pad(num) {
  return String(num).padStart(2, "0");
}

function dateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(key) {
  const [y, m, d] = String(key).split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** 用餐日期：今天 / 明天 / 11月18日 周三 */
function mealDateText(key) {
  if (!key) return "";
  const date = parseDateKey(key);
  const today = parseDateKey(dateKey());
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return "今天";
  if (diff === 1) return "明天";
  if (diff === -1) return "昨天";
  return `${date.getMonth() + 1}月${date.getDate()}日 周${WEEK[date.getDay()]}`;
}

function timeText(ts) {
  if (!ts) return "";
  const date = new Date(ts);
  const now = new Date();
  const hm = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  if (dateKey(date) === dateKey(now)) return `今天 ${hm}`;
  const yesterday = new Date(now.getTime() - 86400000);
  if (dateKey(date) === dateKey(yesterday)) return `昨天 ${hm}`;
  if (date.getFullYear() === now.getFullYear()) return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${hm}`;
  return `${dateKey(date)} ${hm}`;
}

function defaultMealType(date = new Date()) {
  const hour = date.getHours();
  if (hour < 9) return "早餐";
  if (hour < 13) return "午餐";
  if (hour < 20) return "晚餐";
  return "加餐";
}

function statusMeta(status) {
  return STATUS[status] || { text: status, tone: "gray" };
}

module.exports = {
  STATUS,
  FLOW,
  NEXT_ACTION,
  dateKey,
  mealDateText,
  timeText,
  defaultMealType,
  statusMeta
};
