'use strict'

const { test } = require('node:test')

const { buildPlugin } = require('../lib/fastify-secrets-core')

test('buildPlugin should be defined', (t) => {
  t.assert.ok(buildPlugin)
})
