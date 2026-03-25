/**
 * 加载环境变量
 * 从项目根目录下的 .env 文件加载环境变量到 process.env 中
 */

import { config } from "dotenv"
import { fileURLToPath } from "url"
import path from "path"

export function loadEnv() {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  config({ path: path.resolve(__dirname, "../../.env") })
}
