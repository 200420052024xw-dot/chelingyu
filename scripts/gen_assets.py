"""生成小程序所需的 PNG 资源（无 PIL 依赖，使用 zlib + struct）。"""
import struct
import zlib
import os

OUT = r"F:\CheLingYu\miniprogram\assets"

def png_chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))

def make_png(path, w, h, rgba_pixels):
    """rgba_pixels: bytes-like of length w*h*4"""
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    raw = b""
    for y in range(h):
        raw += b"\x00" + rgba_pixels[y * w * 4:(y + 1) * w * 4]
    idat = zlib.compress(raw, 9)
    data = sig + png_chunk(b"IHDR", ihdr) + png_chunk(b"IDAT", idat) + png_chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(data)

def solid(w, h, color):
    """color: (r,g,b,a)"""
    r, g, b, a = color
    px = bytes([r, g, b, a]) * (w * h)
    return px

def new_canvas(w, h):
    return bytearray(w * h * 4)  # 全透明

def set_px(canvas, w, x, y, r, g, b, a=255, h=None):
    if h is None:
        # 推断高度
        h = len(canvas) // (w * 4)
    if 0 <= x < w and 0 <= y < h:
        i = (y * w + x) * 4
        canvas[i:i+4] = bytes([r, g, b, a])

def fill_rect(canvas, w, h, x0, y0, x1, y1, color):
    for y in range(max(0, y0), min(h, y1)):
        for x in range(max(0, x0), min(w, x1)):
            set_px(canvas, w, x, y, *color)

def stroke_rect(canvas, w, h, x0, y0, x1, y1, color, thickness=1):
    for t in range(thickness):
        for x in range(x0, x1):
            set_px(canvas, w, x, y0 + t, *color)
            set_px(canvas, w, x, y1 - 1 - t, *color)
        for y in range(y0, y1):
            set_px(canvas, w, x0 + t, y, *color)
            set_px(canvas, w, x1 - 1 - t, y, *color)

def fill_circle(canvas, w, h, cx, cy, radius, color):
    for y in range(max(0, cy - radius), min(h, cy + radius + 1)):
        for x in range(max(0, cx - radius), min(w, cx + radius + 1)):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if d2 <= radius * radius:
                set_px(canvas, w, x, y, *color)

def stroke_circle(canvas, w, h, cx, cy, radius, color, thickness=1):
    r2_outer = radius * radius
    r2_inner = (radius - thickness) * (radius - thickness)
    for y in range(max(0, cy - radius), min(h, cy + radius + 1)):
        for x in range(max(0, cx - radius), min(w, cx + radius + 1)):
            d2 = (x - cx) ** 2 + (y - cy) ** 2
            if r2_inner < d2 <= r2_outer:
                set_px(canvas, w, x, y, *color)

def fill_round_rect(canvas, w, h, x0, y0, x1, y1, radius, color):
    for y in range(max(0, y0), min(h, y1)):
        for x in range(max(0, x0), min(w, x1)):
            in_corner = False
            # 左上
            if x < x0 + radius and y < y0 + radius:
                cx, cy = x0 + radius, y0 + radius
                if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                    continue
            # 右上
            if x >= x1 - radius and y < y0 + radius:
                cx, cy = x1 - radius - 1, y0 + radius
                if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                    continue
            # 左下
            if x < x0 + radius and y >= y1 - radius:
                cx, cy = x0 + radius, y1 - radius - 1
                if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                    continue
            # 右下
            if x >= x1 - radius and y >= y1 - radius:
                cx, cy = x1 - radius - 1, y1 - radius - 1
                if (x - cx) ** 2 + (y - cy) ** 2 > radius * radius:
                    continue
            set_px(canvas, w, x, y, *color)

# 调色板
GREEN = (15, 185, 109, 255)
GREEN_DEEP = (14, 156, 94, 255)
GREY = (154, 166, 178, 255)
WHITE = (255, 255, 255, 255)
BLACK = (15, 27, 42, 255)
ORANGE = (230, 154, 44, 255)
RED = (229, 80, 60, 255)
BLUE = (47, 122, 224, 255)
LIGHT_GREEN = (230, 248, 239, 255)

# ============== TabBar 图标（81x81 PNG） ==============
TB = 81

