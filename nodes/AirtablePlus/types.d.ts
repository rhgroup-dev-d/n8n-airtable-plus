export interface IAttachment {
  url: string
  filename: string
  type: string
}

export interface IFieldsValues {
  fieldName: string
  fieldValue: string
}

export interface IRecord {
  id: string
  fields: {
    [key: string]: string | IAttachment[]
  }
}
