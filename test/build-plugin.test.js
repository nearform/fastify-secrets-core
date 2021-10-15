'use strict'

const { test, beforeEach } = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const fp = sinon.stub()
const buildPlugin = proxyquire('../lib/build-plugin', {
  'fastify-plugin': fp
})

class Client {
  async get(key) {
    return `content for ${key}`
  }

  async close() {}
}

beforeEach(async () => {
  fp.resetHistory()
  sinon.reset()
  fp.returns({})
})

test('builds a fastify plugin', (t) => {
  const plugin = buildPlugin(Client, {
    option: 'option1'
  })

  t.ok(fp.called, 'calls fastify-plugin')

  const opts = fp.firstCall.args[1]

  t.equal(opts.fastify, '3.x', 'adds option for fastify support')
  t.equal(opts.option, 'option1', 'forward provided options')

  t.equal(plugin.Client, Client, 'also exports client')

  t.end()
})

test('plugin', (t) => {
  t.plan(7)

  buildPlugin(Client, {
    option: 'option1'
  })
  const plugin = fp.firstCall.args[0]

  t.test('no namespace', async (t) => {
    t.plan(2)

    const decorate = sinon.spy()

    await plugin(
      { decorate },
      {
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    t.ok(decorate.called, 'decorates fastify')
    t.ok(
      decorate.calledWith('secrets', {
        secret1: 'content for secret1-name',
        secret2: 'content for secret2-name'
      }),
      'decorates with secrets content'
    )
  })

  t.test('no namespace - secrets array', async (t) => {
    t.plan(2)

    const decorate = sinon.spy()

    await plugin(
      { decorate },
      {
        secrets: ['secret1-name', 'secret2-name']
      }
    )

    t.ok(decorate.called, 'decorates fastify')
    t.ok(
      decorate.calledWith('secrets', {
        '0': 'content for secret1-name',
        '1': 'content for secret2-name',
        'secret1-name': 'content for secret1-name',
        'secret2-name': 'content for secret2-name'
      }),
      'decorates with secrets content'
    )
  })

  t.test('no namespace - secrets exists', async (t) => {
    t.plan(2)

    const decorate = sinon.spy()

    const promise = plugin(
      { decorate, secrets: {} },
      {
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    await t.rejects(promise, new Error('fastify-secrets has already been registered'), 'registration fails')
    t.notOk(decorate.called, 'does not decorate fastify')
  })

  t.test('namespace', async (t) => {
    t.plan(2)

    // emulate decorate behaviour
    const decorate = sinon.stub().callsFake(function decorate(key, obj) {
      this[key] = obj
    })

    await plugin(
      { decorate },
      {
        namespace: 'namespace1',
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    t.ok(decorate.called, 'decorates fastify')
    t.ok(
      decorate.calledWith('secrets', {
        namespace1: {
          secret1: 'content for secret1-name',
          secret2: 'content for secret2-name'
        }
      }),
      'decorates with secrets content'
    )
  })

  t.test('namespace - secrets exists', async (t) => {
    t.plan(2)

    const decorate = sinon.spy()
    const secrets = {}

    await plugin(
      { decorate, secrets },
      {
        namespace: 'namespace1',
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    t.notOk(decorate.called, 'does not decorate fastify')
    t.same(
      secrets,
      {
        namespace1: {
          secret1: 'content for secret1-name',
          secret2: 'content for secret2-name'
        }
      },
      'adds secrets content'
    )
  })

  t.test('namespace - namespace exists', async (t) => {
    t.plan(3)

    const decorate = sinon.spy()
    const secrets = {
      namespace1: {}
    }

    const promise = plugin(
      { decorate, secrets },
      {
        namespace: 'namespace1',
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    await t.rejects(
      promise,
      new Error(`fastify-secrets 'namespace1' instance name has already been registered`),
      'registration fails'
    )
    t.notOk(decorate.called, 'does not decorate fastify')
    t.notSame(
      secrets,
      {
        namespace1: {
          secret1: 'content for secret1-name',
          secret2: 'content for secret2-name'
        }
      },
      'does not add secrets content'
    )
  })

  t.test('no options', async (t) => {
    t.plan(2)

    const decorate = sinon.spy()
    const promise = plugin({ decorate })

    await t.rejects(promise, new Error(`fastify-secrets: no secrets requested`), 'registration fails')
    t.notOk(decorate.called, 'does not decorate fastify')
  })

  t.test('no secrets', async (t) => {
    t.plan(2)

    const decorate = sinon.spy()
    const emptyOpts = {}
    const promise = plugin({ decorate }, emptyOpts)

    await t.rejects(promise, new Error(`fastify-secrets: no secrets requested`), 'registration fails')
    t.notOk(decorate.called, 'does not decorate fastify')
  })
})

test('client integration', (t) => {
  t.plan(3)

  t.test('clientOptions are provided to client when instantiated', async (t) => {
    const constructorStub = sinon.stub()

    class Client {
      constructor(options) {
        return constructorStub(options)
      }

      async get() {}
    }

    buildPlugin(Client)

    const plugin = fp.firstCall.args[0]
    const decorate = sinon.spy()
    const clientOptions = { client: 'options' }

    await plugin(
      { decorate },
      {
        secrets: {
          secret1: 'secret1-name'
        },
        clientOptions
      }
    )

    sinon.assert.calledOnceWithExactly(constructorStub, clientOptions)
  })

  t.test('client with close method', async (t) => {
    t.plan(1)

    let closeCalled = false

    class Client {
      async get(key) {
        return key
      }

      async close() {
        closeCalled = true
      }
    }

    buildPlugin(Client)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.spy()

    await plugin(
      { decorate },
      {
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    t.ok(closeCalled, 'calls client.close if present')
  })

  t.test('client without close method', async (t) => {
    t.plan(1)

    class Client {
      async get(key) {
        return key
      }
    }

    buildPlugin(Client)
    const plugin = fp.firstCall.args[0]
    const decorate = sinon.spy()

    const promise = plugin(
      { decorate },
      {
        secrets: {
          secret1: 'secret1-name',
          secret2: 'secret2-name'
        }
      }
    )

    await t.resolves(promise, 'does not fail')
  })
})
