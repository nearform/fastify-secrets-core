'use strict'

const fp = require('fastify-plugin')

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

    const source = opts.secrets
    const namespace = opts.namespace
    const secrets = {}

    const client = new Client()

    for (const key in source) {
      secrets[key] = await client.get(source[key])
    }

    if (namespace) {
      if (!fastify.secrets) {
        fastify.decorate('secrets', {})
      }

      fastify.secrets[namespace] = secrets
    } else {
      fastify.decorate('secrets', secrets)
    }
  }

  return fp(FastifySecretsPlugin, {
    fastify: '>= 2.x',
    ...pluginOpts
  })
}

module.exports = buildPlugin
