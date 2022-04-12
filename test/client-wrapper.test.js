const { test, beforeEach } = require('tap')
const sinon = require('sinon')

const ClientWrapper = require('../lib/client-wrapper')

beforeEach(() => sinon.reset())

class MockCloseClient {
  get(key) {
    return `value for ${key}`
  }

  async close() {
    return true
  }
}

class MockClient {
  get(key) {
    return `value for ${key}`
  }
}

test('ClientWrapper', async (t) => {
  t.test('instantiates and exposes a refresh method', async (t) => {
    const client = new ClientWrapper(MockCloseClient, {}, {})

    t.ok(client.refresh, 'refresh is exposed as expected')
  })

  t.test('invokes close on the client after a refresh', async (t) => {
    const closeSpy = sinon.spy(MockCloseClient.prototype, 'close')

    const client = new ClientWrapper(
      MockCloseClient,
      {
        decorate: sinon.stub()
      },
      {}
    )

    await client.refresh('test')

    t.ok(closeSpy.calledOnce)
  })

  t.test('refreshes requested setting without namespace', async (t) => {
    const decorateSpy = sinon.spy()
    const client = new ClientWrapper(MockClient, { decorate: decorateSpy }, {})

    await client.refresh('test')

    t.ok(
      decorateSpy.calledWith('secrets', {
        test: 'value for test'
      })
    )
  })

  t.test('refreshes requested setting without namespace', async (t) => {
    const decorateSpy = sinon.spy()
    const client = new ClientWrapper(MockClient, { decorate: decorateSpy }, { namespace: 'test-ns' })

    await client.refresh('test')

    t.ok(
      decorateSpy.calledWith('secrets', {
        'test-ns': {
          test: 'value for test'
        }
      })
    )
  })

  t.test('does not delete existing secrets', async (t) => {
    const decorateSpy = sinon.spy()
    const fastifyMock = { decorate: decorateSpy, secrets: { exists: true } }
    const client = new ClientWrapper(MockClient, fastifyMock, {})

    await client.refresh('test')

    t.ok(
      decorateSpy.calledWith('secrets', {
        exists: true,
        test: 'value for test'
      })
    )
  })
})
