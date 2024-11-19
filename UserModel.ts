import {AuthModel} from './AuthModel'

export interface UserModel {
  _id: number | 0
  email: string
  password?: string | undefined
  firstname?: string | ''
  lastname?: string | ''
  fullname?: string
  roles?: Array<number>
  timeZone?: string
  auth?: AuthModel
}
