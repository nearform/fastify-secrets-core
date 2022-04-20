'use strict'

const { test } = require('tap')

const { buildPlugin } = require('../lib/fastify-secrets-core')

test('buildPlugin should be defined', async (t) => {
  t.ok(buildPlugin)
})
