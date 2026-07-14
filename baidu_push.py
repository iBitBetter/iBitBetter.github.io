#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百度主动推送脚本（标准库实现，无第三方依赖）

功能：读取 sitemap.xml（支持 sitemapindex 递归），将所有文章 URL
      推送到百度搜索资源平台「主动推送」接口。

⚠️ 安全须知（非常重要）：
  - 本仓库（Gmeek 源仓库）是 PUBLIC，切勿把百度 token 写死在本文件或任何提交的文件里。
  - token 一律通过环境变量 BAIDU_TOKEN 注入（本地手动跑 / GitHub Actions Secrets）。
  - 若 token 已泄露到公开场合，请立即到百度搜索资源平台「重置密钥」。

用法：
  本地：  BAIDU_TOKEN=你的token python baidu_push.py
  或：    python baidu_push.py --token 你的token        （仅本地测试，勿提交）
  自定义：python baidu_push.py --site https://ibitbetter.space --sitemap https://ibitbetter.space/sitemap.xml
  CI：    设置环境变量 BAIDU_TOKEN 后直接 `python baidu_push.py`
"""
import os
import sys
import argparse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

BAIDU_API = "http://data.zz.baidu.com/urls"
DEFAULT_SITE = "https://ibitbetter.space"
DEFAULT_SITEMAP = "https://ibitbetter.space/sitemap.xml"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def fetch_urls(sitemap_url):
    """递归解析 sitemap，返回所有最终页面 URL。"""
    try:
        data = urllib.request.urlopen(sitemap_url, timeout=30).read()
    except Exception as e:
        print(f"  无法读取 sitemap {sitemap_url}: {e}", file=sys.stderr)
        return []
    root = ET.fromstring(data)
    urls = []
    subs = root.findall("s:sitemap", NS)
    if subs:
        # sitemapindex：递归抓取每个子 sitemap
        for sm in subs:
            loc = sm.find("s:loc", NS)
            if loc is not None and loc.text:
                urls.extend(fetch_urls(loc.text.strip()))
    else:
        for u in root.findall("s:url", NS):
            loc = u.find("s:loc", NS)
            if loc is not None and loc.text:
                urls.append(loc.text.strip())
    return urls


def push(urls, site, token):
    api = f"{BAIDU_API}?site={site}&token={token}"
    payload = "\n".join(urls).encode("utf-8")
    req = urllib.request.Request(
        api, data=payload, headers={"Content-Type": "text/plain"}
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        return f"HTTP 错误 {e.code}: {e.read().decode('utf-8', errors='ignore')}"
    except Exception as e:
        return f"请求失败: {e}"


def main():
    p = argparse.ArgumentParser(description="百度主动推送脚本")
    p.add_argument("--site", default=os.getenv("BAIDU_SITE", DEFAULT_SITE))
    p.add_argument("--sitemap", default=os.getenv("BAIDU_SITEMAP", DEFAULT_SITEMAP))
    p.add_argument("--token", default=os.getenv("BAIDU_TOKEN", ""))
    args = p.parse_args()

    if not args.token:
        sys.exit(
            "错误：未提供 token。\n"
            "本地：BAIDU_TOKEN=xxx python baidu_push.py\n"
            "CI：在仓库 Secrets 配置 BAIDU_TOKEN。切勿写死在脚本里。"
        )

    print(f">> 拉取 sitemap: {args.sitemap}")
    urls = fetch_urls(args.sitemap)
    urls = [u for u in urls if u]  # 去空
    if not urls:
        sys.exit("错误：sitemap 中未解析到任何 URL，请检查 sitemap 地址是否正确。")

    print(f">> 解析到 {len(urls)} 个 URL，推送到百度...")
    resp = push(urls, args.site, args.token)
    print(">> 百度返回：", resp)
    # 提示配额与常见返回字段
    print(">> 说明：返回含 success 为推送成功条数，remain 为当日剩余配额，"
          "not_valid / not_same_site 为失败条数。")


if __name__ == "__main__":
    main()
