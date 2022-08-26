import type { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-core'
import type { IFieldsValues, IRecord } from './types'
import { NodeOperationError } from 'n8n-workflow'
import { apiRequest, getFields } from './GenericFunctions'

export class AirtablePlusNode implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AirtablePlus',
    name: 'airtable-plus',
    icon: 'file:airtable-plus.svg',
    group: ['input'],
    version: 1,
    description: 'Append, update, and upsert data from Airtable',
    defaults: {
      name: 'AirtablePlus'
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'airtableApi',
        required: true
      }
    ],
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        options: [
          {
            name: 'Append',
            value: 'append',
            description: 'Append the data to a table',
            action: 'Append data to a table'
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update data in a table',
            action: 'Update data in a table'
          },
          {
            name: 'Upsert',
            value: 'upsert',
            description: 'Upsert data in a table',
            action: 'Upsert data in a table'
          }
        ],
        default: 'append'
      },

      // ----------------------------------
      //         All
      // ----------------------------------
      {
        displayName: 'Base ID',
        name: 'application',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the base to access'
      },
      {
        displayName: 'Table ID',
        name: 'table',
        type: 'string',
        default: '',
        required: true,
        description: 'The ID of the table to access'
      },

      // ----------------------------------
      //         append
      // ----------------------------------

      // ----------------------------------
      //         update
      // ----------------------------------
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['update']
          }
        },
        default: '',
        required: true,
        description: 'ID of the record to update'
      },

      // ----------------------------------
      //         upsert
      // ----------------------------------
      {
        displayName: 'Search Formula',
        name: 'searchFormula',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['upsert']
          }
        },
        default: '',
        required: true,
        description: 'Search formula of the record to upsert'
      },

      // ----------------------------------
      //         append + update + upsert
      // ----------------------------------
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'fixedCollection',
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Field'
        },
        displayOptions: {
          show: {
            operation: ['append', 'update', 'upsert']
          }
        },
        default: [],
        placeholder: 'Add Field',
        description: 'Fields which should be sent to Airtable',
        options: [
          {
            displayName: 'Field',
            name: 'fieldValues',
            values: [
              {
                displayName: 'Field Name',
                name: 'fieldName',
                type: 'string',
                default: ''
              },
              {
                displayName: 'Field Value',
                name: 'fieldValue',
                type: 'string',
                default: ''
              }
            ]
          }
        ]
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
          show: {
            operation: ['append', 'update', 'upsert']
          }
        },
        default: {},
        options: [
          {
            displayName: 'Bulk Size',
            name: 'bulkSize',
            type: 'number',
            typeOptions: {
              minValue: 1,
              maxValue: 10
            },
            displayOptions: {
              show: {
                '/operation': ['append', 'update']
              }
            },
            default: 10,
            description: 'Number of records to process at once'
          },
          {
            displayName: 'Typecast',
            name: 'typecast',
            type: 'boolean',
            displayOptions: {
              show: {
                '/operation': ['append', 'update', 'upsert']
              }
            },
            default: false,
            description: 'Whether the Airtable API should attempt mapping of string values for linked records & select options'
          }
        ]
      }
    ]
  }

  async execute (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData()
    const operation = this.getNodeParameter('operation', 0) as string
    const application = this.getNodeParameter('application', 0) as string
    const table = encodeURI(this.getNodeParameter('table', 0) as string)

    const body: IDataObject = {}
    const qs: IDataObject = {}
    const returnData: IDataObject[] = []

    if (operation === 'append') {
      const endpoint = `${application}/${table}`
      const rows: IDataObject[] = []

      for (let i = 0; i < items.length; i++) {
        try {
          const options = this.getNodeParameter('options', i, {}) as IDataObject
          const bulkSize = typeof options.bulkSize === 'number' ? options.bulkSize : 10

          const row: IDataObject = {
            fields: getFields.call(this, this.getNodeParameter('fields.fieldValues', i, []) as IFieldsValues[])
          }

          rows.push(row)

          if (rows.length === bulkSize || i === items.length - 1) {
            body.records = rows
            body.typecast = options.typecast

            const responseData = await apiRequest.call(this, 'POST', endpoint, body, qs)
            returnData.push(...responseData.records)

            rows.length = 0
          }
        } catch (err) {
          if (this.continueOnFail()) {
            returnData.push({ error: err.message })
          } else {
            throw err
          }
        }
      }
    } else if (operation === 'update') {
      const endpoint = `${application}/${table}`
      const rows: IDataObject[] = []

      for (let i = 0; i < items.length; i++) {
        try {
          const options = this.getNodeParameter('options', i, {}) as IDataObject
          const bulkSize = typeof options.bulkSize === 'number' ? options.bulkSize : 10

          const row: IDataObject = {
            fields: getFields.call(this, this.getNodeParameter('fields.fieldValues', i, []) as IFieldsValues[])
          }

          row.id = this.getNodeParameter('id', i) as string
          rows.push(row)

          if (rows.length === bulkSize || i === items.length - 1) {
            body.records = rows
            body.typecast = options.typecast

            const responseData = await apiRequest.call(this, 'PATCH', endpoint, body, qs)
            returnData.push(...responseData.records)

            rows.length = 0
          }
        } catch (err) {
          if (this.continueOnFail()) {
            returnData.push({ error: err.message })
          } else {
            throw err
          }
        }
      }
    } else if (operation === 'upsert') {
      const endpoint = `${application}/${table}`

      for (let i = 0; i < items.length; i++) {
        try {
          const options = this.getNodeParameter('options', i, {}) as IDataObject

          const row: IDataObject = {
            fields: getFields.call(this, this.getNodeParameter('fields.fieldValues', i, []) as IFieldsValues[])
          }

          qs.filterByFormula = this.getNodeParameter('searchFormula', i) as string
          const responseDataExists = await apiRequest.call(this, 'GET', endpoint, {}, qs)

          if (responseDataExists.records.length === 0) {
            body.records = [row]
            body.typecast = options.typecast

            const responseData = await apiRequest.call(this, 'POST', endpoint, body, {})
            returnData.push(...responseData.records)
          } else {
            const existingRecord = responseDataExists.records[0] as IRecord

            row.id = existingRecord.id
            body.records = [row]
            body.typecast = options.typecast

            const responseData = await apiRequest.call(this, 'PATCH', endpoint, body, {})
            returnData.push(...responseData.records)
          }
        } catch (err) {
          if (this.continueOnFail()) {
            returnData.push({ error: err.message })
          } else {
            throw err
          }
        }
      }
    } else {
      throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`)
    }

    return [this.helpers.returnJsonArray(returnData)]
  }
}
