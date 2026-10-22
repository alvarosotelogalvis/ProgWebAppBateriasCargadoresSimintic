import type { IdGenerator } from '@/application/ports/idGenerator'
import { v4 as uuidv4 } from 'uuid'

export class UuidGenerator implements IdGenerator {
  siguiente(): string {
    return uuidv4()
  }
}
