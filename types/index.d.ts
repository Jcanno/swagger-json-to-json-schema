import { Paths, Definitions, ApiMethodDetail } from './help';
import { JSONSchema6Definition, JSONSchema6 } from 'json-schema';
export declare class SwaggerParser {
    paths: Paths;
    definitions: Definitions;
    recursionModelNames: {};
    dependencies: {};
    constructor(paths: Paths, definitions: Definitions);
    /**
     * 解析器初始化,实际上是对parseDefinitionsDependencies的调用
     */
    init(): void;
    /**
     * 解析所有模型的依赖
     * 将解析出「所有模型定义对应的所有的依赖集合」以及「是否为循环依赖模型集合」
     */
    parseDefinitionsDependencies(): {};
    /**
     * 解析单个模型定义的依赖
     * @param definitionName      模型名称
     * @param dependencies        模型所有依赖集合
     * @param branchDependencies  模型下分支依赖集合(用于是否为循环依赖模型判断)
     * @returns { isRecursionModel: boolean, dependency: string[] }
     *                               MenuVO
     *                                 |
     *                                 |
     *    ===meta====key===id====icon====children====creator===gmtModified===
     *         |      |     |      |         |          |           |
     *         |      |     |      |         |          |           |
     *         |      |     |      |       MenuVO       |           |
     *                                      <|>
     *                                       |
     *                                       |
     *                                 bingo!循环依赖模型
     */
    parseDefinition(definitionName: string, dependencies: string[], branchDependencies: string[]): {
        isRecursionModel: boolean;
        dependency: string[];
    };
    /**
     * 获取该属性对象下的模型引用名称, 如 #/definitions/AccountSourceVO
     * @param propertie 属性对象
     * @returns { exist: boolean, modelName: string, existItemsRef: boolean }
     */
    getRefModel(propertie: JSONSchema6Definition): {
        exist: boolean;
        modelName: string;
        existItemsRef: boolean;
    };
    /**
     * 通过swagger模型引用名称获取处理后的模型名称
     * @param name  如#/definitions/AccountSourceVO
     * @returns    { name: string }
     */
    getModelName(name: string): string;
    /**
     * 获取该模型的所有依赖集合，遍历依赖集合添加到definitions对象上
     * @param modelName 模型名称
     * @returns definitions 依赖模型对象集合
     */
    getDefinitionsByDependencies(modelName: string): {};
    parse(): any[];
    /**
     * 解析接口，返回请求json schema
     * @param methodDetail 接口方法详情信息
     */
    parseRequestJsonSchema(methodDetail: ApiMethodDetail): any;
    /**
     * 解析接口，返回响应json schema
     * @param methodDetail 接口方法详情信息
     */
    parseResponseJsonSchema(methodDetail: ApiMethodDetail): JSONSchema6;
    /**
     * 解析嵌套的模型(模型中引用了其他模型，此方法将模型都解析进一个对象中，缺点：遍历循环引用模型会堆栈溢出)
     * @param definition 模型定义
     * @returns definition 解析完成的定义
     */
    parseNestModel(definition: JSONSchema6): JSONSchema6;
}
