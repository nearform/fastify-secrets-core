'use strict'

const { test } = require('tap')

const { buildPlugin } = require('../lib/fastify-secrets-core')

test('buildPlugin should be defined', (t) => {
  t.plan(1)

  t.ok(buildPlugin)
})
