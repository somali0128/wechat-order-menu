const { fail } = require("./errors");

function str(value, max, label) {
  const text = String(value === undefined || value === null ? "" : value).trim();
  if (max && text.length > max) {
    fail(`${label || "内容"}不能超过 ${max} 个字`);
  }
  return text;
}

function requiredStr(value, max, label) {
  const text = str(value, max, label);
  if (!text) {
    fail(`请填写${label}`);
  }
  return text;
}

function strList(value, { maxItems, maxLength, label }) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,，、\s]+/);
  const result = [];
  source.forEach((item) => {
    const text = String(item || "").trim();
    if (text && !result.includes(text)) {
      if (maxLength && text.length > maxLength) {
        fail(`${label}「${text.slice(0, 6)}…」不能超过 ${maxLength} 个字`);
      }
      result.push(text);
    }
  });
  if (maxItems && result.length > maxItems) {
    fail(`${label}最多 ${maxItems} 个`);
  }
  return result;
}

function int(value, min, max, fallback) {
  const num = parseInt(value, 10);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, num));
}

// 云函数运行在 UTC 时区，统一换算为北京时间
function cnDate(ts = Date.now()) {
  return new Date(ts + 8 * 3600 * 1000);
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function formatCnTime(ts = Date.now()) {
  const d = cnDate(ts);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function makeOrderNo(ts = Date.now()) {
  const d = cnDate(ts);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${String(d.getUTCFullYear()).slice(2)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${rand}`;
}

function isCloudFile(value) {
  return typeof value === "string" && value.startsWith("cloud://");
}

function truncate(text, max) {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

module.exports = {
  str,
  requiredStr,
  strList,
  int,
  cnDate,
  formatCnTime,
  makeOrderNo,
  isCloudFile,
  truncate
};
