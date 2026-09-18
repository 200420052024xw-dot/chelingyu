# 项目上下文

## 项目简介

**车领驭（共享无人车企业官网）** — 面向 B 端园区/厂区/物流客户与 C 端个人用户的无人车销售/租赁/运力一体化解决方案官网 + 管理后台。

- 品牌调性与视觉规范详见 [DESIGN.md](DESIGN.md)（设计 token、字体、动效、禁忌等）。
- 通用框架使用说明详见 [README.md](README.md)（shadcn 组件清单、路由示例、依赖管理）。

## 版本技术栈

- **Framework**: Next.js 16（App Router）
- **Core**: React 19
- **Language**: TypeScript 5（`strict: true`）
- **UI**: shadcn/ui（new-york 风格，基于 Radix UI，配置见 [components.json](components.json)）
- **Styling**: Tailwind CSS 4（CSS Variables 主题，入口 [src/app/globals.css](src/app/globals.css)）
- **Backend**: 自定义 Node 服务（[src/server.ts](src/server.ts)） + Supabase（通过 `@supabase/supabase-js`）
- **ORM**: Drizzle ORM（schema 见 [src/storage/database/shared/schema.ts](src/storage/database/shared/schema.ts)）

## 目录结构

```
├── public/                       # 静态资源（含 uploads/）
├── scripts/                      # 构建与启动脚本（bash）
│   ├── build.sh                  # pnpm install + next build + tsup 打包
│   ├── dev.sh                    # 端口 5000，tsx watch 启动
│   ├── prepare.sh                # 依赖安装 + coze-dev check-bins
│   ├── start.sh                  # 生产环境 node dist/server.js
│   └── validate.sh               # 串行跑 ts-check + eslint + stylelint
├── src/
│   ├── app/                      # App Router 路由
│   │   ├── (pages)/              # 公开页面：/、/products、/services、/cases、/about、/contact
│   │   ├── admin/                # 后台管理（单页 SPA，详见下方）
│   │   └── api/                  # REST API 路由
│   ├── components/
│   │   ├── Navigation.tsx        # 顶部导航
│   │   ├── Footer.tsx            # 页脚
│   │   ├── FloatingButtons.tsx   # 悬浮按钮
│   │   └── ui/                   # shadcn/ui 基础组件（**禁止在此目录随意新增非 shadcn 组件**）
│   ├── hooks/                    # 自定义 Hooks
│   ├── lib/                      # 工具库（site-settings.ts、utils.ts）
│   ├── storage/database/         # 数据层（详见下方）
│   └── server.ts                 # 自定义 HTTP 服务入口（端口 5000）
├── next.config.ts                # 全路由禁缓存、远端图片白名单
├── package.json
└── tsconfig.json                 # "@/*" → "./src/*"
```

## 包管理规范

**仅允许使用 pnpm**（packageManager 已锁定为 `pnpm@9.0.0`，`preinstall` 脚本会拒绝其他管理器）。

常用命令：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 移除依赖：`pnpm remove <package>`
- 校验：`pnpm validate`（等价于 `pnpm ts-check && pnpm lint:build && pnpm lint:style`）

## 开发规范

### 编码规范

- 严格遵循 TypeScript `strict` 心智：禁止隐式 `any`、禁止 `as any`、禁止 `@ts-ignore`。
- 函数参数、返回值、解构项、事件对象、`catch` 错误在使用前必须有明确类型或完成类型收窄。
- 禁止拼写错或引用未声明的标识符；删除未使用的变量与导入。
- 路径别名使用 `@/...`（对应 `./src/*`）。

### next.config 配置规范

- 配置中**不要写死绝对路径**，必须使用 `path.resolve(__dirname, ...)`、`import.meta.dirname` 或 `process.cwd()` 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 `typeof window`、`Date.now()`、`Math.random()` 等动态数据；**必须**在 `'use client'` 组件里用 `useEffect + useState` 确保动态内容仅在客户端挂载后渲染。
2. 严禁非法 HTML 嵌套（如 `<p>` 内嵌 `<div>`）。
3. **禁止直接使用 `<head>` 标签**，优先使用 Next.js 的 `metadata` 导出：
   - 三方 CSS / 字体：在 `globals.css` 顶部通过 `@import` 引入，或使用 `next/font`。
   - `preload` / `preconnect` / `dns-prefetch`：使用 `ReactDOM` 的对应方法。
   - JSON-LD：参考 Next.js 官方文档。

## 数据层（src/storage/database/）

- **客户端获取**：通过 `getSupabaseClient()`（[src/storage/database/supabase-client.ts](src/storage/database/supabase-client.ts)）。
  - 自动从 `COZE_SUPABASE_URL` / `COZE_SUPABASE_ANON_KEY` 读取；缺一即抛错。
  - 优先使用 service role key（`COZE_SUPABASE_SERVICE_ROLE_KEY`），无则回退 anon key。
  - 已挂载 `coze-coding-dev-sdk` 的请求上报包装，勿自行替换 `fetch`。
