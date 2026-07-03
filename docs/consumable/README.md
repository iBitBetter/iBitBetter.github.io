# 家庭日用品消耗记录 - Web 版

微信小程序的 Web 单页应用版本，可部署到 GitHub Pages。

## 功能（与小程序版完全一致）

- 添加物品：名称/分类/数量/单位/价格/购买日期/过期日期
- 记录使用：快速使用弹窗，自动扣减剩余量
- 消耗分析：用完后自动计算总成本/使用时长/日均成本/单次成本
- 智能提醒：剩余<20%、预计7天内用完、距过期7天
- 补货预测：基于历史同名物品日均用量 + 自身使用速率
- 历史统计：累计支出、成本排行条形图

## 技术栈

- Vue 3（CDN，无构建）
- 原生 localStorage 存储
- Hash 路由（GitHub Pages 刷新不 404）
- Swiss 风格 CSS + IKB 克莱因蓝

## 文件结构

```
household-web/
├── index.html      # 入口，引入 Vue + JS
├── style.css       # Swiss 风格样式
├── storage.js      # 数据层（localStorage）
└── app.js          # Vue 应用（路由 + 5 页面组件）
```

## 本地预览

```bash
cd household-web
python -m http.server 8090
# 浏览器打开 http://localhost:8090
```

## 部署到 GitHub Pages

### 方式一：放到现有仓库的 docs 目录

```bash
cp -r household-web /path/to/repo/docs
git add docs && git commit -m "add consumable tracker"
git push
# 仓库 Settings → Pages → Source: main / docs
```

### 方式二：新建独立仓库

```bash
cd household-web
git init
git add .
git commit -m "household consumable tracker"
git branch -M main
git remote add origin https://github.com/<你的用户名>/consumable-tracker.git
git push -u origin main
# 仓库 Settings → Pages → Source: main / root
# 等待 1-2 分钟，访问 https://<你的用户名>.github.io/consumable-tracker/
```

### 方式三：直接放入 username.github.io 仓库

如果你有 `<用户名>.github.io` 仓库，把文件放到子目录即可：
```
username.github.io/
└── consumable/
    ├── index.html
    ├── style.css
    ├── storage.js
    └── app.js
```
访问 `https://<用户名>.github.io/consumable/`

## 与小程序版的差异

| 维度 | 小程序版 | Web 版 |
|------|---------|--------|
| 存储 | wx.setStorageSync | localStorage |
| 视图 | WXML/WXSS | Vue 模板 + CSS |
| 路由 | app.json pages | Hash 路由 |
| 弹窗 | wx 组件 | Vue 组件 |
| 部署 | 微信开发者工具上传 | GitHub Pages 静态托管 |
| 数据层 | 完全相同 | 完全相同 |

数据层 `storage.js` 的业务逻辑（addItem/addUsage/analyze/predictPurchase/getReminders）两个版本完全一致，已通过 Node 验证数据流闭环。

## 数据说明

所有数据存储在浏览器 localStorage，不同浏览器/设备不共享。如需多设备同步，后续可接入云数据库（如 Supabase / CloudBase）。
