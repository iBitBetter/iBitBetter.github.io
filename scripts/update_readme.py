"""
iBitBetter 定制 README 生成器
- 替代 Gmeek 框架自带的简单 README
- 从 blogBase.json 读取博客数据
- 从 public-account-data.json 读取公众号数据
- 生成包含博客统计 + 标签分布 + 最新文章 + 公众号看板的丰富 README
"""
import json
import os
from datetime import datetime, timezone, timedelta

# ========== 时区 ==========
TZ = timezone(timedelta(hours=8))  # UTC+8 北京时间

# ========== 路径 ==========
WORKSPACE = os.environ.get("GITHUB_WORKSPACE", os.getcwd())
BLOG_BASE_PATH = os.path.join(WORKSPACE, "blogBase.json")
PA_DATA_PATH = os.path.join(WORKSPACE, "scripts", "public-account-data.json")
README_PATH = os.path.join(WORKSPACE, "README.md")


def load_json(path):
    """安全加载 JSON 文件，不存在则返回 None"""
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return None


def build_readme():
    """生成 README 内容"""
    blog = load_json(BLOG_BASE_PATH)
    pa_data = load_json(PA_DATA_PATH) or {}

    # ========== 基础信息 ==========
    title = blog.get("displayTitle", blog.get("title", "iBitBetter"))
    subtitle = blog.get("subTitle", "")
    home_url = blog.get("homeUrl", "https://ibitbetter.github.io")

    # ========== 文章统计 ==========
    post_list = blog.get("postListJson", {})
    post_count = len(post_list)

    total_comments = sum(p.get("commentNum", 0) for p in post_list.values())
    total_words = sum(p.get("wordCount", 0) for p in post_list.values())

    # ========== 标签分布 ==========
    label_counts = {}
    for p in post_list.values():
        for label in p.get("labels", []):
            label_counts[label] = label_counts.get(label, 0) + 1
    sorted_labels = sorted(label_counts.items(), key=lambda x: x[1], reverse=True)

    # ========== 最新文章 (Top 5) ==========
    sorted_posts = sorted(
        post_list.values(), key=lambda x: x.get("createdAt", 0), reverse=True
    )
    latest_posts = sorted_posts[:5]

    # ========== 公众号数据 ==========
    pa_followers = pa_data.get("followers")
    pa_articles = pa_data.get("totalArticles")
    pa_last_title = pa_data.get("lastArticleTitle")
    pa_last_reads = pa_data.get("lastArticleReads")
    pa_last_updated = pa_data.get("lastUpdated")

    # ========== 构建 README ==========
    lines = []

    # 头部
    lines.append(f"# {title}")
    lines.append("")
    if subtitle:
        lines.append(f"> {subtitle}")
        lines.append("")

    lines.append(f"🏠 [{home_url}]({home_url})")
    lines.append("")

    # 博客统计区
    lines.append("---")
    lines.append("")
    lines.append("## 📊 博客统计")
    lines.append("")
    lines.append("| 指标 | 数据 |")
    lines.append("|------|------|")
    lines.append(f"| 📄 文章总数 | **{post_count}** 篇 |")
    lines.append(f"| 💬 评论总数 | **{total_comments}** 条 |")
    lines.append(f"| 📝 总字数 | **{total_words:,}** 字 |")
    lines.append("")

    # 标签分布
    if sorted_labels:
        lines.append("### 🏷️ 标签分布")
        lines.append("")
        label_parts = []
        for label, count in sorted_labels:
            label_parts.append(f"`{label}` ×{count}")
        lines.append("  ".join(label_parts))
        lines.append("")

    # 最新文章
    lines.append("---")
    lines.append("")
    lines.append("## 📰 最新文章")
    lines.append("")
    for i, post in enumerate(latest_posts, 1):
        post_title = post.get("postTitle", "无标题")
        post_url = post.get("postUrl", "#")
        post_date = post.get("createdDate", "未知")
        labels = " ".join(f"`{l}`" for l in post.get("labels", []))
        lines.append(f"{i}. [{post_title}]({post_url}) {labels} — *{post_date}*")
    lines.append("")

    # 公众号看板
    lines.append("---")
    lines.append("")
    lines.append("## 📡 公众号 · iBitBetter")
    lines.append("")
    lines.append("| 指标 | 数据 |")
    lines.append("|------|------|")
    lines.append(f"| 👥 粉丝数 | {pa_followers if pa_followers is not None else '—'} |")
    lines.append(f"| 📰 已发文章 | {pa_articles if pa_articles is not None else '—'} |")
    lines.append(f"| 🔥 最新推文 | {pa_last_title or '—'} |")
    lines.append(f"| 📈 最近阅读 | {pa_last_reads if pa_last_reads is not None else '—'} |")
    if pa_last_updated:
        lines.append(f"| 🕐 数据更新 | {pa_last_updated} |")
    lines.append("")
    lines.append("> 💡 公众号数据更新：编辑 `scripts/public-account-data.json` 提交即可自动刷新")
    lines.append("")

    # 尾部
    lines.append("---")
    lines.append("")
    now_str = datetime.now(TZ).strftime("%Y-%m-%d %H:%M:%S")
    lines.append(f"🕐 最后更新：{now_str} (UTC+8)")
    lines.append("")
    lines.append(
        "Powered by [Gmeek](https://github.com/Meekdai/Gmeek) "
        "| README by [iBitBetter](https://github.com/iBitBetter)"
    )
    lines.append("")

    return "\n".join(lines)


def main():
    readme = build_readme()
    with open(README_PATH, "w", encoding="utf-8") as f:
        f.write(readme)
    print(f"✅ README.md 已更新 (字数: {len(readme)})")


if __name__ == "__main__":
    main()
