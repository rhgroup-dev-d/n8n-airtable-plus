import type { IDataObject, ILoadOptionsFunctions } from 'n8n-workflow'
import type { IExecuteFunctions, IPollFunctions } from 'n8n-core'
import type { OptionsWithUri } from 'request'
import { NodeApiError } from 'n8n-workflow'
import { IFieldsValues } from './types'

export async function apiRequest (
  this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
  method: string,
  endpoint: string,
  body: object,
  query?: IDataObject,
  uri?: string,
  option: IDataObject = {}
): Promise<any> {
  query = query ?? {}

  const options: OptionsWithUri = {
    headers: {},
    method,
    body,
    qs: query,
    uri: uri ?? `https://api.airtable.com/v0/${endpoint}`,
    useQuerystring: false,
    json: true
  }

  if (Object.keys(option).length !== 0) {
    Object.assign(options, option)
  }

  if (Object.keys(options.body).length === 0) {
    delete options.body
  }

  try {
    return await this.helpers.requestWithAuthentication.call(this, 'airtableApi', options)
  } catch (err) {
    throw new NodeApiError(this.getNode(), err)
  }
}

export function getFields (
  this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
  fields: IFieldsValues[]
): IDataObject {
  return fields.reduce<IDataObject>((obj, item) => ({ ...obj, [item.fieldName]: item.fieldValue }), {})
}
