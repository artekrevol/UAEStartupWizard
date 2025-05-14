/**
 * Type declarations for memory-cache module
 */

declare module 'memory-cache' {
  interface CacheOptions {
    maxAge?: number;
  }

  export function put(key: string, value: any, time?: number, timeoutCallback?: Function): any;
  export function get(key: string): any;
  export function del(key: string): any;
  export function clear(): void;
  export function size(): number;
  export function memsize(): number;
  export function debug(bool: boolean): void;
  export function keys(): string[];
  export function exportJson(): string;
  export function importJson(json: string, options?: CacheOptions): void;
  export function cache(): any;
  export function hits(): number;
  export function misses(): number;
}