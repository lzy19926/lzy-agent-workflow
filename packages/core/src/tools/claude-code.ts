import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface ClaudeCodeOptions {
  planMode?: boolean;
  readOnly?: boolean;
  background?: boolean;
  timeout?: number;
  /**
   * 输出文件路径，如果传入则使用该路径，否则使用默认的 output 目录
   */
  outputFile?: string;
  [key: string]: unknown;
}

export interface SkillRegistrationResult {
  name: string;
  targetPath: string;
  success: boolean;
  error?: string;
}

/**
 * 跨平台 Claude CLI 脚手架启动器
 */
export class ClaudeCode {
  private cliCommand: string;
  private defaultOutputDir: string;

  constructor(cliCommand: string = 'claude', defaultOutputDir: string = 'output') {
    this.cliCommand = cliCommand;
    this.defaultOutputDir = path.resolve(defaultOutputDir);
  }

  /**
   * 查找 Claude CLI 是否可用
   */
  static isAvailable(): boolean {
    try {
      const { execSync } = require('child_process');
      execSync('claude --version', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取 Claude CLI 版本
   */
  async getVersion(): Promise<string> {
    const { exec } = require('child_process');

    return new Promise((resolve, reject) => {
      const child = exec(`${this.cliCommand} -version`, {
        encoding: 'utf8',
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data: string) => {
        stdout += data;
      });

      child.stderr?.on('data', (data: string) => {
        stderr += data;
      });

      child.on('error', (err: Error) => {
        reject(err);
      });

      child.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`claude 退出码：${code}\n${stderr}`));
        }
      });
    });
  }

  /**
   * 在指定工程路径下以非交互模式运行单条指令
   * 后台启动 Claude，不显示终端窗口，输出重定向到文件
   */
  async run(projectPath: string, prompt: string, options: ClaudeCodeOptions = {}): Promise<string> {
    if (!fs.existsSync(projectPath)) {
      throw new Error(`工程路径不存在：${projectPath}`);
    }

    const absolutePath = path.resolve(projectPath);
    const timeout = options.timeout || 0;

    const env: { [key: string]: string | undefined } = { ...process.env };
    delete env.CLAUDECODE;
    delete env.CLAUDE_CODE;
    delete env.CLAUDE_CODE_SESSION_ID;

    const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\$/g, '\\$');

    // 使用 options.outputFile 或默认输出目录
    const outputFile = options.outputFile
      ? path.resolve(options.outputFile)
      : path.join(this.defaultOutputDir, `claude-run-output-${Date.now()}.md`);

    // 确保输出目录存在
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('[ClaudeCode] 执行命令:', `${this.cliCommand} -p "${escapedPrompt}"`);
    console.log('[ClaudeCode] 工作目录:', absolutePath);
    console.log('[ClaudeCode] 输出文件:', outputFile);

    if (process.platform === 'win32') {
      const systemRoot = process.env.SystemRoot || 'C:\\Windows';
      const cmdPath = path.join(systemRoot, 'System32', 'cmd.exe');

      const clearEnvCmd = 'set CLAUDECODE= && set CLAUDE_CODE= && ';
      const fullCmd = `${clearEnvCmd}${this.cliCommand} -p "${escapedPrompt}" > "${outputFile}" 2>&1`;

      const child = spawn(cmdPath, ['/c', fullCmd], {
        cwd: absolutePath,
        env,
        shell: true,
        windowsHide: true,
        stdio: 'ignore',
      });

      child.on('error', (err: Error) => {
        console.error('[ClaudeCode] 进程错误:', err);
      });

      child.on('close', (code: number | null) => {
        console.log(`[ClaudeCode] 进程关闭，退出码：${code}`);
      });

      return this.waitForOutputFile(outputFile, timeout || 600000);
    } else if (process.platform === 'darwin') {
      const fullCmd = `${this.cliCommand} -p "${escapedPrompt}" > "${outputFile}" 2>&1`;

      const child = spawn('bash', ['-c', fullCmd], {
        cwd: absolutePath,
        env,
        detached: true,
        stdio: 'ignore',
      });

      child.on('error', (err: Error) => {
        console.error('[ClaudeCode] 进程错误:', err);
      });

      child.on('close', (code: number | null) => {
        console.log(`[ClaudeCode] 进程关闭，退出码：${code}`);
      });

      return this.waitForOutputFile(outputFile, timeout || 600000);
    } else {
      const fullCmd = `${this.cliCommand} -p "${escapedPrompt}" > "${outputFile}" 2>&1`;

      const child = spawn('bash', ['-c', fullCmd], {
        cwd: absolutePath,
        env,
        detached: true,
        stdio: 'ignore',
      });

      child.on('error', (err: Error) => {
        console.error('[ClaudeCode] 进程错误:', err);
      });

      child.on('close', (code: number | null) => {
        console.log(`[ClaudeCode] 进程关闭，退出码：${code}`);
      });

      return this.waitForOutputFile(outputFile, timeout || 600000);
    }
  }

  /**
   * 注册 skill 到指定项目
   */
  async registerSkill(skillPath: string, projectPath: string = process.cwd()): Promise<SkillRegistrationResult> {
    if (!fs.existsSync(skillPath)) {
      return {
        name: path.basename(skillPath),
        targetPath: '',
        success: false,
        error: `skill 路径不存在：${skillPath}`,
      };
    }

    if (!fs.existsSync(projectPath)) {
      return {
        name: path.basename(skillPath),
        targetPath: '',
        success: false,
        error: `项目路径不存在：${projectPath}`,
      };
    }

    const absoluteSkillPath = path.resolve(skillPath);
    const absoluteProjectPath = path.resolve(projectPath);
    const skillName = path.basename(absoluteSkillPath);
    const skillsDir = path.join(absoluteProjectPath, '.claude', 'skills');
    const targetPath = path.join(skillsDir, skillName);

    try {
      if (!fs.existsSync(skillsDir)) {
        fs.mkdirSync(skillsDir, { recursive: true });
      }

      await this.copySkill(absoluteSkillPath, targetPath);

      return {
        name: skillName,
        targetPath,
        success: true,
      };
    } catch (err) {
      return {
        name: skillName,
        targetPath,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * 递归复制 skill 目录或文件
   */
  private async copySkill(src: string, dest: string): Promise<void> {
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      const entries = fs.readdirSync(src);
      for (const entry of entries) {
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        await this.copySkill(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  /**
   * 等待输出文件生成完成
   */
  private async waitForOutputFile(outputFile: string, timeoutMs: number = 600000): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let lastSize = 0;
      let stableCount = 0;

      const checkFile = async () => {
        try {
          if (Date.now() - startTime > timeoutMs) {
            reject(new Error(`等待输出文件超时：${outputFile}`));
            return;
          }

          if (!fs.existsSync(outputFile)) {
            setTimeout(checkFile, 2000);
            return;
          }

          const stats = fs.statSync(outputFile);
          const content = await fs.promises.readFile(outputFile, 'utf-8');

          if (stats.size === lastSize && stats.size > 0) {
            stableCount++;
            if (stableCount >= 3) {
              console.log('[ClaudeCode] 输出文件完成:', outputFile);
              resolve(content.trim());
              return;
            }
          } else {
            stableCount = 0;
          }

          lastSize = stats.size;
          setTimeout(checkFile, 2000);
        } catch (err: any) {
          if (err.code === 'ENOENT') {
            setTimeout(checkFile, 2000);
          } else {
            reject(err);
          }
        }
      };

      checkFile();
    });
  }
}

export default ClaudeCode;
