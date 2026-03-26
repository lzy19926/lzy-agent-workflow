---
name: ts_code_analyzer
author: lzy19926
version: 1.0.0
description: 一套完整的ts代码工程分析流程
---

# Text Summarizer Skill

一套完整的ts代码工程分析流程


## 流程
1. 架构分析
使用skill: architecture-analysis对该项目进行整体架构分析, 并产出分析报告,以md格式返回


2. 功能分析
使用skill: architecture-analysis对该项目进行功能分析, 说明各主要功能点的代码实现, 并产出分析报告,以md格式返回

3. 前端安全性分析
- 请检查该项目src下的文件, 检查前端安全性并产出分析报告, 以md格式返回
使用skill: frontend-mobile-security-xss-scan

4. 代码质量分析
- 帮我检查该项目的代码质量与编码规范,包含TypeScript 类型体系质量,并产出文档,以md格式返回
- 将报告写入我的语雀文档 存放在/蚂蚁国际/架构文档
使用skill: coding-standards

5. 性能分析
- 对该项目的性能进行分析,总结问题,优缺点,技术思路。并产出分析报告, 以md格式返回
- 将报告写入我的语雀文档 存放在/蚂蚁国际/架构文档

6. 代码逐行审查
- 使用audit-context-building这个skill对项目代码做逐行审查,将优点和缺点整理成两个独立的章节,并生成报告, 以md格式返回

7. 重构与改进建议
基于先前5步骤生成的项目文档 ,生成一份当前项目问题，风险点，改进建议的报告