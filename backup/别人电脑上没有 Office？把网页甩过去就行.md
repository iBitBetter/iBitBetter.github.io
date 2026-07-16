前阵子我在我的老电脑上帮一哥们改他店里的进货表。那台机器刚装的系统，Office 没有，WPS 也没有。我盯着屏幕愣了两秒——总不能当场下几个G的安装包吧，我这老电脑办公软件都带不动。

后来发现，根本不用装。浏览器开个网页，就能拿到跟桌面版差不多的编辑体验。

关键是个叫 OnlyOffice 的开源项目。它可能比你以为的更厉害：免费、开源（AGPL 3.0），拉脱维亚一家公司做的，全球一千五百多万人用。桌面版、手机版都免费。

今天说 GitHub 上 [onlyoffice-web-comp](https://github.com/electroluxcode/onlyoffice-web-comp) 这个仓库。它把 OnlyOffice 的编辑器核心打包成纯前端组件，重点在「纯前端」三个字：不用装客户端，浏览器打开就用；编辑和格式转换全在本地用 WebAssembly 跑完，文档数据压根不出本机；Word、Excel、PPT、CSV、DOCM 都支持，公式、批注照改不误。

作者部署了一个在线 demo，进去直接上传文档或者Excel工作表就能改。我试了下，Excel 多 sheet、公式都正常，导出完全正常。

<img src="https://ibitbetter.space/assets/images/onlyoffice-web-comp.webp" alt="别人电脑上没有 Office？把网页甩过去就行" width="800" height="300"/>

网吧、别人的电脑、卡成狗的轻薄本。临时发过来的xlsx，开个网页、传文件、改完下载、走人，全程都不用打开Office。

得说清楚，这仓库本质是个「模板」，不是 npm 一行 install 就能用的包，而是把组件和静态资源两个文件夹复制进自己项目。作者最近几天还在更新，提交一百六十多次。

适合谁？兜里没带电脑、又被临时甩来表格的人。GitHub 搜 onlyoffice-web-comp 就能找到。下次谁说「我这没装 Office」，把网页甩过去就行。
https://onlyoffice-web-comp.vercel.app/