// storage.js - 数据存储层（Web localStorage 版）
// 从微信小程序版迁移，业务逻辑完全一致

const KEY_ITEMS = 'hct_items';
const KEY_HISTORY = 'hct_history';
const KEY_SETTINGS = 'hct_settings';
const KEY_CHECKINS = 'hct_checkins'; // 每日消耗打卡记录

const DEFAULT_SETTINGS = {
  lowStockThreshold: 0.2,
  expireSoonDays: 7,
  repurchaseDays: 7,
  // 定期提醒设置
  notifyEnabled: false,
  notifyFreq: 'daily',      // 'daily' | 'weekly'
  notifyTime: '20:00',      // HH:MM
  notifyWeekday: 1,         // weekly 时周几触发（0=周日...6=周六）
  lastNotifyDate: ''        // YYYY-MM-DD，上次触发日期，防重复
};

// localStorage 读写封装
function read(key) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : '';
  } catch (e) {
    return '';
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// 生成唯一 ID
function genId() {
  return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// 日期工具
function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function formatRelative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return min + ' 分钟前';
  const hour = Math.floor(min / 60);
  if (hour < 24) return hour + ' 小时前';
  const day = Math.floor(hour / 24);
  if (day < 30) return day + ' 天前';
  return formatDate(ts);
}

function daysBetween(a, b) {
  return Math.floor((b - a) / 86400000);
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00').getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((target - today.getTime()) / 86400000);
}

function round(num, n) {
  const f = Math.pow(10, n);
  return Math.round(num * f) / f;
}

// 初始化存储
function init() {
  if (read(KEY_ITEMS) === '') write(KEY_ITEMS, []);
  if (read(KEY_HISTORY) === '') write(KEY_HISTORY, []);
  if (read(KEY_SETTINGS) === '') write(KEY_SETTINGS, DEFAULT_SETTINGS);
  if (read(KEY_CHECKINS) === '') write(KEY_CHECKINS, []);
}

function getItems() { return read(KEY_ITEMS) || []; }
function getHistory() { return read(KEY_HISTORY) || []; }
function getSettings() { return Object.assign({}, DEFAULT_SETTINGS, read(KEY_SETTINGS) || {}); }

function saveItems(list) { write(KEY_ITEMS, list); }
function saveHistory(list) { write(KEY_HISTORY, list); }

// 添加物品
function addItem(data) {
  const items = getItems();
  const now = Date.now();
  const item = {
    id: genId(),
    name: data.name,
    category: data.category || '其他',
    unit: data.unit || '个',
    totalQuantity: Number(data.totalQuantity),
    remainingQuantity: Number(data.totalQuantity),
    price: Number(data.price),
    purchaseDate: data.purchaseDate,
    expireDate: data.expireDate || '',
    createTime: now,
    status: 'active',
    usageRecords: [],
    consumedTime: null,
    analysis: null
  };
  items.unshift(item);
  saveItems(items);
  return item;
}

// 获取单个物品
function getItem(id) {
  const inActive = getItems().find(i => i.id === id);
  if (inActive) return inActive;
  return getHistory().find(i => i.id === id) || null;
}

// 添加使用记录
function addUsage(id, quantity, note) {
  const items = getItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return null;

  const item = items[idx];
  const q = Number(quantity);
  const record = { time: Date.now(), quantity: q, note: note || '' };
  item.usageRecords.push(record);
  item.remainingQuantity = round(item.remainingQuantity - q, 3);

  let consumed = false;
  if (item.remainingQuantity <= 0) {
    item.remainingQuantity = 0;
    item.status = 'consumed';
    item.consumedTime = Date.now();
    item.analysis = analyze(item);
    consumed = true;
    const history = getHistory();
    history.unshift(item);
    saveHistory(history);
    items.splice(idx, 1);
    saveItems(items);
  } else {
    items[idx] = item;
    saveItems(items);
  }

  return { item, consumed };
}

// 删除物品
function deleteItem(id) {
  let items = getItems();
  let idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items.splice(idx, 1);
    saveItems(items);
    return true;
  }
  let history = getHistory();
  idx = history.findIndex(i => i.id === id);
  if (idx !== -1) {
    history.splice(idx, 1);
    saveHistory(history);
    return true;
  }
  return false;
}

// 消耗分析
function analyze(item) {
  const startTs = new Date(item.purchaseDate + 'T00:00:00').getTime() || item.createTime;
  const endTs = item.consumedTime || Date.now();
  const durationDays = Math.max(daysBetween(startTs, endTs), 1);
  const usageCount = item.usageRecords.length;
  const totalUsed = item.totalQuantity;

  return {
    totalCost: round(item.price, 2),
    durationDays,
    dailyCost: round(item.price / durationDays, 2),
    dailyUsage: round(totalUsed / durationDays, 3),
    usageCount,
    avgPerUse: usageCount > 0 ? round(totalUsed / usageCount, 3) : 0,
    costPerUse: usageCount > 0 ? round(item.price / usageCount, 2) : 0,
    startDate: item.purchaseDate,
    endDate: item.consumedTime ? new Date(item.consumedTime).toISOString().slice(0, 10) : ''
  };
}

