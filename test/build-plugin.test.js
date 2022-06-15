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

test('builds a fastify plugin', async (t) => {
  const plugin = buildPlugin(Client, {
    option: 'option1'
  })

  t.ok(fp.called, 'calls fastify-plugin')

  const opts = fp.firstCall.args[1]

  t.equal(opts.fastify, '4.x', 'adds option for fastify support')
  t.equal(opts.option, 'option1', 'forward provided options')

  t.equal(plugin.Client, Client, 'also exports client')
})

test('plugin', async (t) => {
  buildPlugin(Client, {
    option: 'option1'
  })
  const plugin = fp.firstCall.args[0]

  t.test('no namespace', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: {
        secret1: 'secret1-name',
        secret2: 'secret2-name'
      }
    })

    t.ok(typeof fastifyMock.secrets.refresh === 'function', 'refresh is defined as expected')
    sinon.assert.calledWith(decorate, 'secrets', {
      secret1: 'content for secret1-name',
      secret2: 'content for secret2-name',
      refresh: fastifyMock.secrets.refresh
    })
  })

  t.test('no namespace - secrets array', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['secret1-name', 'secret2-name']
    })

    t.ok(typeof fastifyMock.secrets.refresh === 'function', 'refresh is defined as expected')
    sinon.assert.calledWith(decorate, 'secrets', {
      'secret1-name': 'content for secret1-name',
      'secret2-name': 'content for secret2-name',
      refresh: fastifyMock.secrets.refresh
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

  t.test('namespace', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      namespace: 'namespace1',
      secrets: {
        secret1: 'secret1-name',
        secret2: 'secret2-name'
      }
    })

    t.ok(typeof fastifyMock.secrets.namespace1.refresh === 'function', 'refresh is defined as expected')
    sinon.assert.calledWith(decorate, 'secrets', {
      namespace1: {
        secret1: 'content for secret1-name',
        secret2: 'content for secret2-name',
        refresh: fastifyMock.secrets.namespace1.refresh
      }
    })
  })

  t.test('namespace - secrets exists', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const expectedSecrets = {}
    const fastifyMock = {
      decorate,
      secrets: expectedSecrets
    }

    await plugin(fastifyMock, {
      namespace: 'namespace1',
      secrets: {
        secret1: 'secret1-name',
        secret2: 'secret2-name'
      }
    })

    t.ok(typeof fastifyMock.secrets.namespace1.refresh === 'function', 'refresh is defined as expected')
    t.notOk(decorate.calledWith('secrets'), 'does not decorate fastify with secrets')
    t.same(
      expectedSecrets,
      {
        namespace1: {
          secret1: 'content for secret1-name',
          secret2: 'content for secret2-name',
          refresh: fastifyMock.secrets.namespace1.refresh
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

  t.test("is exposed as 'refresh' at the root with no namespace", async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: {
        secret1: 'secret1-name'
      }
    })

    t.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.ok(fastifyMock.secrets.refresh, 'populates secrets with a refresh method')
  })

  t.test("is exposed as 'refresh' on the namespace scope when provided", async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      namespace: 'test',
      secrets: {
        secret1: 'secret1-name'
      }
    })

    t.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.ok(fastifyMock.secrets.test.refresh, 'populates secrets namespace with a refresh method')
  })

  t.test('can be aliased using the refreshAlias option', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      namespace: 'test',
      refreshAlias: 'update',
      secrets: {
        secret1: 'secret1-name'
      }
    })

    t.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.ok(fastifyMock.secrets.test.update, 'populates secrets namespace with an "update" method')
  })

  t.test('persists across refresh invocations', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      namespace: 'test',
      secrets: {
        secret1: 'secret1-name'
      }
    })

    t.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.ok(fastifyMock.secrets.test.refresh, 'populates secrets namespace with a refresh method')

    await fastifyMock.secrets.test.refresh()

    t.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.ok(fastifyMock.secrets.test.refresh, 'populates secrets namespace with a refresh method')
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

    await fastifyMock.secrets.refresh('test')

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

    await fastifyMock.secrets.refresh()

    t.equal(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test2, 'value for test2 - 2', 'refreshed secret has been called twice')
  })

  t.test('refreshes a specified set of secrets with array notation', async (t) => {
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

    await fastifyMock.secrets.refresh(['test', 'test2'])

    t.equal(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test2, 'value for test2 - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test3, 'value for test3 - 1', 'un-refreshed secret has been called once')
  })

  t.test('refreshes a specified set of secrets with object notation', async (t) => {
    buildPlugin(MockClient)
    const plugin = fp.firstCall.args[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate
    }

    const defaultSecrets = {
      test: 'secretAlias',
      test2: 'secretAlias2',
      test3: 'secretAlias3'
    }
    await plugin(fastifyMock, {
      secrets: defaultSecrets
    })

    await fastifyMock.secrets.refresh()

    t.equal(fastifyMock.secrets.test, 'value for secretAlias - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test2, 'value for secretAlias2 - 2', 'refreshed secret has been called twice')
    t.equal(fastifyMock.secrets.test3, 'value for secretAlias3 - 2', 'refreshed secret has been called twice')
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

    await fastifyMock.secrets.testns.refresh('test')

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

    await fastifyMock.secrets.refresh()

    t.ok(constructionStub.calledTwice, 'constructor has been called twice')
    t.ok(closeStub.calledTwice, 'close method has been called twice')
  })
})
