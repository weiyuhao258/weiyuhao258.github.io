"""Collect only the files referenced by the public website."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import shutil

ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "_site"


class SiteReferences(HTMLParser):
    def __init__(self):
        super().__init__()
        self.files = {"index.html", ".nojekyll"}

    def handle_starttag(self, tag, attributes):
        for key, value in attributes:
            if key not in {"src", "href", "poster", "data-image-src"} or not value:
                continue
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path:
                continue
            relative = unquote(url.path)
            path = (ROOT / relative).resolve()
            if not path.is_relative_to(ROOT) or not path.is_file():
                raise ValueError(f"Invalid site resource: {relative}")
            self.files.add(relative)


def site_files():
    parser = SiteReferences()
    parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    return sorted(parser.files)


if __name__ == "__main__":
    if OUTPUT.exists():
        raise SystemExit("_site already exists; use a fresh output directory.")
    files = site_files()
    for relative in files:
        destination = OUTPUT / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / relative, destination)
    total = sum((OUTPUT / relative).stat().st_size for relative in files)
    print(f"Prepared {len(files)} public files ({total / 1024 / 1024:.1f} MiB)")
