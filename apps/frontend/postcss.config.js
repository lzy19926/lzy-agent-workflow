/**
 * PostCSS 配置文件
 *
 * PostCSS 是一个用 JavaScript 转换 CSS 的工具
 * 在此配置 Tailwind CSS 和 Autoprefixer 插件
 *
 * @see https://postcss.org/
 * @see https://tailwindcss.com/docs/installation
 * @see https://github.com/postcss/autoprefixer
 */

export default {
  // 启用的 PostCSS 插件
  plugins: {
    // Tailwind CSS 插件
    // 提供实用优先的 CSS 类（如 flex, pt-4, text-red-500 等）
    // 空对象 {} 表示使用默认配置
    tailwindcss: {},

    // Autoprefixer 插件
    // 自动为 CSS 属性添加浏览器厂商前缀（如 -webkit-, -moz- 等）
    // 确保 CSS 在不同浏览器中的兼容性
    autoprefixer: {},
  },
};
