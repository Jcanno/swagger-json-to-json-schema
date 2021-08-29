import { Paths, Definitions, ApiMethodDetail } from './help'
import { JSONSchema6Definition, JSONSchema6 } from 'json-schema'

export class SwaggerParser {
  paths: Paths = null
  definitions: Definitions = null
  // 模型中存在递归的模型名称集合  在解析模型定义中解析出来
  recursionModelMap = {}
  dependencies = {}

  constructor(paths: Paths, definitions: Definitions) {
    this.paths = paths
    this.definitions = definitions
    this.init()
  }

  /**
   * 解析器初始化,实际上是对parseDefinitionsDependencies的调用
   */
  init() {
    this.parseDefinitionsDependencies()
  }

  /**
   * 解析所有模型的依赖
   * 将解析出「所有模型定义对应的所有的依赖集合」以及「是否为循环依赖模型集合」
   */
  parseDefinitionsDependencies() {
    const dependencies = {}
    const recursionModelMap = {}
    Object.keys(this.definitions).forEach((definitionName) => {
      const { dependency, isRecursionModel } = this.parseDefinition(definitionName, [], null)
      dependencies[definitionName] = dependency
      recursionModelMap[definitionName] = isRecursionModel
    })

    this.dependencies = dependencies
    this.recursionModelMap = recursionModelMap
    return dependencies
  }

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
   *                                 bingo, recursion model!
   */
  parseDefinition(definitionName: string, dependencies: string[], branchDependencies: string[]) {
    const definition = this.definitions[definitionName]
    const properties = definition.properties
    let isRecursionModel = false

    if (properties) {
      Object.keys(properties).forEach((propertie) => {
        const item = properties[propertie]
        const { exist, modelName } = this.getRefModel(item)

        if (exist) {
          // 全部模型依赖中不存在此模型时，推入该模型
          if (!dependencies.includes(modelName)) {
            dependencies.push(modelName)
          }
          if (branchDependencies) {
            if (branchDependencies.includes(modelName)) {
              isRecursionModel = true
              return
            } else {
              branchDependencies.push(modelName)
            }
          }

          // 递归解析模型定义
          const { isRecursionModel: branchIsRecursionModel } = this.parseDefinition(
            modelName,
            dependencies,
            branchDependencies ?? [definitionName],
          )
          branchIsRecursionModel && (isRecursionModel = true)
        } else {
          return
        }
      })
    }

    return {
      isRecursionModel,
      dependency: dependencies,
    }
  }

  /**
   * 获取该属性对象下的模型引用名称, 如 #/definitions/AccountSourceVO
   * @param propertie 属性对象
   * @returns { exist: boolean, modelName: string, existItemsRef: boolean }
   */
  getRefModel(propertie: JSONSchema6Definition) {
    const ref = typeof propertie === 'boolean' ? '' : propertie?.$ref ?? ''
    const itemsRef =
      typeof propertie === 'boolean' ? '' : (propertie?.items as JSONSchema6)?.$ref ?? ''
    const refName = ref || itemsRef
    const exist = !!refName
    const existItemsRef = !!itemsRef
    const modelName = this.getModelName(refName ? refName : '')
    return {
      exist,
      modelName,
      existItemsRef,
    }
  }

  /**
   * 通过swagger模型引用名称获取处理后的模型名称
   * @param name  如#/definitions/AccountSourceVO
   * @returns    { name: string }
   */
  getModelName(name: string) {
    return name.slice(`#/definitions/`.length)
  }

  /**
   * 获取该模型的所有依赖集合，遍历依赖集合添加到definitions对象上
   * @param modelName 模型名称
   * @returns definitions 依赖模型对象集合
   */
  getDefinitionsByDependencies(modelName: string) {
    const definitionDependencies = this.dependencies[modelName]
    const definitions = {}
    definitionDependencies.forEach((dependency) => {
      definitions[dependency] = this.definitions[dependency]
    })

    return definitions
  }

  parse() {
    const swaggerData = []
    Object.keys(this.paths).forEach((path) => {
      const methods = this.paths[path]
      Object.keys(methods).forEach((method) => {
        const methodDetail = methods[method]
        const requestSchema = this.parseRequestJsonSchema(methodDetail)
        const responseSchema = this.parseResponseJsonSchema(methodDetail)
        const requestJsonSchema = requestSchema ? JSON.stringify(requestSchema) : requestSchema
        const responseJsonSchema: any = responseSchema
          ? JSON.stringify(responseSchema)
          : responseSchema

        swaggerData.push({
          method: method.toUpperCase(),
          requestJsonSchema,
          responseJsonSchema,
          path,
          description: methodDetail['description'] || methodDetail['summary'],
        })
      })
    })

    return swaggerData
  }

  /**
   * 解析接口，返回请求json schema
   * @param methodDetail 接口方法详情信息
   */
  parseRequestJsonSchema(methodDetail: ApiMethodDetail) {
    const parameters = methodDetail.parameters ?? []
    let bodyResult = null
    let hasQueryOrFormData = false
    const queryResult = {
      type: 'object',
      properties: {},
    }
    if (Array.isArray(parameters)) {
      for (let i = 0; i < parameters.length; i++) {
        const parameter = parameters[i]
        if (['formData', 'query'].includes(parameter.in)) {
          const name = parameter.name
          delete parameter.name
          delete parameter.in
          queryResult.properties[name] = parameter
          hasQueryOrFormData = true
          continue
        }

        if (parameter['in'] === 'body') {
          const schema = parameter.schema
          const { exist, modelName, existItemsRef } = this.getRefModel(schema)
          if (exist) {
            const definition = this.definitions[modelName]
            const definitions = this.getDefinitionsByDependencies(modelName)
            const newSchema = this.recursionModelMap[modelName]
              ? {
                  ...definition,
                  definitions,
                }
              : this.parseNestModel(definition)

            bodyResult = existItemsRef
              ? {
                  ...schema,
                  items: newSchema,
                }
              : newSchema
          } else {
            bodyResult = parameter
          }
        }
      }
    }

    return hasQueryOrFormData ? queryResult : bodyResult
  }

  /**
   * 解析接口，返回响应json schema
   * @param methodDetail 接口方法详情信息
   */
  parseResponseJsonSchema(methodDetail: ApiMethodDetail) {
    const successResponses = methodDetail?.responses?.['200']
    if (!successResponses) {
      return null
    }
    const successResponsesSchema = successResponses['schema']
    const { exist, modelName } = this.getRefModel(successResponsesSchema)

    if (exist) {
      const definition = this.definitions[modelName]
      const definitions = this.getDefinitionsByDependencies(modelName)
      if (this.recursionModelMap[modelName]) {
        return {
          ...definition,
          definitions,
        }
      } else {
        return this.parseNestModel(definition)
      }
    } else {
      return successResponses
    }
  }

  /**
   * 解析嵌套的模型(模型中引用了其他模型，此方法将模型都解析进一个对象中，缺点：遍历循环引用模型会堆栈溢出)
   * @param definition 模型定义
   * @returns definition 解析完成的定义
   */
  parseNestModel(definition: JSONSchema6) {
    const properties = definition['properties']
    if (properties) {
      Object.keys(properties).forEach((propertie) => {
        const propertieDetail = properties[propertie]
        const { exist, modelName, existItemsRef } = this.getRefModel(propertieDetail)

        if (exist) {
          const result = this.parseNestModel(this.definitions[modelName])
          existItemsRef
            ? (definition['properties'][propertie]['items'] = result)
            : (definition['properties'][propertie] = result)
        }
      })
    }

    return definition
  }
}
