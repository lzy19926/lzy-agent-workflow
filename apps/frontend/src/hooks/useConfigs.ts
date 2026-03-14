import { useLiveQuery } from 'dexie-react-hooks';
import { getAllConfigs, getConfig, setConfig } from '../db/configStore';

/**
 * 获取所有配置（实时查询）
 */
export function useConfigs() {
  const configs = useLiveQuery(() => getAllConfigs(), []);
  return configs || {};
}

/**
 * 获取单个配置值
 */
export function useConfig<T>(key: string, defaultValue?: T): [T | undefined, (value: T) => Promise<void>] {
  const value = useLiveQuery(
    () => getConfig<T>(key, defaultValue),
    [key]
  );

  const setValue = async (newValue: T) => {
    await setConfig(key, newValue);
  };

  return [value, setValue];
}

/**
 * 获取和设置 API Key
 */
export function useApiKey() {
  return useConfig<string>('apiKey', '');
}

/**
 * 获取和设置输出目录
 */
export function useOutputDir() {
  return useConfig<string>('outputDir', './output');
}