// 预测购买时机
function predictPurchase(item) {
  const settings = getSettings();
  const history = getHistory();
  const sameNameHistory = history.filter(h => h.name === item.name && h.analysis);
  let dailyUsage = 0;

  if (item.usageRecords.length >= 2) {
    const first = item.usageRecords[0].time;
    const last = item.usageRecords[item.usageRecords.length - 1].time;
    const span = Math.max(daysBetween(first, last), 1);
    const used = item.usageRecords.reduce((s, r) => s + r.quantity, 0);
    dailyUsage = used / span;
  } else if (sameNameHistory.length > 0) {
    dailyUsage = sameNameHistory.reduce((s, h) => s + h.analysis.dailyUsage, 0) / sameNameHistory.length;
  }

  if (dailyUsage <= 0) {
    return { needBuy: false, daysLeft: null, dailyUsage: 0, reason: 'no_data' };
  }

  const daysLeft = Math.floor(item.remainingQuantity / dailyUsage);
  return {
    needBuy: daysLeft <= settings.repurchaseDays,
    daysLeft,
    dailyUsage: round(dailyUsage, 3),
    reason: daysLeft <= settings.repurchaseDays ? 'soon' : 'ok'
  };
}

// 提醒列表
function getReminders() {
  const items = getItems();
  const settings = getSettings();
  const list = [];

  items.forEach(item => {
    const ratio = item.totalQuantity > 0 ? item.remainingQuantity / item.totalQuantity : 0;
    const pred = predictPurchase(item);
    if (ratio <= settings.lowStockThreshold || pred.needBuy) {
      list.push({
        type: 'low_stock',
        item,
        daysLeft: pred.daysLeft,
        priority: pred.daysLeft !== null && pred.daysLeft <= 3 ? 1 : 2
      });
    }
    if (item.expireDate) {
      const d = daysUntil(item.expireDate);
      if (d !== null && d <= settings.expireSoonDays) {
        list.push({
          type: d < 0 ? 'expired' : 'expire_soon',
          item,
          daysLeft: d,
          priority: d < 0 ? 1 : 2
        });
      }
    }
  });

  list.sort((a, b) => a.priority - b.priority);
  return list;
}

// 分析汇总
function getAnalysisSummary() {
  const history = getHistory();
  if (history.length === 0) {
    return { count: 0, totalCost: 0, avgDuration: 0, avgDailyCost: 0, topCost: [], byName: {} };
  }

  let totalCost = 0;
  let totalDuration = 0;
  const byName = {};

  history.forEach(h => {
    const a = h.analysis || analyze(h);
    totalCost += a.totalCost;
    totalDuration += a.durationDays;
    if (!byName[h.name]) {
      byName[h.name] = { name: h.name, count: 0, totalCost: 0, totalQty: 0, durations: [] };
    }
    byName[h.name].count += 1;
    byName[h.name].totalCost += a.totalCost;
    byName[h.name].totalQty += h.totalQuantity;
    byName[h.name].durations.push(a.durationDays);
  });

  const topCost = Object.values(byName)
    .map(b => ({
      name: b.name,
      count: b.count,
      totalCost: round(b.totalCost, 2),
      avgDuration: round(b.durations.reduce((s, x) => s + x, 0) / b.durations.length, 1)
    }))
    .sort((a, b) => b.totalCost - a.totalCost);

  return {
    count: history.length,
    totalCost: round(totalCost, 2),
    avgDuration: round(totalDuration / history.length, 1),
    avgDailyCost: round(totalCost / Math.max(totalDuration, 1), 2),
    topCost,
    byName
  };
}

// ============ 每日消耗打卡 ============

function getCheckins() { return read(KEY_CHECKINS) || []; }

// 获取某天打卡（按 YYYY-MM-DD）
function getCheckinByDate(dateStr) {
  return getCheckins().find(c => c.date === dateStr) || null;
}

