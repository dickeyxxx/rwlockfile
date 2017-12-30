import RWLockfile from './rwlockfile'
import * as fs from 'fs-extra'
import * as path from 'path'

const dir = path.join(__dirname, '../tmp/test/rwlockfile')

let count = 0
let f: string

const debug = require('debug')

jest.useRealTimers()
jest.setTimeout(10000)

beforeEach(async () => {
  debug('lock:test')('beforeEach')
  f = path.join(dir, count.toString())
  await fs.remove(f)
  f = path.join(f, count.toString())
  count++
})

describe('rwlockfile', () => {
  let a: RWLockfile
  let b: RWLockfile
  beforeEach(() => {
    a = new RWLockfile(f, { debug: debug('lock:a'), timeout: 20, retryInterval: 5 })
    b = new RWLockfile(f, { debug: debug('lock:b'), timeout: 20, retryInterval: 5 })
  })

  test('can get a write lock', async () => {
    await a.add('write')
  })

  test('can get a write lock sync', () => {
    a.addSync('write')
  })

  test('can get multiple read locks sync', async () => {
    await a.add('read')
    await b.add('read')
  })

  test('can get multiple read locks', () => {
    a.addSync('read')
    b.addSync('read')
  })

  test('cannot get a write lock when reader lock', async () => {
    expect.assertions(2)
    await a.add('read')
    try {
      await b.add('write')
    } catch (err) {
      await expect(err.message).toMatch(/^read lock exists/)
    }
    await b.add('read', {reason: 'mylock'})
    await a.remove('read')
    await a.add('read')
    try {
      await a.add('write')
    } catch (err) {
      await expect(err.message).toMatch(/^read lock exists: mylock/)
    }
  })

  test('cannot get a write lock when reader lock sync', () => {
    a.addSync('read')
    expect(() => b.addSync('write')).toThrowError(/read lock exists:/)
    b.addSync('read')
    a.removeSync('read')
    a.addSync('read')
    b.addSync('read')
    expect(() => a.addSync('write')).toThrowError(/read lock exists/)
  })

  test('shows reason sync', () => {
    a.addSync('read', {reason: 'myreason'})
    expect(() => b.addSync('write')).toThrowError(/lock exists: myreason/)
  })

  test('unlock all', async () => {
    await a.add('read')
    await a.add('write')
    await a.unlock()
    expect(await b.check('write')).toEqual({status: 'open'})
  })

  test('unlock all sync', () => {
    a.addSync('read')
    a.addSync('write')
    a.unlockSync()
    expect(b.checkSync('write')).toEqual({status: 'open'})
  })

  test('removes inactive readers and writers sync', () => {
    fs.outputJSONSync(path.join(f + '.lock'), {
      version: '2.0.0',
      readers: [{
        pid: 1000000,
        uuid: 'fakeuuid',
      }],
      writer: {
        pid: 1000000,
        uuid: 'fakeuuid',
      }
    })
    expect(b.checkSync('write')).toEqual({status: 'open'})
  })

  test('removes inactive readers and writers', async () => {
    fs.outputJSONSync(path.join(f + '.lock'), {
      version: '2.0.0',
      readers: [{
        pid: 1000000,
        uuid: 'fakeuuid',
      }],
      writer: {
        pid: 1000000,
        uuid: 'fakeuuid',
      }
    })
    expect(await b.check('write')).toEqual({status: 'open'})
  })
})