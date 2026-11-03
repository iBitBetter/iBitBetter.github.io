function createBSZ() {
    var postBody = document.getElementById('postBody');
    if (postBody){
        postBody.insertAdjacentHTML('afterend','<div id="busuanzi_container_page_pv" style="float:left;margin-top:8px;font-size:small;">本文浏览量<span id="busuanzi_value_page_pv"></span>次</div>');
    }
    var runday = document.getElementById('runday');
    runday.insertAdjacentHTML('afterend', '<span id="busuanzi_container_site_pv">总浏览量<span id="busuanzi_value_site_pv"></span>次 • </span><span id="busuanzi_container_site_uv">访客<span id="busuanzi_value_site_uv"></span>位</span>');
    // 把 "Powered by Gmeek" 单独成行（与前面的统计信息分行）
    var footer = document.getElementById('footer2');
    if (footer) {
        var spans = footer.querySelectorAll('span');
        for (var i = 0; i < spans.length; i++) {
            if (/Powered by/.test(spans[i].textContent)) {
                spans[i].style.display = 'block';
                break;
            }
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    createBSZ();
    // 自建计数器：调用 Worker 边缘端点 /__counter（替代第三方统计）
    // 复用与 curious 页相同的 localStorage uid，保证全站 UV 去重统一；
    // path=location.pathname 用于按页统计「本文浏览量」(page_pv)。
    var uid = localStorage.getItem('__counter_uid');
    if (!uid) { uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('__counter_uid', uid); }
    fetch('/__counter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: uid, path: location.pathname })
    })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var spv = document.getElementById('busuanzi_value_site_pv');
      var suv = document.getElementById('busuanzi_value_site_uv');
      var ppv = document.getElementById('busuanzi_value_page_pv');
      if (spv) spv.textContent = d.site_pv;
      if (suv) suv.textContent = d.site_uv;
      if (ppv && typeof d.page_pv === "number") ppv.textContent = d.page_pv;
    })
    .catch(function () { /* 计数失败静默，不影响页面 */ });
    console.log("\n %c GmeekBSZ Plugins https://github.com/Meekdai/Gmeek \n","padding:5px 0;background:#bc4c00;color:#fff");
});