// 保存/更新某天打卡
// entries: [{ itemId, name, unit, quantity }]
function saveCheckin(dateStr, entries, note) {
  const list = getCheckins();
  const idx = list.findIndex(c => c.date === dateStr);
  const oldRecord = idx !== -1 ? list[idx] : null;

  // 覆盖时先回滚旧记录的扣减（直接调整 remainingQuantity，避免重复扣减）
  if (oldRecord) {
    const items = getItems();
    oldRecord.entries.forEach(e => {
      const i = items.findIndex(it => it.id === e.itemId);
      if (i !== -1 && items[i].status === 'active') {
        items[i].remainingQuantity = round(items[i].remainingQuantity + Number(e.quantity), 3);
        if (items[i].remainingQuantity > items[i].totalQuantity) {
          items[i].remainingQuantity = items[i].totalQuantity;
        }
      }
    });
    // 移除该天打卡产生的使用记录，保持日志干净
    items.forEach(it => {
      if (it.usageRecords) {
        it.usageRecords = it.usageRecords.filter(r => r.note !== '每日打卡 ' + dateStr);
      }
    });
    saveItems(items);
  }

  const record = {
    date: dateStr,
    entries: entries.filter(e => Number(e.quantity) > 0),
    note: note || '',
    updateTime: Date.now()
  };
  if (idx === -1) {
    list.push(record);
  } else {
    list[idx] = record;
  }
  // 按日期倒序
  list.sort((a, b) => (a.date < b.date ? 1 : -1));
  write(KEY_CHECKINS, list);

  // 同步把打卡数量写入对应在用物品的使用记录
  record.entries.forEach(e => {
    const item = getItem(e.itemId);
    if (item && item.status === 'active' && Number(e.quantity) > 0) {
      addUsage(e.itemId, Number(e.quantity), '每日打卡 ' + dateStr);
    }
  });
  return record;
}

// 最近 N 天消耗统计
function getCheckinStats(days) {
  const list = getCheckins();
  const n = days || 7;
  const today = new Date();
  const result = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = formatDate(d.getTime());
    const c = list.find(x => x.date === ds);
    const totalQty = c ? c.entries.reduce((s, e) => s + Number(e.quantity), 0) : 0;
    const itemCount = c ? c.entries.length : 0;
    result.push({
      date: ds,
      weekday: '日一二三四五六'[d.getDay()],
      hasRecord: !!c,
      totalQty: round(totalQty, 3),
      itemCount,
      entries: c ? c.entries : [],
      note: c ? c.note : ''
    });
  }
  return result;
}

// ============ 定期提醒（通知）============

function getNotifyConfig() {
  const s = getSettings();
  return {
    notifyEnabled: s.notifyEnabled,
    notifyFreq: s.notifyFreq,
    notifyTime: s.notifyTime,
    notifyWeekday: s.notifyWeekday,
    lastNotifyDate: s.lastNotifyDate
  };
}

function setNotifyConfig(cfg) {
  const s = getSettings();
  Object.assign(s, cfg);
  write(KEY_SETTINGS, s);
  return s;
}

// 今天是否应该提醒（频率 + 当天是否已触发）
function shouldNotifyToday() {
  const cfg = getNotifyConfig();
  if (!cfg.notifyEnabled) return false;
  const now = new Date();
  const today = formatDate(now.getTime());
  if (cfg.lastNotifyDate === today) return false; // 今天已触发
  if (cfg.notifyFreq === 'weekly' && now.getDay() !== cfg.notifyWeekday) return false;
  // 时间是否已过设定时间
  const [h, m] = (cfg.notifyTime || '20:00').split(':').map(Number);
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

// 标记今天已触发
function markNotifiedToday() {
  setNotifyConfig({ lastNotifyDate: formatDate(Date.now()) });
}

// 生成提醒文案
function buildNotifyMessage() {
  const items = getItems();
  const rems = getReminders();
  if (items.length === 0) {
    return '还没有在用物品，点击记录今日消耗';
  }
  const lowCount = rems.filter(r => r.type === 'low_stock').length;
  const expCount = rems.filter(r => r.type !== 'low_stock').length;
  let msg = '在用物品 ' + items.length + ' 件';
  if (lowCount > 0) msg += '，' + lowCount + ' 件待补货';
  if (expCount > 0) msg += '，' + expCount + ' 件临期/过期';
  msg += '。别忘了记录今日消耗。';
  return msg;
}

// 导出（兼容 CommonJS 和浏览器全局）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    init, getItems, getHistory, getSettings,
    addItem, getItem, addUsage, deleteItem,
    analyze, predictPurchase, getReminders, getAnalysisSummary,
    formatDate, formatRelative, daysUntil, round,
    getCheckins, getCheckinByDate, saveCheckin, getCheckinStats,
    getNotifyConfig, setNotifyConfig, shouldNotifyToday, markNotifiedToday, buildNotifyMessage
  };
} else {
  window.HCT = {
    init, getItems, getHistory, getSettings,
    addItem, getItem, addUsage, deleteItem,
    analyze, predictPurchase, getReminders, getAnalysisSummary,
    formatDate, formatRelative, daysUntil, round,
    getCheckins, getCheckinByDate, saveCheckin, getCheckinStats,
    getNotifyConfig, setNotifyConfig, shouldNotifyToday, markNotifiedToday, buildNotifyMessage
  };
}
