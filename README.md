# Fastify Secrets (core)

![CI](https://github.com/nearform/fastify-secrets-core/workflows/CI/badge.svg)

Simplify development of fastify-secrets plugins

> This module is intended for developers implemeting fastify-secrets plugins, not for developers using fastify-plugin in their fastify projects

## Installation

```
npm install --save fastify-secrets-core
```

## Usage

`fastify-secrets-core` simplifies development of `fastify-secrets` plugins and ensures that all plugins implements the same api.

Each plugin must only provide a simple client that interacts with the secrets storage and `fastify-secrets-core` will glue it to fastify.

### buildPlugin

Create a new fastify plugin by calling `buildPlugin` and providing a client class or constructor and options that will be forwarded to `fastify-plugin`.

`buildPlugin` will return a fastify plugin that can be exported.

#### Example

```js
const { buildPlugin } = require('fastify-secrets-core')
const Client = require('./client')

const plugin = buildPlugin(Client, {
  name: 'fastify-secrets-example'
})
```

### Client

The client that needs to be provided to `fastify-secrets-core` should implement this methods:

- `constructor`
- `async get(ref)` (required) This will be called to fetch a single secret identified by reference. It's up to the implementation what ref is.
- `async close()` (optional) This method will be called, if present, when the plugin is done fetching the secrets to give a chance to implementations to close any connection or run any teardown code. No further calls to the `get` method will be run after close.

### Example

This is a basic client implementation that reads secrets from `process.env`

```js
class Client {
  constructor() {
    console.log('client contructor')
  }

  async get(ref) {
    return process.env[ref]
  }

  async close() {
    console.log('client close')
  }
}

```

### Resulting plugin

The resulting plugin can be registered directly in fastify.
These are the available options:

- `secrets` (required). A non-empty object representing a map of secret keys and references. The plugin will decorate fastify with a `secrets` object with the same keys as this option but will replace the references with the actual values for the secret as fetched with `client.get(reference)`
- `namespace` (optional). If present, the plugin will add the secret values to `fastify.secrets.namespace` instead of `fastify.secrets`.
- `concurrency` (optional, defaults to 5). How  many concurrent call will be made to `client.get`. This is handled by `fastify-secrets-core` and it's transparent to the implementation.
- `clientOptions` (optional). A value that will be provided to the constructor of the `Client`. Useful to allow plugin users to customize the plugin.

The plugin will also expose the original Client for uses outside of fastify (i.e. db migrations and scripts)

#### Example

Assuming a plugin is built as per the previous examples, it can be used as

```js
fastify.register(plugin, {
  namespace: 'db',
  concurrency: 5,
  secrets: {
    user: 'PG_USER',
    pass: 'PG_PASS'
  },
  clientOptions: {
    optional: 'value'
  }
})

await fastify.ready()

console.log(fastify.secrets.db.pass)

```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md)

## License

Copyright NearForm Ltd 2020. Licensed under the [Apache-2.0 license](http://www.apache.org/licenses/LICENSE-2.0).
