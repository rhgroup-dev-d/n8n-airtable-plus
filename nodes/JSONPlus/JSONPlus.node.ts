import type { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-core'

export class JSONPlus implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'JSONPlus',
    name: 'json-plus',
    icon: 'file:json-plus.svg',
    group: ['transform'],
    version: 1,
    description: 'Get custom JSON value',
    defaults: {
      name: 'JSONPlus'
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Value',
        name: 'value',
        type: 'string',
        default: '',
        required: true,
        description: 'JSON value you want to get'
      }
    ]
  }

  async execute (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const returnData: IDataObject[] = []

    for (let i = 0; i < items.length; i++) {
      try {
        returnData.push(this.getNodeParameter('value', i) as IDataObject)
      } catch (err) {
        if (this.continueOnFail()) {
          returnData.push({ error: err.message })
        } else {
          throw err
        }
      }
    }

    return [this.helpers.returnJsonArray(returnData)]
  }
}
