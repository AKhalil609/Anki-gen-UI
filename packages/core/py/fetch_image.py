import sys
import os
import logging
from icrawler.builtin import GoogleImageCrawler

def main():
    if len(sys.argv) < 4:
        print("Usage: fetch_image.py <query> <count> <out_dir> [--verbose]")
        sys.exit(1)

    query = sys.argv[1]
    count = int(sys.argv[2])
    out_dir = sys.argv[3]
    verbose = len(sys.argv) > 4 and sys.argv[4] == "--verbose"

    # Tame logging unless verbose
    level = logging.DEBUG if verbose else logging.WARNING
    logging.basicConfig(level=level)
    for name in (
        "icrawler",
        "icrawler.crawler",
        "icrawler.builtin",
        "icrawler.downloader",
        "icrawler.parser",
    ):
        logging.getLogger(name).setLevel(level)

    os.makedirs(out_dir, exist_ok=True)
    crawler = GoogleImageCrawler(storage={"root_dir": out_dir})
    # Filter to photos often avoids svg/web junk; tweak as you like:
    crawler.crawl(keyword=query, max_num=count, min_size=(128, 128), file_idx_offset=0)

if __name__ == "__main__":
    main()