#!/usr/bin/env python3
"""
IndexNow URL Submission Script for Gmeek Blog
- Parses sitemap.xml to extract all URLs, or accepts specific URLs via CLI
- Submits to IndexNow API (api.indexnow.org)
- Designed to run in GitHub Actions after Gmeek deployment

Usage:
  # Submit all URLs from sitemap
  python indexnow_submit.py --sitemap docs/sitemap.xml --key 10fe9d2dddb840799a2370388d792e93 --host ibitbetter.github.io

  # Submit specific URLs (e.g. the post that triggered the build)
  python indexnow_submit.py --urls https://ibitbetter.github.io/post/152.html https://ibitbetter.github.io/ --key 10fe9d2dddb840799a2370388d792e93 --host ibitbetter.github.io

  # Submit a single post by issue number
  python indexnow_submit.py --issue 152 --key 10fe9d2dddb840799a2370388d792e93 --host ibitbetter.github.io
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
import xml.etree.ElementTree as ET
from pathlib import Path

INDEXNOW_API = "https://api.indexnow.org/IndexNow"
INDEXNOW_KEY = "10fe9d2dddb840799a2370388d792e93"
INDEXNOW_KEY_LOCATION = "https://ibitbetter.github.io/10fe9d2dddb840799a2370388d792e93.txt"


def parse_sitemap(sitemap_path):
    """Extract all URLs from a sitemap.xml file."""
    urls = []
    tree = ET.parse(sitemap_path)
    root = tree.getroot()

    # Handle namespace
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    for url_elem in root.findall(".//sm:url/sm:loc", ns):
        if url_elem.text:
            urls.append(url_elem.text.strip())

    # Fallback: try without namespace
    if not urls:
        for url_elem in root.findall(".//{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
            if url_elem.text:
                urls.append(url_elem.text.strip())

    # Last resort: any loc element
    if not urls:
        for url_elem in root.iter():
            if url_elem.tag.endswith("loc") and url_elem.text:
                urls.append(url_elem.text.strip())

    return urls


def submit_to_indexnow(urls, key, host, key_location=None):
    """Submit URLs to IndexNow API via POST request."""
    if not urls:
        print("[IndexNow] No URLs to submit.")
        return False

    if key_location is None:
        key_location = f"https://{host}/{key}.txt"

    # IndexNow allows max 10000 URLs per request
    batch_size = 10000
    all_success = True

    for i in range(0, len(urls), batch_size):
        batch = urls[i:i + batch_size]
        payload = {
            "host": host,
            "key": key,
            "keyLocation": key_location,
            "urlList": batch,
        }

        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            INDEXNOW_API,
            data=data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )

        print(f"[IndexNow] Submitting {len(batch)} URL(s) to {INDEXNOW_API}")
        for url in batch[:5]:
            print(f"  -> {url}")
        if len(batch) > 5:
            print(f"  ... and {len(batch) - 5} more")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                status = resp.status
                print(f"[IndexNow] Response: {status} - Success!")
        except urllib.error.HTTPError as e:
            status = e.code
            body = e.read().decode("utf-8", errors="replace")
            reason_map = {
                200: "OK - URL submitted successfully",
                202: "Accepted - URLs will be processed",
                400: "Bad request - Invalid format",
                403: "Forbidden - Key not valid (key file not found or content mismatch)",
                422: "Unprocessable Entity - URLs don't belong to host or key mismatch",
                429: "Too Many Requests - Potential spam detected",
            }
            print(f"[IndexNow] Response: {status} - {reason_map.get(status, 'Unknown error')}")
            if body:
                print(f"[IndexNow] Response body: {body}")
            if status not in (200, 202):
                all_success = False
        except Exception as e:
            print(f"[IndexNow] Error: {e}")
            all_success = False

    return all_success


def main():
    parser = argparse.ArgumentParser(description="Submit URLs to IndexNow")
    parser.add_argument("--sitemap", help="Path to sitemap.xml file")
    parser.add_argument("--urls", nargs="*", help="Specific URLs to submit")
    parser.add_argument("--issue", type=int, help="Issue number to construct post URL")
    parser.add_argument("--key", default=INDEXNOW_KEY, help="IndexNow API key")
    parser.add_argument("--host", default="ibitbetter.github.io", help="Site hostname")
    parser.add_argument(
        "--key-location",
        default=None,
        help="URL of the key file (default: https://{host}/{key}.txt)",
    )
    parser.add_argument(
        "--submit-all",
        action="store_true",
        help="Submit all URLs from sitemap (default: only homepage + changed post)",
    )

    args = parser.parse_args()

    urls = []

    # If specific URLs provided
    if args.urls:
        urls = args.urls
        print(f"[IndexNow] Using {len(urls)} URL(s) from command line")
    # If issue number provided
    elif args.issue:
        post_url = f"https://{args.host}/post/{args.issue}.html"
        urls = [post_url, f"https://{args.host}/"]
        print(f"[IndexNow] Submitting post URL: {post_url}")
    # If sitemap provided
    elif args.sitemap:
        sitemap_path = Path(args.sitemap)
        if not sitemap_path.exists():
            print(f"[IndexNow] Error: Sitemap not found at {sitemap_path}")
            sys.exit(1)

        all_urls = parse_sitemap(sitemap_path)
        print(f"[IndexNow] Found {len(all_urls)} URLs in sitemap")

        if args.submit_all:
            urls = all_urls
        else:
            # Submit homepage + tag page + first page of posts
            homepage = f"https://{args.host}/"
            tagpage = f"https://{args.host}/tag.html"
            urls = [homepage, tagpage]
            # Also include the most recent posts (first 10)
            post_urls = [u for u in all_urls if "/post/" in u]
            urls.extend(post_urls[:10])
            print(f"[IndexNow] Submitting homepage + tag page + {min(10, len(post_urls))} recent posts")
    else:
        print("[IndexNow] Error: Provide --sitemap, --urls, or --issue")
        parser.print_help()
        sys.exit(1)

    success = submit_to_indexnow(urls, args.key, args.host, args.key_location)

    if success:
        print("[IndexNow] All submissions completed successfully!")
        sys.exit(0)
    else:
        print("[IndexNow] Some submissions failed. Check output above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
