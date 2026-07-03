// app.js - Vue 3 单页应用
// 5 个页面 + hash 路由 + 共享使用弹窗

const { createApp, reactive, computed, ref, onMounted, watch } = Vue;
const S = window.HCT;

// ============ 路由 ============
const route = reactive({ name: 'index', params: {} });

function parseHash() {
  const hash = window.location.hash.slice(1) || '/';
  const parts = hash.split('/').filter(Boolean); // ['detail', 'xxx']
  if (parts.length === 0) {
    route.name = 'index'; route.params = {};
  } else if (parts[0] === 'add') {
    route.name = 'add'; route.params = {};
  } else if (parts[0] === 'detail' && parts[1]) {
    route.name = 'detail'; route.params = { id: parts[1] };
  } else if (parts[0] === 'analysis') {
    route.name = 'analysis'; route.params = {};
  } else if (parts[0] === 'reminder') {
    route.name = 'reminder'; route.params = {};
  } else if (parts[0] === 'checkin') {
    route.name = 'checkin'; route.params = {};
  } else {
    route.name = 'index'; route.params = {};
  }
}

function navigate(path) {
  window.location.hash = path;
}

window.addEventListener('hashchange', parseHash);
parseHash();

// ============ 共享使用弹窗 ============
const useModal = reactive({
  show: false,
  item: null,
  qty: '1'
});

function openUseModal(item) {
  useModal.item = item;
  useModal.qty = '1';
  useModal.show = true;
}
function closeUseModal() {
  useModal.show = false;
  useModal.item = null;
}
function setQty(add) {
  const cur = Number(useModal.qty) || 0;
  useModal.qty = String(S.round(cur + add, 3));
}
function resetQty() {
  useModal.qty = '1';
}

const UseModalComponent = {
  template: `
  <div class="modal-mask" :class="{ show: store.show }" @click="close">
    <div class="modal" @click.stop>
      <div class="modal-label">QUICK USE</div>
      <div class="modal-title">{{ store.item && store.item.name }}</div>
      <div class="modal-info num" v-if="store.item">剩余 {{ store.item.remainingQuantity }} {{ store.item.unit }}</div>
      <div class="modal-divider"></div>
      <div class="qty-label">本次使用数量</div>
      <input class="qty-input num" type="number" step="any" v-model="store.qty" placeholder="0" />
      <div class="modal-quick">
        <view class="qbtn" @click="add(1)">+1</view>
        <view class="qbtn" @click="add(0.5)">+0.5</view>
        <view class="qbtn" @click="add(5)">+5</view>
        <view class="qbtn ghost" @click="reset">重置</view>
      </div>
      <div class="modal-actions">
        <div class="btn-ghost cancel" @click="close">取消</div>
        <div class="btn-primary confirm" @click="confirm">确认使用</div>
      </div>
    </div>
  </div>
  `,
  setup() {
    const store = useModal;
    const close = closeUseModal;
    const add = setQty;
    const reset = resetQty;
    function confirm() {
      const qty = Number(store.qty);
      if (!qty || qty <= 0) return;
      if (qty > store.item.remainingQuantity) return;
      const result = S.addUsage(store.item.id, qty, '');
      const consumed = result.consumed;
      close();
      if (consumed) {
        alert('已消耗完毕，已生成分析报告');
      }
      // 触发当前页面刷新
      window.dispatchEvent(new Event('hct-data-changed'));
    }
    return { store, close, add, reset, confirm };
  }
};

