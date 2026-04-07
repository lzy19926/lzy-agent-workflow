/**
 * 代码图谱生成器
 * 功能：符号提取 → 关系抽取 → 生成标准图谱结构（nodes + edges）
 * 支持直接入库 Kuzu、可视化、AI 分析等场景
 */
import { Project, SyntaxKind, SourceFile } from "ts-morph"
import path from "path"
import fs from "fs"

// ====================================
// 类型定义
// ====================================

/**
 * 节点类型
 */
export type NodeType = "File" | "Class" | "Function"

/**
 * 关系类型
 */
export type EdgeType = "CONTAINS" | "IMPORTS" | "EXTENDS" | "CALLS"

/**
 * 代码图谱节点
 */
export interface CodeGraphNode {
  id: string
  type: NodeType
  name?: string
  path?: string
}

/**
 * 代码图谱边（关系）
 */
export interface CodeGraphEdge {
  from: string
  to: string
  type: EdgeType
}

/**
 * 完整代码图谱结构
 */
export interface CodeGraph {
  nodes: CodeGraphNode[]
  edges: CodeGraphEdge[]
}

/**
 * 代码分析器配置
 */
export interface CodeAnalyzerConfig {
  tsConfigPath: string
  include?: string[]
  exclude?: string[]
}

// ====================================
// 代码图谱生成器类
// ====================================

export class CodeGraphGenerator {
  private project: Project
  private codeGraph: CodeGraph
  private nodeIdCounter: number

  constructor(config: CodeAnalyzerConfig) {
    this.project = new Project({
      tsConfigFilePath: config.tsConfigPath,
    })

    if (config.include) {
      this.project.addSourceFilesAtPaths(config.include)
    }

    this.codeGraph = { nodes: [], edges: [] }
    this.nodeIdCounter = 0
  }

  /**
   * 生成唯一节点ID
   */
  private generateNodeId(): string {
    return `node_${this.nodeIdCounter++}`
  }

  /**
   * 根据类型和名称查找节点
   */
  private findNode(type: NodeType, name: string): CodeGraphNode | undefined {
    return this.codeGraph.nodes.find(
      (node) => node.type === type && node.name === name
    )
  }

  /**
   * 根据路径查找文件节点
   */
  private findFileNode(path: string): CodeGraphNode | undefined {
    return this.codeGraph.nodes.find(
      (node) => node.type === "File" && node.path === path
    )
  }

  /**
   * 根据模块路径查找匹配的文件节点
   */
  private findModuleFileNode(modulePath: string): CodeGraphNode | undefined {
    return this.codeGraph.nodes.find(
      (node) => node.type === "File" && node.path?.includes(modulePath)
    )
  }

  /**
   * 从源文件提取所有节点（文件、类、函数）
   */
  private extractNodesFromFile(file: SourceFile): void {
    const filePath = file.getFilePath()
    const fileId = this.generateNodeId()

    // 添加 File 节点
    this.codeGraph.nodes.push({
      id: fileId,
      type: "File",
      path: filePath,
    })

    // 提取 Class 节点
    const classes = file.getClasses()
    for (const cls of classes) {
      const clsId = this.generateNodeId()
      this.codeGraph.nodes.push({
        id: clsId,
        type: "Class",
        name: cls.getName() || "UnknownClass",
      })

      // 添加 CONTAINS 关系：文件包含类
      this.codeGraph.edges.push({
        from: fileId,
        to: clsId,
        type: "CONTAINS",
      })
    }

    // 提取 Function 节点
    const functions = file.getFunctions()
    for (const func of functions) {
      const funcId = this.generateNodeId()
      this.codeGraph.nodes.push({
        id: funcId,
        type: "Function",
        name: func.getName() || "AnonymousFunc",
      })

      // 添加 CONTAINS 关系：文件包含函数
      this.codeGraph.edges.push({
        from: fileId,
        to: funcId,
        type: "CONTAINS",
      })
    }
  }

