import * as v from "idonttrustlikethat"
import { variable, Variable } from "./variable"

type Mode = "throw" | "return"
type Option<_Mode extends Mode = Mode> = {
  mode: _Mode
}

type Result<Config> = {
  [P in keyof Config]: Config[P] extends string ? string
  : Config[P] extends number ? number
  : Config[P] extends boolean ? boolean
  : Config[P] extends Variable<infer T> ? T
  : Result<Config[P]>
}

export function load<Config>(config: Config): Result<Config>
export function load<Config>(config: Config, option: Option<"throw">): Result<Config>
export function load<Config>(config: Config, option: Option<"return">): v.Validation<Result<Config>>
export function load<Config>(config: Config, option?: Option): Result<Config> | v.Validation<Result<Config>> {
  const data = loadData(config)
  const validator = buildValidator(config) as v.Validator<Result<Config>>
  const result = validator.validate(data)
  if (option?.mode === "return") {
    return result
  } else if (result.ok) {
    return result.value
  } else {
    throw `Could not load environment variables: ${JSON.stringify(result.errors)}`
  }
}

function loadData<T>(value: T): unknown {
  if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
    return value
  } else if (Array.isArray(value)) {
    return value.map(loadData)
  } else if (value instanceof Variable) {
    return process.env[value.name]
  } else {
    const result: any = {}
    for (let key in value) {
      result[key] = loadData(value[key])
    }
    return result
  }
}

function buildValidator<T>(value: T): v.Validator<any> {
  if (typeof value === "boolean") {
    return v.boolean
  } else if (typeof value === "number") {
    return v.number
  } else if (typeof value === "string") {
    return v.string
  } else if (Array.isArray(value)) {
    return v.tuple(...value.map(buildValidator))
  } else if (value instanceof Variable) {
    return value.validator
  } else {
    const result: any = {}
    for (let key in value) {
      result[key] = buildValidator(value[key])
    }
    return v.object(result)
  }
}