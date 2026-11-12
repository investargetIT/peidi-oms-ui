# 项目约定（给 Claude 的速查）

## 接口环境切换（高频操作，照做即可，禁止先搜索/探测）

用户说"切本地1 / 切本地2 / 切回生产"时，**只改一个文件的一行**：

`src/services/apiTarget.ts` 里的 `DEFAULT_API_TARGET` → `'prod' | 'local1' | 'local2'`

- 不要 grep 全库、不要 curl 探端口、不要查进程、不要读其他 service 文件。
- 只有用户明确说"地址变了 / 换了新 IP"时，才去改 `API_BASE_URLS`。
- `http://12.18.1.10:8000/xxx` 是本机 umi dev server 的前端页面地址，不是后端接口地址。
- 生产构建强制走 `BASE_URL`；提交前把 `DEFAULT_API_TARGET` 还原为 `'prod'`。

所有 service 通过 `getOmsBaseUrl()` / `getFinanceBaseUrl()` 跟随切换，无需改其他文件。