  /**
   * 提取类的继承关系 EXTENDS
   */
  private extractExtendsRelations(file: SourceFile): void {
    const classes = file.getClasses()
    for (const cls of classes) {
      const baseClass = cls.getBaseClass()
      if (!baseClass) continue

      const fromName = cls.getName()
      const toName = baseClass.getName()
      if (!fromName || !toName) continue

      const fromNode = this.findNode("Class", fromName)
      const toNode = this.findNode("Class", toName)

      if (fromNode && toNode) {
        this.codeGraph.edges.push({
          from: fromNode.id,
          to: toNode.id,
          type: "EXTENDS",
        })
      }
    }
  }

  /**
   * 提取函数调用关系 CALLS
   */
  private extractCallRelations(file: SourceFile): void {
    const functions = file.getFunctions()
    for (const func of functions) {
      const funcName = func.getName()
      if (!funcName) continue

      const callerNode = this.findNode("Function", funcName)
      if (!callerNode) continue

      // 找到这个函数调用的所有方法
      const calls = func.getDescendantsOfKind(SyntaxKind.CallExpression)

      for (const call of calls) {
        const calleeName = call.getExpression().getText()
        const calleeNode = this.findNode("Function", calleeName)

        if (calleeNode) {
          this.codeGraph.edges.push({
            from: callerNode.id,
            to: calleeNode.id,
            type: "CALLS",
          })
        }
      }
    }
  }

  /**
   * 提取文件导入关系 IMPORTS
   */
  private extractImportRelations(file: SourceFile): void {
    const imports = file.getImportDeclarations()

    for (const imp of imports) {
      const moduleFile = imp.getModuleSpecifierSourceFile()
      const resolved = moduleFile?.getFilePath() || ""
      const fromNode = this.findFileNode(file.getFilePath())
      const toNode = this.findModuleFileNode(resolved)

      if (fromNode && toNode) {
        this.codeGraph.edges.push({
          from: fromNode.id,
          to: toNode.id,
          type: "IMPORTS",
        })
      }
    }
  }

  /**
   * 生成完整代码图谱
   */
  public generate(): CodeGraph {
    const sourceFiles = this.project.getSourceFiles()

    // Step 1: 提取所有节点
    for (const file of sourceFiles) {
      this.extractNodesFromFile(file)
    }

    // Step 2: 提取所有关系
    for (const file of sourceFiles) {
      this.extractExtendsRelations(file)
      this.extractCallRelations(file)
      this.extractImportRelations(file)
    }

    return this.codeGraph
  }

  /**
   * 打印代码图谱到控制台
   */
  public printGraph(): void {
    console.log("\n=== 代码图谱生成完成 ===")
    console.log("\n📦 节点总数：", this.codeGraph.nodes.length)
    console.log("\n🔗 关系总数：", this.codeGraph.edges.length)

    console.log("\n📦 节点列表：")
    console.table(this.codeGraph.nodes)

    console.log("\n🔗 关系列表：")
    console.table(this.codeGraph.edges)
  }

  /**
   * 保存代码图谱到JSON文件
   * @param outputPath 输出文件路径，默认值：code-graph.json
   */
  public saveToJson(outputPath: string = "code-graph.json"): void {
    const resolvedPath = path.resolve(outputPath)
    // 确保输出目录存在
    const outputDir = path.dirname(resolvedPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }
    // 写入JSON文件，带2空格缩进
    fs.writeFileSync(
      resolvedPath,
      JSON.stringify(this.codeGraph, null, 2),
      "utf8"
    )
    console.log(`\n✅ 代码图谱已保存到: ${resolvedPath}`)
  }
}

// ====================================
// 命令行执行入口
// ====================================
if (require.main === module) {
  const generator = new CodeGraphGenerator({
    tsConfigPath:
      "E:/webApp/agent learn/lzy-Agent-Workflow/packages/core/tsconfig.json",
  })

  const graph = generator.generate()
  generator.saveToJson()
}

export default CodeGraphGenerator
