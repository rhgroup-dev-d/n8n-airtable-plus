import type { IDataObject, ILoadOptionsFunctions, INodeExecutionData } from 'n8n-workflow'
import type { IExecuteFunctions, IPollFunctions } from 'n8n-core'
import type { OptionsWithUri } from 'request'
import type { IAttachment, IRecord } from './types'
import { NodeApiError } from 'n8n-workflow'

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

export async function apiRequestAllItems (
  this: IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions,
  method: string,
  endpoint: string,
  body: IDataObject,
  query?: IDataObject
): Promise<any> {
  query = query ?? {}
  query.pageSize = 100

  const returnData: IDataObject[] = []
  let responseData

  do {
    responseData = await apiRequest.call(this, method, endpoint, body, query)
    returnData.push(...responseData.records)

    query.offset = responseData.offset
  } while (responseData.offset !== undefined)

  return {
    records: returnData
  }
}

export async function downloadRecordAttachments (
  this: IExecuteFunctions | IPollFunctions,
  records: IRecord[],
  fieldNames: string[]
): Promise<INodeExecutionData[]> {
  const elements: INodeExecutionData[] = []

  for (const record of records) {
    const element: INodeExecutionData = {
      json: record as unknown as IDataObject,
      binary: {}
    }

    if (element.binary === undefined) {
      continue
    }

    for (const fieldName of fieldNames) {
      if (record.fields[fieldName] !== undefined) {
        for (const [index, attachment] of (record.fields[fieldName] as IAttachment[]).entries()) {
          const file = await apiRequest.call(this, 'GET', '', {}, {}, attachment.url, {
            encoding: null,
            json: false
          })

          element.binary[`${fieldName}_${index}`] = await this.helpers.prepareBinaryData(
            Buffer.from(file),
            attachment.filename,
            attachment.type
          )
        }
      }
    }

    if (Object.keys(element.binary).length === 0) {
      delete element.binary
    }

    elements.push(element)
  }

  return elements
}