- **Schema 定义**：所有表结构集中在 [src/storage/database/shared/schema.ts](src/storage/database/shared/schema.ts)（Drizzle，`pgTable`），含 `site_settings` / `banners` / `products` / `business_services` / `cases` / `leads` 等。
- **新增表**：必须先更新 `schema.ts`，再补充 `relations.ts`（如有外键），最后在 admin panel 与 API route 中接入。
- 业务封装推荐在 `src/lib/*.ts` 提供高层函数（如 `getSiteSettings()`），组件 / API 不直接散落 Supabase 调用。

## API 路由规范（src/app/api/）

- 每个资源一个目录，含 `route.ts` 与可选的 `[id]/route.ts`。
- **导出大写方法** `export async function GET/POST/PUT/DELETE(request: NextRequest)`。
- 错误返回统一为 `NextResponse.json({ error: msg }, { status })`；成功返回 `{ data }` 或 `{ success: true, data }`。
- `catch` 块中应将未知错误收窄为 `Error`：`err instanceof Error ? err.message : 'fallback'`。
- 所有路由已由 `next.config.ts` 的 `headers()` 设置 `Cache-Control: no-store, no-cache, must-revalidate`，前端 fetch 时**仍需**附带 `cache: 'no-store'` 与 `Cache-Control` 头（参考 [src/components/Footer.tsx](src/components/Footer.tsx#L24-L31) 的写法）。

## 后台管理（src/app/admin/）

- **单页 SPA**：所有功能 tab 通过 `page.tsx` 内的 `useState<AdminTab>` 切换，无文件级子路由。
- 顶部登录校验：账号 `admin` / 密码 `chelingyu2024`（仅前端校验，**生产前必须替换为真实鉴权**）。
- 每个 panel 一个独立文件：`*-panel.tsx`，命名遵循 `<feature>-panel.tsx`。
- 新增后台功能时：在 `page.tsx` 中扩展 `AdminTab` 联合类型与 `tabs` 数组，再 import 对应面板组件。

## UI 与组件规范

- **默认且必须**采用 [src/components/ui/](src/components/ui/) 下预装的 shadcn/ui 组件与风格（除非用户明确指定其他规范）。
- **图标统一使用 `lucide-react`**；严禁使用卡通或彩色风格图标。
- 设计 token（色彩、字体、间距、阴影、动效）参见 [DESIGN.md](DESIGN.md)；不要在 `globals.css` 之外重复定义品牌色变量。
- 按钮交互：按下 `scale(0.98)`，**禁用弹跳动画**；卡片悬浮 `translateY(-4px)` + 阴影加深（300ms）。
- 最大内容宽度 1280px 居中；导航栏固定顶部 64px + `backdrop-blur`。
- 动效：`cubic-bezier(0.16, 1, 0.3, 1)`、时长 600ms；Banner fade 800ms、自动播放 5s。

## 页面与渲染约定

- `layout.tsx` 已设置 `export const dynamic = 'force-dynamic'` 与 `export const revalidate = 0`，**所有页面默认 SSR**，不要画蛇添足地加缓存。
- 客户端组件需显式 `'use client'`（如 [src/components/Navigation.tsx](src/components/Navigation.tsx)）；服务端组件则不要使用浏览器 API。
- 客户端数据获取推荐封装到自定义 hook 或 `lib/` 中，避免在每个组件里重复 `useEffect + fetch`。

## 常用脚本（pnpm）

| 用途 | 命令 |
| --- | --- |
| 启动开发 | `pnpm dev`（等价 `bash ./scripts/dev.sh`，端口 5000） |
| 构建 | `pnpm build`（等价 `bash ./scripts/build.sh`） |
| 生产启动 | `pnpm start`（等价 `bash ./scripts/start.sh`） |
| 类型检查 | `pnpm ts-check` |
| ESLint | `pnpm lint` / `pnpm lint:build` |
| Stylelint | `pnpm lint:style` |
| 全量校验 | `pnpm validate` |

## 易踩坑

- ⚠️ 在 SSR 阶段访问 `window` / `localStorage` / `Date.now()` 会导致 Hydration mismatch。
- ⚠️ 忘记在客户端 fetch 时加 `cache: 'no-store'` 会拿到旧数据（因 `next.config.ts` 已全局禁缓存，但仍建议显式声明）。
- ⚠️ 使用 `npm` 或 `yarn` 会被 `preinstall` 脚本拦截。
- ⚠️ 自定义服务端端口是 **5000**（不是默认 3000），启动后访问 `http://localhost:5000`。
- ⚠️ 站点设置（`site_settings` 表）会被 Navigation / Footer / 联系页并发请求，做变更时考虑幂等与默认值兜底（参考 [src/lib/site-settings.ts](src/lib/site-settings.ts) 的 `defaultSettings`）。
