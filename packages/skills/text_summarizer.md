---
name: text_summarizer
author: lzy19926
version: 1.0.0
description: 视频内容总结
---

# Text Summarizer Skill

A more complex example that demonstrates text processing capabilities.

## What it does

请帮我整理并总结一段视频的文本内容，严格遵循以下要求，适配语音转文字后的口语化、冗余特点：

1.  先梳理语音核心主旨，用1-2句话概括视频文本的整体内容，不遗漏核心话题；

2.  提炼关键信息：核心观点、重要案例、数据、结论、关键建议（若有），剔除口语化冗余（如“嗯、啊、这个、那个”）、重复表述；

3.  结构清晰，可分点（或分段）呈现，逻辑连贯，贴合语音原本的表述顺序，不打乱内容逻辑；

4.  保持客观中立，不添加任何主观评价、猜测，不编造语音中未提及的信息；

5.  若语音中有分话题、分段落，可对应拆分总结；若有未说完的观点、待补充的内容，单独标注；

6.  语言简洁明了，兼顾完整性和简洁性，避免冗余，适合快速掌握视频语音核心。

7. 以 json 格式返回：{summary: "简短摘要", organizedText: "整理后的完整文本", keyPoints: ["关键点 1", "关键点 2"]}'



