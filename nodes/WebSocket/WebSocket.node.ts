import type { INodeExecutionData, INodeType, INodeTypeDescription } from 'n8n-workflow'
import type { IExecuteFunctions } from 'n8n-core'

export class WebSocket implements INodeType {
  description: INodeTypeDescription = {
    subtitle: '={{$parameter["url"]}}',
    displayName: 'WebSocket',
    name: 'websocket',
    icon: 'file:websocket.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts the workflow when a websocket is called',
    defaults: {
      name: 'WebSocket'
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'oAuth2Api',
        required: true
      }
    ],
    properties: [
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        placeholder: 'wss://example.com',
        description: 'The URL to make the request to',
        required: true
      },
      {
        displayName: 'Open Event Code',
        name: 'openEventCode',
        typeOptions: {
          editor: 'codeNodeEditor'
        },
        type: 'string',
        default: '',
        description: 'TODO',
        noDataExpression: true
      },
      {
        displayName: 'Message Event Code',
        name: 'messageEventCode',
        typeOptions: {
          editor: 'codeNodeEditor'
        },
        type: 'string',
        default: '',
        description: 'TODO',
        noDataExpression: true
      }
    ]
  }

  async execute (this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    return [this.helpers.returnJsonArray([{}])]
  }
}
