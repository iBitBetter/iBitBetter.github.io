前几天我C盘又双叒红了，删了半天只腾出几个G，一看AppData还杵着十几个G不敢动。那感觉就像家里堆满了垃圾，但每袋都贴着「可能是重要文件」的标签，你压根不敢扔。

后来顺藤摸瓜找到个叫 WinMole 的开源工具，Windows 上的，灵感来自 Mac 的 Mole。最骚的是它同时给了一个命令行 TUI 版和一个图形 GUI 版，你按键盘喜欢哪种用哪种，双击 run.bat 就能跑。
<img src="https://ibitbetter.space/assets/images/winMole-index.webp" alt="winmole tui mode" width="800" height="300"/>

我上来先点 Clean。它扫了一圈，把我平时根本不敢碰的东西列得明明白白：系统临时文件 4.70 MB、回收站 134.28 MB、缩略图缓存 6.01 MB、微信日志 12.44 MB、Chrome 缓存 408.50 MB……总共 25 项、566.52 MB。分类就是三大类：系统垃圾、App 缓存、浏览器缓存。每一项列得清楚，你才敢按 Enter 开清。更狠的是它支持 `--dry-run` 先预览，还自带白名单保护核心路径，手抖也不会误删。

<img src="https://ibitbetter.space/assets/images/winMole-clean.webp" alt="winmole tui mode clean" width="800" height="300"/>


试了下 Memory，也就是内存释放。我电脑 8GB 内存，之前占用 72.2%，它 trim 了 136 个进程的工作集，8 个受保护的跳过，结果直接掉到 45.6%，多出 2.08 GB 可用。那一刻我风扇都安静了。

<img src="https://ibitbetter.space/assets/images/winMole-memory.webp" alt="winmole tui mode memory" width="800" height="300"/>

Uninstall 也顶用。我系统里装了 138 个应用，它按大小排好序，Visual Studio 2010 那堆老古董 3.36 GB 顶在最上面，微信 812 MB、Git 336 MB 一目了然。你空格选中，回车就开卸，比 Windows 自带的卸载入口痛快太多。Analyze 更像磁盘 CT，哪个文件夹占了多少一清二楚，我 AppData 直接占了 79.2%，10.89 GB，终于知道 C 盘为啥红了。Status 就是个实时仪表板，CPU、内存、磁盘、进程、网络全在上面，甚至还有个 ASCII 小狗图标，有点极客浪漫。

<img src="https://ibitbetter.space/assets/images/winMole-uninstall.webp" alt="winmole tui mode uninstall" width="800" height="300"/>

如果你完全不想敲命令，切到 GUI 版也行，界面是红色大标题配中文分类，点「一键清理」就完事，1.01 GB 垃圾直接标出来，适合长辈或者不爱看命令行的人。

<img src="https://ibitbetter.space/assets/images/winMole-gui.webp" alt="winmole gui 一键清理" width="800" height="800"/>

它开源免费，GPL-3.0 协议，规则写在 cleanup_rules.yaml 里，你自己可以改。社区规则默认关闭，想深度清理得手动开，这点我觉得很克制——不默认乱删，比那些恨不得把你注册表清空的工具稳得多。

<img src="https://ibitbetter.space/assets/images/winMole-status.webp" alt="winmole tui mode status" width="800" height="300"/>

适合谁？C 盘常年飘红、又不敢乱删东西的 Windows 用户。去 GitHub 搜 [iBitBetter/winmole](https://github.com/iBitBetter/winmole/releases/tag/v1.1.0)，如果你使用workbuddy，可以直接告诉workbuddy，让它直接上github搜索iBitBetter/winmole，帮你安装 winmole就可以了。