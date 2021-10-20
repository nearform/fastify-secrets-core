'use strict'

const fp = require('fastify-plugin')
const pProps = require('p-props')
const pMap = require('p-map')

const DEFAULT_GET_CONCURRENCY = 5

function assertOptions(opts) {
  if (!opts || !opts.secrets) {
    throw new Error('fastify-secrets: no secrets requested')
  }
}

function assertPluginAlreadyRegistered(fastify, opts) {
  const namespace = opts.namespace

  if (!namespace && fastify.secrets) {
    throw new Error('fastify-secrets has already been registered')
  }

  if (namespace && fastify.secrets && fastify.secrets[namespace]) {
    throw new Error(`fastify-secrets '${namespace}' instance name has already been registered`)
  }
}

function buildPlugin(Client, pluginOpts) {
  async function FastifySecretsPlugin(fastify, opts) {
    assertOptions(opts)
    assertPluginAlreadyRegistered(fastify, opts)

    const client = new Client(opts.clientOptions)
    const concurrency = opts.concurrency || DEFAULT_GET_CONCURRENCY

    let secrets

    if (Array.isArray(opts.secrets)) {
      const temp = {}
      const secretValues = await pMap(opts.secrets, async (value) => (temp[value] = await client.get(value)), {
        concurrency
      })
      secrets = secretValues.reduce((acc, kv) => {
        const [key, value] = Object.entries(kv)[0]
        acc[key] = value
        return acc
      }, {})
    } else {
      secrets = await pProps(opts.secrets, (value) => client.get(value), { concurrency })
    }

    const namespace = opts.namespace
    if (namespace) {
      if (!fastify.secrets) {
        fastify.decorate('secrets', {})
      }

      fastify.secrets[namespace] = secrets
    } else {
      fastify.decorate('secrets', secrets)
    }

    if (client.close) {
      await client.close()
    }
  }

  const plugin = fp(FastifySecretsPlugin, {
    fastify: '3.x',
    ...pluginOpts
  })
  plugin.Client = Client

  return plugin
}

module.exports = buildPlugin
