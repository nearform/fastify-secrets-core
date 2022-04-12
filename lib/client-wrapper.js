'use strict'

function ClientWrapper(Client, fastify, opts) {
  this.refresh = async function get(key) {
    const client = new Client(opts.clientOptions)
    const value = await client.get(key)
    const secrets = fastify.secrets || {}
    const namespace = opts.namespace

    if (namespace) {
      fastify.decorate('secrets', {
        ...secrets,
        [namespace]: {
          ...secrets[namespace],
          [key]: value
        }
      })
    } else {
      fastify.decorate('secrets', {
        ...secrets,
        [key]: value
      })
    }

    if (client.close) {
      await client.close()
    }
  }
}

module.exports = ClientWrapper
