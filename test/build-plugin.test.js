'use strict'

const { test, beforeEach } = require('tap')
const sinon = require('sinon')
const proxyquire = require('proxyquire')

const fp = sinon.stub()
const { buildPlugin } = proxyquire('../lib/build-plugin', {
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

test('builds a fastify plugin', async (t) => {
  const plugin = buildPlugin(Client, {
    option: 'option1'
  })

  t.ok(fp.called, 'calls fastify-plugin')

  const opts = fp.firstCall.args[1]

  t.equal(opts.fastify, '3.x', 'adds option for fastify support')
  t.equal(opts.option, 'option1', 'forward provided options')

  t.equal(plugin.Client, Client, 'also exports client')
})

test('plugin', async (t) => {
  buildPlugin(Client, {
    option: 'option1'
  })
  const plugin = fp.firstCall.args[0]

  t.test('no namespace', async () => {
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

    sinon.assert.calledWith(decorate, 'secrets', {
      secret1: 'content for secret1-name',
      secret2: 'content for secret2-name'
    })
  })

  t.test('no namespace - secrets array', async () => {
    const decorate = sinon.spy()

    await plugin(
      { decorate },
      {
        secrets: ['secret1-name', 'secret2-name']
      }
    )

    sinon.assert.calledWith(decorate, 'secrets', {
      'secret1-name': 'content for secret1-name',
      'secret2-name': 'content for secret2-name'
    })
  })

  t.test('no namespace - secrets exists', async (t) => {
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

  t.test('namespace', async () => {
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

    sinon.assert.calledWith(decorate, 'secrets', {
      namespace1: {
        secret1: 'content for secret1-name',
        secret2: 'content for secret2-name'
      }
    })
  })

  t.test('namespace - secrets exists', async (t) => {
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

    t.notOk(decorate.calledWith('secrets'), 'does not decorate fastify with secrets')
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
    const decorate = sinon.spy()
    const promise = plugin({ decorate })

    await t.rejects(promise, new Error(`fastify-secrets: no secrets requested`), 'registration fails')
    t.notOk(decorate.called, 'does not decorate fastify')
  })

  t.test('no secrets', async (t) => {
    const decorate = sinon.spy()
    const emptyOpts = {}
    const promise = plugin({ decorate }, emptyOpts)

    await t.rejects(promise, new Error(`fastify-secrets: no secrets requested`), 'registration fails')
    t.notOk(decorate.called, 'does not decorate fastify')
  })
})

test('client integration', async (t) => {
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

test('client wrapper', async (t) => {
  buildPlugin(Client)
  const plugin = fp.firstCall.args[0]

  t.test("is exposed as 'secretClient' with no namespace", async (t) => {
    const decorate = sinon.spy()

    await plugin(
      { decorate },
      {
        secrets: {
          secret1: 'secret1-name'
        }
      }
    )

    t.ok(decorate.calledWith('secretClient'), 'decorates fastify with client wrapper')
  })

  t.test('is prefixed in the event a namespace is present', async (t) => {
    const decorate = sinon.spy()

    await plugin(
      { decorate, secrets: {} },
      {
        namespace: 'test',
        secrets: {
          secret1: 'secret1-name'
        }
      }
    )

    t.ok(decorate.calledWith('testSecretClient'), 'decorates fastify with client wrapper')
  })

  class MockClient {
    constructor() {
      this.invokeCount = {}
    }

    async get(key) {
      if (this.invokeCount[key] === undefined) {
        this.invokeCount[key] = 1
      } else {
        this.invokeCount[key] += 1
      }
      return `value for ${key} - ${this.invokeCount[key]}`
    }
  }

  t.test('allows for specific secrets to be refreshed', async (t) => {
    buildPlugin(MockClient)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['test', 'test2']
    })

    await fastifyMock.secretClient('test')

    t.equal(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test2, 'value for test2 - 1', 'un-refreshed secret has been called once')
  })

  t.test('refreshes all secrets by default', async (t) => {
    buildPlugin(MockClient)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['test', 'test2']
    })

    await fastifyMock.secretClient()

    t.equal(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test2, 'value for test2 - 2', 'refreshed secret has been called twice')
  })

  t.test('refreshes a specified set of secrets', async (t) => {
    buildPlugin(MockClient)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['test', 'test2', 'test3']
    })

    await fastifyMock.secretClient(['test', 'test2'])

    t.equal(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test2, 'value for test2 - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test3, 'value for test3 - 1', 'un-refreshed secret has been called once')
  })

  t.test('respects namespaces when refreshing', async (t) => {
    buildPlugin(MockClient)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate,
      secrets: {}
    }

    await plugin(fastifyMock, {
      namespace: 'testns',
      secrets: ['test', 'test2']
    })

    await fastifyMock.testnsSecretClient('test')

    t.equal(fastifyMock.secrets.testns.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.testns.test2, 'value for test2 - 1', 'un-refreshed secret has been called once')
  })

  t.test('will instantiate a fresh client if there is a provided close method', async (t) => {
    const constructionStub = sinon.stub()
    const closeStub = sinon.stub()
    class MockCloseClient {
      constructor() {
        constructionStub()
      }

      async get(key) {
        return `value for ${key}`
      }

      async close() {
        closeStub()
      }
    }

    buildPlugin(MockCloseClient)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['test']
    })

    t.ok(closeStub.calledOnce, 'close is invoked after initial secret setup')

    await fastifyMock.secretClient()

    t.ok(constructionStub.calledTwice, 'constructor has been called twice')
    t.ok(closeStub.calledTwice, 'close method has been called twice')
  })
})
