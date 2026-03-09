import { db, ConfigRecord } from './index';

const CONFIG_KEYS = {
  API_KEY: 'apiKey',
  OUTPUT_DIR: 'outputDir',
};

/**
 * 保存配置
 */
export async function setConfig(key: string, value: any): Promise<void> {
  const record: ConfigRecord = {
    key,
    value,
    updatedAt: new Date().toISOString(),
  };

  await db.configs.put(record);
}

/**
 * 获取配置
 */
export async function getConfig<T = any>(key: string, defaultValue?: T): Promise<T | undefined> {
  const record = await db.configs.get(key);
  return record?.value ?? defaultValue;
}

/**
 * 获取 API Key
 */
export async function getApiKey(): Promise<string | undefined> {
  return await getConfig(CONFIG_KEYS.API_KEY);
}

/**
 * 保存 API Key
 */
export async function setApiKey(key: string): Promise<void> {
  await setConfig(CONFIG_KEYS.API_KEY, key);
}

/**
 * 获取输出目录
 */
export async function getOutputDir(): Promise<string | undefined> {
  return await getConfig(CONFIG_KEYS.OUTPUT_DIR, './output');
}

/**
 * 保存输出目录
 */
export async function setOutputDir(dir: string): Promise<void> {
  await setConfig(CONFIG_KEYS.OUTPUT_DIR, dir);
}

/**
 * 获取所有配置
 */
export async function getAllConfigs(): Promise<Record<string, any>> {
  const configs = await db.configs.toArray();
  return configs.reduce((acc, config) => {
    acc[config.key] = config.value;
    return acc;
  }, {} as Record<string, any>);
}

/**
 * 删除配置
 */
export async function deleteConfig(key: string): Promise<void> {
  await db.configs.delete(key);
}
