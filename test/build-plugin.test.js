'use strict'

const { describe, test, beforeEach, mock } = require('node:test')
const buildPlugin = require('../lib/build-plugin')

const sinon = require('sinon')

class Client {
  async get(key) {
    return `content for ${key}`
  }

  async close() {}
}

beforeEach(async () => {
  sinon.reset()
})

test('builds a fastify plugin', async (t) => {
  const fp = mock.fn(() => ({}))
  const plugin = buildPlugin(Client, {
    option: 'option1'
  }, {
    fp
  })

  t.assert.ok(fp, 'calls fastify-plugin')

  const opts = fp.mock.calls[0].arguments[1]

  t.assert.strictEqual(opts.fastify, '5.x', 'adds option for fastify support')
  t.assert.strictEqual(opts.option, 'option1', 'forward provided options')

  t.assert.strictEqual(plugin.Client, Client, 'also exports client')
})

describe('plugin', () => {
  let plugin;

  beforeEach(() => {
    const fp = mock.fn(() => ({}))
    plugin = buildPlugin(Client, {
      option: 'option1'
    }, {
      fp
    })
    plugin = fp.mock.calls[0].arguments[0]
  })

  test('no namespace', async (t) => {
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

    t.assert.ok(typeof fastifyMock.secrets.refresh === 'function', 'refresh is defined as expected')
    sinon.assert.calledWith(decorate, 'secrets', {
      secret1: 'content for secret1-name',
      secret2: 'content for secret2-name',
      refresh: fastifyMock.secrets.refresh
    })
  })

  test('no namespace - secrets array', async (t) => {
    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })
    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['secret1-name', 'secret2-name']
    })

    t.assert.ok(typeof fastifyMock.secrets.refresh === 'function', 'refresh is defined as expected')
    sinon.assert.calledWith(decorate, 'secrets', {
      'secret1-name': 'content for secret1-name',
      'secret2-name': 'content for secret2-name',
      refresh: fastifyMock.secrets.refresh
    })
  })

  test('no namespace - secrets exists', async (t) => {
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

    await t.assert.rejects(promise, new Error('fastify-secrets has already been registered'), 'registration fails')
    t.assert.ok(!decorate.called, 'does not decorate fastify')
  })

  test('namespace', async (t) => {
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

    t.assert.ok(typeof fastifyMock.secrets.namespace1.refresh === 'function', 'refresh is defined as expected')
    sinon.assert.calledWith(decorate, 'secrets', {
      namespace1: {
        secret1: 'content for secret1-name',
        secret2: 'content for secret2-name',
        refresh: fastifyMock.secrets.namespace1.refresh
      }
    })
  })

  test('namespace - secrets exists', async (t) => {
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

    t.assert.ok(typeof fastifyMock.secrets.namespace1.refresh === 'function', 'refresh is defined as expected')
    t.assert.ok(!decorate.calledWith('secrets'), 'does not decorate fastify with secrets')
    t.assert.deepStrictEqual(
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

  test('namespace - namespace exists', async (t) => {
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

    await t.assert.rejects(
      promise,
      new Error(`fastify-secrets 'namespace1' instance name has already been registered`),
      'registration fails'
    )
    t.assert.ok(!decorate.called, 'does not decorate fastify')
    t.assert.notDeepEqual(
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

  test('no options', async (t) => {
    const decorate = sinon.spy()
    const promise = plugin({ decorate })

    await t.assert.rejects(promise, new Error(`fastify-secrets: no secrets requested`), 'registration fails')
    t.assert.ok(!decorate.called, 'does not decorate fastify')
  })

  test('no secrets', async (t) => {
    const decorate = sinon.spy()
    const emptyOpts = {}
    const promise = plugin({ decorate }, emptyOpts)

    await t.assert.rejects(promise, new Error(`fastify-secrets: no secrets requested`), 'registration fails')
    t.assert.ok(!decorate.called, 'does not decorate fastify')
  })
})

describe('client integration', () => {
  test('clientOptions are provided to client when instantiated', async (t) => {
    const constructorStub = sinon.stub()

    class Client {
      constructor(options) {
        return constructorStub(options)
      }

      async get() {}
    }

    const fp = mock.fn(() => ({}))
    buildPlugin(Client, undefined, { fp })

    const plugin = fp.mock.calls[0].arguments[0]
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

  test('client with close method', async (t) => {
    let closeCalled = false

    class Client {
      async get(key) {
        return key
      }

      async close() {
        closeCalled = true
      }
    }

    const fp = mock.fn(() => ({}))
    buildPlugin(Client, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]

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

    t.assert.ok(closeCalled, 'calls client.close if present')
  })

  test('client without close method', async (t) => {
    class Client {
      async get(key) {
        return key
      }
    }

    const fp = mock.fn(() => ({}))
    buildPlugin(Client, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]
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

    await t.assert.doesNotReject(() => promise, 'does not fail')
  })
})

describe('client wrapper', () => {
  let plugin;

  beforeEach(() => {
    const fp = mock.fn(() => ({}))
    plugin = buildPlugin(Client, undefined, { fp })
    plugin = fp.mock.calls[0].arguments[0]
  })


  test("is exposed as 'refresh' at the root with no namespace", async (t) => {
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

    t.assert.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.assert.ok(fastifyMock.secrets.refresh, 'populates secrets with a refresh method')
  })

  test("is exposed as 'refresh' on the namespace scope when provided", async (t) => {
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

    t.assert.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.assert.ok(fastifyMock.secrets.test.refresh, 'populates secrets namespace with a refresh method')
  })

  test('can be aliased using the refreshAlias option', async (t) => {
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

    t.assert.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.assert.ok(fastifyMock.secrets.test.update, 'populates secrets namespace with an "update" method')
  })

  test('persists across refresh invocations', async (t) => {
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

    t.assert.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.assert.ok(fastifyMock.secrets.test.refresh, 'populates secrets namespace with a refresh method')

    await fastifyMock.secrets.test.refresh()

    t.assert.ok(decorate.calledWith('secrets'), 'decorates fastify with secrets')
    t.assert.ok(fastifyMock.secrets.test.refresh, 'populates secrets namespace with a refresh method')
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

  test('allows for specific secrets to be refreshed', async (t) => {
    const fp = mock.fn(() => ({}))
    buildPlugin(MockClient, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]

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

    t.assert.equal(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.assert.equal(fastifyMock.secrets.test2, 'value for test2 - 1', 'un-refreshed secret has been called once')
  })

  test('refreshes all secrets by default', async (t) => {
    const fp = mock.fn(() => ({}))
    buildPlugin(MockClient, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]

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

    t.assert.strictEqual(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.assert.strictEqual(fastifyMock.secrets.test2, 'value for test2 - 2', 'refreshed secret has been called twice')
  })

  test('refreshes a specified set of secrets with array notation', async (t) => {
    const fp = mock.fn(() => ({}))
    buildPlugin(MockClient, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]

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

    t.assert.strictEqual(fastifyMock.secrets.test, 'value for test - 2', 'refreshed secret has been called twice')
    t.assert.strictEqual(fastifyMock.secrets.test2, 'value for test2 - 2', 'refreshed secret has been called twice')
    t.assert.strictEqual(fastifyMock.secrets.test3, 'value for test3 - 1', 'un-refreshed secret has been called once')
  })

  test('refreshes a specified set of secrets with object notation', async (t) => {
    const fp = mock.fn(() => ({}))
    buildPlugin(MockClient, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]

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

    t.assert.strictEqual(
      fastifyMock.secrets.test,
      'value for secretAlias - 2',
      'refreshed secret has been called twice'
    )
    t.assert.strictEqual(
      fastifyMock.secrets.test2,
      'value for secretAlias2 - 2',
      'refreshed secret has been called twice'
    )
    t.assert.strictEqual(
      fastifyMock.secrets.test3,
      'value for secretAlias3 - 2',
      'refreshed secret has been called twice'
    )
  })

  test('respects namespaces when refreshing', async (t) => {
    const fp = mock.fn(() => ({}))
    buildPlugin(MockClient, undefined, { fp })
    const plugin = fp.mock.calls[0].arguments[0]

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

    t.assert.strictEqual(
      fastifyMock.secrets.testns.test,
      'value for test - 2',
      'refreshed secret has been called twice'
    )
    t.assert.strictEqual(
      fastifyMock.secrets.testns.test2,
      'value for test2 - 1',
      'un-refreshed secret has been called once'
    )
  })

  test('will instantiate a fresh client if there is a provided close method', async (t) => {
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

    const fp = mock.fn(() => ({}))
    buildPlugin(MockCloseClient, undefined, { fp })
    buildPlugin(MockCloseClient)
    const plugin = fp.mock.calls[0].arguments[0]

    const decorate = sinon.stub().callsFake((key, value) => {
      fastifyMock[key] = value
    })

    const fastifyMock = {
      decorate
    }

    await plugin(fastifyMock, {
      secrets: ['test']
    })

    t.assert.ok(closeStub.calledOnce, 'close is invoked after initial secret setup')

    await fastifyMock.secrets.refresh()

    t.assert.ok(constructionStub.calledTwice, 'constructor has been called twice')
    t.assert.ok(closeStub.calledTwice, 'close method has been called twice')
  })
})