// ============ 首页 ============
const IndexPage = {
  template: `
  <div class="top-bar"></div>
  <div class="page-wrap">
    <div class="header">
      <span class="label">HOUSEHOLD CONSUMABLES</span>
      <h1 class="h1">日用消耗</h1>
      <div class="subtitle">在用物品 <span class="num count">{{ items.length }}</span></div>
    </div>

    <div class="add-btn" @click="goAdd"><span class="add-plus">+</span> 添加物品</div>

    <div class="checkin-entry" @click="goCheckin">
      <div class="ck-left">
        <span class="ck-label">DAILY CHECK-IN</span>
        <span class="ck-title">今日消耗记录</span>
        <span class="ck-sub" v-if="todayChecked">今日已记录 {{ todayCheckedCount }} 项</span>
        <span class="ck-sub" v-else>点击快速记录今日使用情况</span>
      </div>
      <span class="ck-arrow">›</span>
    </div>

    <div v-if="items.length === 0" class="empty">
      <div class="empty-icon">□</div>
      <div class="empty-text">还没有在用物品</div>
      <div class="empty-sub">点击上方添加你的第一件日用品</div>
    </div>

    <div class="item-list">
      <div v-for="it in items" :key="it.id" class="card item-card" @click="goDetail(it.id)">
        <div class="item-head">
          <span class="item-name">{{ it.name }}</span>
          <span class="item-cat">{{ it.category }}</span>
        </div>
        <div class="num-row">
          <span class="num remaining" :class="{ warn: it.percent <= 20 }">{{ it.remainingQuantity }}</span>
          <span class="num total">/ {{ it.totalQuantity }} {{ it.unit }}</span>
          <span class="percent num">{{ it.percent }}%</span>
        </div>
        <div class="progress">
          <div class="progress-fill" :class="{ 'warn-fill': it.percent <= 20 }" :style="{ width: it.percent + '%' }"></div>
        </div>
        <div class="item-meta">
          <span class="meta-item num">¥{{ it.price }}</span>
          <span v-if="it.expireText" class="meta-item" :class="{ warn: it.expireDays < 0, 'warn-soft': it.expireDays >= 0 && it.expireDays <= 7 }">{{ it.expireText }}</span>
        </div>
        <div class="use-btn" @click.stop="quickUse(it)">使用</div>
      </div>
    </div>
  </div>
  `,
  setup() {
    const items = ref([]);
    const todayChecked = ref(false);
    const todayCheckedCount = ref(0);
    function load() {
      items.value = S.getItems().map(it => {
        const percent = it.totalQuantity > 0 ? Math.max(S.round(it.remainingQuantity / it.totalQuantity * 100, 0), 0) : 0;
        let expireDays = null;
        let expireText = '';
        if (it.expireDate) {
          expireDays = S.daysUntil(it.expireDate);
          if (expireDays < 0) expireText = '已过期';
          else if (expireDays === 0) expireText = '今天过期';
          else expireText = '剩 ' + expireDays + ' 天';
        }
        return Object.assign({}, it, { percent, expireDays, expireText });
      });
      // 今日打卡状态
      const today = S.formatDate(Date.now());
      const ck = S.getCheckinByDate(today);
      todayChecked.value = !!ck && ck.entries.length > 0;
      todayCheckedCount.value = ck ? ck.entries.length : 0;
    }
    onMounted(load);
    window.addEventListener('hct-data-changed', load);
    function goAdd() { navigate('/add'); }
    function goDetail(id) { navigate('/detail/' + id); }
    function goCheckin() { navigate('/checkin'); }
    function quickUse(it) { openUseModal(it); }
    return { items, todayChecked, todayCheckedCount, goAdd, goDetail, goCheckin, quickUse };
  }
};

