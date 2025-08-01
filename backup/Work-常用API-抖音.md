## 订单服务使用到的API

/order/logisticsAdd 订单发货接口 https://op.jinritemai.com/docs/api-docs/16/718﻿

/order/logisticsAddSinglePack 支持多个订单发同一个物流包裹 https://op.jinritemai.com/docs/api-docs/16/563﻿

/token/refresh https://op.jinritemai.com/docs/api-docs/162/1601﻿

/order/searchList 订单列表查询 https://op.jinritemai.com/docs/api-docs/15/1342﻿

/order/orderDetail 订单详情查询 https://op.jinritemai.com/docs/api-docs/15/1343﻿

订单退款接口，是调用 /order/searchList 使用上面的参数 after_sale_status_desc 获取指定日期的退款订单

## 抖音电子面单API

/logistics/newCreateOrder https://op.jinritemai.com/docs/api-docs/1262/1339﻿

/logistics/waybillApply https://op.jinritemai.com/docs/api-docs/1262/490﻿

/logistics/listShopNetsite https://op.jinritemai.com/docs/api-docs/1262/1843﻿

电子面单常见对接场景 https://op.jinritemai.com/docs/guide-docs/1320/3307﻿

## 如何实现多店铺共享面单取号

/logistics/newCreateOrder﻿ token字段传开通电子面单店铺的token，user_id字段传订单所在店铺的shopid或者传-1。（例：A店铺开通了电子面单，现在要用B店铺的订单获取单号，则token传A店铺的，user_id传B店铺的shopid或者-1）

抖音电商电子面单打印对接 https://op.jinritemai.com/docs/guide-docs/120/596﻿

官方打印组件下载： https://logistics.douyinec.com/davinci/index﻿

抖音开放平台： https://op.jinritemai.com/home