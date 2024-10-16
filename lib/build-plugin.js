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

async function getSecretsFromClient(client, concurrency, refs) {
  return Array.isArray(refs)
    ? Object.assign(
        {},
        ...(await pMap(refs, async (value) => ({ [value]: await client.get(value) }), {
          concurrency
        }))
      )
    : await pProps(refs, (value) => client.get(value), { concurrency })
}

function decorateWithSecrets(fastify, namespace, secrets) {
  if (namespace) {
    if (!fastify.secrets) {
      fastify.decorate('secrets', {})
    }

    fastify.secrets[namespace] = secrets
  } else {
    fastify.decorate('secrets', secrets)
  }
}

async function refresh(client, fastify, opts, refs) {
  const { namespace, concurrency } = opts
  const secretsToRefresh = typeof refs === 'string' ? [refs] : refs || opts.secrets
  const refreshedSecrets = await getSecretsFromClient(client, concurrency, secretsToRefresh)
  const existingSecrets = namespace ? fastify.secrets[namespace] : fastify.secrets

  decorateWithSecrets(fastify, namespace, {
    ...existingSecrets,
    ...refreshedSecrets
  })

  if (client.close) {
    await client.close()
  }

  return refreshedSecrets
}

function buildPlugin(Client, pluginOpts) {
  async function FastifySecretsPlugin(fastify, opts) {
    assertOptions(opts)
    assertPluginAlreadyRegistered(fastify, opts)

    const client = new Client(opts.clientOptions)
    const concurrency = opts.concurrency || DEFAULT_GET_CONCURRENCY
    const namespace = opts.namespace

    // Register secrets
    const secrets = await getSecretsFromClient(client, concurrency, opts.secrets)
    decorateWithSecrets(fastify, namespace, {
      ...secrets,
      [opts.refreshAlias || 'refresh']: async (refs) => {
        const activeClient = client.close ? new Client(opts.clientOptions) : client
        return refresh(activeClient, fastify, opts, refs)
      }
    })

    if (client.close) {
      await client.close()
    }
  }

  const plugin = fp(FastifySecretsPlugin, {
    fastify: '5.x',
    ...pluginOpts
  })
  plugin.Client = Client

  return plugin
}

module.exports = buildPlugin