// ============ 添加页 ============
const AddPage = {
  template: `
  <div class="top-bar"></div>
  <div class="page-wrap">
    <div class="header">
      <span class="label">NEW ITEM</span>
      <h1 class="h1">添加物品</h1>
    </div>
    <div class="form">
      <div class="field">
        <span class="field-label">名称</span>
        <input class="field-input" v-model="form.name" placeholder="如：抽纸" />
      </div>
      <div class="field">
        <span class="field-label">分类</span>
        <select class="field-select" v-model="form.categoryIndex" @change="onCatChange">
          <option v-for="(c, i) in categories" :key="i" :value="i">{{ c }}</option>
        </select>
      </div>
      <div class="field-row">
        <div class="field flex2">
          <span class="field-label">数量</span>
          <input class="field-input num" type="number" step="any" v-model="form.totalQuantity" placeholder="0" />
        </div>
        <div class="field flex1">
          <span class="field-label">单位</span>
          <select class="field-select" v-model="form.unitIndex" @change="onUnitChange">
            <option v-for="(u, i) in units" :key="i" :value="i">{{ u }}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <span class="field-label">购买价格 (¥)</span>
        <input class="field-input num" type="number" step="any" v-model="form.price" placeholder="0.00" />
      </div>
      <div class="field">
        <span class="field-label">购买日期</span>
        <input class="field-input num" type="date" v-model="form.purchaseDate" />
      </div>
      <div class="field">
        <span class="field-label">过期日期 <span class="optional">选填</span></span>
        <input class="field-input num" type="date" v-model="form.expireDate" />
      </div>
    </div>
    <div class="btn-primary submit" @click="submit">添加</div>
    <div class="tip">添加后即可在首页记录每次使用</div>
  </div>
  `,
  setup() {
    const categories = ['纸品', '清洁', '洗护', '厨房', '食品', '其他'];
    const units = ['包', '个', '瓶', '袋', '盒', '卷', '块', '升', '千克'];
    const form = reactive({
      name: '',
      category: '纸品',
      categoryIndex: 0,
      totalQuantity: '',
      unit: '包',
      unitIndex: 0,
      price: '',
      purchaseDate: S.formatDate(Date.now()),
      expireDate: ''
    });
    function onCatChange(e) {
      form.category = categories[Number(e.target.value)];
    }
    function onUnitChange(e) {
      form.unit = units[Number(e.target.value)];
    }
    function submit() {
      if (!form.name.trim()) return alert('请填写名称');
      if (!form.totalQuantity || Number(form.totalQuantity) <= 0) return alert('请填写有效数量');
      if (!form.price || Number(form.price) < 0) return alert('请填写价格');
      if (!form.purchaseDate) return alert('请选择购买日期');
      if (form.expireDate && form.expireDate < form.purchaseDate) return alert('过期日期早于购买日期');
      S.addItem({
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        totalQuantity: form.totalQuantity,
        price: form.price,
        purchaseDate: form.purchaseDate,
        expireDate: form.expireDate
      });
      alert('已添加');
      navigate('/');
    }
    return { form, categories, units, onCatChange, onUnitChange, submit };
  }
};

