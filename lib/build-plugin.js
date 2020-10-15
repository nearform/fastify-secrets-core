'use strict'

const fp = require('fastify-plugin')
const pProps = require('p-props')

const GET_CONCURRENCY = 5

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

    const client = new Client()

    const secrets = await pProps(opts.secrets, (value) => client.get(value), { concurrency: GET_CONCURRENCY })

    const namespace = opts.namespace
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
    fastify: '3.x',
    ...pluginOpts
  })
}

module.exports = buildPlugin
