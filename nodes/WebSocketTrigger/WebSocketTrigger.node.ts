import type { INodeType, INodeTypeDescription, ITriggerResponse } from 'n8n-workflow'
import type { ITriggerFunctions } from 'n8n-core'
import WebSocket from 'ws'
import { NodeOperationError, WorkflowExecuteMode } from 'n8n-workflow'
import { NodeVM } from 'vm2'

const defaultOpenEventCode = `// Add your code here
$send({
  action: 'register',
  accessCode: $accessCode
})

const message = await $waitMessage()`

async function execCode (
  ctx: Record<string, any>,
  workflowMode: WorkflowExecuteMode,
  code: string
): Promise<void> {
  const sandbox = new NodeVM({
    console: workflowMode === 'manual' ? 'redirect' : 'inherit',
    sandbox: ctx
  })

  try {
    await sandbox.run(`module.exports = async function() {${code}\n}()`, __dirname)
  } catch {
  }
}

function parseMessage (data: any): Record<string, any> {
  const payload = Array.isArray(data)
    ? data.map(it => it.toString()).join('')
    : data.toString()

  let message

  try {
    message = JSON.parse(payload)
  } catch {
    message = { ...payload.split('') }
  }

  return message
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
        required: false
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
          editor: 'code'
        },
        type: 'string',
        default: defaultOpenEventCode,
        description: 'Code to execute when connected to socket',
        noDataExpression: true
      }
    ]
  }

  async trigger (this: ITriggerFunctions): Promise<ITriggerResponse> {
    const workflowMode = this.getMode()
    const uri = this.getNodeParameter('uri', 0) as string
    let accessToken: string = ''

    try {
      const oAuth2Api = await this.getCredentials('oAuth2Api')
      accessToken = (oAuth2Api?.oauthTokenData as any)?.access_token ?? ''
    } catch {
    }

    const client = new WebSocket(uri)

    async function handleOpen (this: ITriggerFunctions): Promise<void> {
      const openEventCode = this.getNodeParameter('openEventCode', 0) as string

      const ctx = {
        $accessToken: accessToken,
        $getNodeParameter: this.getNodeParameter,
        $getWorkflowStaticData: this.getWorkflowStaticData,
        $send: (data: any): void => {
          if (typeof data === 'string') {
            client.send(data)
          } else {
            client.send(JSON.stringify(data))
          }
        },
        $waitMessage: async (): Promise<Record<string, any>> => {
          return await new Promise((resolve) => {
            client.once('message', (data) => {
              resolve(parseMessage(data))
            })
          })
        },
        helpers: this.helpers
      }

      await execCode(ctx, workflowMode, openEventCode)
    }

    async function manualTriggerFunction (this: ITriggerFunctions): Promise<void> {
      await new Promise((resolve, reject) => {
        client.on('open', () => {
          handleOpen.call(this)
            .then(() => {
              resolve(true)
            })
            .catch((err) => {
              throw new NodeOperationError(this.getNode(), err.message)
            })
        })

        client.on('message', (data) => {
          const message = parseMessage(data)
          this.emit([this.helpers.returnJsonArray(message)])
        })

        client.on('error', (err) => {
          this.emitError(err)
          reject(err)
        })
      })
    }

    async function closeFunction (this: ITriggerFunctions): Promise<void> {
      client.terminate()
    }

    if (workflowMode === 'trigger') {
      await manualTriggerFunction.call(this)
    }

    return {
      closeFunction: closeFunction.bind(this),
      manualTriggerFunction: manualTriggerFunction.bind(this)
    }
  }
}
