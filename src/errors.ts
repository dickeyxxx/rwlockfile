import {Status} from './rwlockfile'

export class LockfileError extends Error {
  code = 'ELOCK'
  msg: string
  file: string
  reason: string

  constructor({ msg, file, reason }: { file: string; msg?: string; reason?: string }) {
    super(msg || (reason ? `${reason}: ${file}` : `lock exists!: ${file}`))
  }
}

export class RWLockfileError extends LockfileError {
  constructor (status: Status, file: string) {
    switch (status.status) {
      case 'write_lock':
        super({file, msg: `write lock exists: ${status.job.reason || ''}`})
        return
      case 'read_lock':
        super({file, msg: `read lock exists: ${status.jobs[0].reason || ''}`})
        return
      default:
        throw new Error(`Unexpected status: ${status.status}`)
    }
  }
}