// ============ 详情页 ============
const DetailPage = {
  template: `
  <div v-if="item">
    <div class="top-bar"></div>
    <div class="page-wrap">
      <div class="detail-head">
        <span class="label">{{ item.category }}</span>
        <h1 class="h1">{{ item.name }}</h1>
        <div class="status-tag" :class="isHistory ? 'tag-done' : 'tag-active'">
          {{ isHistory ? '已消耗完毕' : '使用中' }}
        </div>
      </div>

      <div class="card stock-card">
        <div class="num-row">
          <span class="num big" :class="{ warn: percent <= 20 }">{{ item.remainingQuantity }}</span>
          <span class="num unit">/ {{ item.totalQuantity }} {{ item.unit }}</span>
          <span class="num pct">{{ percent }}%</span>
        </div>
        <div class="progress">
          <div class="progress-fill" :class="{ 'warn-fill': percent <= 20 }" :style="{ width: percent + '%' }"></div>
        </div>
        <div v-if="!isHistory && prediction.daysLeft !== null" class="pred">
          预计还能用 <span class="num pred-days">{{ prediction.daysLeft }}</span> 天
          <span v-if="prediction.needBuy" class="pred-buy">· 建议补货</span>
        </div>
      </div>

      <div class="card info-card">
        <div class="info-row">
          <span class="info-label">购买价格</span>
          <span class="num info-val">¥{{ item.price }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">购买日期</span>
          <span class="num info-val">{{ item.purchaseDate }}</span>
        </div>
        <div class="info-row" v-if="item.expireDate">
          <span class="info-label">过期日期</span>
          <span class="info-val num" :class="{ warn: expireDays < 0, 'warn-soft': expireDays >= 0 && expireDays <= 7 }">
            {{ item.expireDate }} <span class="expire-text">{{ expireText }}</span>
          </span>
        </div>
        <div class="info-row" v-if="isHistory && item.analysis">
          <span class="info-label">消耗完毕</span>
          <span class="num info-val">{{ item.analysis.endDate }}</span>
        </div>
      </div>

      <div class="card analysis-card" v-if="isHistory && item.analysis">
        <div class="card-label">CONSUMPTION ANALYSIS</div>
        <div class="card-title">消耗分析</div>
        <div class="analysis-grid">
          <div class="a-cell"><span class="a-label">总成本</span><span class="num a-value">¥{{ item.analysis.totalCost }}</span></div>
          <div class="a-cell"><span class="a-label">使用时长</span><span class="num a-value">{{ item.analysis.durationDays }} 天</span></div>
          <div class="a-cell"><span class="a-label">日均成本</span><span class="num a-value">¥{{ item.analysis.dailyCost }}/天</span></div>
          <div class="a-cell"><span class="a-label">日均用量</span><span class="num a-value">{{ item.analysis.dailyUsage }} {{ item.unit }}</span></div>
          <div class="a-cell"><span class="a-label">使用次数</span><span class="num a-value">{{ item.analysis.usageCount }} 次</span></div>
          <div class="a-cell"><span class="a-label">单次成本</span><span class="num a-value">¥{{ item.analysis.costPerUse }}</span></div>
        </div>
        <div class="insight">
          本次共使用 {{ item.totalQuantity }} {{ item.unit }}，历时 {{ item.analysis.durationDays }} 天，
          平均每天花费 ¥{{ item.analysis.dailyCost }}，单次使用成本 ¥{{ item.analysis.costPerUse }}。
        </div>
      </div>

      <div v-if="!isHistory" class="btn-primary use-action" @click="openUseModal(item)">记录使用</div>
      <div v-if="isHistory" class="btn-ghost repurchase-action" @click="goAdd">重新购买同类</div>

      <div class="section" v-if="records.length > 0">
        <div class="section-head">
          <span class="label">USAGE LOG</span>
          <span class="section-count num">{{ records.length }} 次记录</span>
        </div>
        <div class="timeline">
          <div v-for="(r, i) in records" :key="i" class="t-item">
            <div class="t-dot" :class="{ 'dot-now': i === 0 }"></div>
            <div class="t-line" v-if="i !== records.length - 1"></div>
            <div class="t-content">
              <div class="t-time">{{ r.time }}</div>
              <div class="t-qty num">-{{ r.quantity }} {{ item.unit }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="delete-link" @click="del">删除物品</div>
    </div>
  </div>
  `,
  setup() {
    const item = ref(null);
    const isHistory = ref(false);
    const percent = ref(0);
    const expireText = ref('');
    const expireDays = ref(null);
    const prediction = ref({ daysLeft: null, needBuy: false });
    const records = ref([]);

    function load() {
      const id = route.params.id;
      const it = S.getItem(id);
      if (!it) { alert('物品不存在'); navigate('/'); return; }
      item.value = it;
      isHistory.value = it.status === 'consumed';
      percent.value = it.totalQuantity > 0 ? Math.max(S.round(it.remainingQuantity / it.totalQuantity * 100, 0), 0) : 0;
      let ed = null, et = '';
      if (it.expireDate) {
        ed = S.daysUntil(it.expireDate);
        if (ed < 0) et = '已过期 ' + Math.abs(ed) + ' 天';
        else if (ed === 0) et = '今天过期';
        else et = '剩 ' + ed + ' 天';
      }
      expireDays.value = ed;
      expireText.value = et;
      prediction.value = isHistory.value ? { daysLeft: null, needBuy: false } : S.predictPurchase(it);
      records.value = (it.usageRecords || []).slice().reverse().map(r => ({
        time: S.formatRelative(r.time),
        quantity: r.quantity
      }));
    }

    onMounted(load);
    watch(() => route.params.id, load);
    window.addEventListener('hct-data-changed', load);

    function del() {
      if (confirm('确认删除该物品及其使用记录？此操作不可恢复。')) {
        S.deleteItem(item.value.id);
        navigate('/');
      }
    }
    function goAdd() { navigate('/add'); }

    return { item, isHistory, percent, expireText, expireDays, prediction, records, del, goAdd, openUseModal };
  }
};

