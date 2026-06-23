#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gmeek 构建后 SEO 注入脚本 v3
==================================
策略：先清除本文注入的所有 SEO 标签（幂等），再重新注入。
每次运行结果一致，可重复执行。

注入内容：
  - <link rel="canonical">
  - Article JSON-LD Schema（从 postList.json 读真实发布日期）
  - Open Graph + Twitter Card meta tags
  - <meta name="description">（纯文本，无 Markdown）
  - 确保 <title> 不含重复后缀
"""

import os
import re
import json
import sys
import glob
import urllib.parse

# ─────────────────────────────────────────────
# 路径常量
# ─────────────────────────────────────────────
DOCS_DIR = "docs"
POST_DIR = os.path.join(DOCS_DIR, "post")
CONFIG_FILE = "config.json"
POSTLIST_FILE = os.path.join(DOCS_DIR, "postList.json")

# 本文管理的 SEO 标签正则（用于清除旧注入）
SEO_TAG_PATTERNS = [
    r'\s*<link[^>]+rel=["\']canonical["\'][^>]*>\s*',
    r'\s*<meta[^>]+property=["\']og:(title|url|type|description|site_name|image)["\'][^>]*>\s*',
    r'\s*<meta[^>]+name=["\'](twitter:card|description)["\'][^>]*>\s*',
    r'\s*<script type=["\']application/ld\+json["\'][^>]*>\s*.*?</script>\s*',
]


# ─────────────────────────────────────────────
# 配置 & 元数据加载
# ─────────────────────────────────────────────
def load_config():
    if not os.path.exists(CONFIG_FILE):
        print(f"[ERROR] {CONFIG_FILE} 不存在")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def get_base_url(config):
    domain = config.get("domain", "").strip().rstrip("/")
    if not domain:
        domain = "ibitbetter.github.io"
    if not domain.startswith("http"):
        domain = "https://" + domain
    return domain.rstrip("/")


def load_post_metadata():
    """
    读取 docs/postList.json（dict 结构：{"P149": {...}, ...}）。
    返回 {slug_filename: {"title", "date", "description"}}。
    URL 解码 postUrl，处理空格等编码字符。
    """
    meta = {}
    if not os.path.exists(POSTLIST_FILE):
        print(f"[WARN] {POSTLIST_FILE} 不存在，将仅从 HTML 解析元数据。")
        return meta

    with open(POSTLIST_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    for key, val in data.items():
        if not isinstance(val, dict):
            continue
        url = val.get("postUrl", "")
        if not url:
            continue
        url_decoded = urllib.parse.unquote(url)
        slug = os.path.basename(url_decoded)
        meta[slug] = {
            "title": val.get("postTitle", "").strip(),
            "date": val.get("createdDate", "").strip()[:10],
            "description": "",
        }

    print(f"[SEO] 从 postList.json 加载了 {len(meta)} 篇文章元数据。")
    return meta


# ─────────────────────────────────────────────
# HTML 文本工具
# ─────────────────────────────────────────────
def strip_tags(html_fragment):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html_fragment)).strip()


def strip_markdown(text):
    """移除 Markdown 语法，保留可读纯文本。"""
    text = re.sub(r"!$$.*?$$$.*?$", "", text)
    text = re.sub(r"$$([^$$]+)\]$[^)]+$", r"\1", text)
    text = re.sub(r"[#*`>~]{2,}", "", text)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.M)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.M)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def clean_title(title):
    title = re.sub(r"\s*[-|·]\s*iBitBetter\s*$", "", title, flags=re.I)
    return title.strip()


def extract_first_paragraph(html):
    for m in re.finditer(r"<p[^>]*>(.*?)</p>", html, re.I | re.S):
        text = strip_tags(m.group(1)).strip()
        text = strip_markdown(text)
        if len(text) < 30:
            continue
        if re.match(r"发表于|发布于|🔗|👉|📅", text):
            continue
        return text[:200]
    return ""


def extract_title_from_html(html):
    m = re.search(r"<title>(.*?)</title>", html, re.I | re.S)
    if m:
        return clean_title(m.group(1))
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)
    if m:
        return strip_tags(m.group(1)).strip()
    return ""


def extract_date_from_html(html):
    m = re.search(r'<time[^>]+datetime="([^"]+)"', html, re.I)
    if m:
        d = m.group(1).strip()[:10]
        if re.match(r"\d{4}-\d{2}-\d{2}", d):
            return d
    m = re.search(r"(\d{4}-\d{2}-\d{2})", html)
    if m:
        return m.group(1)
    return ""


# ─────────────────────────────────────────────
# 核心：清除旧标签 & 注入新标签
# ─────────────────────────────────────────────
def clear_old_seo_tags(html):
    for pattern in SEO_TAG_PATTERNS:
        html = re.sub(pattern, "\n", html, flags=re.I | re.S)
    return html


def inject_seo_tags(html, canonical_url, title, description, author, iso_date, site_name):
    blocks = []

    # 1. canonical
    blocks.append(f'  <link rel="canonical" href="{canonical_url}">')

    # 2. Open Graph
    blocks.append(f'  <meta property="og:title" content="{_esc(title)}">')
    blocks.append(f'  <meta property="og:url" content="{canonical_url}">')
    blocks.append(f'  <meta property="og:type" content="article">')
    if description:
        blocks.append(f'  <meta property="og:description" content="{_esc(description)}">')
    blocks.append(f'  <meta property="og:site_name" content="{_esc(site_name)}">')

    # 3. Twitter Card
    blocks.append(f'  <meta name="twitter:card" content="summary">')

    # 4. meta description
    if description:
        blocks.append(f'  <meta name="description" content="{_esc(description)}">')

    # 5. Article JSON-LD Schema
    schema = _build_schema(canonical_url, title, description, author, iso_date)
    blocks.append(f'  <script type="application/ld+json">')
    blocks.append(f'  {json.dumps(schema, ensure_ascii=False)}')
    blocks.append(f'  </script>')

    tags_block = "\n".join(blocks) + "\n"
    return _insert_before_head_close(html, tags_block)


def _build_schema(url, title, description, author, iso_date):
    schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "url": url,
        "datePublished": iso_date,
        "dateModified": iso_date,
        "author": {"@type": "Person", "name": author},
        "publisher": {
            "@type": "Organization",
            "name": author,
            "logo": {
                "@type": "ImageObject",
                "url": url.rsplit("/", 2)[0] + "/favicon.ico"
            }
        }
    }
    if description:
        schema["description"] = description
    return schema


def _insert_before_head_close(html, tags_block):
    if "</head>" in html:
        return html.replace("</head>", tags_block + "</head>", 1)
    if "<head>" in html:
        return html.replace("<head>", "<head>\n" + tags_block, 1)
    return tags_block + html


def _esc(text):
    return text.replace("&", "&amp;").replace('"', "&quot;").replace("<", "&lt;").replace(">", "&gt;")


# ─────────────────────────────────────────────
# 处理单个文件
# ─────────────────────────────────────────────
def process_file(filepath, base_url, author, site_name, meta_dict):
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    filename = os.path.basename(filepath)
    canonical_url = f"{base_url}/post/{filename}"

    meta = meta_dict.get(filename, {})
    title = meta.get("title") or extract_title_from_html(html)
    pub_date = meta.get("date") or extract_date_from_html(html)
    description = meta.get("description") or extract_first_paragraph(html)
    iso_date = pub_date + "T00:00:00Z" if pub_date else ""

    description = strip_markdown(strip_tags(description))

    html = clear_old_seo_tags(html)
    html = inject_seo_tags(html, canonical_url, title, description, author, iso_date, site_name)

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(html)

    return title, pub_date, description


# ─────────────────────────────────────────────
# 主流程
# ─────────────────────────────────────────────
def main():
    config = load_config()
    base_url = get_base_url(config)
    author = config.get("author", config.get("title", "iBitBetter"))
    site_name = config.get("title", "iBitBetter")
    meta_dict = load_post_metadata()

    print(f"[SEO] base URL : {base_url}")
    print(f"[SEO] author   : {author}")
    print(f"[SEO] docs dir : {DOCS_DIR}")

    html_files = sorted(glob.glob(os.path.join(POST_DIR, "*.html")))
    if not html_files:
        print(f"[WARN] {POST_DIR} 下没有 HTML 文件，跳过。")
        return

    print(f"[SEO] 处理 {len(html_files)} 篇文章…")
    for fpath in html_files:
        fname = os.path.basename(fpath)
        title, pub_date, desc = process_file(fpath, base_url, author, site_name, meta_dict)
        print(f"  ✅ {fname}")
        print(f"      标题 : {title[:50]}")
        print(f"      日期 : {pub_date}")
        print(f"      摘要 : {desc[:60]}…")

    for extra in ["index.html", "tag.html"]:
        fpath = os.path.join(DOCS_DIR, extra)
        if os.path.exists(fpath):
            process_file(fpath, base_url, author, site_name, {})
            print(f"  ✅ {extra}")

    print(f"\n[SEO] 全部完成。")


if __name__ == "__main__":
    main()
