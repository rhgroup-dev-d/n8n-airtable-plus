export interface IFieldsValues {
  fieldName: string
  fieldValue: string
}

export interface IRecord {
  id: string
  fields: {
    [key: string]: string
  }
}