// ============ 分析页 ============
const AnalysisPage = {
  template: `
  <div class="top-bar"></div>
  <div class="page-wrap">
    <div class="header">
      <span class="label">ANALYSIS</span>
      <h1 class="h1">消耗分析</h1>
      <div class="subtitle">已消耗完毕的物品统计</div>
    </div>

    <div v-if="summary.count === 0" class="empty">
      <div class="empty-icon">□</div>
      <div class="empty-text">暂无消耗记录</div>
      <div class="empty-sub">物品消耗完毕后将在此生成分析</div>
    </div>

    <div v-else>
      <div class="card overview">
        <div class="ov-grid">
          <div class="ov-cell"><span class="ov-label">消耗物品</span><span class="num ov-value">{{ summary.count }}</span><span class="ov-unit">件</span></div>
          <div class="ov-cell"><span class="ov-label">累计支出</span><span class="num ov-value">¥{{ summary.totalCost }}</span></div>
          <div class="ov-cell"><span class="ov-label">平均时长</span><span class="num ov-value">{{ summary.avgDuration }}</span><span class="ov-unit">天</span></div>
          <div class="ov-cell"><span class="ov-label">日均总成本</span><span class="num ov-value">¥{{ summary.avgDailyCost }}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><span class="label">COST RANKING</span></div>
        <h2 class="h2 section-title">支出排行</h2>
        <div class="bars">
          <div v-for="b in bars" :key="b.name" class="bar-item">
            <div class="bar-name">{{ b.name }}</div>
            <div class="bar-track"><div class="bar-fill" :style="{ width: b.percent + '%' }"></div></div>
            <div class="bar-val num">¥{{ b.totalCost }}</div>
            <div class="bar-meta num">{{ b.count }}次 · 均{{ b.avgDuration }}天</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><span class="label">HISTORY</span></div>
        <h2 class="h2 section-title">消耗记录</h2>
        <div class="hist-list">
          <div v-for="h in history" :key="h.id" class="card hist-card" @click="goDetail(h.id)">
            <div class="hist-head">
              <span class="hist-name">{{ h.name }}</span>
              <span class="num hist-cost">¥{{ h.analysis.totalCost }}</span>
            </div>
            <div class="hist-meta num">{{ h.analysis.startDate }} → {{ h.analysis.endDate }}</div>
            <div class="hist-stats">
              <span class="num">{{ h.analysis.durationDays }}天</span>
              <span class="dot">·</span>
              <span class="num">日均¥{{ h.analysis.dailyCost }}</span>
              <span class="dot">·</span>
              <span class="num">{{ h.analysis.usageCount }}次</span>
              <span class="dot">·</span>
              <span class="num">单次¥{{ h.analysis.costPerUse }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  setup() {
    const summary = ref({ count: 0, totalCost: 0, avgDuration: 0, avgDailyCost: 0, topCost: [] });
    const history = ref([]);
    const bars = ref([]);
    function load() {
      const s = S.getAnalysisSummary();
      const maxCost = s.topCost.length > 0 ? s.topCost[0].totalCost : 1;
      summary.value = s;
      history.value = S.getHistory();
      bars.value = s.topCost.map(t => Object.assign({}, t, { percent: Math.max(Math.round(t.totalCost / maxCost * 100), 4) }));
    }
    onMounted(load);
    window.addEventListener('hct-data-changed', load);
    function goDetail(id) { navigate('/detail/' + id); }
    return { summary, history, bars, goDetail };
  }
};

// ============ 每日消耗打卡页 ============
const CheckinPage = {
  template: `
  <div class="top-bar"></div>
  <div class="page-wrap">
    <div class="header">
      <span class="label">DAILY CHECK-IN</span>
      <h1 class="h1">今日消耗</h1>
      <div class="subtitle num">{{ todayDate }} 星期{{ todayWeekday }}</div>
    </div>

    <div v-if="items.length === 0" class="empty">
      <div class="empty-icon">□</div>
      <div class="empty-text">还没有在用物品</div>
      <div class="empty-sub">先添加物品，再回来记录每日消耗</div>
    </div>

    <div v-else>
      <div class="card ck-form">
        <div class="ck-form-label">记录今天使用的数量</div>
        <div class="ck-item" v-for="it in items" :key="it.id">
          <div class="ck-item-left">
            <div class="ck-item-name">{{ it.name }}</div>
            <div class="ck-item-meta num">剩余 {{ it.remainingQuantity }} {{ it.unit }}</div>
          </div>
          <div class="ck-item-right">
            <input class="ck-input num" type="number" step="any" min="0" v-model="form[it.id]" placeholder="0" />
            <span class="ck-unit">{{ it.unit }}</span>
          </div>
        </div>
        <div class="ck-note-row">
          <input class="ck-note-input" v-model="note" placeholder="备注（选填）" />
        </div>
        <div class="btn-primary ck-submit" @click="submit">保存今日消耗</div>
      </div>

      <div class="section">
        <div class="section-head"><span class="label">RECENT 7 DAYS</span></div>
        <h2 class="h2 section-title">最近 7 天</h2>
        <div class="ck-log-list">
          <div v-for="d in stats" :key="d.date" class="card ck-log-item" :class="{ 'is-today': d.date === todayDate }">
            <div class="ck-log-head">
              <span class="ck-log-date num">{{ d.date }}</span>
              <span class="ck-log-week">周{{ d.weekday }}</span>
              <span class="ck-log-badge" v-if="d.hasRecord">{{ d.itemCount }} 项 · {{ d.totalQty }}</span>
              <span class="ck-log-empty" v-else>未记录</span>
            </div>
            <div v-if="d.hasRecord" class="ck-log-entries">
              <span v-for="e in d.entries" :key="e.itemId" class="ck-log-entry">
                {{ e.name }} <span class="num">-{{ e.quantity }}{{ e.unit }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  `,
  setup() {
    const items = ref([]);
    const form = reactive({});
    const note = ref('');
    const todayDate = S.formatDate(Date.now());
    const todayWeekday = '日一二三四五六'[new Date().getDay()];
    const stats = ref([]);

    function load() {
      items.value = S.getItems();
      // 预填今日已有打卡
      const ck = S.getCheckinByDate(todayDate);
      const map = {};
      items.value.forEach(it => {
        const exist = ck ? ck.entries.find(e => e.itemId === it.id) : null;
        map[it.id] = exist ? String(exist.quantity) : '';
      });
      Object.keys(form).forEach(k => delete form[k]);
      Object.assign(form, map);
      note.value = ck ? ck.note : '';
      stats.value = S.getCheckinStats(7);
    }

    function submit() {
      const entries = items.value
        .filter(it => form[it.id] && Number(form[it.id]) > 0)
        .map(it => ({
          itemId: it.id,
          name: it.name,
          unit: it.unit,
          quantity: Number(form[it.id])
        }));
      if (entries.length === 0) {
        alert('请至少填写一个物品的使用数量');
        return;
      }
      // 校验不超过剩余
      for (const e of entries) {
        const it = items.value.find(i => i.id === e.itemId);
        if (e.quantity > it.remainingQuantity) {
          alert(it.name + ' 超过剩余数量（剩余 ' + it.remainingQuantity + '）');
          return;
        }
      }
      S.saveCheckin(todayDate, entries, note.value);
      alert('已保存今日消耗，共 ' + entries.length + ' 项');
      window.dispatchEvent(new Event('hct-data-changed'));
      load();
    }

    onMounted(load);
    window.addEventListener('hct-data-changed', load);
    return { items, form, note, todayDate, todayWeekday, stats, submit };
  }
};

// ============ 提醒页 ============
const ReminderPage = {
  template: `
  <div class="top-bar"></div>
  <div class="page-wrap">
    <div class="header">
      <span class="label">REMINDERS</span>
      <h1 class="h1">提醒中心</h1>
      <div class="subtitle" v-if="reminders.length > 0">
        <span class="num" :class="{ urgent: urgentCount > 0 }">{{ reminders.length }}</span> 项待处理
        <span v-if="urgentCount > 0">· <span class="num urgent">{{ urgentCount }}</span> 项紧急</span>
      </div>
      <div class="subtitle" v-else>所有物品状态正常</div>
    </div>

    <div v-if="reminders.length === 0" class="empty">
      <div class="empty-icon">✓</div>
      <div class="empty-text">一切正常</div>
      <div class="empty-sub">暂无需要补货或处理的物品</div>
    </div>

    <div class="reminder-list">
      <div v-for="r in reminders" :key="r.item.id + r.type" class="card r-card" :class="{ 'r-urgent': r.priority === 1 }" @click="goDetail(r.item.id)">
        <div class="r-left">
          <div class="r-label" :class="{ 'lbl-urgent': r.priority === 1 }">{{ r.typeLabel }}</div>
          <div class="r-name">{{ r.item.name }}</div>
          <div class="r-detail">{{ r.detail }}</div>
        </div>
        <div class="r-right">
          <div class="r-percent num">{{ r.percent }}%</div>
          <div class="r-arrow">›</div>
        </div>
      </div>
    </div>

    <div class="section notify-section">
      <div class="section-head"><span class="label">SCHEDULED REMINDER</span></div>
      <h2 class="h2 section-title">定期提醒</h2>
      <div class="card notify-card">
        <div class="notify-row">
          <div class="notify-info">
            <div class="notify-name">开启浏览器通知</div>
            <div class="notify-desc">到点提醒记录今日消耗</div>
          </div>
          <div class="switch" :class="{ on: cfg.notifyEnabled }" @click="toggleNotify">
            <div class="switch-knob"></div>
          </div>
        </div>

        <template v-if="cfg.notifyEnabled">
          <div class="notify-row">
            <div class="notify-info">
              <div class="notify-name">提醒频率</div>
            </div>
            <div class="seg">
              <div class="seg-item" :class="{ active: cfg.notifyFreq === 'daily' }" @click="setFreq('daily')">每天</div>
              <div class="seg-item" :class="{ active: cfg.notifyFreq === 'weekly' }" @click="setFreq('weekly')">每周</div>
            </div>
          </div>
          <div class="notify-row">
            <div class="notify-info">
              <div class="notify-name">提醒时间</div>
            </div>
            <input class="notify-time num" type="time" v-model="cfg.notifyTime" @change="saveTime" />
          </div>
          <div class="notify-row" v-if="cfg.notifyFreq === 'weekly'">
            <div class="notify-info">
              <div class="notify-name">提醒日</div>
            </div>
            <select class="notify-select" v-model="cfg.notifyWeekday" @change="saveWeekday">
              <option :value="0">周日</option>
              <option :value="1">周一</option>
              <option :value="2">周二</option>
              <option :value="3">周三</option>
              <option :value="4">周四</option>
              <option :value="5">周五</option>
              <option :value="6">周六</option>
            </select>
          </div>
          <div class="notify-status">
            <span class="notify-dot" :class="{ live: notifyPermission === 'granted' }"></span>
            {{ notifyStatusText }}
          </div>
        </template>
      </div>
    </div>

    <div class="info-block" v-if="reminders.length > 0 || cfg.notifyEnabled">
      <div class="info-title">提醒规则</div>
      <div class="info-line">· 剩余量低于 20% 提醒补货</div>
      <div class="info-line">· 预计 7 天内用完提醒购买</div>
      <div class="info-line">· 距过期 7 天提醒，过期标红</div>
      <div class="info-line" v-if="cfg.notifyEnabled">· 定期提醒仅在页面打开时生效</div>
    </div>
  </div>
  `,
  setup() {
    const reminders = ref([]);
    const urgentCount = ref(0);
    const cfg = reactive(S.getNotifyConfig());
    const notifyPermission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
    const notifyStatusText = computed(() => {
      if (notifyPermission.value === 'granted') return '通知已开启';
      if (notifyPermission.value === 'denied') return '通知被拒绝，请在浏览器设置中允许';
      if (notifyPermission.value === 'unsupported') return '当前浏览器不支持通知';
      return '需要授权浏览器通知权限';
    });

    function load() {
      const list = S.getReminders().map(r => {
        let typeText = '', typeLabel = '', detail = '';
        switch (r.type) {
          case 'low_stock':
            typeLabel = 'STOCK LOW'; typeText = '即将用完';
            detail = r.daysLeft !== null ? '预计 ' + r.daysLeft + ' 天后用完，建议补货' : '剩余不足，建议补货';
            break;
          case 'expire_soon':
            typeLabel = 'EXPIRING'; typeText = '即将过期'; detail = '剩 ' + r.daysLeft + ' 天过期'; break;
          case 'expired':
            typeLabel = 'EXPIRED'; typeText = '已过期'; detail = '已过期 ' + Math.abs(r.daysLeft) + ' 天，建议处理'; break;
        }
        const percent = r.item.totalQuantity > 0 ? Math.round(r.item.remainingQuantity / r.item.totalQuantity * 100) : 0;
        return Object.assign({}, r, { typeText, typeLabel, detail, percent });
      });
      reminders.value = list;
      urgentCount.value = list.filter(r => r.priority === 1).length;
      Object.assign(cfg, S.getNotifyConfig());
    }

    async function toggleNotify() {
      if (cfg.notifyEnabled) {
        // 关闭
        S.setNotifyConfig({ notifyEnabled: false });
        Object.assign(cfg, S.getNotifyConfig());
        return;
      }
      // 开启：先请求权限
      if (typeof Notification === 'undefined') {
        alert('当前浏览器不支持通知');
        return;
      }
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        notifyPermission.value = perm;
        if (perm !== 'granted') {
          alert('未授权通知权限，无法开启提醒');
          return;
        }
      }
      S.setNotifyConfig({ notifyEnabled: true });
      Object.assign(cfg, S.getNotifyConfig());
    }
    function setFreq(f) {
      S.setNotifyConfig({ notifyFreq: f });
      Object.assign(cfg, S.getNotifyConfig());
    }
    function saveTime() {
      S.setNotifyConfig({ notifyTime: cfg.notifyTime });
    }
    function saveWeekday() {
      S.setNotifyConfig({ notifyWeekday: Number(cfg.notifyWeekday) });
    }

    onMounted(load);
    window.addEventListener('hct-data-changed', load);
    function goDetail(id) { navigate('/detail/' + id); }
    return { reminders, urgentCount, goDetail, cfg, notifyPermission, notifyStatusText, toggleNotify, setFreq, saveTime, saveWeekday };
  }
};

// ============ 底部导航 ============
const TabBar = {
  template: `
  <div class="tabbar">
    <div class="tab-item" :class="{ active: route.name === 'index' }" @click="navigate('/')">
      <span class="tab-icon">□</span><span class="tab-text">物品</span>
    </div>
    <div class="tab-item" :class="{ active: route.name === 'analysis' }" @click="navigate('/analysis')">
      <span class="tab-icon">▣</span><span class="tab-text">分析</span>
    </div>
    <div class="tab-item" :class="{ active: route.name === 'reminder' }" @click="navigate('/reminder')">
      <span class="tab-icon">!</span><span class="tab-text">提醒</span>
    </div>
  </div>
  `,
  setup() {
    return { route, navigate };
  }
};

// ============ 根组件 ============
const App = {
  template: `
  <div id="app-inner">
    <component :is="currentPage"></component>
    <tab-bar v-if="showTabBar"></tab-bar>
    <use-modal-component></use-modal-component>
  </div>
  `,
  components: { IndexPage, AddPage, DetailPage, AnalysisPage, CheckinPage, ReminderPage, TabBar, UseModalComponent },
  setup() {
    const currentPage = computed(() => {
      switch (route.name) {
        case 'add': return 'AddPage';
        case 'detail': return 'DetailPage';
        case 'analysis': return 'AnalysisPage';
        case 'checkin': return 'CheckinPage';
        case 'reminder': return 'ReminderPage';
        default: return 'IndexPage';
      }
    });
    const showTabBar = computed(() => ['index', 'analysis', 'reminder'].includes(route.name));
    return { currentPage, showTabBar };
  }
};

// 初始化存储并启动
S.init();

// 定期提醒定时器：页面打开期间每分钟检查一次
function checkScheduledNotify() {
  if (!S.shouldNotifyToday()) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification('日用消耗提醒', {
      body: S.buildNotifyMessage()
    });
    S.markNotifiedToday();
  } catch (e) {
    // 通知创建失败，忽略
  }
}
checkScheduledNotify();
setInterval(checkScheduledNotify, 60000);

createApp(App).mount('#app');
