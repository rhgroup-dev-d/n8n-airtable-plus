import type { IDataObject, INodeType, INodeTypeDescription, ITriggerResponse } from 'n8n-workflow'
import type { ITriggerFunctions } from 'n8n-core'
import { NodeOperationError } from 'n8n-workflow'
import { WebSocket } from 'ws'

function wsDataToObject (data: any): IDataObject {
  const payload = Array.isArray(data)
    ? data.map(it => it.toString()).join('')
    : data.toString()

  try {
    return JSON.parse(payload)
  } catch {
    return { ...payload.split('') }
  }
}

export class WebSocketTrigger implements INodeType {
  description: INodeTypeDescription = {
    subtitle: '={{$parameter["url"]}}',
    displayName: 'WebSocket Trigger',
    name: 'webSocketTrigger',
    icon: 'file:websocket-trigger.svg',
    group: ['trigger'],
    version: 1,
    description: 'Starts the workflow when a websocket is opened',
    defaults: {
      name: 'WebSocket Trigger'
    },
    inputs: [],
    outputs: ['main'],
    parameterPane: 'wide',
    credentials: [
      {
        name: 'oAuth2Api',
        required: true
      }
    ],
    properties: [
      {
        displayName: 'URI',
        name: 'uri',
        type: 'string',
        default: '',
        placeholder: 'wss://example.com',
        description: 'The URI to open socket to',
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
      }
    ]
  }

  async trigger (this: ITriggerFunctions): Promise<ITriggerResponse> {
    const uri = this.getNodeParameter('uri', 0) as string
    let accessToken: string | null = null

    try {
      const oAuth2Api = await this.getCredentials('oAuth2Api')
      accessToken = (oAuth2Api.oauthTokenData as any).access_token ?? null
    } catch {
    }

    if (accessToken === null) {
      throw new NodeOperationError(this.getNode(), 'OAuth2 credentials are not initialized')
    }

    const client = new WebSocket(uri)

    const result: ITriggerResponse = {
      manualTriggerFunction: async () => {
        await new Promise((resolve, reject) => {
          client.on('open', () => {
            console.log('connection open')
          })

          client.on('message', (data) => {
            const message = wsDataToObject(data)
            this.emit([this.helpers.returnJsonArray(message)])

            resolve(true)
          })

          client.on('error', (err) => {
            reject(err)
          })
        })
      },
      closeFunction: async () => {
        client.terminate()
      }
    }

    if (this.getMode() === 'trigger') {
      await result.manualTriggerFunction?.()
    }

    return result
  }
}
