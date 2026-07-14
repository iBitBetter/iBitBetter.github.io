#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百度主动推送脚本（标准库实现，无第三方依赖）

功能：读取 sitemap.xml（支持 sitemapindex 递归），将所有文章 URL
      推送到百度搜索资源平台「主动推送」接口。

⚠️ 安全须知（非常重要）：
  - 本仓库（iBitBetter.github.io）是 PUBLIC，切勿把百度 token 写死在本文件或任何提交的文件里。
  - token 一律通过环境变量 BAIDU_TOKEN 注入（本地手动跑 / GitHub Actions Secrets）。
  - 若 token 已泄露到公开场合，请立即到百度搜索资源平台「重置密钥」。

用法：
  本地：  BAIDU_TOKEN=你的token python baidu_push.py
  或：    python baidu_push.py --token 你的token        （仅本地测试，勿提交）
  自定义：python baidu_push.py --site https://ibitbetter.space --sitemap ./sitemap.xml
  CI：    设置环境变量 BAIDU_TOKEN 后直接 `python baidu_push.py`

v3 变更：
  - 修复相对路径（如 ./docs/sitemap.xml）在 GitHub Actions 中因 CWD 不确定而找不到文件的问题
  - 基于 __file__ 计算绝对路径，不再依赖 os.getcwd()
  - 增加调试日志：打印工作目录、检测到的路径模式、最终使用的路径
"""
import os
import sys
import argparse
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET

BAIDU_API = "http://data.zz.baidu.com/urls"
DEFAULT_SITE = "https://ibitbetter.space"
DEFAULT_SITEMAP = "./docs/sitemap.xml"   # github.io 仓库根目录下的 docs/sitemap.xml
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}

# 用浏览器 UA 避免被 Cloudflare / WAF 当爬虫拦掉
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


def _resolve_path(sitemap_arg):
    """
    将用户传入的 sitemap 参数解析为绝对路径或 URL。
    
    策略：
      1. 如果是 http(s) URL → 原样返回（走 HTTP 拉取）
      2. 如果是相对路径（./docs/sitemap.xml、docs/sitemap.xml、sitemap.xml）
         → 基于 __file__ 所在目录（即脚本同目录）转换为绝对路径
      3. 如果已经是绝对路径 → normpath 后返回
    """
    # 情况 1：URL
    if sitemap_arg.startswith(("http://", "https://")):
        print(f"  [模式] URL 模式: {sitemap_arg}")
        return sitemap_arg
    
    # 情况 2 & 3：文件路径
    # 用 __file__ 定位脚本所在目录作为基准，不依赖 os.getcwd()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    abs_path = os.path.normpath(os.path.join(script_dir, sitemap_arg))
    
    print(f"  [模式] 本地文件模式")
    print(f"  [调试] 脚本目录: {script_dir}")
    print(f"  [调试] 工作目录: {os.getcwd()}")
    print(f"  [调试] 输入参数: {sitemap_arg}")
    print(f"  [调试] 解析结果: {abs_path}")
    
    return abs_path


def _read_sitemap(source):
    """
    从 source 读取 sitemap 内容（bytes）。
    source 可以是：
      - 绝对文件路径（由 _resolve_path 保证）
      - http(s) URL
    """
    if source.startswith(("http://", "https://")):
        print(f"  [HTTP] 正在拉取 {source} ...")
        req = urllib.request.Request(source, headers={"User-Agent": BROWSER_UA})
        try:
            return urllib.request.urlopen(req, timeout=30).read()
        except Exception as e:
            print(f"  无法通过 HTTP 读取: {e}", file=sys.stderr)
            return None
    else:
        # 绝对文件路径
        if os.path.isfile(source):
            size = os.path.getsize(source)
            print(f"  [本地] 正在读取 {source} ({size} bytes) ...")
            with open(source, "rb") as f:
                return f.read()
        else:
            print(f"  [错误] 文件不存在: {source}", file=sys.stderr)
            # 列出脚本同级目录帮助排查
            parent = os.path.dirname(source)
            if os.path.isdir(parent):
                print(f"  [排查] 目录 {parent} 内容:", file=sys.stderr)
                for entry in sorted(os.listdir(parent)):
                    full = os.path.join(parent, entry)
                    is_dir = os.path.isdir(full)
                    marker = "/" if is_dir else ""
                    print(f"          {entry}{marker}", file=sys.stderr)
            else:
                print(f"  [排查] 目录 {parent} 也不存在", file=sys.stderr)
            return None


def fetch_urls(sitemap_source):
    """递归解析 sitemap，返回所有最终页面 URL。"""
    resolved = _resolve_path(sitemap_source)
    data = _read_sitemap(resolved)
    if data is None:
        return []

    root = ET.fromstring(data)
    urls = []
    subs = root.findall("s:sitemap", NS)
    if subs:
        # sitemapindex：递归抓取每个子 sitemap
        print(f"  [sitemap] 检测到 sitemap index，包含 {len(subs)} 个子 sitemap")
        for sm in subs:
            loc = sm.find("s:loc", NS)
            if loc is not None and loc.text:
                sub_url = loc.text.strip()
                print(f"  [sitemap]   └─ {sub_url}")
                urls.extend(fetch_urls(sub_url))
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
        body = ""
        try:
            body = e.read().decode("utf-8", errors="ignore")
        except Exception:
            pass
        return f"HTTP 错误 {e.code}: {body}"
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
