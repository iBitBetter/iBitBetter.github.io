
1. 下载 `Mirror` 的最新版本 [地址](https://github.com/LoeiFy/Mirror/raw/master/release/mirror.zip)
2. 获取你的 `hash` [地址](https://github.com/haoz0x139/myblog/issues/28)

    Mirror 内部做了一层 GitHub API token 的字符转换，解决不小心把 token 上传到 GitHub 后被删的问题
    下面是获取 `hash` 的步骤

   - 获取 [token](https://github.com/LoeiFy/Mirror/wiki/Token-%E8%AE%BE%E7%BD%AE)
   -  获取你的主域名 `hostname`，例如 `https://blog.1016913.xyz` 的主域名为 `blog.1016913.xyz`
   - 打开 [Mirror](https://blog.1016913.xyz/) 网站，并打开 `开发者工具` 界面
   -  在开发者工具的 `console` tab 页面，输入 js 代码 `window.encrypt('你的token', '你的主域名')`
![example](https://user-images.githubusercontent.com/2193211/54478294-7689cc00-484b-11e9-9f45-8157cf92d180.png)
      得到的字符就是 `hash` 串

3. 修改 `index.html`

```html
<script>
window.config = {
  organization: false, // 默认是 false，如果你的项目是属于 GitHub 组织 的，请设置为 true
  order: 'UPDATED_AT', // 文章排序，以 创建时间 或者 更新时间，可选值 'UPDATED_AT'，'CREATED_AT'
  title: 'Mirror', // 博客标题
  user: 'LoeiFy', // GitHub 用户名，必须
  repository: 'Recordum', // GitHub 项目名，指定文章内容来源 issues，必须
  authors: 'LoeiFy,author1', // 博客作者，以 ',' 分割，GitHub 用户名默认包含在内
  ignores: '17,13', // 文章忽略的 issues ID
  host: '', // 博客的主域名，不填自动获取，请注意这个值会影响 hash 的值
  hash: '', // 必须
  perpage: 5, // 分页
}
</script>
```

<!-- ##{"timestamp":1755783310}## -->