def make_tab_home(path, color):
    c = new_canvas(TB, TB)
    # 房形
    fill_polygon = [(TB//2, 12), (10, 40), (10, 70), (TB-10, 70), (TB-10, 40)]
    # 屋顶
    for y in range(12, 36):
        for x in range(12, TB-12):
            # 计算到顶点的距离以画三角形
            # 简单：用斜线
            if abs(x - TB//2) <= (y - 12) * (TB//2 - 12) // 24:
                set_px(c, TB, x, y, *color)
    # 房子主体
    fill_rect(c, TB, TB, 16, 36, TB-16, 70, color)
    # 门
    fill_rect(c, TB, TB, TB//2 - 8, 50, TB//2 + 8, 70, WHITE)
    make_png(path, TB, TB, bytes(c))

def make_tab_orders(path, color):
    c = new_canvas(TB, TB)
    # 列表三条线 + 圆点
    for i, y0 in enumerate([20, 38, 56]):
        fill_circle(c, TB, TB, 18, y0 + 5, 5, color)
        fill_round_rect(c, TB, TB, 30, y0, 65, y0 + 10, 3, color)
    make_png(path, TB, TB, bytes(c))

def make_tab_profile(path, color):
    c = new_canvas(TB, TB)
    # 头
    fill_circle(c, TB, TB, TB//2, 28, 14, color)
    # 身体
    fill_round_rect(c, TB, TB, 18, 46, TB-18, 70, 14, color)
    make_png(path, TB, TB, bytes(c))

os.makedirs(os.path.join(OUT, "tabbar"), exist_ok=True)
make_tab_home(os.path.join(OUT, "tabbar", "home.png"), GREY)
make_tab_home(os.path.join(OUT, "tabbar", "home-active.png"), GREEN_DEEP)
make_tab_orders(os.path.join(OUT, "tabbar", "orders.png"), GREY)
make_tab_orders(os.path.join(OUT, "tabbar", "orders-active.png"), GREEN_DEEP)
make_tab_profile(os.path.join(OUT, "tabbar", "profile.png"), GREY)
make_tab_profile(os.path.join(OUT, "tabbar", "profile-active.png"), GREEN_DEEP)

# ============== 车辆插图 160x160 ==============
VS = 160

def draw_box_truck(path, body_color, accent=BLACK, wheel_color=(40, 40, 40, 255), window_color=(180, 220, 240, 255)):
    c = new_canvas(VS, VS)
    # 底盘阴影
    fill_round_rect(c, VS, VS, 16, 100, 144, 130, 8, (220, 220, 220, 255))
    # 货厢主体
    fill_round_rect(c, VS, VS, 24, 50, 144, 120, 10, body_color)
    # 货厢顶部
    fill_round_rect(c, VS, VS, 24, 46, 144, 56, 6, accent)
    # 左侧门/分割线
    fill_rect(c, VS, VS, 64, 50, 68, 120, accent)
    fill_rect(c, VS, VS, 104, 50, 108, 120, accent)
    # 驾驶舱
    fill_round_rect(c, VS, VS, 14, 70, 36, 120, 6, accent)
    # 窗户
    fill_round_rect(c, VS, VS, 18, 76, 32, 92, 3, window_color)
    # 车头灯
    fill_circle(c, VS, VS, 17, 110, 3, ORANGE)
    # 车轮
    fill_circle(c, VS, VS, 38, 122, 10, wheel_color)
    fill_circle(c, VS, VS, 38, 122, 4, (90, 90, 90, 255))
    fill_circle(c, VS, VS, 120, 122, 10, wheel_color)
    fill_circle(c, VS, VS, 120, 122, 4, (90, 90, 90, 255))
    # 底部绿色条
    fill_rect(c, VS, VS, 24, 112, 144, 118, GREEN)
    make_png(path, VS, VS, bytes(c))

os.makedirs(os.path.join(OUT, "vehicles"), exist_ok=True)
draw_box_truck(os.path.join(OUT, "vehicles", "box-small.png"), WHITE)
draw_box_truck(os.path.join(OUT, "vehicles", "box-medium.png"), WHITE)
# 冷链车：车体白色 + 蓝色雪花
c = new_canvas(VS, VS)
draw_box_truck_gen = draw_box_truck
# 复用
draw_box_truck(os.path.join(OUT, "vehicles", "cold-chain.png"), WHITE)
# 在车体加雪花标识
import struct
def add_snowflake(path):
    c = bytearray(open(path, "rb").read())  # 不修改原 PNG；改用重绘
    # 重绘带雪花
    c2 = new_canvas(VS, VS)
    fill_round_rect(c2, VS, VS, 16, 100, 144, 130, 8, (220, 220, 220, 255))
    fill_round_rect(c2, VS, VS, 24, 50, 144, 120, 10, WHITE)
    fill_round_rect(c2, VS, VS, 24, 46, 144, 56, 6, BLACK)
    fill_rect(c2, VS, VS, 64, 50, 68, 120, BLACK)
    fill_rect(c2, VS, VS, 104, 50, 108, 120, BLACK)
    fill_round_rect(c2, VS, VS, 14, 70, 36, 120, 6, BLACK)
    fill_round_rect(c2, VS, VS, 18, 76, 32, 92, 3, (180, 220, 240, 255))
    # 雪花
    cx, cy = 90, 88
    for ang in range(8):
        import math
        rad = math.radians(ang * 45)
        ex = int(cx + math.cos(rad) * 16)
        ey = int(cy + math.sin(rad) * 16)
        # 主臂
        for t in range(0, 17):
            x = int(cx + (ex - cx) * t / 16)
            y = int(cy + (ey - cy) * t / 16)
            set_px(c2, VS, x, y, *BLUE)
            set_px(c2, VS, x-1, y, *BLUE)
            set_px(c2, VS, x+1, y, *BLUE)
        # 侧臂
        for t in range(4, 10):
            x = int(cx + (ex - cx) * t / 16)
            y = int(cy + (ey - cy) * t / 16)
            nx = int(x + math.cos(rad + 1.2) * 5)
            ny = int(y + math.sin(rad + 1.2) * 5)
            nx2 = int(x + math.cos(rad - 1.2) * 5)
            ny2 = int(y + math.sin(rad - 1.2) * 5)
            for px, py in [(nx, ny), (nx2, ny2)]:
                for d in range(-1, 2):
                    set_px(c2, VS, px + d, py, *BLUE)
    # 车轮
    fill_circle(c2, VS, VS, 38, 122, 10, (40, 40, 40, 255))
    fill_circle(c2, VS, VS, 38, 122, 4, (90, 90, 90, 255))
    fill_circle(c2, VS, VS, 120, 122, 10, (40, 40, 40, 255))
    fill_circle(c2, VS, VS, 120, 122, 4, (90, 90, 90, 255))
    fill_rect(c2, VS, VS, 24, 112, 144, 118, GREEN)
    make_png(path, VS, VS, bytes(c2))

add_snowflake(os.path.join(OUT, "vehicles", "cold-chain.png"))

# ============== 通用图标 64x64 ==============
IS = 64

def icon_loc(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS//2, IS//2, 20, color)
    fill_circle(c, IS, IS, IS//2, IS//2, 8, WHITE)
    set_px(c, IS, IS//2, IS//2, *color)
    make_png(path, IS, IS, bytes(c))

def icon_chat(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 8, 12, 56, 48, 8, color)
    fill_round_rect(c, IS, IS, 24, 48, 44, 58, 6, color)
    make_png(path, IS, IS, bytes(c))

def icon_clock(path, color=GREEN):
    c = new_canvas(IS, IS)
    stroke_circle(c, IS, IS, IS//2, IS//2, 22, color, 3)
    fill_rect(c, IS, IS, IS//2, IS//2 - 12, IS//2 + 2, IS//2 + 1, color)
    fill_rect(c, IS, IS, IS//2 - 1, IS//2, IS//2 + 10, IS//2 + 2, color)
    make_png(path, IS, IS, bytes(c))

def icon_pin(path, color=RED):
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS//2, 22, 12, color)
    fill_round_rect(c, IS, IS, IS//2 - 4, 30, IS//2 + 4, 56, 4, color)
    fill_circle(c, IS, IS, IS//2, 22, 5, WHITE)
    make_png(path, IS, IS, bytes(c))

def icon_box(path, color=ORANGE):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 10, 16, 54, 52, 4, color)
    fill_rect(c, IS, IS, 10, 26, 54, 30, (255, 255, 255, 200))
    make_png(path, IS, IS, bytes(c))

def icon_snow(path, color=BLUE):
    import math
    c = new_canvas(IS, IS)
    cx, cy = IS//2, IS//2
    for ang in range(8):
        rad = math.radians(ang * 45)
        ex = int(cx + math.cos(rad) * 22)
        ey = int(cy + math.sin(rad) * 22)
        for t in range(0, 23):
            x = int(cx + (ex - cx) * t / 22)
            y = int(cy + (ey - cy) * t / 22)
            set_px(c, IS, x, y, *color)
            set_px(c, IS, x-1, y, *color)
            set_px(c, IS, x+1, y, *color)
    make_png(path, IS, IS, bytes(c))

def icon_doc(path, color=BLUE):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 14, 8, 50, 56, 4, color)
    for y in range(20, 50, 6):
        fill_rect(c, IS, IS, 18, y, 46, y + 2, WHITE)
    make_png(path, IS, IS, bytes(c))

def icon_check(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS//2, IS//2, 26, color)
    for t in range(0, 12):
        x1 = 18 + t
        y1 = 32 + t // 2
        x2 = 18 + t
        y2 = 38 + t // 2
        set_px(c, IS, x1, y1, *WHITE)
        set_px(c, IS, x2, y2, *WHITE)
    for t in range(0, 18):
        x = 26 + t
        y = 38 + (50 - 38) * t // 18
        set_px(c, IS, x, y, *WHITE)
        set_px(c, IS, x + 1, y, *WHITE)
    make_png(path, IS, IS, bytes(c))

def icon_arrow_right(path, color=GREEN):
    c = new_canvas(IS, IS)
    # 横线
    fill_rect(c, IS, IS, 14, IS//2 - 2, 46, IS//2 + 2, color)
    # 箭头
    for t in range(12):
        set_px(c, IS, 44 + t, IS//2 - t, *color)
        set_px(c, IS, 44 + t, IS//2 + t, *color)
    make_png(path, IS, IS, bytes(c))

def icon_close(path, color=GREY):
    c = new_canvas(IS, IS)
    for t in range(20):
        x = 16 + t
        y1 = 16 + t
        y2 = 48 - t
        set_px(c, IS, x, y1, *color)
        set_px(c, IS, x, y2, *color)
        set_px(c, IS, x + 1, y1, *color)
        set_px(c, IS, x + 1, y2, *color)
    make_png(path, IS, IS, bytes(c))

def icon_back(path, color=BLACK):
    c = new_canvas(IS, IS)
    # 横线
    fill_rect(c, IS, IS, 18, IS//2 - 2, 50, IS//2 + 2, color)
    # 箭头
    for t in range(12):
        set_px(c, IS, 20 - t, IS//2 - t, *color)
        set_px(c, IS, 20 - t, IS//2 + t, *color)
    make_png(path, IS, IS, bytes(c))

def icon_battery(path, percent=80):
    c = new_canvas(IS, IS)
    stroke_rect(c, IS, IS, 10, 22, 50, 42, GREEN, 2)
    fill_rect(c, IS, IS, 50, 28, 54, 36, GREEN)
    # 电量条
    inner_w = int(36 * percent / 100)
    fill_rect(c, IS, IS, 12, 24, 12 + inner_w, 40, GREEN)
    make_png(path, IS, IS, bytes(c))

def icon_distance(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS//2, IS//2, 22, (255, 255, 255, 0))
    stroke_circle(c, IS, IS, IS//2, IS//2, 20, color, 2)
    set_px(c, IS, IS//2, IS//2, *color)
    fill_round_rect(c, IS, IS, IS//2 - 8, IS//2, IS//2, IS//2 + 16, 2, color)
    fill_round_rect(c, IS, IS, IS//2 - 4, IS//2 - 14, IS//2 + 8, IS//2, 2, color)
    make_png(path, IS, IS, bytes(c))

def icon_weight(path, color=ORANGE):
    c = new_canvas(IS, IS)
    # 砝码
    fill_round_rect(c, IS, IS, 16, 24, 48, 56, 4, color)
    fill_rect(c, IS, IS, 26, 14, 38, 24, color)
    fill_round_rect(c, IS, IS, 28, 8, 36, 16, 4, color)
    make_png(path, IS, IS, bytes(c))

def icon_volume(path, color=BLUE):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 10, 22, 54, 54, 4, color)
    # 立方体线
    fill_rect(c, IS, IS, 22, 22, 42, 26, BLACK)
    fill_rect(c, IS, IS, 22, 22, 26, 26, BLACK)
    make_png(path, IS, IS, bytes(c))

os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)
icon_loc(os.path.join(OUT, "icons", "location.png"), GREEN)
icon_loc(os.path.join(OUT, "icons", "location-active.png"), GREEN_DEEP)
icon_chat(os.path.join(OUT, "icons", "chat.png"), BLACK)
icon_clock(os.path.join(OUT, "icons", "clock.png"), BLACK)
icon_pin(os.path.join(OUT, "icons", "pin-pickup.png"), GREEN)
icon_pin(os.path.join(OUT, "icons", "pin-dropoff.png"), RED)
icon_box(os.path.join(OUT, "icons", "box.png"))
icon_snow(os.path.join(OUT, "icons", "snow.png"))
icon_doc(os.path.join(OUT, "icons", "doc.png"))
icon_check(os.path.join(OUT, "icons", "check.png"))
icon_arrow_right(os.path.join(OUT, "icons", "arrow-right.png"))
icon_close(os.path.join(OUT, "icons", "close.png"))
icon_back(os.path.join(OUT, "icons", "back.png"))
icon_battery(os.path.join(OUT, "icons", "battery.png"), 80)
icon_battery(os.path.join(OUT, "icons", "battery-low.png"), 20)
icon_distance(os.path.join(OUT, "icons", "distance.png"))
icon_weight(os.path.join(OUT, "icons", "weight.png"))
icon_volume(os.path.join(OUT, "icons", "volume.png"))

# 其它小图标
def icon_more(path, color=BLACK):
    c = new_canvas(IS, IS)
    for cy in [22, 32, 42]:
        fill_circle(c, IS, IS, IS//2, cy, 3, color)
    make_png(path, IS, IS, bytes(c))

def icon_search(path, color=BLACK):
    c = new_canvas(IS, IS)
    stroke_circle(c, IS, IS, 24, 24, 10, color, 3)
    fill_rect(c, IS, IS, 32, 32, 50, 36, color)
    make_png(path, IS, IS, bytes(c))

def icon_vehicle(path, color=GREEN):
    c = new_canvas(IS, IS)
    # 简化的厢式车
    fill_round_rect(c, IS, IS, 6, 22, 50, 50, 4, color)
    fill_round_rect(c, IS, IS, 50, 28, 60, 50, 4, color)
    fill_circle(c, IS, IS, 18, 54, 6, BLACK)
    fill_circle(c, IS, IS, 52, 54, 6, BLACK)
    make_png(path, IS, IS, bytes(c))

def icon_money(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 10, 18, 54, 50, 4, color)
    fill_round_rect(c, IS, IS, 10, 18, 14, 50, 4, GREEN_DEEP)
    make_png(path, IS, IS, bytes(c))

def icon_message(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 8, 14, 56, 50, 6, color)
    fill_round_rect(c, IS, IS, 24, 50, 40, 58, 4, color)
    make_png(path, IS, IS, bytes(c))

def icon_settings(path, color=GREY):
    import math
    c = new_canvas(IS, IS)
    cx, cy = IS//2, IS//2
    # 齿轮
    for ang in range(12):
        rad = math.radians(ang * 30)
        x = int(cx + math.cos(rad) * 24)
        y = int(cy + math.sin(rad) * 24)
        for t in range(-2, 3):
            set_px(c, IS, x + t, y, *color)
            set_px(c, IS, x, y + t, *color)
    fill_circle(c, IS, IS, cx, cy, 14, color)
    fill_circle(c, IS, IS, cx, cy, 6, WHITE)
    make_png(path, IS, IS, bytes(c))

def icon_support(path, color=GREEN):
    c = new_canvas(IS, IS)
    # 客服头
    fill_circle(c, IS, IS, 22, 22, 12, color)
    fill_round_rect(c, IS, IS, 8, 32, 56, 58, 6, color)
    # 头戴
    fill_round_rect(c, IS, IS, 8, 14, 36, 24, 4, color)
    make_png(path, IS, IS, bytes(c))

def icon_plus(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_rect(c, IS, IS, 12, IS//2 - 3, 52, IS//2 + 3, color)
    fill_rect(c, IS, IS, IS//2 - 3, 12, IS//2 + 3, 52, color)
    make_png(path, IS, IS, bytes(c))

def icon_calendar(path, color=GREEN):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 8, 14, 56, 56, 4, color)
    fill_rect(c, IS, IS, 8, 14, 56, 24, GREEN_DEEP)
    fill_rect(c, IS, IS, 18, 8, 22, 22, BLACK)
    fill_rect(c, IS, IS, 42, 8, 46, 22, BLACK)
    for r in range(3):
        for col in range(5):
            fill_rect(c, IS, IS, 14 + col * 9, 28 + r * 9, 18 + col * 9, 32 + r * 9, WHITE)
    make_png(path, IS, IS, bytes(c))

def icon_delete(path, color=RED):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 14, 16, 50, 54, 4, color)
    fill_rect(c, IS, IS, 10, 12, 54, 18, color)
    fill_rect(c, IS, IS, 26, 8, 38, 14, color)
    fill_rect(c, IS, IS, 22, 24, 26, 50, WHITE)
    fill_rect(c, IS, IS, 30, 24, 34, 50, WHITE)
    fill_rect(c, IS, IS, 38, 24, 42, 50, WHITE)
    make_png(path, IS, IS, bytes(c))

icon_more(os.path.join(OUT, "icons", "more.png"))
icon_search(os.path.join(OUT, "icons", "search.png"))
icon_vehicle(os.path.join(OUT, "icons", "vehicle.png"))
icon_money(os.path.join(OUT, "icons", "money.png"))
icon_message(os.path.join(OUT, "icons", "message.png"))
icon_settings(os.path.join(OUT, "icons", "settings.png"))
icon_support(os.path.join(OUT, "icons", "support.png"))
icon_plus(os.path.join(OUT, "icons", "plus.png"))
icon_calendar(os.path.join(OUT, "icons", "calendar.png"))
icon_delete(os.path.join(OUT, "icons", "delete.png"))

# 货物分类图标
def cat_general(path):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 10, 18, 54, 54, 6, GREEN)
    fill_rect(c, IS, IS, 14, 28, 50, 32, WHITE)
    make_png(path, IS, IS, bytes(c))

def cat_doc(path):
    icon_doc(path, GREEN)

def cat_fresh(path):
    icon_snow(path, GREEN)

def cat_food(path):
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS//2, IS//2, 22, ORANGE)
    fill_circle(c, IS, IS, 22, 22, 4, WHITE)
    fill_circle(c, IS, IS, 42, 22, 4, WHITE)
    make_png(path, IS, IS, bytes(c))

def cat_medical(path):
    c = new_canvas(IS, IS)
    fill_round_rect(c, IS, IS, 14, 14, 50, 50, 6, RED)
    fill_rect(c, IS, IS, IS//2 - 3, 22, IS//2 + 3, 42, WHITE)
    fill_rect(c, IS, IS, 22, IS//2 - 3, 42, IS//2 + 3, WHITE)
    make_png(path, IS, IS, bytes(c))

def cat_other(path):
    c = new_canvas(IS, IS)
    for i in range(3):
        cx = 16 + i * 12
        fill_circle(c, IS, IS, cx, IS//2, 4, GREEN)
    make_png(path, IS, IS, bytes(c))

os.makedirs(os.path.join(OUT, "categories"), exist_ok=True)
cat_general(os.path.join(OUT, "categories", "general.png"))
cat_doc(os.path.join(OUT, "categories", "document.png"))
cat_fresh(os.path.join(OUT, "categories", "fresh.png"))
cat_food(os.path.join(OUT, "categories", "food.png"))
cat_medical(os.path.join(OUT, "categories", "medical.png"))
cat_other(os.path.join(OUT, "categories", "other.png"))

# ============== 新增小图标（route / arrow-up / filter / pay-success / pay-fail / withdraw）==============

def icon_route(path, color=GREEN):
    """两圆 + 中间 3 段虚线（绿色）"""
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, 14, IS // 2, 7, color)
    fill_circle(c, IS, IS, IS - 14, IS // 2, 7, color)
    for seg in range(3):
        x0 = 22 + seg * 8
        fill_rect(c, IS, IS, x0, IS // 2 - 2, x0 + 5, IS // 2 + 2, color)
    make_png(path, IS, IS, bytes(c))

def icon_arrow_up(path, color=GREEN):
    """垂直条 + 上箭头"""
    c = new_canvas(IS, IS)
    fill_rect(c, IS, IS, IS // 2 - 3, 20, IS // 2 + 3, 54, color)
    # 箭头三角
    for t in range(16):
        set_px(c, IS, IS // 2 - t, 20 + t // 2, *color)
        set_px(c, IS, IS // 2 + t, 20 + t // 2, *color)
    make_png(path, IS, IS, bytes(c))

def icon_filter(path, color=GREY):
    """漏斗"""
    c = new_canvas(IS, IS)
    # 上沿梯形
    for y in range(10, 36):
        inset = max(0, (y - 10) // 2)
        fill_rect(c, IS, IS, 8 + inset, y, IS - 8 - inset, y + 1, color)
    # 颈
    fill_rect(c, IS, IS, IS // 2 - 8, 36, IS // 2 + 8, 54, color)
    make_png(path, IS, IS, bytes(c))

def icon_pay_success(path):
    """绿色圆 + 白色勾"""
    icon_check(path)  # 复用

def icon_pay_fail(path):
    """红色圆 + 白色 ×"""
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS // 2, IS // 2, 26, RED)
    for t in range(20):
        x = 18 + t
        set_px(c, IS, x, x, *WHITE)
        set_px(c, IS, x + 1, x, *WHITE)
        set_px(c, IS, x, x + 1, *WHITE)
        set_px(c, IS, IS - 1 - x, x, *WHITE)
        set_px(c, IS, IS - 2 - x, x, *WHITE)
        set_px(c, IS, IS - 1 - x, x + 1, *WHITE)
    make_png(path, IS, IS, bytes(c))

def icon_withdraw(path):
    """绿色圆 + 白色上箭头"""
    c = new_canvas(IS, IS)
    fill_circle(c, IS, IS, IS // 2, IS // 2, 26, GREEN)
    # 白色上箭头
    fill_rect(c, IS, IS, IS // 2 - 3, 22, IS // 2 + 3, 46, WHITE)
    for t in range(14):
        set_px(c, IS, IS // 2 - t, 22 - t // 2 + 14, *WHITE)
        set_px(c, IS, IS // 2 + t, 22 - t // 2 + 14, *WHITE)
    make_png(path, IS, IS, bytes(c))

os.makedirs(os.path.join(OUT, "icons"), exist_ok=True)
icon_route(os.path.join(OUT, "icons", "route.png"))
icon_arrow_up(os.path.join(OUT, "icons", "arrow-up.png"))
icon_filter(os.path.join(OUT, "icons", "filter.png"))
icon_pay_success(os.path.join(OUT, "icons", "pay-success.png"))
icon_pay_fail(os.path.join(OUT, "icons", "pay-fail.png"))
icon_withdraw(os.path.join(OUT, "icons", "withdraw.png"))

# ============== 空状态插画 240x240 ==============
ES = 240

def make_empty_box(path, title_color=GREEN_DEEP):
    """外框圆角方盒 + 内部虚线连接（订单列表空）"""
    c = new_canvas(ES, ES)
    # 浅绿底圆
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    # 主体盒子
    fill_round_rect(c, ES, ES, 50, 60, 190, 200, 16, WHITE)
    stroke_rect(c, ES, ES, 50, 60, 190, 200, title_color, 2)
    # 盒盖
    fill_round_rect(c, ES, ES, 50, 60, 190, 86, 16, title_color)
    # 盒身横线
    for y in range(110, 190, 18):
        fill_rect(c, ES, ES, 70, y, 170, y + 4, LIGHT_GREEN)
    # 下方虚线（表示路径）
    for x in range(40, 200, 14):
        fill_rect(c, ES, ES, x, 215, x + 8, 217, title_color)
    make_png(path, ES, ES, bytes(c))

def make_vehicle_outline(path):
    """圆 + 车辆轮廓（车辆列表空）"""
    c = new_canvas(ES, ES)
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    # 简化的厢式车：底盘 + 货厢 + 驾驶舱
    fill_round_rect(c, ES, ES, 60, 130, 180, 170, 8, WHITE)
    stroke_rect(c, ES, ES, 60, 130, 180, 170, GREEN_DEEP, 2)
    fill_round_rect(c, ES, ES, 70, 90, 180, 150, 10, WHITE)
    stroke_rect(c, ES, ES, 70, 90, 180, 150, GREEN_DEEP, 2)
    fill_round_rect(c, ES, ES, 50, 110, 78, 150, 6, WHITE)
    stroke_rect(c, ES, ES, 50, 110, 78, 150, GREEN_DEEP, 2)
    # 车轮
    fill_circle(c, ES, ES, 72, 172, 10, GREEN_DEEP)
    fill_circle(c, ES, ES, 168, 172, 10, GREEN_DEEP)
    make_png(path, ES, ES, bytes(c))

def make_clipboard(path):
    """剪贴板 + 三条线（任务列表空）"""
    c = new_canvas(ES, ES)
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    # 板
    fill_round_rect(c, ES, ES, 70, 60, 170, 200, 10, WHITE)
    stroke_rect(c, ES, ES, 70, 60, 170, 200, GREEN_DEEP, 2)
    # 顶部夹子
    fill_round_rect(c, ES, ES, 100, 50, 140, 70, 4, GREEN_DEEP)
    # 横线
    for i, y in enumerate([100, 130, 160]):
        fill_rect(c, ES, ES, 85, y, 155, y + 4, GREEN_DEEP if i == 0 else (154, 166, 178, 255))
    # 勾
    fill_rect(c, ES, ES, 78, 130, 82, 134, GREEN_DEEP)
    make_png(path, ES, ES, bytes(c))

def make_coins(path):
    """三枚叠加硬币 + ¥ 符号（收益空）"""
    c = new_canvas(ES, ES)
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    # 三枚硬币
    fill_circle(c, ES, ES, 90, 160, 38, (255, 220, 120, 255))
    stroke_circle(c, ES, ES, 90, 160, 38, ORANGE, 2)
    fill_circle(c, ES, ES, 120, 145, 38, (255, 220, 120, 255))
    stroke_circle(c, ES, ES, 120, 145, 38, ORANGE, 2)
    fill_circle(c, ES, ES, 150, 130, 42, GREEN)
    stroke_circle(c, ES, ES, 150, 130, 42, GREEN_DEEP, 2)
    # ¥ 符号（白色）粗略两条横线 + 竖线
    fill_rect(c, ES, ES, 148, 112, 152, 150, WHITE)
    fill_rect(c, ES, ES, 142, 122, 158, 126, WHITE)
    fill_rect(c, ES, ES, 142, 138, 158, 142, WHITE)
    make_png(path, ES, ES, bytes(c))

def make_speech_bubble(path):
    """圆角消息气泡 + 三个点（消息空）"""
    c = new_canvas(ES, ES)
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    fill_round_rect(c, ES, ES, 50, 70, 190, 170, 24, WHITE)
    stroke_rect(c, ES, ES, 50, 70, 190, 170, GREEN_DEEP, 2)
    # 气泡尾巴
    fill_round_rect(c, ES, ES, 80, 165, 110, 195, 6, WHITE)
    # 三个点
    for cx in [95, 120, 145]:
        fill_circle(c, ES, ES, cx, 120, 7, GREEN_DEEP)
    make_png(path, ES, ES, bytes(c))

def make_headset(path):
    """客服头戴耳麦（工单空）"""
    c = new_canvas(ES, ES)
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    # 头
    fill_circle(c, ES, ES, ES // 2, 100, 36, WHITE)
    stroke_circle(c, ES, ES, ES // 2, 100, 36, GREEN_DEEP, 2)
    # 身体
    fill_round_rect(c, ES, ES, 78, 138, 162, 200, 16, WHITE)
    stroke_rect(c, ES, ES, 78, 138, 162, 200, GREEN_DEEP, 2)
    # 耳麦弧
    for x in range(10):
        y_off = -int((x - 5) ** 2 // 4) + 4
        set_px(c, ES, ES // 2 - 50 + x, 75 + y_off, *GREEN_DEEP)
        set_px(c, ES, ES // 2 + 50 - x, 75 + y_off, *GREEN_DEEP)
    # 左右耳罩
    fill_round_rect(c, ES, ES, ES // 2 - 60, 78, ES // 2 - 50, 110, 6, GREEN_DEEP)
    fill_round_rect(c, ES, ES, ES // 2 + 50, 78, ES // 2 + 60, 110, 6, GREEN_DEEP)
    make_png(path, ES, ES, bytes(c))

def make_user_silhouette(path):
    """通用用户轮廓（profile 装饰）"""
    c = new_canvas(ES, ES)
    fill_circle(c, ES, ES, ES // 2, ES // 2, 110, LIGHT_GREEN)
    # 头
    fill_circle(c, ES, ES, ES // 2, 90, 32, WHITE)
    stroke_circle(c, ES, ES, ES // 2, 90, 32, GREEN_DEEP, 2)
    # 肩
    fill_round_rect(c, ES, ES, 70, 130, 170, 200, 28, WHITE)
    stroke_rect(c, ES, ES, 70, 130, 170, 200, GREEN_DEEP, 2)
    make_png(path, ES, ES, bytes(c))

def make_brand_mark(path):
    """品牌标识：圆形背景 + 白色 'C' + 小车辆轮廓"""
    c = new_canvas(200, 200)
    fill_circle(c, 200, 200, 100, 100, 96, GREEN_DEEP)
    # 'C' 形（用粗圆弧近似：用四个矩形围出开口）
    fill_circle(c, 200, 200, 100, 100, 60, WHITE)
    fill_circle(c, 200, 200, 100, 100, 44, GREEN_DEEP)
    # 开口（右侧矩形覆盖白色）
    fill_rect(c, 200, 200, 100, 80, 200, 120, GREEN_DEEP)
    # 小车辆剪影
    fill_round_rect(c, 200, 200, 70, 110, 130, 140, 4, WHITE)
    fill_round_rect(c, 200, 200, 75, 95, 130, 125, 6, WHITE)
    fill_circle(c, 200, 200, 80, 142, 6, WHITE)
    fill_circle(c, 200, 200, 120, 142, 6, WHITE)
    make_png(path, 200, 200, bytes(c))

os.makedirs(os.path.join(OUT, "images"), exist_ok=True)
make_empty_box(os.path.join(OUT, "images", "empty-orders.png"))
make_vehicle_outline(os.path.join(OUT, "images", "empty-vehicles.png"))
make_clipboard(os.path.join(OUT, "images", "empty-tasks.png"))
make_coins(os.path.join(OUT, "images", "empty-earnings.png"))
make_speech_bubble(os.path.join(OUT, "images", "empty-messages.png"))
make_headset(os.path.join(OUT, "images", "empty-support.png"))
make_user_silhouette(os.path.join(OUT, "images", "empty-profile.png"))
make_brand_mark(os.path.join(OUT, "images", "brand-mark.png"))

print("All assets generated.")
