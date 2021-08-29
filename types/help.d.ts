import { JSONSchema6 } from 'json-schema';
export interface Definitions {
    [key: string]: JSONSchema6;
}
interface Parameter {
    /**
     * 描述
     */
    description?: string;
    /**
     * 参数类型
     */
    in?: 'body' | 'query' | 'path' | 'formData';
    /**
     * 名称
     */
    name?: string;
    /**
     * 是否必须
     */
    required?: string;
    /**
     * 数据模型
     */
    schema?: {
        $ref?: string;
        items?: {
            $ref?: string;
        };
    };
}
export interface ApiMethodDetail {
    /**
     * 操作的标签
     */
    tags?: string[];
    /**
     * 短摘要
     */
    summary?: string;
    /**
     * 描述
     */
    description?: string;
    /**
     * 标识操作的唯一字符串
     */
    operationId?: string;
    /**
     * MIME类型列表
     */
    consumes?: string[];
    /**
     * MIME类型列表
     */
    produces?: string[];
    /**
     * 参数列表
     */
    parameters?: Parameter[];
    /**
     * 应答状态码和对于的消息的Schema
     */
    responses?: Record<string, JSONSchema6>;
    /**
     * 安全
     */
    security?: string[];
}
export interface Paths {
    [key: string]: {
        [method: string]: ApiMethodDetail;
    };
}
export interface OriginSwaggerData {
    paths: Paths;
    definitions: Definitions;
}
export interface SwaggerData {
    path: string;
    method: string;
    requestJsonSchema?: string;
    responseJsonSchema?: string;
    ssoRequired: boolean;
    description: string;
    name?: string;
    appId?: number;
    apiId?: number;
    isInKong?: boolean;
    [key: string]: any;
}
export {};
