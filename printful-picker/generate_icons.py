"""
生成插件图标 PNG 文件（需要 Pillow: pip install Pillow）
运行: python generate_icons.py
"""
import os

try:
    from PIL import Image, ImageDraw, ImageFont
    HAS_PILLOW = True
except ImportError:
    HAS_PILLOW = False

def draw_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    # 圆角背景
    r = size // 6
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=(108, 99, 255, 255))
    # 购物袋图形
    cx, cy = size // 2, size // 2
    bag_w = int(size * 0.52)
    bag_h = int(size * 0.46)
    bx = cx - bag_w // 2
    by = cy - bag_h // 2 + int(size * 0.06)
    draw.rounded_rectangle([bx, by, bx + bag_w, by + bag_h], radius=size // 10, fill=(255, 255, 255, 255))
    # 提手
    handle_w = int(size * 0.26)
    handle_h = int(size * 0.18)
    hx = cx - handle_w // 2
    hy = by - handle_h + 1
    draw.arc([hx, hy, hx + handle_w, hy + handle_h * 2], start=200, end=340,
             fill=(255, 255, 255, 255), width=max(1, size // 16))
    return img

os.makedirs("icons", exist_ok=True)

if HAS_PILLOW:
    for size in [16, 48, 128]:
        img = draw_icon(size)
        img.save(f"icons/icon{size}.png")
    print("图标已生成：icons/icon16.png, icon48.png, icon128.png")
else:
    # 没有 Pillow，生成最简 1x1 PNG（透明占位）
    import struct, zlib
    def make_minimal_png(size, color=(108, 99, 255, 255)):
        def chunk(name, data):
            c = zlib.crc32(name + data) & 0xFFFFFFFF
            return struct.pack(">I", len(data)) + name + data + struct.pack(">I", c)
        ihdr_data = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
        raw_rows = b""
        for _ in range(size):
            row = b"\x00" + bytes(color[:3]) * size
            raw_rows += row
        idat_data = zlib.compress(raw_rows)
        return (b"\x89PNG\r\n\x1a\n"
                + chunk(b"IHDR", ihdr_data)
                + chunk(b"IDAT", idat_data)
                + chunk(b"IEND", b""))
    for size in [16, 48, 128]:
        with open(f"icons/icon{size}.png", "wb") as f:
            f.write(make_minimal_png(size))
    print("已生成占位图标（无 Pillow，图标为纯色块）")
    print("建议安装 Pillow 后重新运行: pip install Pillow")
