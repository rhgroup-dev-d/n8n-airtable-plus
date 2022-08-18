import type { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-core'
import { NodeOperationError } from 'n8n-workflow'
import { apiRequest, apiRequestAllItems, downloadRecordAttachments } from './GenericFunctions'

export class AirtablePlus implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'AirtablePlus',
    name: 'airtable',
    icon: 'file:airtable-plus.svg',
    group: ['input'],
    version: 1,
    description: 'Read, update, write and delete data from Airtable',
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
            name: 'Delete',
            value: 'delete',
            description: 'Delete data from a table',
            action: 'Delete data from a table'
          },
          {
            name: 'List',
            value: 'list',
            description: 'List data from a table',
            action: 'List data from a table'
          },
          {
            name: 'Read',
            value: 'read',
            description: 'Read data from a table',
            action: 'Read data from a table'
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update data in a table',
            action: 'Update data in a table'
          }
        ],
        default: 'read'
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
      {
        displayName: 'Add All Fields',
        name: 'addAllFields',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['append']
          }
        },
        default: true,
        description: 'Whether all fields should be sent to Airtable or only specific ones'
      },
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'string',
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Field'
        },
        displayOptions: {
          show: {
            addAllFields: [false],
            operation: ['append']
          }
        },
        default: [],
        placeholder: 'Name',
        required: true,
        description: 'The name of fields for which data should be sent to Airtable'
      },

      // ----------------------------------
      //         delete
      // ----------------------------------
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['delete']
          }
        },
        default: '',
        required: true,
        description: 'ID of the record to delete'
      },

      // ----------------------------------
      //         list
      // ----------------------------------
      {
        displayName: 'Return All',
        name: 'returnAll',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['list']
          }
        },
        default: true,
        description: 'Whether to return all results or only up to a given limit'
      },
      {
        displayName: 'Limit',
        name: 'limit',
        type: 'number',
        displayOptions: {
          show: {
            operation: ['list'],
            returnAll: [false]
          }
        },
        typeOptions: {
          minValue: 1,
          maxValue: 100
        },
        default: 100,
        description: 'Max number of results to return'
      },
      {
        displayName: 'Download Attachments',
        name: 'downloadAttachments',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['list']
          }
        },
        default: false,
        description: 'Whether the attachment fields define in \'Download Fields\' will be downloaded'
      },
      {
        displayName: 'Download Fields',
        name: 'downloadFieldNames',
        type: 'string',
        required: true,
        displayOptions: {
          show: {
            operation: ['list'],
            downloadAttachments: [true]
          }
        },
        default: '',
        description: 'Name of the fields of type \'attachment\' that should be downloaded. Multiple ones can be defined separated by comma. Case sensitive and cannot include spaces after a comma.'
      },
      {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        displayOptions: {
          show: {
            operation: ['list']
          }
        },
        default: {},
        description: 'Additional options which decide which records should be returned',
        placeholder: 'Add Option',
        options: [
          {
            displayName: 'Fields',
            name: 'fields',
            type: 'string',
            typeOptions: {
              multipleValues: true,
              multipleValueButtonText: 'Add Field'
            },
            default: [],
            placeholder: 'Name',
            description: 'Only data for fields whose names are in this list will be included in the records'
          },
          {
            displayName: 'Filter By Formula',
            name: 'filterByFormula',
            type: 'string',
            default: '',
            placeholder: 'NOT({Name} = \'\')',
            description: 'A formula used to filter records. The formula will be evaluated for each record, and if the result is not 0, false, "", NaN, [], or #Error! the record will be included in the response.'
          },
          {
            displayName: 'Sort',
            name: 'sort',
            placeholder: 'Add Sort Rule',
            description: 'Defines how the returned records should be ordered',
            type: 'fixedCollection',
            typeOptions: {
              multipleValues: true
            },
            default: {},
            options: [
              {
                name: 'property',
                displayName: 'Property',
                values: [
                  {
                    displayName: 'Field',
                    name: 'field',
                    type: 'string',
                    default: '',
                    description: 'Name of the field to sort on'
                  },
                  {
                    displayName: 'Direction',
                    name: 'direction',
                    type: 'options',
                    options: [
                      {
                        name: 'ASC',
                        value: 'asc',
                        description: 'Sort in ascending order (small -> large)'
                      },
                      {
                        name: 'DESC',
                        value: 'desc',
                        description: 'Sort in descending order (large -> small)'
                      }
                    ],
                    default: 'asc',
                    description: 'The sort direction'
                  }
                ]
              }
            ]
          },
          {
            displayName: 'View',
            name: 'view',
            type: 'string',
            default: '',
            placeholder: 'Grid view',
            description: 'The name or ID of a view in the table. If set, only the records in that view will be returned. The records will be sorted according to the order of the view.'
          }
        ]
      },

      // ----------------------------------
      //         read
      // ----------------------------------
      {
        displayName: 'ID',
        name: 'id',
        type: 'string',
        displayOptions: {
          show: {
            operation: ['read']
          }
        },
        default: '',
        required: true,
        description: 'ID of the record to return'
      },

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
      {
        displayName: 'Update All Fields',
        name: 'updateAllFields',
        type: 'boolean',
        displayOptions: {
          show: {
            operation: ['update']
          }
        },
        default: true,
        description: 'Whether all fields should be sent to Airtable or only specific ones'
      },
      {
        displayName: 'Fields',
        name: 'fields',
        type: 'string',
        typeOptions: {
          multipleValues: true,
          multipleValueButtonText: 'Add Field'
        },
        displayOptions: {
          show: {
            updateAllFields: [false],
            operation: ['update']
          }
        },
        default: [],
        placeholder: 'Name',
        required: true,
        description: 'The name of fields for which data should be sent to Airtable'
      },

      // ----------------------------------
      //         append + delete + update
      // ----------------------------------
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        displayOptions: {
          show: {
            operation: ['append', 'delete', 'update']
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
            default: 10,
            description: 'Number of records to process at once'
          },
          {
            displayName: 'Ignore Fields',
            name: 'ignoreFields',
            type: 'string',
            displayOptions: {
              show: {
                '/operation': ['update'],
                '/updateAllFields': [true]
              }
            },
            default: '',
            description: 'Comma-separated list of fields to ignore'
          },
          {
            displayName: 'Typecast',
            name: 'typecast',
            type: 'boolean',
            displayOptions: {
              show: {
                '/operation': ['append', 'update']
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

    const returnData: IDataObject[] = []
    const qs: IDataObject = {}

    if (operation === 'append') {
      const requestMethod = 'POST'
      const endpoint = `${application}/${table}`
      const rows: IDataObject[] = []

      for (let i = 0; i < items.length; i++) {
        try {
          const addAllFields = this.getNodeParameter('addAllFields', i) as boolean
          const options = this.getNodeParameter('options', i, {}) as IDataObject
          const bulkSize = typeof options.bulkSize === 'number' ? options.bulkSize : 10
          const row: IDataObject = {}

          if (addAllFields) {
            row.fields = { ...items[i].json }
            // @ts-expect-error
            delete row.fields.id
          } else {
            const fields = this.getNodeParameter('fields', i, []) as string[]
            row.fields = {}

            for (const fieldName of fields) {
              // @ts-expect-error
              row.fields[fieldName] = items[i].json[fieldName]
            }
          }

          rows.push(row)

          if (rows.length === bulkSize || i === items.length - 1) {
            const body = { records: rows, typecast: options.typecast }
            const responseData = await apiRequest.call(this, requestMethod, endpoint, body, qs)

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
    } else if (operation === 'delete') {
      const requestMethod = 'DELETE'
      const endpoint = `${application}/${table}`
      const rows: string[] = []
      const options = this.getNodeParameter('options', 0, {}) as IDataObject
      const bulkSize = typeof options.bulkSize === 'number' ? options.bulkSize : 10

      for (let i = 0; i < items.length; i++) {
        try {
          const id = this.getNodeParameter('id', i) as string
          rows.push(id)

          if (rows.length === bulkSize || i === items.length - 1) {
            qs.records = rows
            rows.length = 0

            const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs)
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
    } else if (operation === 'list') {
      try {
        const requestMethod = 'GET'
        const endpoint = `${application}/${table}`
        const returnAll = this.getNodeParameter('returnAll', 0) as boolean
        const downloadAttachments = this.getNodeParameter('downloadAttachments', 0) as boolean
        const additionalOptions = this.getNodeParameter('additionalOptions', 0, {}) as IDataObject

        for (const key of Object.keys(additionalOptions)) {
          if (key === 'sort' && (additionalOptions.sort as IDataObject).property !== undefined) {
            qs[key] = (additionalOptions[key] as IDataObject).property
          } else {
            qs[key] = additionalOptions[key]
          }
        }

        let responseData

        if (returnAll) {
          responseData = await apiRequestAllItems.call(this, requestMethod, endpoint, {}, qs)
        } else {
          qs.maxRecords = this.getNodeParameter('limit', 0) as number
          responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs)
        }

        returnData.push(...responseData.records)

        if (downloadAttachments) {
          const downloadFieldNames = (this.getNodeParameter('downloadFieldNames', 0) as string).split(',')
          const data = await downloadRecordAttachments.call(this, responseData.records, downloadFieldNames)
          return [data]
        }
      } catch (err) {
        if (this.continueOnFail()) {
          returnData.push({ error: err.message })
        } else {
          throw err
        }
      }
    } else if (operation === 'read') {
      const requestMethod = 'GET'

      for (let i = 0; i < items.length; i++) {
        const id = this.getNodeParameter('id', i) as string
        const endpoint = `${application}/${table}/${id}`

        try {
          const responseData = await apiRequest.call(this, requestMethod, endpoint, {}, qs)
          returnData.push(responseData)
        } catch (err) {
          if (this.continueOnFail()) {
            returnData.push({ error: err.message })
          } else {
            throw err
          }
        }
      }
    } else if (operation === 'update') {
      const requestMethod = 'PATCH'
      const endpoint = `${application}/${table}`
      const rows: IDataObject[] = []

      for (let i = 0; i < items.length; i++) {
        try {
          const updateAllFields = this.getNodeParameter('updateAllFields', i) as boolean
          const options = this.getNodeParameter('options', i, {}) as IDataObject
          const ignoreFields = typeof options.ignoreFields === 'string' ? options.ignoreFields : ''
          const bulkSize = typeof options.bulkSize === 'number' ? options.bulkSize : 10
          const row: IDataObject = {}

          if (updateAllFields) {
            row.fields = { ...items[i].json }
            // @ts-expect-error
            delete row.fields.id

            if (ignoreFields !== '') {
              const ignoredFields = ignoreFields
                .split(',')
                .map(field => field.trim())
                .filter(field => field.length !== 0)

              if (ignoredFields.length !== 0) {
                row.fields = Object.entries(items[i].json)
                  .filter(([key]) => !ignoredFields.includes(key))
                  .reduce((obj, [key, val]) => Object.assign(obj, { [key]: val }), {})
              }
            }
          } else {
            const fields = this.getNodeParameter('fields', i, []) as string[]
            row.fields = {}

            for (const fieldName of fields) {
              // @ts-expect-error
              row.fields[fieldName] = items[i].json[fieldName]
            }
          }

          row.id = this.getNodeParameter('id', i) as string
          rows.push(row)

          if (rows.length === bulkSize || i === items.length - 1) {
            const data = { records: rows, typecast: options.typecast }
            const responseData = await apiRequest.call(this, requestMethod, endpoint, data, qs)

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
    } else {
      throw new NodeOperationError(this.getNode(), `The operation "${operation}" is not known!`)
    }

    return [this.helpers.returnJsonArray(returnData)]
  }
}
