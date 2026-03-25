import { config } from "dotenv"
import { fileURLToPath } from "url"
import path from "path"

/**
 * 加载环境变量
 * 从项目根目录下的 .env 文件加载环境变量到 process.env 中
 */
export function loadEnv() {
  config({ path: path.resolve(__dirname, "../../.env") })
}

export const __filename = fileURLToPath(import.meta.url)
export const __dirname = path.dirname(__filename)
